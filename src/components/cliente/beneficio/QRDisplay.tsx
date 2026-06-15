"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SHADOW } from "@/lib/shadowStyles";
import { ReclamoEffectiveStatus } from "@/lib/couponStatus";

interface QRDisplayProps {
  reclamoId: string;
  onRedeemed?: () => void;
}

const QR_DURATION_SECONDS = 600;
const STATUS_POLL_INTERVAL_MS = 2500;

export default function QRDisplay({ reclamoId, onRedeemed }: QRDisplayProps) {
  const router = useRouter();
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_DURATION_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInFlightRef = useRef(false);
  const refreshTriggeredRef = useRef(false);

  const generateQR = useCallback(async () => {
    setLoading(true);
    setError(null);
    refreshTriggeredRef.current = false;

    try {
      const res = await fetch(`/api/reclamos/${reclamoId}/qr`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "No pudimos generar el QR. Intentá de nuevo."
        );
      }

      if (!data.qrDataURL || typeof data.qrDataURL !== "string") {
        throw new Error("No pudimos generar el QR. Intentá de nuevo.");
      }

      setQrDataURL(data.qrDataURL);
      setSecondsLeft(QR_DURATION_SECONDS);
    } catch (err) {
      setQrDataURL(null);
      setError(
        err instanceof Error ? err.message : "No pudimos generar el QR. Intentá de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }, [reclamoId]);

  const refreshCoupons = useCallback(() => {
    if (refreshTriggeredRef.current) {
      return;
    }

    refreshTriggeredRef.current = true;
    if (onRedeemed) {
      onRedeemed();
    } else {
      router.refresh();
    }
  }, [router, onRedeemed]);

  const pollStatus = useCallback(async () => {
    if (pollInFlightRef.current || refreshTriggeredRef.current) {
      return;
    }

    pollInFlightRef.current = true;

    try {
      const res = await fetch(`/api/reclamos/${reclamoId}/status`, {
        method: "GET",
        cache: "no-store",
      });

      if (res.status === 401) {
        refreshCoupons();
        return;
      }

      if (res.status === 404) {
        refreshCoupons();
        return;
      }

      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as {
        effectiveStatus?: string;
        canShowQr?: boolean;
      };

      if (
        data.canShowQr === false ||
        data.effectiveStatus === ReclamoEffectiveStatus.CANJEADO ||
        (typeof data.effectiveStatus === "string" &&
          data.effectiveStatus !== ReclamoEffectiveStatus.PENDIENTE)
      ) {
        refreshCoupons();
      }
    } finally {
      pollInFlightRef.current = false;
    }
  }, [reclamoId, refreshCoupons]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  useEffect(() => {
    if (!qrDataURL) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }

        return s - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qrDataURL]);

  useEffect(() => {
    if (!qrDataURL) return;

    void pollStatus();

    const intervalId = setInterval(() => {
      void pollStatus();
    }, STATUS_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      pollInFlightRef.current = false;
    };
  }, [pollStatus, qrDataURL]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 20;
  const isExpired = secondsLeft === 0;

  if (loading && !qrDataURL) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-border-default/70 bg-surface/80 px-6 py-10 text-center lg:px-5 lg:py-9 2xl:px-6 2xl:py-10">
        <div role="status" aria-label="Cargando código QR">
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">Generando tu QR</p>
          <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">Esto tarda solo unos segundos.</p>
        </div>
      </div>
    );
  }

  if (!qrDataURL) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-2xl border border-border-default/70 bg-surface/80 px-6 py-8 lg:px-5 lg:py-7 2xl:px-6 2xl:py-8">
          <div className="space-y-2">
            <Badge variant="danger">QR no disponible</Badge>
            <p className="text-sm font-medium text-text-primary">No pudimos cargar el código.</p>
            {error ? <p className="text-xs text-text-muted">{error}</p> : null}
          </div>
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={() => void generateQR()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-3.5 2xl:space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted lg:text-[11px] 2xl:text-xs">
          Vigencia del QR
        </p>
        <div
          className={`font-mono text-2xl font-bold tabular-nums lg:text-[1.65rem] 2xl:text-2xl ${
            isUrgent ? "text-danger" : "text-text-primary"
          }`}
        >
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
      </div>

      <div className={`rounded-2xl border border-border-default/70 bg-white p-4 ${SHADOW.focalBase} lg:p-3.5 2xl:p-4`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataURL}
          alt="Código QR para canjear el cupón"
          className="mx-auto aspect-square w-full max-w-[256px] rounded-xl sm:max-w-[184px] lg:max-w-[208px] 2xl:max-w-[184px]"
        />
      </div>

      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
          Mostralo en el local para validar tu beneficio.
        </p>
        <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">
          {isExpired
            ? "El QR venció. Presioná \"Renovar ahora\" para generar uno nuevo."
            : 'Este QR vence en 10 minutos. Si se vence, presioná "Renovar ahora" para generar uno nuevo.'}
        </p>
        {error ? <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">{error}</p> : null}
      </div>

      <Button
        type="button"
        variant="muted"
        size="sm"
        onClick={() => void generateQR()}
        disabled={loading}
        className="w-full"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        {loading ? "Renovando..." : "Renovar ahora"}
      </Button>
    </div>
  );
}
