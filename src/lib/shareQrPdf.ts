import { PDFDocument, rgb } from "pdf-lib";
import { generateQRDataURL } from "@/lib/qr";

const MM_TO_POINTS = 72 / 25.4;
const BRAND_LOGO_PATH = "/logo-min.png";
const BRAND_URL = "www.qupon.com.ar";

const Q_CENTER_X_FRAC = 0.499;
const Q_CENTER_Y_FRAC = 0.503;
const QR_TO_Q_RATIO = 0.42;

const Q_OUTLINE_PATH =
  "m393.5 40.1c-50.5 2.1-101 15.1-148.5 38.5-67.7 33.3-132.7 99.9-165.1 169.2-14 29.8-25.1 " +
  "63-29.9 89.5-8.8 49-9 91.7-0.4 138.7 11.2 61.5 41.7 124.8 82.3 171 35.5 40.5 75.3 71.3 " +
  "120.6 93.5 32.3 15.8 60.5 24.9 94.5 30.5 4.1 0.7 8.4 1.4 9.4 1.6 4.3 0.8 22.9 2.5 35.1 " +
  "3.2 59.5 3.5 122.6-9.7 177.1-37.1 12.7-6.4 34.9-19.7 42.4-25.4 9.3-7.1 18.3-13.3 19.3-13.3 " +
  "0.6 0 17.7 16.6 38.1 37 20.4 20.3 37.5 37 37.9 37 1.1 0.2 64.7-62.7 64.7-63.9 0-0.4-16.6" +
  "-17.7-37-38.4-20.3-20.6-37-38-37-38.7 0-0.6 1.9-3.7 4.3-6.8 16.3-21.5 28.5-42.5 40.1-68.8 " +
  "22.6-51.6 32.9-104.1 31.3-159.9-1.4-48.3-11.2-92.3-30.6-137.4-7.6-17.6-8.5-19.5-17.4-34.6" +
  "-18.4-31.4-35.5-53.5-61.6-79.5-42-41.9-87.7-70.3-141.4-87.9-42.1-13.8-84.3-19.7-128.2-18z" +
  "m41 95.4c42 4.4 76 15.7 112 37.3 56.4 33.8 100.7 91.8 119.8 156.7 8.8 29.7 13 67.2 10.8 " +
  "96-3.7 48.1-15.7 86.6-39 125.6-3.5 5.9-7.3 11.9-8.5 13.4l-2.1 2.6-31.5-31.3c-34.6-34.5" +
  "-37.9-37.1-47.4-36.9-9 0.1-13 2.6-31.3 19.9-18.2 17.3-21.7 21.4-23.9 28.8-2 6.7-1.8 9.1 " +
  "1.4 15.9 2.5 5.2 7.1 10.1 34.6 37 17.4 17 31.5 31.5 31.4 32.3-0.4 1.9-18.3 13-34.1 21.1" +
  "-30.8 15.7-61.4 24.5-96.2 27.6-30.8 2.7-66.7-1.2-99-10.6-19.1-5.6-46.1-18.1-64.6-29.9-31.6" +
  "-20-64.3-52.2-83.9-82.5-37.1-57.3-51.6-127.9-40.4-196 2.5-15.3 4.4-23.6 7.6-34 11.9-38.8 " +
  "33.6-77.3 60-106.2 41.6-45.7 96.3-75.5 155.5-84.8 22.6-3.5 47.4-4.2 68.8-2z";

export const shareQrPdfSizeOptions = [
  {
    value: "chico",
    label: "Chico",
    description: "QR de 6 cm",
    qrSizeMm: 60,
    pixelWidth: 900,
  },
  {
    value: "mediano",
    label: "Mediano",
    description: "QR de 8 cm",
    qrSizeMm: 80,
    pixelWidth: 1200,
  },
  {
    value: "grande",
    label: "Grande",
    description: "QR de 10 cm",
    qrSizeMm: 100,
    pixelWidth: 1600,
  },
] as const;

export type ShareQrPdfSize = (typeof shareQrPdfSizeOptions)[number]["value"];

function mmToPoints(mm: number) {
  return mm * MM_TO_POINTS;
}

