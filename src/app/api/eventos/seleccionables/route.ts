import { apiSuccess } from "@/lib/apiResponse";
import { listEventosSeleccionables } from "@/server/services/eventosService";

export async function GET() {
  const eventos = await listEventosSeleccionables();
  return apiSuccess(eventos);
}
