import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  titleAs?: "h1" | "h2" | "p";
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  titleAs = "h2",
  className,
}: SectionHeaderProps) {
  const isCenter = align === "center";
  const TitleTag = titleAs;

  return (
    <div
      className={cn(
        "mb-6",
        isCenter ? "text-center" : "text-left",
        className
      )}
    >
      <span className="mb-2.5 block text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </span>
      <TitleTag className="text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
        {title}
      </TitleTag>
      {description ? (
        <p
          className={cn(
            "mt-3 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base",
            isCenter ? "mx-auto" : "mr-auto"
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
