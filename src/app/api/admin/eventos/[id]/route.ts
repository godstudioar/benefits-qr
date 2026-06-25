import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSessionFromCookies } from "@/lib/adminAuth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { updateEventoFlow } from "@/server/services/eventosService";

async function requireAdmin() {
  const session = await getAdminSessionFromCookies();
  if (!session) return apiError("No autorizado", 401);
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const err = await requireAdmin();
  if (err) return err;

  const { id } = await params;
  const body = await req.json();
  const result = await updateEventoFlow(id, body);

  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return apiSuccess(result.data, result.status);
}
