import Badge from "@/components/ui/Badge";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import LinkButton from "@/components/ui/LinkButton";
import { SHADOW } from "@/lib/shadowStyles";
import { ArrowRight, Check } from "lucide-react";

const FEATURES = [
  "Cupones ilimitados desde el primer día",
  "Sin comisiones por canje",
  "Soporte por WhatsApp y mail",
  "Estadísticas de uso en tiempo real",
  "Acceso desde cualquier dispositivo",
  "Sin permanencia — cancelás cuando querés",
];

export default function Pricing() {
  return (
    <section className="bg-surface-muted px-6 py-20 lg:px-8 lg:py-16 2xl:py-20">
      <div className="max-w-3xl mx-auto">
        <Reveal y={20} amount={0.35}>
          <SectionHeader
            eyebrow="Precios"
            title="Empezá gratis, crecé sin límites"
            description="El primer mes lo cubrimos nosotros. Probá todas las funciones sin tarjeta ni compromiso."
            className="lg:mb-10 2xl:mb-12 [&>span]:lg:mb-2 [&>span]:lg:text-xs [&>h2]:lg:text-3xl [&>p]:lg:text-sm"
          />
        </Reveal>

        {/* Pricing card */}
        <Reveal delay={0.06} y={20} amount={0.25}>
          <div className={`bg-surface overflow-hidden rounded-3xl border border-border-default/70 ${SHADOW.heroBase} transition-[box-shadow] duration-200 ${SHADOW.heroHover}`}>
            {/* Top banner */}
              <div className="bg-primary flex flex-col gap-3 px-8 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7 lg:py-4 2xl:px-8 2xl:py-5">
                <div>
                  <p className="text-text-soft text-sm font-medium lg:text-xs 2xl:text-sm">Primer mes</p>
                  <p className="text-primary-foreground text-2xl font-black tracking-tight lg:text-3xl 2xl:text-2xl">Totalmente gratis</p>
                </div>
                <Badge
                  className="self-start gap-1.5 border border-surface/30 bg-surface/20 px-3.5 py-1.5 font-semibold text-primary-foreground lg:self-auto lg:px-3 lg:py-1 lg:text-xs 2xl:px-3.5 2xl:py-1.5 2xl:text-xs"
                >
                <span className="w-1.5 h-1.5 rounded-full bg-success-border shrink-0" />
                Sin tarjeta requerida
              </Badge>
            </div>

            {/* Body */}
              <div className="px-8 py-8 lg:flex lg:gap-8 lg:px-7 lg:py-7 2xl:gap-10 2xl:px-8 2xl:py-8">
              {/* Price */}
              <div className="mb-8 shrink-0 lg:mb-0 lg:w-44 2xl:w-48">
                <p className="mb-2 text-xs font-semibold tracking-widest text-text-muted/80 uppercase lg:text-xs 2xl:text-xs">Luego del primer mes</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-text-primary lg:text-4xl 2xl:text-4xl">$12.000</span>
                  <span className="text-sm text-text-muted/80 lg:text-xs 2xl:text-sm">/mes</span>
                </div>
                <p className="mt-1 mb-6 text-xs text-text-muted/80 lg:mb-5 lg:text-xs 2xl:mb-6 2xl:text-xs">ARS · IVA incluido</p>

                <LinkButton
                  href="/login"
                  size="lg"
                  className="w-full font-semibold lg:min-h-11 lg:px-4 lg:text-sm 2xl:min-h-12 2xl:px-5"
                >
                  Crear mi cuenta
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </LinkButton>
                <p className="mt-3 text-center text-xs text-text-muted/80 lg:text-xs 2xl:text-xs">
                  Sin cargo hasta el día 31
                </p>
              </div>

              {/* Divider */}
              <div className="hidden w-px self-stretch bg-border-default/70 lg:block" />

              {/* Features */}
              <ul className="grid flex-1 grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2 lg:gap-x-5 lg:gap-y-2.5 2xl:gap-x-6 2xl:gap-y-3">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-muted lg:gap-2 lg:text-xs 2xl:gap-2.5 2xl:text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft/50 text-primary lg:h-4 lg:w-4 2xl:h-5 2xl:w-5">
                      <Check className="h-4 w-4 lg:h-3 lg:w-3 2xl:h-4 2xl:w-4" aria-hidden="true" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        {/* Reassurance */}
        <Reveal delay={0.12} y={16} amount={0.4}>
          <p className="mt-6 text-center text-sm text-text-muted/80 lg:mt-5 lg:text-xs 2xl:mt-6 2xl:text-sm">
            ¿Tenés dudas? Escribinos a{" "}
            <a
              href="mailto:qupon.qr@gmail.com"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              qupon.qr@gmail.com
            </a>{" "}
            y te respondemos al toque.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
