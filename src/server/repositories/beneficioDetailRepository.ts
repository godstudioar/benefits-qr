import { MedioPago, EstadoReclamo } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type BeneficioDetailRaw = {
  beneficio: {
    id: string;
    descripcion: string;
    fechaExpiracion: string;
    maxUsos: number | null;
    diasValidos: number[];
    deletedAt: string | null;
    localId: string;
    esPublico: boolean;
    mediosPago: MedioPago[];
    esAcumulable: boolean;
    condicionesExtra: string | null;
  } | null;
  stats: {
    total: number;
    canjeados: number;
    pendientes: number;
  } | null;
  reclamos: Array<{
    id: string;
    estado: EstadoReclamo;
    fechaReclamo: string;
    fechaCanje: string | null;
    cliente: {
      nombre: string | null;
      email: string | null;
    };
  }> | null;
};

export async function getBeneficioDetailRaw(
  beneficioId: string,
  localId: string,
  page: number,
  pageSize: number
): Promise<BeneficioDetailRaw> {
  const [raw] = await prisma.$queryRaw<[BeneficioDetailRaw]>`
    WITH
      beneficio_cte AS (
        SELECT id, descripcion, "fechaExpiracion", "maxUsos", "diasValidos", "deletedAt", "localId", "esPublico", "mediosPago", "esAcumulable", "condicionesExtra"
        FROM "Beneficio"
        WHERE id = ${beneficioId}
          AND "localId" = ${localId}
      ),
      stats_cte AS (
        SELECT
          COUNT(*)::int                                        AS total,
          COUNT(*) FILTER (WHERE estado = 'CANJEADO')::int    AS canjeados,
          COUNT(*) FILTER (WHERE estado = 'PENDIENTE')::int   AS pendientes
        FROM "Reclamo"
        WHERE "beneficioId" = ${beneficioId}
      ),
      reclamos_cte AS (
        SELECT
          r.id,
          r.estado,
          r."fechaReclamo",
          r."fechaCanje",
          json_build_object(
            'nombre', c.nombre,
            'email',  c.email
          ) AS cliente
        FROM "Reclamo" r
        JOIN "Cliente" c ON c.id = r."clienteId"
        WHERE r."beneficioId" = ${beneficioId}
        ORDER BY r."fechaReclamo" DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      )
    SELECT
      (SELECT row_to_json(b) FROM beneficio_cte b)                  AS beneficio,
      COALESCE(
        (SELECT row_to_json(s) FROM stats_cte s),
        '{"total":0,"canjeados":0,"pendientes":0}'::json
      )                                                              AS stats,
      COALESCE(
        (SELECT json_agg(r ORDER BY r."fechaReclamo" DESC) FROM reclamos_cte r),
        '[]'::json
      )                                                              AS reclamos
  `;

  return raw;
}
