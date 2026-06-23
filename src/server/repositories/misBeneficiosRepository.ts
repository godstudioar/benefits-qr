import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { EstadoReclamo } from "@/lib/enums";
import { ReclamoEffectiveStatus } from "@/lib/couponStatus";

export type MisBeneficiosFiltersInput = {
  q?: string;
  status?: ReclamoEffectiveStatus;
  soloHoy?: boolean;
  rubro?: string;
};

export type RubroOption = {
  id: number;
  nombre: string;
};

export type ReclamoRow = {
  id: string;
  estado: EstadoReclamo;
  fechaReclamo: Date;
  fechaCanje: Date | null;
  beneficioDescripcion: string;
  beneficioFechaExpiracion: Date;
  beneficioDeletedAt: Date | null;
  beneficioDiasValidos: number[];
  beneficioVentanasHorarias: Prisma.JsonValue | null;
  beneficioMaxUsos: number | null;
  beneficioCanjeados: number;
  localNombre: string | null;
  localId: string;
  localLogoV: string;
  localRubroNombre: string | null;
  localDireccion: string | null;
  totalCount: number;
};

export type ReclamoStatusRow = Omit<ReclamoRow, "totalCount">;

function parseRubroId(value: string | undefined): number | undefined {
  if (!value) return undefined;

  if (!/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

const RECLAMO_REDEEMABLE_TODAY_CONDITION = Prisma.sql`
  r.estado = 'PENDIENTE'
  AND b."deletedAt" IS NULL
  AND b."fechaExpiracion" >= CURRENT_TIMESTAMP
  AND (b."maxUsos" IS NULL OR COALESCE(rs."beneficioCanjeados", 0) < b."maxUsos")
  AND (
    array_length(b."diasValidos", 1) IS NULL
    OR array_length(b."diasValidos", 1) = 0
    OR EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos")
  )
`;

const STATUS_CONDITIONS: Record<ReclamoEffectiveStatus, Prisma.Sql> = {
  [ReclamoEffectiveStatus.CANJEADO]: Prisma.sql`r.estado = 'CANJEADO'`,
  [ReclamoEffectiveStatus.CANCELADO]: Prisma.sql`(
    r.estado = 'CANCELADO'
    OR b."deletedAt" IS NOT NULL
  )`,
  [ReclamoEffectiveStatus.VENCIDO]: Prisma.sql`
    r.estado = 'PENDIENTE'
    AND b."deletedAt" IS NULL
    AND b."fechaExpiracion" < CURRENT_TIMESTAMP
  `,
  [ReclamoEffectiveStatus.PENDIENTE]: Prisma.sql`
    r.estado = 'PENDIENTE'
    AND b."deletedAt" IS NULL
    AND b."fechaExpiracion" >= CURRENT_TIMESTAMP
    AND (b."maxUsos" IS NULL OR COALESCE(rs."beneficioCanjeados", 0) < b."maxUsos")
  `,
  [ReclamoEffectiveStatus.AGOTADO]: Prisma.sql`
    r.estado = 'PENDIENTE'
    AND b."deletedAt" IS NULL
    AND b."fechaExpiracion" >= CURRENT_TIMESTAMP
    AND b."maxUsos" IS NOT NULL
    AND COALESCE(rs."beneficioCanjeados", 0) >= b."maxUsos"
  `,
};

function buildMisBeneficiosFilters(filters: MisBeneficiosFiltersInput): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (filters.q?.trim()) {
    const q = "%" + filters.q.trim() + "%";
    conditions.push(
      Prisma.sql`(b.descripcion ILIKE ${q} OR l.nombre ILIKE ${q})`
    );
  }

  if (filters.status && STATUS_CONDITIONS[filters.status]) {
    conditions.push(STATUS_CONDITIONS[filters.status]);
  }

  const rubroId = parseRubroId(filters.rubro);
  if (rubroId !== undefined) {
    conditions.push(Prisma.sql`l."rubroId" = ${rubroId}`);
  }

  if (filters.soloHoy) {
    conditions.push(RECLAMO_REDEEMABLE_TODAY_CONDITION);
  }

  if (conditions.length === 0) return Prisma.empty;

  return Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`;
}

export async function getMisBeneficiosRows(
  clienteId: string,
  page: number,
  pageSize: number,
  filters: MisBeneficiosFiltersInput = {}
): Promise<ReclamoRow[]> {
  const filterSql = buildMisBeneficiosFilters(filters);
  const offset = Math.max(0, (page - 1) * pageSize);

  return prisma.$queryRaw<ReclamoRow[]>`
    WITH reclamo_stats_cte AS (
      SELECT
        r.id AS "reclamoId",
        (
          SELECT COUNT(*)::int
          FROM "Reclamo" rc
          WHERE rc."beneficioId" = b.id
            AND rc.estado = 'CANJEADO'
        ) AS "beneficioCanjeados"
      FROM "Reclamo" r
      JOIN "Beneficio" b ON b.id = r."beneficioId"
      WHERE r."clienteId" = ${clienteId}
    )
    SELECT
      r.id,
      r.estado,
      r."fechaReclamo",
      r."fechaCanje",
      b.descripcion           AS "beneficioDescripcion",
      b."fechaExpiracion"     AS "beneficioFechaExpiracion",
      b."deletedAt"           AS "beneficioDeletedAt",
      b."diasValidos"         AS "beneficioDiasValidos",
      b."ventanasHorarias"    AS "beneficioVentanasHorarias",
      b."maxUsos"             AS "beneficioMaxUsos",
      rs."beneficioCanjeados",
      l.nombre                AS "localNombre",
      l.id                    AS "localId",
      LEFT(MD5(COALESCE(l."logoUrl", '')), 8) AS "localLogoV",
      ru.nombre               AS "localRubroNombre",
      l.direccion             AS "localDireccion",
      COUNT(*) OVER ()::int   AS "totalCount"
    FROM "Reclamo" r
    JOIN "Beneficio" b ON b.id = r."beneficioId"
    JOIN "Local"     l ON l.id = b."localId"
    LEFT JOIN "Rubro" ru ON ru.id = l."rubroId"
    JOIN reclamo_stats_cte rs ON rs."reclamoId" = r.id
    WHERE r."clienteId" = ${clienteId}
      ${filterSql}
    ORDER BY r."fechaReclamo" DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;
}

export async function getMisBeneficiosRubros(
  clienteId: string
): Promise<RubroOption[]> {
  return prisma.$queryRaw<RubroOption[]>`
    SELECT DISTINCT ru.id, ru.nombre
    FROM "Reclamo" r
    JOIN "Beneficio" b ON b.id = r."beneficioId"
    JOIN "Local" l ON l.id = b."localId"
    JOIN "Rubro" ru ON ru.id = l."rubroId"
    WHERE r."clienteId" = ${clienteId}
    ORDER BY ru.nombre ASC
  `;
}

export async function getMisBeneficioRow(
  clienteId: string,
  reclamoId: string
): Promise<ReclamoStatusRow | null> {
  const [row] = await prisma.$queryRaw<ReclamoStatusRow[]>`
    SELECT
      r.id,
      r.estado,
      r."fechaReclamo",
      r."fechaCanje",
      b.descripcion           AS "beneficioDescripcion",
      b."fechaExpiracion"     AS "beneficioFechaExpiracion",
      b."deletedAt"           AS "beneficioDeletedAt",
      b."diasValidos"         AS "beneficioDiasValidos",
      b."ventanasHorarias"    AS "beneficioVentanasHorarias",
      b."maxUsos"             AS "beneficioMaxUsos",
      (
        SELECT COUNT(*)::int
        FROM "Reclamo" rc
        WHERE rc."beneficioId" = b.id
          AND rc.estado = 'CANJEADO'
      )                       AS "beneficioCanjeados",
      l.nombre                AS "localNombre",
      l.id                    AS "localId",
      LEFT(MD5(COALESCE(l."logoUrl", '')), 8) AS "localLogoV",
      ru.nombre               AS "localRubroNombre",
      l.direccion             AS "localDireccion"
    FROM "Reclamo" r
    JOIN "Beneficio" b ON b.id = r."beneficioId"
    JOIN "Local"     l ON l.id = b."localId"
    LEFT JOIN "Rubro" ru ON ru.id = l."rubroId"
    WHERE r."clienteId" = ${clienteId}
      AND r.id = ${reclamoId}
    LIMIT 1
  `;

  return row ?? null;
}
