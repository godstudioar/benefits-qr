import Card from "@/components/ui/Card";
import { SHADOW } from "@/lib/shadowStyles";

export default function BeneficioLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className={`w-full max-w-md p-8 ${SHADOW.focalBase}`}>
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-border-default animate-pulse" />
          <div className="h-6 w-48 bg-border-default rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-surface-muted rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-11 w-full bg-surface-muted rounded-xl animate-pulse" />
          <div className="h-11 w-full bg-surface-muted rounded-xl animate-pulse" />
          <div className="h-11 w-full bg-border-default rounded-xl animate-pulse" />
        </div>
      </Card>
    </main>
  );
}
