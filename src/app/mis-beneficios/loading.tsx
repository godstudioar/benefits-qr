import Card from "@/components/ui/Card";
import { SHADOW } from "@/lib/shadowStyles";

export default function MisBeneficiosLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:max-w-2xl lg:pt-7 2xl:max-w-3xl 2xl:pt-8">
      <div className="mb-5 space-y-1 sm:mb-6 lg:mb-5 2xl:mb-6">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-border-default" />
        <div className="h-4 w-72 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className="mb-5 sm:mb-6 lg:mb-5 2xl:mb-6">
        <Card className={`rounded-xl border-border-strong/40 bg-primary p-3 sm:p-4 ${SHADOW.accentBase}`}>
          <div className="mb-1 h-3 w-32 animate-pulse rounded bg-primary-foreground/20" />
          <div className="h-7 w-8 animate-pulse rounded bg-primary-foreground/30" />
        </Card>
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card
            key={i}
            className={`overflow-hidden border-surface/80 bg-surface/95 ${SHADOW.accentBase}`}
          >
             <div className="p-4 sm:p-5 lg:p-4 2xl:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-border-default" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-24 animate-pulse rounded bg-border-default" />
                      <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-border-default" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
                  </div>
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-border-default" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
