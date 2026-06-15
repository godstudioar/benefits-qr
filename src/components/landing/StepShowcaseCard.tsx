import IPhoneMockup from "@/components/landing/IPhoneMockup";
import { INTERACTION, SHADOW } from "@/lib/shadowStyles";
import Card from "@/components/ui/Card";

export type StepShowcaseItem = {
  number: string;
  actorLabel: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
};

export default function StepShowcaseCard({
  number,
  actorLabel,
  title,
  description,
  imageSrc,
  imageAlt,
}: StepShowcaseItem) {
  return (
    <Card
      className={`h-full overflow-hidden p-4 ${SHADOW.cardBase} ${INTERACTION.hoverLift} ${SHADOW.cardHover} sm:p-5 lg:p-4 2xl:p-5`}
    >
      <span className="block text-xs font-semibold uppercase tracking-widest text-primary">
        {actorLabel}
      </span>

      <div className="mt-3 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-sm font-semibold tracking-[0.16em] text-primary">
          {number}
        </span>
        <h3 className="text-base font-semibold text-text-primary lg:text-sm 2xl:text-base">
          {title}
        </h3>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text-muted lg:text-sm 2xl:text-base">
        {description}
      </p>
      <div className="mt-5">
        <IPhoneMockup
          imageSrc={imageSrc}
          imageAlt={imageAlt}
          sizes="(min-width: 1536px) 18rem, (min-width: 1024px) 22vw, 92vw"
          frameClassName="max-w-[17rem] sm:max-w-[18rem] lg:max-w-[15.5rem] 2xl:max-w-[17rem]"
        />
      </div>
    </Card>
  );
}
