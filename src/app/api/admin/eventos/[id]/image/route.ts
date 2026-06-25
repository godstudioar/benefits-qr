import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSessionFromCookies } from "@/lib/adminAuth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { uploadEventoImageFlow } from "@/server/services/eventosService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSessionFromCookies();
  if (!session) return apiError("No autorizado", 401);

  const { id } = await params;
  const form = await req.formData();
  const file = form.get("image") as File | null;

  const result = await uploadEventoImageFlow(id, file);

  if (!result.ok) {
    return apiError(result.error, result.status, result.code);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return apiSuccess(result.data, result.status);
}
