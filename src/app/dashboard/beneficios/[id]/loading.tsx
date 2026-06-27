import Card from "@/components/ui/Card";
import { SHADOW } from "@/lib/shadowStyles";

export default function BeneficioStatsLoading() {
  return (
    <main>
      <div className="mb-5 space-y-2 sm:mb-6">
        <div className="h-3 w-24 rounded bg-surface-muted animate-pulse" />
        <div className="h-8 w-52 rounded-xl bg-surface-muted animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded bg-surface-soft animate-pulse" />
      </div>

      <Card className={`relative mb-6 border-surface/80 bg-surface/95 p-4 ${SHADOW.accentBase} sm:bg-surface/85 sm:p-6`}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <div className="space-y-2 pr-12 sm:pr-36">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-7 w-60 rounded-xl bg-surface-muted animate-pulse" />
                <div className="h-6 w-20 rounded-full bg-surface-muted animate-pulse" />
              </div>
              <div className="h-4 w-72 max-w-full rounded bg-surface-soft animate-pulse" />
              <div className="h-4 w-64 max-w-full rounded bg-surface-soft animate-pulse" />
            </div>

            <div className="absolute right-4 top-4 h-9 w-9 rounded-lg bg-surface-muted animate-pulse sm:right-6 sm:top-6 sm:h-9 sm:w-32" />
          </div>

          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-surface-muted animate-pulse" />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-border-default/80 bg-surface-soft/70 p-2.5 sm:p-3">
                  <div className="mx-auto mb-1 h-3 w-16 rounded bg-surface-muted animate-pulse" />
                  <div className="mx-auto h-6 w-10 rounded bg-border-default animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-3 h-7 w-40 rounded-xl bg-surface-muted animate-pulse" />
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-surface/80 bg-surface/95 p-3 sm:bg-surface/85 sm:p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 rounded bg-surface-muted animate-pulse" />
                <div className="h-3 w-52 max-w-full rounded bg-surface-soft animate-pulse" />
                <div className="h-3 w-48 max-w-full rounded bg-surface-soft animate-pulse" />
              </div>
              <div className="h-6 w-20 rounded-full bg-surface-muted animate-pulse" />
            </div>
          </Card>
        ))}

        <div className="flex items-center justify-between pt-2">
          <div className="h-9 w-24 rounded-lg bg-surface-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-surface-soft animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-surface-muted animate-pulse" />
        </div>
      </div>
    </main>
  );
}
