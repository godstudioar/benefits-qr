import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { BeneficioEffectiveStatus } from "@/lib/couponStatus";

export type DashboardFiltersInput = {
  q?: string;
  status?: BeneficioEffectiveStatus;
  soloHoy?: boolean;
};

export type DashboardRaw = {
  local: {
    id: string;
    nombre: string | null;
    email: string;
    logoUrl: string | null;
    direccion: string | null;
    telefono: string | null;
    rubroNombre: string | null;
  } | null;
  beneficios: Array<{
    id: string;
    descripcion: string;
    fechaExpiracion: string;
    maxUsos: number | null;
    diasValidos: number[];
    deletedAt: string | null;
    totalReclamos: number;
    canjeados: number;
  }> | null;
  totalBeneficios: number;
  reclamoStats: {
    total: number;
    canjeados: number;
  } | null;
  clientesUnicos: number;
  cuponesActivos: number;
  proximosAVencer: number;
};

const BENEFICIO_AVAILABLE_CONDITION = Prisma.sql`
  b."deletedAt" IS NULL
  AND b."fechaExpiracion" >= CURRENT_TIMESTAMP
  AND (b."maxUsos" IS NULL OR COALESCE(bs.canjeados, 0) < b."maxUsos")
`;

const STATUS_CONDITIONS: Record<BeneficioEffectiveStatus, Prisma.Sql> = {
  [BeneficioEffectiveStatus.ACTIVO]: BENEFICIO_AVAILABLE_CONDITION,
  [BeneficioEffectiveStatus.VENCIDO]: Prisma.sql`
    b."deletedAt" IS NULL
    AND b."fechaExpiracion" < CURRENT_TIMESTAMP
  `,
  [BeneficioEffectiveStatus.AGOTADO]: Prisma.sql`
    b."deletedAt" IS NULL
    AND b."fechaExpiracion" >= CURRENT_TIMESTAMP
    AND b."maxUsos" IS NOT NULL
    AND COALESCE(bs.canjeados, 0) >= b."maxUsos"
  `,
  [BeneficioEffectiveStatus.ELIMINADO]: Prisma.sql`b."deletedAt" IS NOT NULL`,
};

function buildDashboardFilters(filters: DashboardFiltersInput): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (filters.q?.trim()) {
    conditions.push(
      Prisma.sql`b.descripcion ILIKE ${"%" + filters.q.trim() + "%"}`
    );
  }

  if (filters.status && STATUS_CONDITIONS[filters.status]) {
    conditions.push(STATUS_CONDITIONS[filters.status]);
  } else {
    conditions.push(Prisma.sql`b."deletedAt" IS NULL`);
  }

  if (filters.soloHoy) {
    conditions.push(BENEFICIO_AVAILABLE_CONDITION);
    conditions.push(
      Prisma.sql`(
        array_length(b."diasValidos", 1) IS NULL
        OR array_length(b."diasValidos", 1) = 0
        OR EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos")
      )`
    );
  }

  if (conditions.length === 0) return Prisma.empty;

  return Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`;
}

export async function getDashboardRaw(
  localId: string,
  page: number,
  pageSize: number,
  filters: DashboardFiltersInput = {}
): Promise<DashboardRaw> {
  const filterSql = buildDashboardFilters(filters);
  const offset = Math.max(0, (page - 1) * pageSize);

  const [raw] = await prisma.$queryRaw<[DashboardRaw]>`
    WITH
      local_cte AS (
        SELECT l.id, l.nombre, l.email, l."logoUrl", l.direccion, l.telefono, ru.nombre AS "rubroNombre"
        FROM "Local" l
        LEFT JOIN "Rubro" ru ON ru.id = l."rubroId"
        WHERE l.id = ${localId}
      ),
      beneficio_stats_all_cte AS (
        SELECT
          r."beneficioId",
          COUNT(*)::int                                          AS "totalReclamos",
          COUNT(*) FILTER (WHERE r.estado = 'CANJEADO')::int    AS canjeados
        FROM "Reclamo" r
        WHERE r."beneficioId" IN (
          SELECT b.id FROM "Beneficio" b WHERE b."localId" = ${localId}
        )
        GROUP BY r."beneficioId"
      ),
      filtered_beneficios_cte AS (
        SELECT
          b.id,
          b.descripcion,
          b."fechaExpiracion",
          b."maxUsos",
          b."diasValidos",
          b."deletedAt",
          b."createdAt",
          COALESCE(bs."totalReclamos", 0) AS "totalReclamos",
          COALESCE(bs.canjeados, 0)        AS canjeados
        FROM "Beneficio" b
        LEFT JOIN beneficio_stats_all_cte bs ON bs."beneficioId" = b.id
        WHERE b."localId" = ${localId}
          ${filterSql}
      ),
      paged_beneficios_cte AS (
        SELECT *
        FROM filtered_beneficios_cte
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize} OFFSET ${offset}
      ),
      total_cte AS (
        SELECT COUNT(*)::int AS count
        FROM filtered_beneficios_cte
      ),
      reclamo_stats_cte AS (
        SELECT
          COUNT(r.id)::int                                          AS total,
          COUNT(r.id) FILTER (WHERE r.estado = 'CANJEADO')::int    AS canjeados
        FROM "Reclamo" r
        JOIN "Beneficio" b ON r."beneficioId" = b.id
        WHERE b."localId" = ${localId}
      ),
      clientes_unicos_cte AS (
        SELECT COUNT(DISTINCT r."clienteId")::int AS count
        FROM "Reclamo" r
        JOIN "Beneficio" b ON r."beneficioId" = b.id
        WHERE b."localId" = ${localId}
      ),
      cupones_activos_cte AS (
        SELECT COUNT(*)::int AS count
        FROM "Beneficio"
        WHERE "localId" = ${localId}
          AND "deletedAt" IS NULL
          AND "fechaExpiracion" > NOW()
      ),
      proximos_vencer_cte AS (
        SELECT COUNT(*)::int AS count
        FROM "Beneficio"
        WHERE "localId" = ${localId}
          AND "deletedAt" IS NULL
          AND "fechaExpiracion" > NOW()
          AND "fechaExpiracion" <= NOW() + INTERVAL '7 days'
      )
    SELECT
      (SELECT row_to_json(l) FROM local_cte l)                                              AS local,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', b.id,
              'descripcion', b.descripcion,
              'fechaExpiracion', b."fechaExpiracion",
              'maxUsos', b."maxUsos",
              'diasValidos', b."diasValidos",
              'deletedAt', b."deletedAt",
              'totalReclamos', b."totalReclamos",
              'canjeados', b.canjeados
            )
            ORDER BY b."createdAt" DESC
          )
          FROM paged_beneficios_cte b
        ),
        '[]'::json
      )                                                                                     AS beneficios,
      (SELECT count FROM total_cte)                                                         AS "totalBeneficios",
      COALESCE(
        (SELECT row_to_json(rs) FROM reclamo_stats_cte rs),
        '{"total":0,"canjeados":0}'::json
      )                                                                                     AS "reclamoStats",
      (SELECT count FROM clientes_unicos_cte)                                               AS "clientesUnicos",
      (SELECT count FROM cupones_activos_cte)                                               AS "cuponesActivos",
      (SELECT count FROM proximos_vencer_cte)                                               AS "proximosAVencer"
  `;

  return raw;
}
