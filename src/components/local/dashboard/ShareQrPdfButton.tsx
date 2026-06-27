"use client";

import { useState, type ReactNode } from "react";
import { Printer } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  downloadShareQrPdf,
  shareQrPdfSizeOptions,
  type ShareQrPdfSize,
} from "@/lib/shareQrPdf";
import type { ButtonVisualSize, ButtonVisualVariant } from "@/components/ui/buttonStyles";

interface ShareQrPdfButtonProps {
  url: string;
  pdfCtaText?: string;
  title?: string;
  ariaLabel?: string;
  confirmTitle?: string;
  confirmDescription?: ReactNode;
  confirmActionLabel?: string;
  modalTitle?: string;
  modalDescription?: string;
  buttonVariant?: ButtonVisualVariant;
  buttonSize?: ButtonVisualSize;
  buttonClassName?: string;
  children?: ReactNode;
}

export default function ShareQrPdfButton({
  url,
  pdfCtaText,
  title = "Generar QR para imprimir",
  ariaLabel = "Generar QR para imprimir",
  confirmTitle = "¿Para imprimir en tu local?",
  confirmDescription = (
    <>
      Este QR es para que los clientes lo escaneen <strong>físicamente en tu negocio</strong>.
      <br />
      <br />
      <strong>No sirve para enviar por WhatsApp o email</strong> — para eso usá los botones de compartir de al lado.
    </>
  ),
  confirmActionLabel = "Entiendo, continuar",
  modalTitle = "Imprimir QR para local",
  modalDescription = "Elegí el tamaño del QR para exportar un PDF listo para imprimir y usar en tu negocio.",
  buttonVariant = "outline",
  buttonSize = "icon-2xs",
  buttonClassName = "rounded-lg bg-info-soft transition-[background-color,transform,box-shadow] duration-200 hover:bg-info-soft/95 hover:shadow-md hover:shadow-info/20 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
  children,
}: ShareQrPdfButtonProps) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [size, setSize] = useState<ShareQrPdfSize>("mediano");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsGenerating(true);
    setError(null);

    try {
      await downloadShareQrPdf(url, size, pdfCtaText);
      setOpen(false);
    } catch {
      setError("No pudimos generar el PDF. Intentá de nuevo en unos segundos.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setError(null);
          setShowConfirm(true);
        }}
        title={title}
        aria-label={ariaLabel}
        variant={buttonVariant}
        size={buttonSize}
        className={buttonClassName}
      >
        {children ?? <Printer aria-hidden="true" className="size-4 text-info" />}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent showCloseButton={false}>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={() => {
                  setShowConfirm(false);
                  setOpen(true);
                }}
              >
                {confirmActionLabel}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Modal
        open={open}
        onClose={() => {
          setError(null);
          setOpen(false);
        }}
        title={modalTitle}
        description={modalDescription}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="share-qr-pdf-size" className="block text-sm font-medium text-text-primary">
              Tamaño
            </label>

            <Select value={size} onValueChange={(value) => setSize(value as ShareQrPdfSize)}>
              <SelectTrigger id="share-qr-pdf-size" aria-label="Seleccionar tamaño del QR">
                <SelectValue placeholder="Seleccioná un tamaño" />
              </SelectTrigger>
              <SelectContent>
                {shareQrPdfSizeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center justify-between gap-3 pr-2">
                      <span>{option.label}</span>
                      <span className="text-xs text-current/70">{option.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="rounded-xl border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger" aria-live="polite">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setError(null);
                setOpen(false);
              }}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleDownload()} disabled={isGenerating}>
              {isGenerating ? "Generando..." : "Descargar PDF"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
