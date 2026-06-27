import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import { getLocalPublicPageData } from "@/server/services/localPublicPageService";

type FindFirstArgs = Parameters<typeof prisma.local.findFirst>[0];

type LocalDelegateLike = {
  findFirst: typeof prisma.local.findFirst;
};

const localDelegate = prisma.local as LocalDelegateLike;

function getCurrentArgentinaWeekday() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "short",
    })
      .format(new Date())
      .replace("Sun", "0")
      .replace("Mon", "1")
      .replace("Tue", "2")
      .replace("Wed", "3")
      .replace("Thu", "4")
      .replace("Fri", "5")
      .replace("Sat", "6"),
  );
}

test("local public page only queries public coupons", async () => {
  const originalFindFirst = localDelegate.findFirst;
  let capturedArgs: FindFirstArgs | undefined;

  localDelegate.findFirst = (async (args: FindFirstArgs) => {
    capturedArgs = args;
    return null;
  }) as typeof prisma.local.findFirst;

  try {
    await getLocalPublicPageData("local-123");
  } finally {
    localDelegate.findFirst = originalFindFirst;
  }

  assert.deepEqual(capturedArgs?.select?.beneficios.where, {
    deletedAt: null,
    esPublico: true,
  });
});

test("local public page keeps usable-now and claimable-later coupons separated", async () => {
  const originalFindFirst = localDelegate.findFirst;
  const todayWeekday = getCurrentArgentinaWeekday();
  const tomorrowWeekday = (todayWeekday + 1) % 7;

  localDelegate.findFirst = (async () => ({
    id: "local-123",
    nombre: "Cafe Centro",
    email: "hola@cafecentro.test",
    logoUrl: "https://cdn.example.com/logo.png",
    direccion: "Av. Siempre Viva 123",
    telefono: "11-5555-0000",
    rubro: { nombre: "Cafetería" },
    beneficios: [
      {
        id: "usable-now",
        descripcion: "2x1 en café",
        fechaExpiracion: new Date("2099-06-30T00:00:00-03:00"),
        maxUsos: null,
        diasValidos: [],
        ventanasHorarias: null,
        createdAt: new Date("2026-06-01T10:00:00-03:00"),
        reclamos: [],
      },
      {
        id: "claimable-later",
        descripcion: "Postre gratis",
        fechaExpiracion: new Date("2099-06-30T00:00:00-03:00"),
        maxUsos: null,
        diasValidos: [tomorrowWeekday],
        ventanasHorarias: null,
        createdAt: new Date("2026-06-02T10:00:00-03:00"),
        reclamos: [],
      },
      {
        id: "expired",
        descripcion: "Promo vencida",
        fechaExpiracion: new Date("2026-06-15T00:00:00-03:00"),
        maxUsos: null,
        diasValidos: [1],
        ventanasHorarias: { 1: { startMinute: 9 * 60, endMinute: 18 * 60 } },
        createdAt: new Date("2026-06-03T10:00:00-03:00"),
        reclamos: [],
      },
    ],
  })) as typeof prisma.local.findFirst;

  try {
    const result = await getLocalPublicPageData("local-123");

    assert.ok(result);
    assert.deepEqual(result.benefits.map((benefit) => benefit.id), ["usable-now"]);
    assert.deepEqual(
      result.claimableLaterBenefits.map((benefit) => benefit.id),
      ["claimable-later"],
    );
  } finally {
    localDelegate.findFirst = originalFindFirst;
  }
});
