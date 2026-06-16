"use client";

import { useState } from "react";
import type { TrendDay } from "@/server/services/dashboardStatsService";

interface TrendSparklineProps {
  data: TrendDay[];
  dataKey: "reclamos" | "canjes";
  color: string;
  label: string;
}

function buildPolyline(values: number[], width: number, height: number, padding: number): string {
  if (values.length === 0) return "";

  const max = Math.max(...values, 1);
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const step = values.length > 1 ? usableW / (values.length - 1) : 0;

  return values
    .map((v, i) => {
      const x = padding + i * step;
      const y = padding + usableH - (v / max) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function formatDayLabel(date: string): string {
  const day = new Date(`${date}T00:00:00`);
  return day.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function TrendSparkline({ data, dataKey, color, label }: TrendSparklineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const values = data.map((d) => d[dataKey]);
  const total = values.reduce((s, v) => s + v, 0);
  const W = 200;
  const H = 48;
  const PAD = 4;
  const usableW = W - PAD * 2;
  const step = data.length > 1 ? usableW / (data.length - 1) : usableW;
  const polyline = buildPolyline(values, W, H, PAD);

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;
  const hoveredX = hoveredIndex !== null ? PAD + hoveredIndex * step : null;

  const getIndexFromClientX = (clientX: number, bounds: DOMRect): number => {
    const relativeX = ((clientX - bounds.left) / bounds.width) * W;
    const rawIndex = data.length > 1 ? Math.round((relativeX - PAD) / step) : 0;

    return Math.max(0, Math.min(data.length - 1, rawIndex));
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    setHoveredIndex(getIndexFromClientX(event.clientX, bounds));
  };

  const handleTouchMove = (event: React.TouchEvent<SVGSVGElement>) => {
    if (data.length === 0 || event.touches.length === 0) return;

    const touch = event.touches[0];
    const bounds = event.currentTarget.getBoundingClientRect();
    setHoveredIndex(getIndexFromClientX(touch.clientX, bounds));
  };

  return (
    <div className="relative min-w-0 flex-1">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-lg font-bold text-text-primary sm:text-xl lg:text-lg 2xl:text-xl">
          {total}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs lg:text-[11px] 2xl:text-xs">
          {label}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-10 w-full sm:h-12 lg:h-10 2xl:h-12"
        preserveAspectRatio="none"
        aria-label={`${label}: ${total} en 30 días`}
        role="img"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
        onTouchStart={handleTouchMove}
        onTouchMove={handleTouchMove}
        onTouchCancel={() => setHoveredIndex(null)}
      >
        {polyline && (
          <>
            <polyline
              points={polyline}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={`${PAD},${H - PAD} ${polyline} ${W - PAD},${H - PAD}`}
              fill={color}
              fillOpacity="0.1"
              stroke="none"
            />
            {hoveredPoint && (
              <line
                x1={hoveredX ?? PAD}
                y1={PAD}
                x2={hoveredX ?? PAD}
                y2={H - PAD}
                stroke={color}
                strokeOpacity="0.25"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </>
        )}
      </svg>
      {hoveredPoint && (
        <div className="pointer-events-none absolute top-12 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border-default/70 bg-surface px-2 py-1 shadow-md shadow-primary/16 sm:top-14 lg:top-12 2xl:top-14">
          <p className="text-[10px] font-semibold text-text-primary sm:text-[11px]">
            {formatDayLabel(hoveredPoint.date)}
          </p>
          <p className="text-[10px] text-text-muted sm:text-[11px]">
            {label}: {hoveredPoint[dataKey]}
          </p>
        </div>
      )}
      <p className="mt-1 text-[10px] leading-tight text-text-muted sm:text-[11px] lg:text-[10px] 2xl:text-[11px]">
        Últimos 30 días
      </p>
    </div>
  );
}
