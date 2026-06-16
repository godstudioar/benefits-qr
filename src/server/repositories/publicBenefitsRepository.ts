import { unstable_cache } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PublicBenefitsFiltersInput = {
  q?: string;
  rubroId?: string;
  soloHoy?: boolean;
  soloDisponibles?: boolean;
  localId?: string;
};

export type PublicBenefitsCatalogRaw = {
  beneficios: Array<{
    id: string;
    descripcion: string;
    fechaExpiracion: string;
    maxUsos: number | null;
    diasValidos: number[];
    createdAt: string;
    canjeados: number;
    local: {
      nombre: string | null;
      logoUrl: string | null;
      rubroNombre: string | null;
      direccion: string | null;
      lat: number | null;
      lng: number | null;
    };
  }> | null;
  total: number;
};

export type PublicBenefitsLocaleRaw = {
  id: string;
  nombre: string | null;
  logoUrl: string | null;
  lat: number;
  lng: number;
  rubroNombre: string | null;
  beneficiosCount: number;
};

const AVAILABLE_CONDITION = Prisma.sql`
  b."fechaExpiracion" >= CURRENT_TIMESTAMP
  AND (b."maxUsos" IS NULL OR COALESCE(bs.canjeados, 0) < b."maxUsos")
`;

function parseRubroId(value: string | undefined): number | undefined {
  if (!value) return undefined;

  if (!/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

async function _getPublicBenefitsCatalogRaw(
  page: number,
  pageSize: number,
  filters: PublicBenefitsFiltersInput = {}
): Promise<PublicBenefitsCatalogRaw> {
  const offset = Math.max(0, (page - 1) * pageSize);

  const nombreFilter = filters.q
    ? Prisma.sql`AND l.nombre ILIKE ${"%" + filters.q + "%"}`
    : Prisma.empty;

  // rubroId from the URL is a string; validate and cast to int before using it
  // in a raw query so malformed values do not become broken SQL filters.
  const rubroId = parseRubroId(filters.rubroId);
  const rubroFilter = rubroId !== undefined
    ? Prisma.sql`AND l."rubroId" = ${rubroId}`
    : Prisma.empty;

  const soloHoyFilter = filters.soloHoy
    ? Prisma.sql`AND (
        array_length(b."diasValidos", 1) IS NULL
        OR array_length(b."diasValidos", 1) = 0
        OR EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos")
      )
      AND (${AVAILABLE_CONDITION})`
    : Prisma.empty;

  const soloDisponiblesFilter = filters.soloDisponibles
    ? Prisma.sql`AND (${AVAILABLE_CONDITION})`
    : Prisma.empty;

  const localFilter = filters.localId
    ? Prisma.sql`AND b."localId" = ${filters.localId}`
    : Prisma.empty;

  // Optimización: cuando filtramos por local específico, limitamos los stats a beneficios de ese local
  const beneficioStatsFilter = filters.localId
    ? Prisma.sql`b."localId" = ${filters.localId}`
    : Prisma.sql`b."esPublico" = true AND b."deletedAt" IS NULL`;

  const [raw] = await prisma.$queryRaw<[PublicBenefitsCatalogRaw]>`
    WITH beneficio_stats_cte AS (
      SELECT
        r."beneficioId",
        COUNT(*) FILTER (WHERE r.estado = 'CANJEADO')::int AS canjeados
      FROM "Reclamo" r
      JOIN "Beneficio" b ON b.id = r."beneficioId"
      WHERE ${beneficioStatsFilter}
      GROUP BY r."beneficioId"
    ),
    filtered_beneficios_cte AS (
      SELECT
        b.id,
        b.descripcion,
        b."fechaExpiracion",
        b."maxUsos",
        b."diasValidos",
        b."createdAt",
        COALESCE(bs.canjeados, 0) AS canjeados,
        l.nombre AS "localNombre",
        l."logoUrl" AS "localLogoUrl",
        l.direccion AS "localDireccion",
        l.lat AS "localLat",
        l.lng AS "localLng",
        ru.nombre AS "localRubroNombre",
        l.id AS "localId",
        (${AVAILABLE_CONDITION}) AS "isAvailable",
        CASE
          WHEN NOT (${AVAILABLE_CONDITION}) THEN 2
          WHEN (
            array_length(b."diasValidos", 1) IS NOT NULL
            AND array_length(b."diasValidos", 1) > 0
            AND NOT (EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos"))
          ) THEN 1
          ELSE 0
        END AS "sortRank",
        ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY
          CASE
            WHEN NOT (${AVAILABLE_CONDITION}) THEN 2
            WHEN (
              array_length(b."diasValidos", 1) IS NOT NULL
              AND array_length(b."diasValidos", 1) > 0
              AND NOT (EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos"))
            ) THEN 1
            ELSE 0
          END ASC, b."createdAt" DESC
        ) AS "localPriorityIndex"
      FROM "Beneficio" b
      JOIN "Local" l ON l.id = b."localId"
      LEFT JOIN "Rubro" ru ON ru.id = l."rubroId"
      LEFT JOIN beneficio_stats_cte bs ON bs."beneficioId" = b.id
      WHERE b."esPublico" = true
        AND b."deletedAt" IS NULL
        AND l."isTest" = false
        AND l."active" = true
        ${nombreFilter}
        ${rubroFilter}
        ${soloHoyFilter}
        ${soloDisponiblesFilter}
        ${localFilter}
    ),
    paged_beneficios_cte AS (
      SELECT *
      FROM filtered_beneficios_cte
      ORDER BY "localPriorityIndex" ASC, "sortRank" ASC, "createdAt" DESC
      LIMIT ${pageSize} OFFSET ${offset}
    )
    SELECT
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', b.id,
              'descripcion', b.descripcion,
              'fechaExpiracion', b."fechaExpiracion",
              'maxUsos', b."maxUsos",
              'diasValidos', b."diasValidos",
              'createdAt', b."createdAt",
              'canjeados', b.canjeados,
              'local', json_build_object(
                'nombre', b."localNombre",
                'logoUrl', b."localLogoUrl",
                'rubroNombre', b."localRubroNombre",
                'direccion', b."localDireccion",
                'lat', b."localLat",
                'lng', b."localLng"
              )
            )
            ORDER BY b."localPriorityIndex" ASC, b."sortRank" ASC, b."createdAt" DESC
          )
          FROM paged_beneficios_cte b
        ),
        '[]'::json
      ) AS beneficios,
      COALESCE((SELECT COUNT(*)::int FROM filtered_beneficios_cte), 0) AS total
  `;

  return raw;
}

// Cached version: 60s TTL, keyed by (page, pageSize, filters).
// The raw response is fully JSON-serializable (DB returns dates as ISO strings).
// Hydration (string → Date) happens in the service layer after cache hit.
// Cache key includes filter params for better granularity and hit rate.
export const getPublicBenefitsCatalogRaw = (
  page: number,
  pageSize: number,
  filters: PublicBenefitsFiltersInput = {}
) => {
  const rubroId = parseRubroId(filters.rubroId);
  const cacheKey = [
    "public-benefits-catalog",
    String(page),
    String(pageSize),
    filters.q ?? "",
    rubroId !== undefined ? String(rubroId) : "",
    filters.localId ?? "",
    filters.soloHoy ? "1" : "0",
    filters.soloDisponibles ? "1" : "0",
  ];

  return unstable_cache(
    async () => _getPublicBenefitsCatalogRaw(page, pageSize, filters),
    cacheKey,
    { revalidate: 60 }
  )();
};

export async function getFeaturedPublicBenefitsRaw(limit: number): Promise<PublicBenefitsCatalogRaw> {
  // Devolvemos hasta `limit` beneficios priorizando:
  //   0 -> activos y aplicables hoy
  //   1 -> activos pero no aplicables hoy (día no válido)
  //   2 -> vencidos / agotados
  const [raw] = await prisma.$queryRaw<[PublicBenefitsCatalogRaw]>`
    WITH beneficio_stats_cte AS (
      SELECT
        r."beneficioId",
        COUNT(*) FILTER (WHERE r.estado = 'CANJEADO')::int AS canjeados
      FROM "Reclamo" r
      JOIN "Beneficio" b ON b.id = r."beneficioId"
      WHERE b."esPublico" = true
        AND b."deletedAt" IS NULL
      GROUP BY r."beneficioId"
    ),
    all_featured_cte AS (
      SELECT
        b.id,
        b.descripcion,
        b."fechaExpiracion",
        b."maxUsos",
        b."diasValidos",
        b."createdAt",
        COALESCE(bs.canjeados, 0) AS canjeados,
        l.nombre AS "localNombre",
        l."logoUrl" AS "localLogoUrl",
        l.direccion AS "localDireccion",
        l.lat AS "localLat",
        l.lng AS "localLng",
        ru.nombre AS "localRubroNombre",
        CASE
          WHEN (${AVAILABLE_CONDITION}) AND (
            array_length(b."diasValidos", 1) IS NULL
            OR array_length(b."diasValidos", 1) = 0
            OR EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos")
          ) THEN 0
          WHEN (${AVAILABLE_CONDITION}) THEN 1
          ELSE 2
        END AS "priority",
        ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY
          CASE
            WHEN (${AVAILABLE_CONDITION}) AND (
              array_length(b."diasValidos", 1) IS NULL
              OR array_length(b."diasValidos", 1) = 0
              OR EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos")
            ) THEN 0
            WHEN (${AVAILABLE_CONDITION}) THEN 1
            ELSE 2
          END ASC, b."createdAt" DESC
        ) AS "localPriorityIndex"
      FROM "Beneficio" b
      JOIN "Local" l ON l.id = b."localId"
      LEFT JOIN "Rubro" ru ON ru.id = l."rubroId"
      LEFT JOIN beneficio_stats_cte bs ON bs."beneficioId" = b.id
      WHERE b."esPublico" = true
        AND b."deletedAt" IS NULL
        AND l."isTest" = false
        AND l."active" = true
    ),
    featured_beneficios_cte AS (
      SELECT *
      FROM all_featured_cte
      ORDER BY "localPriorityIndex" ASC, "priority" ASC, "createdAt" DESC
      LIMIT ${limit}
    )
    SELECT
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', b.id,
              'descripcion', b.descripcion,
              'fechaExpiracion', b."fechaExpiracion",
              'maxUsos', b."maxUsos",
              'diasValidos', b."diasValidos",
              'createdAt', b."createdAt",
              'canjeados', b.canjeados,
              'local', json_build_object(
                'nombre', b."localNombre",
                'logoUrl', b."localLogoUrl",
                'rubroNombre', b."localRubroNombre",
                'direccion', b."localDireccion",
                'lat', b."localLat",
                'lng', b."localLng"
              )
            )
            ORDER BY b."localPriorityIndex" ASC, b."priority" ASC, b."createdAt" DESC
          )
          FROM featured_beneficios_cte b
        ),
        '[]'::json
      ) AS beneficios,
      0 AS total
  `;

  return raw;
}

async function _getFilteredLocalesForPublicBenefitsRaw(
  filters: PublicBenefitsFiltersInput = {}
): Promise<PublicBenefitsLocaleRaw[]> {
  const nombreFilter = filters.q
    ? Prisma.sql`AND l.nombre ILIKE ${"%" + filters.q + "%"}`
    : Prisma.empty;

  const rubroId = parseRubroId(filters.rubroId);
  const rubroFilter = rubroId !== undefined
    ? Prisma.sql`AND l."rubroId" = ${rubroId}`
    : Prisma.empty;

  const soloHoyFilter = filters.soloHoy
    ? Prisma.sql`AND (
        array_length(b."diasValidos", 1) IS NULL
        OR array_length(b."diasValidos", 1) = 0
        OR EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos")
      )
      AND (${AVAILABLE_CONDITION})`
    : Prisma.empty;

  const soloDisponiblesFilter = filters.soloDisponibles
    ? Prisma.sql`AND (${AVAILABLE_CONDITION})`
    : Prisma.empty;

  const localFilter = filters.localId
    ? Prisma.sql`AND b."localId" = ${filters.localId}`
    : Prisma.empty;

  const beneficioStatsFilter = filters.localId
    ? Prisma.sql`b."localId" = ${filters.localId}`
    : Prisma.sql`b."esPublico" = true AND b."deletedAt" IS NULL`;

  return prisma.$queryRaw<PublicBenefitsLocaleRaw[]>`
    WITH beneficio_stats_cte AS (
      SELECT
        r."beneficioId",
        COUNT(*) FILTER (WHERE r.estado = 'CANJEADO')::int AS canjeados
      FROM "Reclamo" r
      JOIN "Beneficio" b ON b.id = r."beneficioId"
      WHERE ${beneficioStatsFilter}
      GROUP BY r."beneficioId"
    ),
    filtered_beneficios_cte AS (
      SELECT
        b.id,
        b."localId"
      FROM "Beneficio" b
      JOIN "Local" l ON l.id = b."localId"
      LEFT JOIN beneficio_stats_cte bs ON bs."beneficioId" = b.id
      WHERE b."esPublico" = true
        AND b."deletedAt" IS NULL
        AND l.lat IS NOT NULL
        AND l.lng IS NOT NULL
        AND l."isTest" = false
        AND l."active" = true
        ${nombreFilter}
        ${rubroFilter}
        ${soloHoyFilter}
        ${soloDisponiblesFilter}
        ${localFilter}
    )
    SELECT
      l.id,
      l.nombre,
      l."logoUrl",
      l.lat,
      l.lng,
      ru.nombre AS "rubroNombre",
      COUNT(fb.id)::int AS "beneficiosCount"
    FROM filtered_beneficios_cte fb
    JOIN "Local" l ON l.id = fb."localId"
    LEFT JOIN "Rubro" ru ON ru.id = l."rubroId"
    GROUP BY l.id, l.nombre, l."logoUrl", l.lat, l.lng, ru.nombre
    ORDER BY l.nombre ASC NULLS LAST
  `;
}

export const getFilteredLocalesForPublicBenefitsRaw = (filters: PublicBenefitsFiltersInput = {}) => {
  const rubroId = parseRubroId(filters.rubroId);
  const cacheKey = [
    "public-benefits-locales",
    filters.q ?? "",
    rubroId !== undefined ? String(rubroId) : "",
    filters.localId ?? "",
    filters.soloHoy ? "1" : "0",
    filters.soloDisponibles ? "1" : "0",
  ];

  return unstable_cache(
    async () => _getFilteredLocalesForPublicBenefitsRaw(filters),
    cacheKey,
    { revalidate: 60 }
  )();
};
