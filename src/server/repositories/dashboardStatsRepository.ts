import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type TrendDay = {
  date: string;
  reclamos: number;
  canjes: number;
};

export type TopCuponRaw = {
  id: string;
  descripcion: string;
  fechaExpiracion: string;
  maxUsos: number | null;
  deletedAt: string | null;
  diasValidos: number[];
  ventanasHorarias: Prisma.JsonValue | null;
  totalReclamos: number;
  canjeados: number;
  tasa: number;
};

export type TopClienteRaw = {
  id: string;
  nombre: string | null;
  email: string | null;
  canjeados: number;
};

export type DashboardStatsRaw = {
  trend: TrendDay[] | null;
  recurrence: {
    nuevos: number;
    recurrentes: number;
  } | null;
  topCupones: TopCuponRaw[] | null;
  topClientes: TopClienteRaw[] | null;
  avgRedeemTimeSeconds: number | null;
  statusDistribution: {
    activos: number;
    vencidos: number;
    agotados: number;
    eliminados: number;
  } | null;
};

export async function getDashboardStatsRaw(localId: string): Promise<DashboardStatsRaw> {
  const [raw] = await prisma.$queryRaw<[DashboardStatsRaw]>`
    WITH
      local_beneficios AS (
        SELECT id, descripcion, "fechaExpiracion", "maxUsos", "deletedAt", "diasValidos", "ventanasHorarias"
        FROM "Beneficio"
        WHERE "localId" = ${localId}
      ),
      local_reclamos AS (
        SELECT r.id, r."beneficioId", r."clienteId", r.estado, r."fechaReclamo", r."fechaCanje"
        FROM "Reclamo" r
        JOIN local_beneficios b ON b.id = r."beneficioId"
      ),
      beneficio_reclamos AS (
        SELECT
          b.id AS "beneficioId",
          COUNT(r.id)::int AS "totalReclamos",
          COUNT(r.id) FILTER (WHERE r.estado = 'CANJEADO')::int AS canjeados
        FROM local_beneficios b
        LEFT JOIN local_reclamos r ON r."beneficioId" = b.id
        GROUP BY b.id
      ),
      trend_cte AS (
        SELECT
          d::date AS date,
          COALESCE(COUNT(r.id) FILTER (WHERE r."fechaReclamo"::date = d::date), 0)::int AS reclamos,
          COALESCE(COUNT(r.id) FILTER (WHERE r."fechaCanje"::date = d::date), 0)::int AS canjes
        FROM generate_series(
          (NOW() - INTERVAL '29 days')::date,
          NOW()::date,
          '1 day'
        ) AS d
        LEFT JOIN local_reclamos r
          ON r."fechaReclamo"::date = d::date
          OR r."fechaCanje"::date = d::date
        GROUP BY d::date
        ORDER BY d::date
      ),
      cliente_first_reclamo AS (
        SELECT "clienteId", MIN("fechaReclamo") AS first_reclamo
        FROM local_reclamos
        GROUP BY "clienteId"
      ),
      recent_clientes AS (
        SELECT DISTINCT r."clienteId", cf.first_reclamo
        FROM local_reclamos r
        JOIN cliente_first_reclamo cf ON cf."clienteId" = r."clienteId"
        WHERE r."fechaReclamo" >= NOW() - INTERVAL '30 days'
      ),
      recurrence_cte AS (
        SELECT
          COUNT(*) FILTER (WHERE first_reclamo >= NOW() - INTERVAL '30 days')::int AS nuevos,
          COUNT(*) FILTER (WHERE first_reclamo < NOW() - INTERVAL '30 days')::int AS recurrentes
        FROM recent_clientes
      ),
      top_cupones_cte AS (
        SELECT
          b.id,
          b.descripcion,
          b."fechaExpiracion",
          b."maxUsos",
          b."deletedAt",
          b."diasValidos",
          b."ventanasHorarias",
          br."totalReclamos",
          br.canjeados,
          CASE
            WHEN br."totalReclamos" > 0
            THEN ROUND((br.canjeados::numeric / br."totalReclamos"::numeric) * 100)::int
            ELSE 0
          END AS tasa
        FROM local_beneficios b
        JOIN beneficio_reclamos br ON br."beneficioId" = b.id
        WHERE b."deletedAt" IS NULL
          AND br."totalReclamos" > 0
        ORDER BY tasa DESC, br.canjeados DESC
        LIMIT 3
      ),
      top_clientes_cte AS (
        SELECT
          c.id,
          c.nombre,
          c.email,
          COUNT(r.id)::int AS canjeados
        FROM local_reclamos r
        JOIN "Cliente" c ON c.id = r."clienteId"
        WHERE r.estado = 'CANJEADO'
        GROUP BY c.id, c.nombre, c.email
        ORDER BY canjeados DESC
        LIMIT 3
      ),
      avg_redeem_cte AS (
        SELECT AVG(EXTRACT(EPOCH FROM ("fechaCanje" - "fechaReclamo")))::double precision AS avg_seconds
        FROM local_reclamos
        WHERE estado = 'CANJEADO' AND "fechaCanje" IS NOT NULL
      ),
      status_dist_cte AS (
        SELECT
          COUNT(*) FILTER (WHERE b."deletedAt" IS NOT NULL)::int AS eliminados,
          COUNT(*) FILTER (
            WHERE b."deletedAt" IS NULL
              AND b."fechaExpiracion" <= NOW()
          )::int AS vencidos,
          COUNT(*) FILTER (
            WHERE b."deletedAt" IS NULL
              AND b."fechaExpiracion" > NOW()
              AND b."maxUsos" IS NOT NULL
              AND COALESCE(br.canjeados, 0) >= b."maxUsos"
          )::int AS agotados,
          COUNT(*) FILTER (
            WHERE b."deletedAt" IS NULL
              AND b."fechaExpiracion" > NOW()
              AND (
                b."maxUsos" IS NULL
                OR COALESCE(br.canjeados, 0) < b."maxUsos"
              )
          )::int AS activos
        FROM local_beneficios b
        LEFT JOIN beneficio_reclamos br ON br."beneficioId" = b.id
      )
    SELECT
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'date', t.date,
              'reclamos', t.reclamos,
              'canjes', t.canjes
            )
            ORDER BY t.date
          )
          FROM trend_cte t
        ),
        '[]'::json
      ) AS trend,
      COALESCE(
        (SELECT row_to_json(rc) FROM recurrence_cte rc),
        '{"nuevos":0,"recurrentes":0}'::json
      ) AS recurrence,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', tc.id,
              'descripcion', tc.descripcion,
              'fechaExpiracion', tc."fechaExpiracion",
              'maxUsos', tc."maxUsos",
              'deletedAt', tc."deletedAt",
              'diasValidos', tc."diasValidos",
              'ventanasHorarias', tc."ventanasHorarias",
              'totalReclamos', tc."totalReclamos",
              'canjeados', tc.canjeados,
              'tasa', tc.tasa
            )
            ORDER BY tc.tasa DESC, tc.canjeados DESC
          )
          FROM top_cupones_cte tc
        ),
        '[]'::json
      ) AS "topCupones",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', tcl.id,
              'nombre', tcl.nombre,
              'email', tcl.email,
              'canjeados', tcl.canjeados
            )
            ORDER BY tcl.canjeados DESC
          )
          FROM top_clientes_cte tcl
        ),
        '[]'::json
      ) AS "topClientes",
      (SELECT avg_seconds FROM avg_redeem_cte) AS "avgRedeemTimeSeconds",
      COALESCE(
        (
          SELECT json_build_object(
            'activos', sd.activos,
            'vencidos', sd.vencidos,
            'agotados', sd.agotados,
            'eliminados', sd.eliminados
          )
          FROM status_dist_cte sd
        ),
        '{"activos":0,"vencidos":0,"agotados":0,"eliminados":0}'::json
      ) AS "statusDistribution"
  `;

  return raw;
}