async function loadBrandLogoBytes() {
  try {
    const response = await fetch(BRAND_LOGO_PATH, { cache: "force-cache" });

    if (!response.ok) {
      return null;
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function getPdfSizeOption(size: ShareQrPdfSize) {
  return shareQrPdfSizeOptions.find((option) => option.value === size) ?? shareQrPdfSizeOptions[1];
}

async function loadSvgImage(svgMarkup: string): Promise<HTMLImageElement> {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface PageBackgroundOpts {
  widthPx: number;
  heightPx: number;
  qFrame: { x: number; y: number; size: number };
  qrArea: { x: number; y: number; w: number; h: number };
}

async function renderPageBackgroundDataUrl(opts: PageBackgroundOpts): Promise<string> {
  const { widthPx, heightPx, qFrame, qrArea } = opts;

  const qSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 812 812"` +
    ` width="${qFrame.size}" height="${qFrame.size}">` +
    `<path fill="#7c3aed" d="${Q_OUTLINE_PATH}"/>` +
    `</svg>`;
  const qImg = await loadSvgImage(qSvg);

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d")!;

  const cx = widthPx / 2;
  const cy = heightPx * 0.46;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(widthPx, heightPx) * 0.72);
  grad.addColorStop(0, "#f5edff");
  grad.addColorStop(0.55, "#faf7ff");
  grad.addColorStop(1, "#ffffff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, widthPx, heightPx);

  ctx.save();
  ctx.shadowColor = "rgba(109, 40, 217, 0.22)";
  ctx.shadowBlur = qFrame.size * 0.045;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = qFrame.size * 0.018;
  ctx.drawImage(qImg, qFrame.x, qFrame.y, qFrame.size, qFrame.size);
  ctx.restore();

  const pad = qrArea.w * 0.06;
  const rx = qrArea.w * 0.07;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrArea.x - pad, qrArea.y - pad, qrArea.w + pad * 2, qrArea.h + pad * 2, rx);
  ctx.fill();

  return canvas.toDataURL("image/png");
}

export async function downloadShareQrPdf(
  url: string,
  size: ShareQrPdfSize,
  ctaText = "Escaneá para canjear tu beneficio"
) {
  const selectedSize = getPdfSizeOption(size);

  const qrSizeMm = selectedSize.qrSizeMm;
  const qFrameSizeMm = qrSizeMm / QR_TO_Q_RATIO;

  const padding = mmToPoints(12);
  const textAreaHeight = mmToPoints(10);
  const footerHeight = mmToPoints(14);
  const qFrameSize = mmToPoints(qFrameSizeMm);
  const qrSize = mmToPoints(qrSizeMm);
  const pageWidth = qFrameSize + padding * 2;
  const pageHeight = qFrameSize + padding * 2 + textAreaHeight + footerHeight;

  const pxPerPt = 2.5;
  const wPx = Math.round(pageWidth * pxPerPt);
  const hPx = Math.round(pageHeight * pxPerPt);
  const qFramePx = Math.round(qFrameSize * pxPerPt);
  const paddingPx = Math.round(padding * pxPerPt);
  const qrSizePx = Math.round(qrSize * pxPerPt);

  const qFrameXPx = paddingPx;
  const qFrameYPx = paddingPx;

  const qrCenterXPx = qFrameXPx + qFramePx * Q_CENTER_X_FRAC;
  const qrCenterYPx = qFrameYPx + qFramePx * Q_CENTER_Y_FRAC;

  const [qrDataUrl, brandLogoBytes, bgDataUrl] = await Promise.all([
    generateQRDataURL(url, { width: selectedSize.pixelWidth }),
    loadBrandLogoBytes(),
    renderPageBackgroundDataUrl({
      widthPx: wPx,
      heightPx: hPx,
      qFrame: { x: qFrameXPx, y: qFrameYPx, size: qFramePx },
      qrArea: {
        x: qrCenterXPx - qrSizePx / 2,
        y: qrCenterYPx - qrSizePx / 2,
        w: qrSizePx,
        h: qrSizePx,
      },
    }),
  ]);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);

  const bgImage = await pdf.embedPng(bgDataUrl);
  page.drawImage(bgImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

  const qrImage = await pdf.embedPng(qrDataUrl);
  const qrCenterXPt = padding + qFrameSize * Q_CENTER_X_FRAC;
  const qrCenterYPt = padding + textAreaHeight + footerHeight + qFrameSize * (1 - Q_CENTER_Y_FRAC);
  page.drawImage(qrImage, {
    x: qrCenterXPt - qrSize / 2,
    y: qrCenterYPt - qrSize / 2,
    width: qrSize,
    height: qrSize,
  });

  const borderInset = mmToPoints(3);
  page.drawRectangle({
    x: borderInset,
    y: borderInset,
    width: pageWidth - borderInset * 2,
    height: pageHeight - borderInset * 2,
    borderColor: rgb(0.486, 0.228, 0.929),
    borderWidth: 0.75,
    borderOpacity: 0.15,
    opacity: 0,
    color: rgb(1, 1, 1),
  });

  const ctaSize = 10;
  const ctaFont = await pdf.embedFont("Helvetica");
  const ctaWidth = ctaFont.widthOfTextAtSize(ctaText, ctaSize);
  const ctaCenterY = padding + footerHeight + textAreaHeight / 2;
  page.drawText(ctaText, {
    x: (pageWidth - ctaWidth) / 2,
    y: ctaCenterY - ctaSize / 2,
    size: ctaSize,
    font: ctaFont,
    color: rgb(0.486, 0.228, 0.929),
    opacity: 0.6,
  });

  const footerCenterY = padding + footerHeight / 2;
  const textSize = 9;
  const textWidth = BRAND_URL.length * 4.8;

  if (brandLogoBytes) {
    const brandLogo = await pdf.embedPng(brandLogoBytes);
    const logoWidth = mmToPoints(12);
    const logoHeight = (brandLogo.height / brandLogo.width) * logoWidth;
    const gap = mmToPoints(2.5);
    const totalBrandWidth = logoWidth + gap + textWidth;
    const startX = (pageWidth - totalBrandWidth) / 2;

    page.drawImage(brandLogo, {
      x: startX,
      y: footerCenterY - logoHeight / 2,
      width: logoWidth,
      height: logoHeight,
      opacity: 0.18,
    });

    page.drawText(BRAND_URL, {
      x: startX + logoWidth + gap,
      y: footerCenterY - textSize / 2 + 1,
      size: textSize,
      opacity: 0.45,
    });
  } else {
    page.drawText(BRAND_URL, {
      x: (pageWidth - textWidth) / 2,
      y: footerCenterY - textSize / 2 + 1,
      size: textSize,
      opacity: 0.45,
    });
  }

  const pdfBytes = await pdf.save();
  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = `benefitqr-${selectedSize.value}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}
