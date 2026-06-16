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

const CANVAS_WIDTH = 700;
const QR_X = (CANVAS_WIDTH - QR_SIZE) / 2;
const QR_Y = 30;
const TEXT_PADDING = 35;
const TEXT_MAX_WIDTH = CANVAS_WIDTH - TEXT_PADDING * 2;

const INSTRUCCION =
  "Escaneá este QR con tu celular para ver tu regalo y luego acercate al local para canjearlo.";
const URL_TEXT = "www.qupon.com.ar";

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

  const lx = Math.round((QR_SIZE - bgSize) / 2);
  const ly = Math.round((QR_SIZE - bgSize) / 2);
  qrImage.composite(bg, lx, ly);

  const fontBody = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const fontUrl = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

  const instruccionHeight = Jimp.measureTextHeight(fontBody, INSTRUCCION, TEXT_MAX_WIDTH);
  const urlHeight = Jimp.measureTextHeight(fontUrl, URL_TEXT, TEXT_MAX_WIDTH);

  const GAP_AFTER_QR = 36;
  const GAP_BETWEEN = 20;
  const BOTTOM_PAD = 36;
  const CANVAS_HEIGHT =
    QR_Y + QR_SIZE + GAP_AFTER_QR + instruccionHeight + GAP_BETWEEN + urlHeight + BOTTOM_PAD;

  const canvas = new Jimp(CANVAS_WIDTH, CANVAS_HEIGHT, 0xffffffff);
  canvas.composite(qrImage, QR_X, QR_Y);

  const instruccionY = QR_Y + QR_SIZE + GAP_AFTER_QR;
  canvas.print(
    fontBody,
    TEXT_PADDING,
    instruccionY,
    { text: INSTRUCCION, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_TOP },
    TEXT_MAX_WIDTH,
    instruccionHeight
  );

  const urlY = instruccionY + instruccionHeight + GAP_BETWEEN;
  canvas.print(
    fontUrl,
    TEXT_PADDING,
    urlY,
    { text: URL_TEXT, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_TOP },
    TEXT_MAX_WIDTH,
    urlHeight
  );

  await canvas.writeAsync(outputFile);
  console.log(`✓ QR guardado en: ${outputFile}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
