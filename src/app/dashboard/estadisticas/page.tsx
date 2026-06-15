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
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-32 sm:px-6 sm:pt-8 sm:pb-16 lg:max-w-4xl lg:pt-7 lg:pb-14 2xl:max-w-5xl 2xl:pt-8 2xl:pb-16">
      <Reveal y={10} amount={0.2} className="mb-6 sm:mb-7">
        <SectionHeader
          eyebrow="Métricas"
          title="Estadísticas del negocio"
          description="Seguí la evolución de tus cupones y el rendimiento de canje en tiempo real."
          align="left"
          className="!mb-0"
        />
      </Reveal>

      <div className="mb-6 grid grid-cols-4 gap-2 sm:mb-8 sm:grid-cols-3 sm:gap-3 lg:mb-7 lg:grid-cols-4 lg:gap-2.5 2xl:mb-8 2xl:gap-3">
        <Reveal y={14} amount={0.25} className="h-full">
          <MetricCard
            label="Cupones"
            value={totalBeneficios}
            variant="light"
            elevated
            className="h-full bg-surface p-2.5"
            labelClassName="text-[8px] leading-tight tracking-[0.06em]"
            valueClassName="text-base sm:text-2xl lg:text-xl 2xl:text-2xl"
          />
        </Reveal>
        <Reveal delay={0.03} y={14} amount={0.25} className="h-full">
          <MetricCard
            label="Vencen en 7 días"
            value={proximosAVencer}
            variant="light"
            elevated
            className="h-full bg-surface p-2.5"
            labelClassName="text-[8px] leading-tight tracking-[0.06em]"
            valueClassName="text-base sm:text-2xl lg:text-xl 2xl:text-2xl"
          />
        </Reveal>
        <Reveal delay={0.06} y={14} amount={0.25} className="h-full">
          <MetricCard
            label="Reclamos"
            value={totalReclamos}
            variant="light"
            elevated
            className="h-full bg-surface p-2.5"
            labelClassName="text-[8px] leading-tight tracking-[0.06em]"
            valueClassName="text-base sm:text-2xl lg:text-xl 2xl:text-2xl"
          />
        </Reveal>
        <Reveal delay={0.09} y={14} amount={0.25} className="h-full">
          <MetricCard
            label="Canjeados"
            value={totalCanjeados}
            variant="light"
            elevated
            className="h-full bg-surface p-2.5"
            labelClassName="text-[8px] leading-tight tracking-[0.06em]"
            valueClassName="text-base sm:text-2xl lg:text-xl 2xl:text-2xl"
          />
        </Reveal>
        <Reveal delay={0.12} y={14} amount={0.25} className="h-full">
          <MetricCard
            label="Tasa canje (%)"
            value={tasaCanje}
            variant="light"
            elevated
            className="h-full bg-surface p-2.5"
            labelClassName="text-[8px] leading-tight tracking-[0.06em]"
            valueClassName="text-base sm:text-2xl lg:text-xl 2xl:text-2xl"
          />
        </Reveal>
        <Reveal delay={0.15} y={14} amount={0.25} className="h-full">
          <MetricCard
            label="Clientes únicos"
            value={clientesUnicos}
            variant="light"
            elevated
            className="h-full bg-surface p-2.5"
            labelClassName="text-[8px] leading-tight tracking-[0.06em]"
            valueClassName="text-base sm:text-2xl lg:text-xl 2xl:text-2xl"
          />
        </Reveal>
        <Reveal delay={0.18} y={14} amount={0.25} className="h-full">
          <MetricCard
            label="% Recurrencia"
            value={stats.recurrence.porcentajeRecurrencia}
            variant="light"
            elevated
            className="h-full bg-surface p-2.5"
            labelClassName="text-[8px] leading-tight tracking-[0.06em]"
            valueClassName="text-base sm:text-2xl lg:text-xl 2xl:text-2xl"
          />
        </Reveal>
        <Reveal delay={0.21} y={14} amount={0.25} className="h-full">
          <Card className="flex h-full flex-col rounded-xl border-accent-soft/80 bg-surface p-2.5 sm:p-4 lg:p-3.5 2xl:p-4">
            <p className="mb-1 text-[8px] font-semibold uppercase leading-tight tracking-[0.06em] text-accent-foreground/80 sm:text-xs lg:text-[11px] 2xl:text-xs">
              Tiempo medio a canje
            </p>
            <p className="text-sm font-bold leading-tight text-accent-foreground sm:text-2xl lg:text-xl 2xl:text-2xl">
              {stats.avgRedeemTimeFormatted}
            </p>
          </Card>
        </Reveal>
      </div>

      <Reveal y={12} amount={0.15} className="mb-4 sm:mb-5 lg:mb-4 2xl:mb-5">
        <Card className={`border-surface/80 bg-surface/95 p-4 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-5 lg:p-4 2xl:p-5`}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs lg:text-[11px] 2xl:text-xs">
            Tendencia — últimos 30 días
          </p>
          <div className="flex gap-4 sm:gap-6 lg:gap-5 2xl:gap-6">
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

      <Reveal y={12} delay={0.12} amount={0.15} className="mb-4 sm:mb-5 lg:mb-4 2xl:mb-5">
        <Card className={`h-full border-surface/80 bg-surface/95 p-4 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-5 lg:p-4 2xl:p-5`}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs lg:text-[11px] 2xl:text-xs">
            Top cupones por rendimiento
          </p>
          <TopCupones cupones={stats.topCupones} />
        </Card>
      </Reveal>

      <Reveal y={12} delay={0.18} amount={0.15} className="mb-4 sm:mb-5 lg:mb-4 2xl:mb-5">
        <Card className={`h-full border-surface/80 bg-surface/95 p-4 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-5 lg:p-4 2xl:p-5`}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs lg:text-[11px] 2xl:text-xs">
            Top clientes
          </p>
          <TopClientes clientes={stats.topClientes} />
        </Card>
      </Reveal>

      <Reveal y={12} delay={0.24} amount={0.15}>
        <Card className={`border-surface/80 bg-surface/95 p-4 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-5 lg:p-4 2xl:p-5`}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs lg:text-[11px] 2xl:text-xs">
            Salud de cupones
          </p>
          <StatusDistribution distribution={stats.statusDistribution} />
        </Card>
      </Reveal>
    </main>
  );
}
