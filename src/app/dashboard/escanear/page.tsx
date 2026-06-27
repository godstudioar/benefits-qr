"use client";
import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, CircleAlert, QrCode, XCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";

const QRScanner = dynamic(() => import("@/components/local/dashboard/escanear/QRScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48 sm:h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

type ScanState = "scanning" | "confirming" | "success" | "error";

type StatusState = Exclude<ScanState, "scanning">;

const STATUS_CONFIG: Record<
  StatusState,
  {
    title: string;
    description: string;
    icon: LucideIcon;
    iconBgClassName: string;
    iconClassName: string;
  }
> = {
  confirming: {
    title: "QR detectado",
    description: "¿Confirmás el canje de este cupón?",
    icon: CircleAlert,
    iconBgClassName: "bg-primary-soft",
    iconClassName: "text-primary",
  },
  success: {
    title: "¡Canje exitoso!",
    description: "El cupón se canjeó correctamente.",
    icon: CheckCircle2,
    iconBgClassName: "bg-success-soft",
    iconClassName: "text-success",
  },
  error: {
    title: "Error",
    description: "No se pudo completar el canje.",
    icon: XCircle,
    iconBgClassName: "bg-danger-soft",
    iconClassName: "text-danger",
  },
};

export default function EscanearPage() {
  const [state, setState] = useState<ScanState>("scanning");
  const [message, setMessage] = useState("");
  const [scannedData, setScannedData] = useState<{
    reclamoId: string;
    qrToken: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleScan(data: string) {
    if (state !== "scanning") return;

    try {
      const parsed = JSON.parse(data);
      if (parsed.reclamoId && parsed.qrToken) {
        setScannedData(parsed);
        setState("confirming");
      } else {
        setMessage("QR inválido");
        setState("error");
      }
    } catch {
      setMessage("QR inválido");
      setState("error");
    }
  }

  const handleScannerError = useCallback(() => {
    setMessage("No se pudo iniciar la cámara para escanear. Revisá permisos e intentá nuevamente.");
    setState("error");
  }, []);

  async function handleCanjear() {
    if (!scannedData) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/reclamos/${scannedData.reclamoId}/canjear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: scannedData.qrToken }),
      });

      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (res.ok) {
        setState("success");
        return;
      }

      const errorMessage =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string" &&
        payload.error.trim()
          ? payload.error
          : "Error al canjear";

      setState("error");
      setMessage(errorMessage);
    } catch {
      setState("error");
      setMessage("No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setState("scanning");
    setMessage("");
    setScannedData(null);
  }

  return (
    <main className="mx-auto w-full max-w-3xl">
      <SectionHeader
        eyebrow="Escanear cupón"
        title="Escanear QR"
        description="Escaneá el código del cliente para confirmar el canje del cupón."
        align="left"
        titleAs="h1"
      />

      <Card className="p-6">
        {state === "scanning" && (
          <div className="space-y-4" role="status" aria-live="polite" aria-atomic="true">
            <p className="flex items-center justify-center gap-2 text-center text-sm text-text-muted">
              <QrCode className="h-4 w-4 text-primary" aria-hidden="true" />
              Apuntá la cámara al código QR del cliente
            </p>
            <QRScanner onScan={handleScan} onError={handleScannerError} />
          </div>
        )}

        {state === "confirming" && (
          <div className="py-8 text-center" role="status" aria-live="polite" aria-atomic="true">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                STATUS_CONFIG.confirming.iconBgClassName
              }`}
            >
              <STATUS_CONFIG.confirming.icon
                className={`h-8 w-8 ${STATUS_CONFIG.confirming.iconClassName}`}
                aria-hidden="true"
              />
            </div>
             <h2 className="mb-2 text-lg font-semibold text-text-primary">
               {STATUS_CONFIG.confirming.title}
             </h2>
             <p className="mb-6 text-sm text-text-muted">
               {STATUS_CONFIG.confirming.description}
             </p>
             <div className="flex justify-center gap-3">
               <Button variant="secondary" onClick={reset}>
                 Cancelar
               </Button>
              <Button onClick={handleCanjear} loading={loading}>
                Confirmar canje
              </Button>
            </div>
          </div>
        )}

        {state === "success" && (
            <div className="py-8 text-center" role="status" aria-live="polite" aria-atomic="true">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                STATUS_CONFIG.success.iconBgClassName
              }`}
            >
              <STATUS_CONFIG.success.icon
                className={`h-8 w-8 ${STATUS_CONFIG.success.iconClassName}`}
                aria-hidden="true"
              />
            </div>
             <h2 className="mb-2 text-lg font-semibold text-text-primary">
               {STATUS_CONFIG.success.title}
             </h2>
             <p className="mb-4 text-sm text-text-muted">{STATUS_CONFIG.success.description}</p>
            <Button onClick={reset} className="mt-4">
              Escanear otro
            </Button>
          </div>
        )}

        {state === "error" && (
            <div className="py-8 text-center" role="alert" aria-live="assertive" aria-atomic="true">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                STATUS_CONFIG.error.iconBgClassName
              }`}
            >
              <STATUS_CONFIG.error.icon
                className={`h-8 w-8 ${STATUS_CONFIG.error.iconClassName}`}
                aria-hidden="true"
              />
            </div>
             <h2 className="mb-2 text-lg font-semibold text-text-primary">{STATUS_CONFIG.error.title}</h2>
             <p className="mb-2 text-sm text-text-muted">{STATUS_CONFIG.error.description}</p>
             <p className="mb-4 text-sm text-danger">{message}</p>
            <Button onClick={reset}>Intentar de nuevo</Button>
          </div>
        )}
      </Card>
    </main>
  );
}
