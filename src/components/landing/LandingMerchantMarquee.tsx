import { getLandingMerchantLogos } from "@/server/services/landingMerchantLogosService";
import LogoFrame from "@/components/ui/LogoFrame";
import { cn } from "@/lib/utils";

const MIN_SEQUENCE_ITEMS = 6;

function buildSequence<T>(items: T[]) {
  if (items.length >= MIN_SEQUENCE_ITEMS) {
    return items;
  }

  const repetitions = Math.ceil(MIN_SEQUENCE_ITEMS / items.length);
  return Array.from({ length: repetitions }, () => items).flat();
}

type LandingMerchantMarqueeProps = {
  className?: string;
};

export default async function LandingMerchantMarquee({
  className,
}: LandingMerchantMarqueeProps) {
  const logos = await getLandingMerchantLogos();

  if (logos.length === 0) {
    return null;
  }

  const sequence = buildSequence(logos);

  return (
    <section
      aria-label="Logos de comercios"
      className={cn(
        "relative min-h-[14vh] py-4 sm:min-h-[22vh] sm:py-5 lg:min-h-[16vh] lg:py-3 2xl:-mx-6",
        className,
      )}
    >
      <div className="landing-logo-marquee absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden">

        <ul className="landing-logo-marquee__track flex w-max items-center gap-12 px-6 sm:gap-16 sm:px-8 lg:gap-20 lg:px-8">
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
                  className="h-18 w-18 rounded-full border border-border-default/70 bg-surface/88 shadow-sm sm:h-16 sm:w-16 lg:h-16 lg:w-16"
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
