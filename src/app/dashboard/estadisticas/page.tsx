import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { UserType } from "@/lib/enums";
import Card from "@/components/ui/Card";
import Reveal from "@/components/ui/Reveal";
import MetricCard from "@/components/ui/MetricCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { getDashboardPageData } from "@/server/services/dashboardService";
import { getDashboardStats } from "@/server/services/dashboardStatsService";
import TrendSparkline from "@/components/local/dashboard/stats/TrendSparkline";
import TopCupones from "@/components/local/dashboard/stats/TopCupones";
import TopClientes from "@/components/local/dashboard/stats/TopClientes";
import StatusDistribution from "@/components/local/dashboard/stats/StatusDistribution";
import { SHADOW } from "@/lib/shadowStyles";

const PAGE_SIZE = 10;
const METRIC_CARD_CLASS = "h-full bg-surface p-3 sm:p-4";
const METRIC_LABEL_CLASS = "text-[10px] leading-tight tracking-[0.08em] sm:text-xs";
const METRIC_VALUE_CLASS = "text-lg sm:text-2xl";
const STATS_SECTION_CARD_CLASS = `border-surface/80 bg-surface/95 p-4 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-5`;
const STATS_SECTION_LABEL_CLASS = "mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted";

export default async function DashboardStatsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.userType !== UserType.LOCAL) {
    redirect("/login");
  }

  const [dashboardData, stats] = await Promise.all([
    getDashboardPageData(session.userId, 1, PAGE_SIZE),
    getDashboardStats(session.userId),
  ]);

  const {
    local,
    totalBeneficios,
    totalReclamos,
    totalCanjeados,
    tasaCanje,
    clientesUnicos,
    proximosAVencer,
  } = dashboardData;

  if (!local) redirect("/login");
  if (local.nombre === null) redirect("/onboarding");

  return (
    <main>
      <Reveal y={10} amount={0.2} className="mb-6">
        <SectionHeader
          eyebrow="Métricas"
          title="Estadísticas del negocio"
          description="Seguí la evolución de tus cupones y el rendimiento de canje en tiempo real."
          align="left"
          titleAs="h1"
          className="!mb-0"
        />
      </Reveal>

      <Reveal y={12} amount={0.15} className="mb-6 sm:mb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Cupones"
            value={totalBeneficios}
            variant="light"
            elevated
            className={METRIC_CARD_CLASS}
            labelClassName={METRIC_LABEL_CLASS}
            valueClassName={METRIC_VALUE_CLASS}
          />
          <MetricCard
            label="Vencen en 7 días"
            value={proximosAVencer}
            variant="light"
            elevated
            className={METRIC_CARD_CLASS}
            labelClassName={METRIC_LABEL_CLASS}
            valueClassName={METRIC_VALUE_CLASS}
          />
          <MetricCard
            label="Reclamos"
            value={totalReclamos}
            variant="light"
            elevated
            className={METRIC_CARD_CLASS}
            labelClassName={METRIC_LABEL_CLASS}
            valueClassName={METRIC_VALUE_CLASS}
          />
          <MetricCard
            label="Canjeados"
            value={totalCanjeados}
            variant="light"
            elevated
            className={METRIC_CARD_CLASS}
            labelClassName={METRIC_LABEL_CLASS}
            valueClassName={METRIC_VALUE_CLASS}
          />
          <MetricCard
            label="Tasa canje (%)"
            value={tasaCanje}
            variant="light"
            elevated
            className={METRIC_CARD_CLASS}
            labelClassName={METRIC_LABEL_CLASS}
            valueClassName={METRIC_VALUE_CLASS}
          />
          <MetricCard
            label="Clientes únicos"
            value={clientesUnicos}
            variant="light"
            elevated
            className={METRIC_CARD_CLASS}
            labelClassName={METRIC_LABEL_CLASS}
            valueClassName={METRIC_VALUE_CLASS}
          />
          <MetricCard
            label="% Recurrencia"
            value={stats.recurrence.porcentajeRecurrencia}
            variant="light"
            elevated
            className={METRIC_CARD_CLASS}
            labelClassName={METRIC_LABEL_CLASS}
            valueClassName={METRIC_VALUE_CLASS}
          />
          <Card className="flex h-full flex-col rounded-xl border-accent-soft/80 bg-surface p-3 sm:p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-accent-foreground/80 sm:text-xs">
              Tiempo medio a canje
            </p>
            <p className="text-lg font-bold leading-tight text-accent-foreground sm:text-2xl">
              {stats.avgRedeemTimeFormatted}
            </p>
          </Card>
        </div>
      </Reveal>

      <Reveal y={12} amount={0.15} className="mb-4 sm:mb-5">
        <Card className={STATS_SECTION_CARD_CLASS}>
          <p className={STATS_SECTION_LABEL_CLASS}>
            Tendencia — últimos 30 días
          </p>
          <div className="flex gap-4 sm:gap-6">
            <TrendSparkline
              data={stats.trend}
              dataKey="reclamos"
              color="var(--color-primary)"
              label="Reclamos"
            />
            <TrendSparkline
              data={stats.trend}
              dataKey="canjes"
              color="var(--color-success)"
              label="Canjes"
            />
          </div>
        </Card>
      </Reveal>

      <Reveal y={12} delay={0.12} amount={0.15} className="mb-4 sm:mb-5">
        <Card className={`h-full ${STATS_SECTION_CARD_CLASS}`}>
          <p className={STATS_SECTION_LABEL_CLASS}>
            Top cupones por rendimiento
          </p>
          <TopCupones cupones={stats.topCupones} />
        </Card>
      </Reveal>

      <Reveal y={12} delay={0.18} amount={0.15} className="mb-4 sm:mb-5">
        <Card className={`h-full ${STATS_SECTION_CARD_CLASS}`}>
          <p className={STATS_SECTION_LABEL_CLASS}>
            Top clientes
          </p>
          <TopClientes clientes={stats.topClientes} />
        </Card>
      </Reveal>

      <Reveal y={12} delay={0.24} amount={0.15}>
        <Card className={STATS_SECTION_CARD_CLASS}>
          <p className={STATS_SECTION_LABEL_CLASS}>
            Salud de cupones
          </p>
          <StatusDistribution distribution={stats.statusDistribution} />
        </Card>
      </Reveal>
    </main>
  );
}
