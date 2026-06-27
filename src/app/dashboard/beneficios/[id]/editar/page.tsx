import BeneficioForm from "@/components/local/dashboard/beneficios/BeneficioForm";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";
import SectionHeader from "@/components/ui/SectionHeader";
import { getSessionFromCookies } from "@/lib/auth";
import { UserType } from "@/lib/enums";
import { getBeneficioEditPageData } from "@/server/services/beneficiosApiService";
import { SHADOW } from "@/lib/shadowStyles";
import { redirect } from "next/navigation";

export default async function EditarBeneficioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSessionFromCookies()]);

  if (!session || session.userType !== UserType.LOCAL) {
    redirect("/login");
  }

  const beneficio = await getBeneficioEditPageData(id, session.userId);

  if (!beneficio) {
    redirect("/dashboard");
  }
  return (
    <main className="mx-auto w-full max-w-3xl">
      <div className="mb-3 flex justify-start sm:mb-4">
        <LinkButton href="/dashboard" variant="subtle" size="sm">
          ← Volver
        </LinkButton>
      </div>

      <SectionHeader
        eyebrow="Editar cupón"
        title="Actualizá el beneficio"
        description="Cambiá la descripción, la vigencia y la visibilidad sin perder el historial del cupón."
        align="left"
        titleAs="h1"
      />

      <Card className={`w-full border-surface/80 bg-surface/95 p-5 ${SHADOW.accentBase} sm:bg-surface/85 sm:p-6`}>
        <BeneficioForm
          mode="edit"
          initialData={beneficio.initialData}
          summaryBadges={[
            { label: `Canjeados: ${beneficio.constraints.canjeados}`, variant: "light" },
            { label: `Activos: ${beneficio.constraints.activeReclamos}`, variant: "muted" },
            {
              label: beneficio.constraints.isUnlimited
                ? "Máximo actual: sin límite"
                : `Máximo actual: ${beneficio.constraints.maxUsos}`,
              variant: "secondary",
            },
          ]}
          submitConfig={{
            endpoint: `/api/beneficios/${beneficio.id}`,
            method: "PATCH",
            submitLabel: "Guardar cambios",
            cancelHref: `/dashboard/beneficios/${beneficio.id}`,
            successRedirect: `/dashboard/beneficios/${beneficio.id}`,
          }}
        />
      </Card>
    </main>
  );
}
