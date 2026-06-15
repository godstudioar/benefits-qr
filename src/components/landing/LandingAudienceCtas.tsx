import { ArrowRight, Building2, Check, Gift } from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
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
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
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
    icon: <Gift className="h-5 w-5" aria-hidden="true" />,
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
      className="scroll-mt-24 border-y border-border-default/60 bg-surface-soft px-6 py-12 lg:px-8 lg:py-14 2xl:py-16"
    >
      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
        <Reveal y={16} amount={0.2}>
          <SectionHeader
            eyebrow="Empezá según tu perfil"
            title="Una entrada clara para cada lado de la experiencia"
            description="Negocios gestionan beneficios y clientes acceden a sus cupones sin vueltas."
            align="left"
            className="max-w-2xl lg:mb-8 [&>h2]:text-2xl [&>p]:max-w-xl"
          />
        </Reveal>

        <Reveal delay={0.04} y={18} amount={0.2}>
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5 2xl:gap-6">
            {AUDIENCE_CTAS.map((cta) => (
              <div
                key={cta.title}
                className={`group rounded-3xl border p-6 text-left transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 lg:p-6 2xl:p-7 ${cta.className}`}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${cta.iconClassName}`}>
                  {cta.icon}
                </div>
                <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${cta.eyebrowClassName}`}>
                  {cta.eyebrow}
                </p>
                <h2 className={`mb-2 text-lg font-semibold ${cta.titleClassName}`}>
                  {cta.title}
                </h2>
                <p className={`mb-5 max-w-md text-sm leading-relaxed ${cta.descriptionClassName}`}>
                  {cta.description}
                </p>
                <ul className={`mb-5 space-y-2 text-sm ${cta.bulletClassName}`}>
                  {cta.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <LinkButton href={cta.href} variant={cta.buttonVariant}>
                  {cta.action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </LinkButton>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
