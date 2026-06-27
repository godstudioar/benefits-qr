import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { createHash } from "crypto";
import { NextRequest } from "next/server";

function normalizePath(path: string) {
  if (!path.startsWith("/")) return "/";
  if (path.length > 160) return path.slice(0, 160);
  return path;
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "";
  }
  return req.headers.get("x-real-ip") ?? "";
}

function isLocalhostRequest(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function buildVisitorHash(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";
  const acceptLanguage = req.headers.get("accept-language") ?? "";
  const seed = `${ip}|${userAgent}|${acceptLanguage}|${
    process.env.ADMIN_SESSION_SECRET ?? "qupon"
  }`;

  return createHash("sha256").update(seed).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Cuerpo inválido", 400, "INVALID_BODY");
  }

  if (isLocalhostRequest(req)) {
    return apiSuccess({ ok: true, skipped: true }, 200);
  }

  const path = normalizePath(String((body as Record<string, unknown>)?.path ?? "/"));
  const referrerRaw = String((body as Record<string, unknown>)?.referrer ?? "");
  const referrer = referrerRaw ? referrerRaw.slice(0, 300) : null;

  const visitorHash = buildVisitorHash(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const now = new Date();
  const visitedOn = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  await prisma.sitePageview.create({
    data: {
      path,
      visitorHash,
      userAgent,
      referrer,
      visitedOn,
    },
  });

  return apiSuccess({ ok: true }, 201);
}
