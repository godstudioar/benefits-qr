import LogoutButton from "@/components/auth/LogoutButton";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import MetricCard from "@/components/ui/MetricCard";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import { getAdminCredentials, getAdminSessionFromCookies } from "@/lib/adminAuth";
import { getAdminDashboardData } from "@/server/services/adminDashboardService";
import TrendSparkline from "@/components/local/dashboard/stats/TrendSparkline";
import AdminLoginForm from "./AdminLoginForm";
import AdminEventosSection from "./AdminEventosSection";
import { listAllEventos } from "@/server/services/eventosService";

export default async function AdminPage() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-14">
        <div className="my-auto w-full max-w-xl">
          <Card className="border-warning-soft/70 bg-warning-soft/60 p-6">
            <h1 className="text-xl font-bold text-warning">Admin no configurado</h1>
            <p className="mt-2 text-sm text-warning">
              Configurá `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` en el entorno para habilitar `/admin`.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  const session = await getAdminSessionFromCookies();
  if (!session) {
    return <AdminLoginForm />;
  }

  const [data, allEventos] = await Promise.all([
    getAdminDashboardData(),
    listAllEventos(),
  ]);
  const trafficAsTrend = data.trafficTrend.map((day) => ({
    date: day.date,
    reclamos: day.pageviews,
    canjes: day.visitantesUnicos,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
      <Reveal y={10} amount={0.2} className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <SectionHeader
            eyebrow="Admin"
            title="Métricas globales Qupon"
            description="Visión general de locales, cupones, reclamos, canjes y tráfico del sitio."
            align="left"
            className="!mb-0"
          />
          <LogoutButton logoutEndpoint="/api/admin/logout" />
        </div>
      </Reveal>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Locales" value={data.kpi.totalLocales} variant="light" />
        <MetricCard label="Locales nuevos 7d" value={data.kpi.localesNuevos7d} />
        <MetricCard label="Locales nuevos 30d" value={data.kpi.localesNuevos30d} />
        <MetricCard label="Cupones totales" value={data.kpi.totalCupones} />
        <MetricCard label="Cupones activos" value={data.kpi.cuponesActivos} />
        <MetricCard label="Activos públicos" value={data.kpi.activosPublicos} />
        <MetricCard label="Activos privados" value={data.kpi.activosPrivados} />
        <MetricCard label="Locales sin cupones" value={data.kpi.localesSinCupones} variant="warning" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Reclamos" value={data.kpi.totalReclamos} />
        <MetricCard label="Canjes" value={data.kpi.totalCanjes} />
        <MetricCard label="Tasa canje (%)" value={data.kpi.tasaCanje} variant="light" />
        <MetricCard label="Clientes únicos" value={data.kpi.clientesUnicos} />
        <MetricCard label="Pageviews 30d" value={data.kpi.pageviews30d} />
        <MetricCard
          label="Visitantes únicos diarios acumulados (30d)"
          value={data.kpi.visitantesUnicos30d}
        />
        <MetricCard label="Locales con público activo" value={data.kpi.localesConActivosPublicos} />
        <MetricCard label="Locales con privado activo" value={data.kpi.localesConActivosPrivados} />
      </div>
      <p className="mb-6 text-xs text-text-muted">
        Visitantes únicos diarios acumulados = suma de visitantes únicos por cada día del período (no usuarios únicos absolutos del mes).
      </p>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-surface/80 bg-surface/95 p-4 sm:bg-surface/85">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Top locales por cupones
          </p>
          <div className="space-y-2">
            {data.topLocalesPorCupones.map((local) => (
              <div
                key={local.localId}
                className="flex items-center justify-between rounded-xl border border-surface/70 bg-surface/70 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{local.nombre}</p>
                  <p className="text-xs text-text-muted">Activos: {local.cuponesActivos}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">Totales {local.totalCupones}</Badge>
                  <Badge variant="light">Pub {local.activosPublicos}</Badge>
                  <Badge variant="secondary">Priv {local.activosPrivados}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-surface/80 bg-surface/95 p-4 sm:bg-surface/85">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Top páginas (30d)
          </p>
          <div className="space-y-2">
            {data.topPaths.map((row) => (
              <div
                key={row.path}
                className="flex items-center justify-between rounded-xl border border-surface/70 bg-surface/70 px-3 py-2"
              >
                <p className="truncate pr-3 text-sm font-medium text-text-primary">{row.path}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{row.pageviews} pv</Badge>
                  <Badge variant="secondary">{row.visitantesUnicos} uu</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mb-6 border-surface/80 bg-surface/95 p-4 sm:bg-surface/85">
        <AdminEventosSection
          initialEventos={JSON.parse(JSON.stringify(allEventos))}
        />
      </Card>

      <Card className="border-surface/80 bg-surface/95 p-4 sm:bg-surface/85">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Tendencia de tráfico (30 días)
        </p>
        <div className="rounded-xl border border-surface/70 bg-surface/70 p-3 sm:p-4">
          <div className="flex gap-4 sm:gap-6">
            <TrendSparkline
              data={trafficAsTrend}
              dataKey="reclamos"
              color="var(--color-primary)"
              label="Pageviews"
            />
            <TrendSparkline
              data={trafficAsTrend}
              dataKey="canjes"
              color="var(--color-success)"
              label="Visitantes únicos"
            />
          </div>
        </div>
      </Card>
    </main>
  );
}
