import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireLocalAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import {
  deleteBeneficioFlow,
  getBeneficioById,
  updateBeneficioFlow,
} from "@/server/services/beneficiosApiService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await getBeneficioById(id);
  if (!result.ok) {
    return apiError(result.error, result.status, result.code);
  }

  return apiSuccess(result.data as Record<string, unknown>, result.status);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireLocalAuth(req);
  if (error) return error;

  const { id } = await params;

  const result = await deleteBeneficioFlow(id, session!.userId);
  if (!result.ok) {
    return apiError(result.error, result.status, result.code);
  }

  revalidatePath("/dashboard");
  revalidatePath("/beneficios");
  revalidatePath("/");
  if (result.eventoId) {
    revalidatePath("/eventos", "layout");
  }
  return apiSuccess({ success: true }, result.status);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireLocalAuth(req);
  if (error) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "No autorizado" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "No pudimos leer los datos del cupón." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateBeneficioFlow(session!.userId, id, (body ?? {}) as Record<string, unknown>);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.code,
        message: result.message ?? result.error,
        ...(result.field ? { field: result.field } : {}),
      },
      { status: result.status },
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/beneficios/${id}`);
  revalidatePath(`/dashboard/beneficios/${id}/editar`);
  revalidatePath(`/beneficio/${id}`);
  revalidatePath("/beneficios");
  revalidatePath("/");

  return apiSuccess(result.data as Record<string, unknown>, result.status);
}
