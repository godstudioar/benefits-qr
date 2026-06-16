import Card from "@/components/ui/Card";
import { SHADOW } from "@/lib/shadowStyles";

export default function Loading() {
  return (
    <main className="relative px-4 pt-24 pb-14 sm:px-6 lg:px-8 lg:pb-16">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        {/* Header skeleton */}
        <div className="mb-6 space-y-2">
          <div className="h-4 w-28 animate-pulse rounded-md bg-surface-muted" />
          <div className="h-8 w-48 animate-pulse rounded-md bg-surface-muted" />
          <div className="h-4 w-80 animate-pulse rounded-md bg-surface-muted" />
        </div>

        {/* Filters skeleton */}
        <div className="mb-6 flex flex-wrap gap-2">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-10 w-44 animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-9 w-36 animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-9 w-36 animate-pulse rounded-xl bg-surface-muted" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className={`h-64 overflow-hidden border-surface/80 bg-surface/95 ${SHADOW.cardBase} sm:bg-surface/85 sm:backdrop-blur-md`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-full w-full animate-pulse bg-surface-muted" />
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
