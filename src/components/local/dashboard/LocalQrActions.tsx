"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Printer } from "lucide-react";
import Button from "@/components/ui/Button";
import ShareQrPdfButton from "@/components/local/dashboard/ShareQrPdfButton";

type LocalQrActionsProps = {
  url: string;
  localName: string;
};

export default function LocalQrActions({ url, localName }: LocalQrActionsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir página"
        title="Abrir página"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-default bg-surface-muted text-text-primary shadow-sm transition-[transform,background-color,color,box-shadow,border-color] duration-200 hover:border-border-default hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </Link>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void handleCopy()}
        title={copied ? "Link copiado" : "Copiar enlace de la página"}
        aria-label={copied ? "Enlace de la página copiado" : "Copiar enlace de la página"}
      >
        {copied ? (
          <Check className="h-4 w-4 text-success" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>

      <ShareQrPdfButton
        url={url}
        pdfCtaText="Escaneá para ver los cupones de este local"
        title="Generar QR imprimible del local"
        ariaLabel="Generar QR imprimible del local"
        confirmTitle="¿Imprimir este QR para tu local?"
        confirmDescription={
          <>
            Quienes escaneen este QR van a entrar a <strong>{localName}</strong> y van a poder elegir uno de los cupones disponibles.
            <br />
            <br />
            El canje sigue el flujo seguro de siempre: primero se reclama el cupón y después se muestra el QR del cliente para validarlo en el local.
          </>
        }
        confirmActionLabel="Continuar"
        modalTitle="Imprimir QR del local"
        modalDescription="Elegí un tamaño para exportar un PDF con el QR permanente de la página de este local."
        buttonVariant="secondary"
        buttonSize="icon-sm"
        buttonClassName="h-9 w-9 rounded-xl"
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
      </ShareQrPdfButton>
    </div>
  );
}
