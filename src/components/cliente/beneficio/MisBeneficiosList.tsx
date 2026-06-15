"use client";
import { useState } from "react";
import { QrCode, CircleAlert } from "lucide-react";
import BenefitWeekdays from "@/components/ui/BenefitWeekdays";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import QRDisplay from "@/components/cliente/beneficio/QRDisplay";
import Button from "@/components/ui/Button";
import LogoFrame from "@/components/ui/LogoFrame";
import {
  ReclamoEffectiveStatus,
  type ReclamoEffectiveStatus as ReclamoEffectiveStatusType,
} from "@/lib/couponStatus";
import { formatDateAR, formatDateTimeAR } from "@/lib/dates";
import { INTERACTION, SHADOW } from "@/lib/shadowStyles";
import { getReclamoStatusPresentation } from "@/lib/statusPresentation";


type Reclamo = {
  id: string;
  effectiveStatus: ReclamoEffectiveStatusType;
  canShowQr: boolean;
  blockedMessage: string | null;
  fechaReclamo: Date | string;
  fechaCanje: Date | string | null;
  beneficio: {
    descripcion: string;
    fechaExpiracion: Date | string;
    diasValidos: number[];
    local: { nombre: string | null; id: string; logoV: string; rubroNombre: string | null; direccion: string | null };
  };
};

export default function MisBeneficiosList({
  reclamos,
}: {
  reclamos: Reclamo[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (reclamos.length === 0) {
    return (
      <Card className={`border-surface/80 bg-surface/95 p-10 text-center ${SHADOW.accentBase} sm:bg-surface/85 sm:p-12 lg:p-9 2xl:p-12`}>
        <p className="text-text-muted">No tenés cupones reclamados aún</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3 lg:space-y-2.5 2xl:space-y-3">
      {reclamos.map((r) => {
        const status = getReclamoStatusPresentation(r.effectiveStatus);
        const isExpanded = expandedId === r.id;
        const localName = r.beneficio.local.nombre ?? "Local adherido";

        return (
          <Card
            key={r.id}
            className={`overflow-hidden border-surface/80 bg-surface/95 ${SHADOW.accentBase} ${INTERACTION.hoverLift} ${SHADOW.accentHover} sm:bg-surface/85`}
          >
            <div className="p-4 sm:p-5 lg:p-4 2xl:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <LogoFrame
                      src={`/api/locales/${r.beneficio.local.id}/logo?v=${r.beneficio.local.logoV}`}
                      alt={`Logo de ${localName}`}
                      name={localName}
                      className="h-9 w-9 rounded-xl bg-primary-soft"
                      fallbackClassName="text-xs"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-primary lg:text-[13px] 2xl:text-sm">
                          {localName}
                        </p>
                        {r.beneficio.local.rubroNombre && (
                          <Badge variant="muted" className="shrink-0 px-2 py-0 text-[10px]">
                            {r.beneficio.local.rubroNombre}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">
                        Reclamo: {formatDateAR(r.fechaReclamo)}
                      </p>
                      {r.beneficio.local.direccion && (
                        <p className="line-clamp-2 text-xs text-text-muted/80 lg:text-[11px] 2xl:text-xs">
                          {r.beneficio.local.direccion}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="line-clamp-2 text-base font-semibold text-text-primary lg:text-[15px] 2xl:text-base">
                    {r.beneficio.descripcion}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted lg:text-[11px] 2xl:text-xs">
                      <span>Vence: {formatDateAR(r.beneficio.fechaExpiracion)}</span>
                    </div>
                    <BenefitWeekdays
                      diasValidos={r.beneficio.diasValidos}
                      className="text-text-muted/80 lg:text-[11px] 2xl:text-xs"
                    />
                  </div>
                </div>
                <Badge variant={status.badgeVariant}>{status.label}</Badge>
              </div>

              {r.canShowQr && (
                <Button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  variant="light"
                  className="mt-4 w-full"
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  {isExpanded ? "Ocultar QR" : "Mostrar QR"}
                </Button>
              )}

              {!r.canShowQr && r.blockedMessage && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning-border bg-warning-soft/60 px-3 py-2.5 text-xs text-warning lg:text-[11px] 2xl:text-xs">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <p>{r.blockedMessage}</p>
                </div>
              )}

              {r.effectiveStatus === ReclamoEffectiveStatus.VENCIDO && (
                <p className="mt-3 text-xs text-danger lg:text-[11px] 2xl:text-xs">
                  Este cupón venció y ya no puede canjearse.
                </p>
              )}

              {r.effectiveStatus === ReclamoEffectiveStatus.CANJEADO && r.fechaCanje && (
                <p className="mt-3 text-xs text-success lg:text-[11px] 2xl:text-xs">
                  El local registró el canje el {formatDateTimeAR(r.fechaCanje)}.
                </p>
              )}

              {r.effectiveStatus === ReclamoEffectiveStatus.CANCELADO && (
                <p className="mt-3 text-xs text-text-muted lg:text-[11px] 2xl:text-xs">
                  Este cupón ya no está disponible porque el local lo dio de baja.
                </p>
              )}
            </div>

            {isExpanded && r.canShowQr && (
               <div className="border-t border-border-default/70 bg-surface-muted/35 p-4 sm:p-5 lg:p-4 2xl:p-5">
                <QRDisplay reclamoId={r.id} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
