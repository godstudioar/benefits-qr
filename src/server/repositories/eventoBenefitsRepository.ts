import { unstable_cache } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { PublicBenefitsCatalogRaw, PublicBenefitsFiltersInput } from "./publicBenefitsRepository";

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

async function _getEventoBenefitsCatalogRaw(
  eventoId: string,
  page: number,
  pageSize: number,
  filters: PublicBenefitsFiltersInput = {},
): Promise<PublicBenefitsCatalogRaw> {
  const offset = Math.max(0, (page - 1) * pageSize);

  const nombreFilter = filters.q
    ? Prisma.sql`AND l.nombre ILIKE ${"%" + filters.q + "%"}`
    : Prisma.empty;

  const rubroId = parseRubroId(filters.rubroId);
  const rubroFilter = rubroId !== undefined
    ? Prisma.sql`AND l."rubroId" = ${rubroId}`
    : Prisma.empty;

  const soloHoyFilter = filters.soloHoy
    ? Prisma.sql`AND (${AVAILABLE_CONDITION})`
    : Prisma.empty;

  const soloDisponiblesFilter = filters.soloDisponibles
    ? Prisma.sql`AND (${AVAILABLE_CONDITION})`
    : Prisma.empty;

  const [raw] = await prisma.$queryRaw<[PublicBenefitsCatalogRaw]>`
    WITH beneficio_stats_cte AS (
      SELECT
        r."beneficioId",
        COUNT(*) FILTER (WHERE r.estado = 'CANJEADO')::int AS canjeados
      FROM "Reclamo" r
      JOIN "Beneficio" b ON b.id = r."beneficioId"
      WHERE b."eventoId" = ${eventoId}
        AND b."deletedAt" IS NULL
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
        CASE
          WHEN NOT (${AVAILABLE_CONDITION}) THEN 1
          ELSE 0
        END AS "sortRank"
      FROM "Beneficio" b
      JOIN "Local" l ON l.id = b."localId"
      LEFT JOIN "Rubro" ru ON ru.id = l."rubroId"
      LEFT JOIN beneficio_stats_cte bs ON bs."beneficioId" = b.id
      WHERE b."eventoId" = ${eventoId}
        AND b."deletedAt" IS NULL
        AND l."isTest" = false
        AND l."active" = true
        ${nombreFilter}
        ${rubroFilter}
        ${soloHoyFilter}
        ${soloDisponiblesFilter}
    ),
    paged_beneficios_cte AS (
      SELECT *
      FROM filtered_beneficios_cte
      ORDER BY "sortRank" ASC, "createdAt" DESC
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
            ORDER BY b."sortRank" ASC, b."createdAt" DESC
          )
          FROM paged_beneficios_cte b
        ),
        '[]'::json
      ) AS beneficios,
      COALESCE((SELECT COUNT(*)::int FROM filtered_beneficios_cte), 0) AS total
  `;

  return raw;
}

export const getEventoBenefitsCatalogRaw = (
  eventoId: string,
  page: number,
  pageSize: number,
  filters: PublicBenefitsFiltersInput = {},
) => {
  const rubroId = parseRubroId(filters.rubroId);
  const cacheKey = [
    "evento-benefits-catalog",
    eventoId,
    String(page),
    String(pageSize),
    filters.q ?? "",
    rubroId !== undefined ? String(rubroId) : "",
    filters.soloHoy ? "1" : "0",
    filters.soloDisponibles ? "1" : "0",
  ];

  return unstable_cache(
    async () => _getEventoBenefitsCatalogRaw(eventoId, page, pageSize, filters),
    cacheKey,
    { revalidate: 60, tags: [`evento-benefits-${eventoId}`] },
  )();
};
