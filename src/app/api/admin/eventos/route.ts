import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSessionFromCookies } from "@/lib/adminAuth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import {
  createEventoFlow,
  listAllEventos,
} from "@/server/services/eventosService";

async function requireAdmin() {
  const session = await getAdminSessionFromCookies();
  if (!session) return apiError("No autorizado", 401);
  return null;
}

export async function GET() {
  const err = await requireAdmin();
  if (err) return err;

  const eventos = await listAllEventos();
  return apiSuccess(eventos);
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;

  const body = await req.json();
  const result = await createEventoFlow(body);

  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return apiSuccess(result.data, result.status);
}
