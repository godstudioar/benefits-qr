#!/usr/bin/env node

const QRCode = require("qrcode");
const Jimp = require("jimp");
const path = require("path");

const url = process.argv[2];
const outputFile = process.argv[3] || "qr-output.png";

if (!url) {
  console.error("Uso: node scripts/gen-qr.js \"<URL>\" [archivo-salida.png]");
  process.exit(1);
}

const QR_SIZE = 600;
const LOGO_RATIO = 0.22;
const LOGO_PADDING = 14;

async function main() {
  console.log(`Generando QR para: ${url}`);

  const qrBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: QR_SIZE,
    color: {
      dark: "#5B21B6",
      light: "#ffffff",
    },
  });

  const qrImage = await Jimp.read(qrBuffer);

  const logoPath = path.join(__dirname, "..", "public", "logo-min.png");
  const logo = await Jimp.read(logoPath);

  const logoSize = Math.round(QR_SIZE * LOGO_RATIO);
  logo.resize(logoSize, logoSize);

  const bgSize = logoSize + LOGO_PADDING * 2;
  const bg = new Jimp(bgSize, bgSize, 0xffffffff);
  bg.composite(logo, LOGO_PADDING, LOGO_PADDING);

  const x = Math.round((QR_SIZE - bgSize) / 2);
  const y = Math.round((QR_SIZE - bgSize) / 2);
  qrImage.composite(bg, x, y);

  await qrImage.writeAsync(outputFile);
  console.log(`✓ QR guardado en: ${outputFile}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
