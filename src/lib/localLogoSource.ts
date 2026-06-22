import { logoVersion } from "@/lib/logoVersion";

type LocalLogoSourceInput = {
  localId: string | null | undefined;
  logoUrl: string | null | undefined;
};

export function getLocalLogoDisplayUrl({ localId, logoUrl }: LocalLogoSourceInput): string | null {
  if (!localId || !logoUrl) {
    return null;
  }

  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }

  if (logoUrl.startsWith("data:")) {
    const version = logoVersion(logoUrl);
    return `/api/locales/${localId}/logo?v=${version}`;
  }

  return null;
}
