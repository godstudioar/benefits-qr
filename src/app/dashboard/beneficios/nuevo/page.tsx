import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import NuevoBeneficioForm from "@/components/local/dashboard/beneficios/NuevoBeneficioForm";
import { SHADOW } from "@/lib/shadowStyles";

export default function NuevoBeneficioPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-8 sm:px-6 sm:pt-8 lg:max-w-4xl lg:pt-7 2xl:max-w-5xl 2xl:pt-8">
      <SectionHeader
        eyebrow="Nuevo cupón"
        title="Creá un beneficio"
        description="Definí la vigencia y las condiciones del cupón para publicarlo."
        align="left"
        className="mb-5 sm:mb-6 lg:mb-5 2xl:mb-6"
      />

      <Card className={`mx-auto w-full max-w-2xl border-surface/80 bg-surface/95 p-5 ${SHADOW.accentBase} sm:bg-surface/85 sm:p-6 lg:max-w-2xl lg:p-5 2xl:max-w-2xl 2xl:p-6`}>
        <NuevoBeneficioForm />
      </Card>
    </main>
  );
}
