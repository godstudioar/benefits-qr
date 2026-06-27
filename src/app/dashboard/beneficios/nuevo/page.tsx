import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import NuevoBeneficioForm from "@/components/local/dashboard/beneficios/NuevoBeneficioForm";
import { SHADOW } from "@/lib/shadowStyles";

export default function NuevoBeneficioPage() {
  return (
    <main className="mx-auto w-full max-w-3xl">
      <SectionHeader
        eyebrow="Nuevo cupón"
        title="Creá un beneficio"
        description="Definí la vigencia y las condiciones del cupón para publicarlo."
        align="left"
        titleAs="h1"
      />

      <Card className={`w-full border-surface/80 bg-surface/95 p-5 ${SHADOW.accentBase} sm:bg-surface/85 sm:p-6`}>
        <NuevoBeneficioForm />
      </Card>
    </main>
  );
}
