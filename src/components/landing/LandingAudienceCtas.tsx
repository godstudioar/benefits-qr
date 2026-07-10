import { ArrowRight, Building2, Gift } from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
import Reveal from "@/components/ui/Reveal";
import { SHADOW } from "@/lib/shadowStyles";

const AUDIENCE_CTAS = [
  {
    title: "Para locales",
    description:
      "Creá cupónes, publicá beneficios y escaneálos desde un solo lugar.",
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
    buttonVariant: "primary" as const,
  },
  {
    title: "Para clientes",
    description:
      "Accedé a todos tus cupones desde tu mail, guardalos y mostrá el QR cuando llegás al local.",
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
                className={`group flex flex-col items-center rounded-2xl border p-5 text-center transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 lg:p-6 ${cta.className}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cta.iconClassName}`}>
                  {cta.icon}
                </div>
                <h2 className={`mt-3 text-sm font-semibold ${cta.titleClassName}`}>
                  {cta.title}
                </h2>
                <p className={`mt-1 max-w-xs text-xs leading-relaxed ${cta.descriptionClassName}`}>
                  {cta.description}
                </p>
                <LinkButton href={cta.href} variant={cta.buttonVariant} size="sm" className="mt-4 w-full sm:w-auto">
                  {cta.action}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </LinkButton>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
