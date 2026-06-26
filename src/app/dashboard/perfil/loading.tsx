import Card from "@/components/ui/Card";

export default function EditPerfilLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl">
      <div className="mx-auto w-full max-w-md">
        <Card className="w-full border-surface/80 bg-surface/95 p-6 shadow-xl shadow-border-default/60 sm:bg-surface/85 sm:backdrop-blur-md sm:p-7">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center gap-2 sm:mb-7">
            <div className="h-7 w-36 rounded-xl bg-surface-muted animate-pulse" />
            <div className="h-4 w-52 rounded bg-surface-soft animate-pulse" />
          </div>

          <div className="space-y-4 sm:space-y-5">
            {/* Logo placeholder */}
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-2xl bg-surface-muted animate-pulse" />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <div className="h-3 w-10 rounded bg-surface-muted animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-surface-soft animate-pulse" />
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded bg-surface-muted animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-surface-soft animate-pulse" />
            </div>

            {/* Dirección */}
            <div className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-surface-muted animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-surface-soft animate-pulse" />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-surface-muted animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-surface-soft animate-pulse" />
            </div>

            {/* Button */}
            <div className="h-12 w-full rounded-lg bg-surface-muted animate-pulse" />
          </div>
        </Card>
      </div>
    </main>
  );
}
