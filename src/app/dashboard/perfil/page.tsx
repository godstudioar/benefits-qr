import { redirect } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import { getSessionFromCookies } from "@/lib/auth";
import { UserType } from "@/lib/enums";
import { getLocalLogoDisplayUrl } from "@/lib/localLogoSource";
import { findLocalById } from "@/server/repositories/localApiRepository";

import EditPerfilForm from "@/components/local/dashboard/perfil/EditPerfilForm";

export default async function EditPerfilPage() {
  const session = await getSessionFromCookies();
  if (!session || session.userType !== UserType.LOCAL) {
    redirect("/login");
  }
  const local = await findLocalById(session.userId);
  if (!local) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-3xl">
      <Reveal y={10} amount={0.2} className="mb-6 sm:mb-8">
        <SectionHeader
          eyebrow="Negocio"
          title="Datos del negocio"
          description="Actualizá los datos públicos de tu negocio"
          align="left"
          titleAs="h1"
          className="!mb-0"
        />
      </Reveal>

      <Reveal delay={0.04} y={12} amount={0.2}>
        <div className="mx-auto w-full max-w-md">
          <EditPerfilForm
            email={local.email}
            nombre={local.nombre ?? ""}
            logoUrl={getLocalLogoDisplayUrl({ localId: local.id, logoUrl: local.logoUrl })}
            direccion={local.direccion}
            telefono={local.telefono}
            rubroId={local.rubro?.id ?? null}
            lat={local.lat ?? null}
            lng={local.lng ?? null}
            placeId={local.placeId ?? null}
          />
        </div>
      </Reveal>
    </main>
  );
}
