"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import BrandLogo from "@/components/ui/BrandLogo";
import { cn } from "@/lib/utils";

type AuthenticatedNavbarProps = {
  logoutEndpoint: "/api/auth/logout" | "/api/auth/cliente/logout";
};

export default function AuthenticatedNavbar({
  logoutEndpoint,
}: AuthenticatedNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-40 px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8 lg:pt-5">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <nav
          aria-label="Navegación autenticada de escritorio"
          className="hidden w-full items-center justify-between rounded-full border border-primary/14 bg-surface-soft/88 px-3 py-1.5 shadow-lg shadow-primary/12 sm:bg-surface/20 sm:backdrop-blur-md md:flex"
        >
          <Link
            href="/"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Ir al inicio de Qupon"
          >
            <BrandLogo priority />
          </Link>

          <LogoutButton logoutEndpoint={logoutEndpoint} />
        </nav>

        <nav
          aria-label="Navegación autenticada móvil"
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-full border px-3 py-2 shadow-lg transition-[background-color,border-color,box-shadow] duration-200 sm:bg-surface/20 sm:backdrop-blur-md sm:shadow-xl md:hidden",
            isScrolled
              ? "border-primary/14 bg-surface-soft/92 shadow-primary/14 sm:shadow-primary/18"
              : "border-primary/10 bg-surface-soft/58 shadow-primary/10 sm:shadow-primary/12",
          )}
        >
          <Link
            href="/"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Ir al inicio de Qupon"
          >
            <BrandLogo priority className="w-18 sm:w-24" />
          </Link>

          <LogoutButton logoutEndpoint={logoutEndpoint} />
        </nav>
      </div>
    </div>
  );
}
