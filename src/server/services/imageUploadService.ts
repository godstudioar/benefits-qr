const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const QUALITY_STEPS = [82, 76, 70, 64, 58, 52, 46, 40, 34, 28];

type OptimizeOptions = {
  dimensionSteps: number[];
  maxOutputBytes: number;
};

type OptimizedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

type UploadResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string; code: string };

export async function optimizeImageFile(
  file: File,
  options: OptimizeOptions,
): Promise<OptimizedImage> {
  const sharp = (await import("sharp")).default;
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let lastCandidate: Buffer | null = null;

  for (const dimension of options.dimensionSteps) {
    const resizedBuffer = await sharp(inputBuffer, { animated: false })
      .rotate()
      .resize(dimension, dimension, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    for (const quality of QUALITY_STEPS) {
      const candidate = await sharp(resizedBuffer)
        .webp({ quality })
        .toBuffer();

      lastCandidate = candidate;

      if (candidate.byteLength <= options.maxOutputBytes) {
        return { buffer: candidate, contentType: "image/webp", extension: "webp" };
      }
    }
  }

  return {
    buffer: lastCandidate ?? inputBuffer,
    contentType: "image/webp",
    extension: "webp",
  };
}

export function validateImageFile(
  file: File | null,
): { ok: true; file: File } | { ok: false; status: number; error: string; code: string } {
  if (!file) {
    return { ok: false, status: 400, error: "Archivo requerido", code: "FILE_REQUIRED" };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      status: 400,
      error: "Solo se permiten imágenes JPG, PNG, WebP o GIF",
      code: "INVALID_FILE_TYPE",
    };
  }

  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      status: 400,
      error: "La imagen no puede superar 10MB",
      code: "FILE_TOO_LARGE",
    };
  }

  return { ok: true, file };
}

export async function uploadImageToStorage(
  optimized: OptimizedImage,
  storagePath: string,
  maxOutputBytes: number,
): Promise<UploadResult> {
  if (optimized.buffer.byteLength > maxOutputBytes) {
    return {
      ok: false,
      status: 400,
      error: `No se pudo reducir la imagen. Probá con otra imagen.`,
      code: "IMAGE_TOO_HEAVY_AFTER_OPTIMIZATION",
    };
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blobBody = new Uint8Array(optimized.buffer);
    const blob = await put(
      storagePath,
      new Blob([blobBody], { type: optimized.contentType }),
      { access: "public", addRandomSuffix: true },
    );
    return { ok: true, url: blob.url };
  }

  const base64 = optimized.buffer.toString("base64");
  return { ok: true, url: `data:${optimized.contentType};base64,${base64}` };
}
