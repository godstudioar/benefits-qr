import { getLandingMerchantLogos } from "@/server/services/landingMerchantLogosService";
import LogoFrame from "@/components/ui/LogoFrame";

const MIN_SEQUENCE_ITEMS = 6;

function buildSequence<T>(items: T[]) {
  if (items.length >= MIN_SEQUENCE_ITEMS) {
    return items;
  }

  const repetitions = Math.ceil(MIN_SEQUENCE_ITEMS / items.length);
  return Array.from({ length: repetitions }, () => items).flat();
}

export default async function LandingMerchantMarquee() {
  const logos = await getLandingMerchantLogos();

  if (logos.length === 0) {
    return null;
  }

  const sequence = buildSequence(logos);

  return (
    <section
      aria-label="Logos de comercios"
      className="relative min-h-[22vh] border-y border-border-default/60 bg-white/55 py-4 sm:min-h-[24vh] sm:py-5"
    >
      <div className="landing-logo-marquee absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-white/95 via-white/70 to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-white/95 via-white/70 to-transparent sm:w-20" />

        <ul className="landing-logo-marquee__track flex w-max items-center gap-8 px-6 sm:gap-10 sm:px-8 lg:gap-12 lg:px-10">
          {[...sequence, ...sequence].map((logo, index) => {
            const isClone = index >= sequence.length;

            return (
              <li
                key={`${logo.id}-${index}`}
                data-clone={isClone ? "true" : "false"}
                aria-hidden={isClone}
                className="flex items-center justify-center"
              >
                <LogoFrame
                  src={logo.logoUrl}
                  alt={`Logo de ${logo.nombre}`}
                  name={logo.nombre}
                  className="h-14 w-14 rounded-full border border-border-default/70 bg-surface/88 shadow-sm sm:h-16 sm:w-16 lg:h-20 lg:w-20"
                  imageClassName="object-cover "
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
