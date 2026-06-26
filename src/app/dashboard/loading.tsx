import Card from "@/components/ui/Card";
import { SHADOW } from "@/lib/shadowStyles";

export default function DashboardLoading() {
  return (
    <main>
      <div className={`mb-5 rounded-2xl border border-border-default bg-surface p-3 ${SHADOW.focalBase} sm:mb-6 sm:p-4`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-surface-muted animate-pulse" />
            <div className="min-w-0 space-y-2">
              <div className="h-6 w-40 rounded-lg bg-surface-muted animate-pulse" />
              <div className="h-4 w-44 max-w-full rounded bg-surface-soft animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-full rounded-lg bg-surface-muted animate-pulse sm:w-36" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:mb-8 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className={`border-border-default bg-surface p-3 ${SHADOW.cardBase} sm:p-4`}>
            <div className="mb-1 h-3 w-16 rounded bg-surface-muted animate-pulse" />
            <div className="h-7 w-10 rounded bg-accent-soft animate-pulse" />
          </Card>
        ))}
      </div>

      <div className={`mb-4 rounded-2xl border border-border-default bg-surface p-4 ${SHADOW.cardBase} sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-36 rounded-xl bg-surface-muted animate-pulse" />
            <div className="h-4 w-64 max-w-full rounded bg-surface-soft animate-pulse" />
          </div>
          <div className="h-10 w-full rounded-lg bg-surface-muted animate-pulse sm:w-36" />
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className={`border border-border-default bg-surface p-3 ${SHADOW.cardBase} sm:p-5`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-40 rounded bg-surface-muted animate-pulse" />
                  <div className="h-6 w-16 rounded-full bg-surface-muted animate-pulse" />
                </div>
                <div className="h-4 w-48 max-w-full rounded bg-surface-soft animate-pulse" />
                <div className="h-4 w-36 rounded bg-surface-soft animate-pulse" />
                <div className="flex gap-2 pt-1">
                  <div className="h-6 w-20 rounded-full bg-surface-soft animate-pulse" />
                  <div className="h-6 w-24 rounded-full bg-surface-soft animate-pulse" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                <div className="flex items-center gap-1.5">
                  <div className="h-8 w-8 rounded-lg bg-surface-soft animate-pulse" />
                  <div className="h-8 w-8 rounded-lg bg-surface-soft animate-pulse" />
                  <div className="h-8 w-8 rounded-lg bg-surface-soft animate-pulse" />
                </div>
                <div className="h-8 w-24 rounded-lg bg-surface-muted animate-pulse" />
              </div>
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
