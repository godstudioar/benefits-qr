import { ArrowRight, Building2, Gift } from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
import Reveal from "@/components/ui/Reveal";
import { SHADOW } from "@/lib/shadowStyles";

const AUDIENCE_CTAS = [
  {
    eyebrow: "Entrada dedicada",
    title: "Para locales",
    description:
      "Creá cupónes, publicá beneficios y escaneálos desde un solo lugar.",
    bullets: ["Rápido y simple", "Control de usos", "Canje inmediato"],
    href: "/login",
    action: "Ingresar como negocio",
    icon: <Building2 className="h-4 w-4" aria-hidden="true" />,
    className:
      "border-surface/80 bg-surface/90 lg:bg-surface/75 sm:backdrop-blur-md " +
      SHADOW.heroBase +
      " " +
      SHADOW.heroHover,
    iconClassName: "bg-primary-soft text-primary",
    titleClassName: "text-text-primary",
    descriptionClassName: "text-text-muted",
    eyebrowClassName: "text-primary",
    bulletClassName: "text-text-muted",
    buttonVariant: "primary" as const,
  },
  {
    eyebrow: "Entrada dedicada",
    title: "Para clientes",
    description:
      "Accedé a todos tus cupones desde tu mail, guardalos y mostrá el QR cuando llegás al local.",
    bullets: ["Sin contraseña", "Sin app extra", "Todo en un lugar"],
    href: "/acceso",
    action: "Ingresar como cliente",
    icon: <Gift className="h-4 w-4" aria-hidden="true" />,
    className:
      "border-primary-foreground/20 bg-primary hover:bg-accent " +
      SHADOW.heroBase +
      " " +
      SHADOW.heroHover,
    iconClassName: "bg-surface/20 text-primary-foreground",
    titleClassName: "text-primary-foreground",
    descriptionClassName: "text-primary-foreground/80",
    eyebrowClassName: "text-primary-foreground/72",
    bulletClassName: "text-primary-foreground/82",
    buttonVariant: "subtle" as const,
  },
];

export default function LandingAudienceCtas() {
  return (
    <section
      id="perfil"
      tabIndex={-1}
      className="scroll-mt-24 border-y border-border-default/60 bg-surface-soft px-6 py-8 lg:px-8 lg:py-10"
    >
      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
        <Reveal delay={0.04} y={18} amount={0.2}>
          <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
            {AUDIENCE_CTAS.map((cta) => (
              <div
                key={cta.title}
                className={`group rounded-2xl border p-4 text-left transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 lg:p-5 ${cta.className}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cta.iconClassName}`}>
                      {cta.icon}
                    </div>
                    <h2 className={`truncate text-sm font-semibold ${cta.titleClassName}`}>
                      {cta.title}
                    </h2>
                  </div>
                  <p className={`text-xs leading-relaxed sm:hidden ${cta.descriptionClassName}`}>
                    {cta.description}
                  </p>
                  <div className="flex items-center gap-3 sm:contents">
                    <p className={`hidden min-w-0 flex-1 text-xs leading-relaxed sm:block ${cta.descriptionClassName}`}>
                      {cta.description}
                    </p>
                    <LinkButton href={cta.href} variant={cta.buttonVariant} size="sm" className="w-full sm:w-auto">
                      {cta.action}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </LinkButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
