"use client";

import { Menu, X } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import { useEffect, useId, useState, type MouseEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#perfil", label: "Ingresar" },
  { href: "#eventos", label: "Eventos" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#ideas", label: "Ideas" },
] as const;

export default function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState<(typeof NAV_ITEMS)[number]["href"]>("#inicio");
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) =>
      item.href.startsWith("#") ? document.querySelector<HTMLElement>(item.href) : null,
    ).filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length === 0) {
          return;
        }

        const activeSection = visibleEntries[0].target as HTMLElement;
        const matchedItem = NAV_ITEMS.find((item) => item.href === `#${activeSection.id}`);

        if (matchedItem) {
          setActiveHref(matchedItem.href);
        }
      },
      {
        rootMargin: "-30% 0px -45% 0px",
        threshold: [0.2, 0.35, 0.5, 0.65],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleAnchorClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: (typeof NAV_ITEMS)[number]["href"],
  ) => {
    if (!href.startsWith("#")) {
      setIsOpen(false);
      return;
    }

    const target = document.querySelector<HTMLElement>(href);

    if (!target) {
      setIsOpen(false);
      return;
    }

    event.preventDefault();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.history.pushState(null, "", href);
    setIsOpen(false);
    setActiveHref(href);

    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });

    requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
    });
  };

  return (
    <div className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <div className="relative w-full">
          <nav
            aria-label="Secciones de la landing"
            className="relative hidden w-full items-center rounded-full border border-primary/14 bg-surface-soft/88 p-1.5 pl-3 shadow-lg shadow-primary/12 sm:bg-surface/20 sm:backdrop-blur-md md:flex"
          >
            <a
              href="#inicio"
              onClick={(event) => handleAnchorClick(event, "#inicio")}
              className="z-10 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Ir al inicio"
            >
              <BrandLogo priority />
            </a>

            <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(event) => handleAnchorClick(event, item.href)}
                  aria-current={activeHref === item.href ? "location" : undefined}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    activeHref === item.href
                      ? "border-primary/24 bg-primary-soft/72 text-primary shadow-sm shadow-primary-soft/20"
                      : "border-transparent text-primary-muted hover:border-primary/22 hover:bg-primary-soft/70 hover:text-primary",
                  )}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="w-24 shrink-0" aria-hidden="true" />
          </nav>

          <div className="md:hidden">
            <div
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-full border shadow-lg px-3 py-2 transition-[background-color,border-color,box-shadow] duration-200 sm:shadow-xl sm:bg-surface/20 sm:backdrop-blur-md",
                isScrolled
                  ? "border-primary/14 bg-surface-soft/92 shadow-primary/14 sm:shadow-primary/18"
                  : "border-primary/10 bg-surface-soft/58 shadow-primary/10 sm:shadow-primary/12",
              )}
            >
              <a
                href="#inicio"
                onClick={(event) => handleAnchorClick(event, "#inicio")}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Ir al inicio"
              >
                <BrandLogo priority className="w-18 sm:w-24" />
              </a>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-expanded={isOpen}
                aria-controls={menuId}
                aria-label={isOpen ? "Cerrar navegación" : "Abrir navegación"}
                className={cn(
                  "rounded-full text-text-primary sm:bg-surface/35",
                  isScrolled
                    ? "border-primary/14 bg-surface-soft/92 shadow-md shadow-primary/14 sm:shadow-lg sm:shadow-primary/18"
                    : "border-primary/10 bg-surface-soft/70 shadow-sm shadow-primary/10 sm:shadow-md sm:shadow-primary/12",
                )}
                onClick={() => setIsOpen((open) => !open)}
              >
                {isOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
              </Button>
            </div>

            <nav
              id={menuId}
              aria-label="Secciones de la landing"
              className={cn(
                "absolute inset-x-0 mt-3 rounded-3xl border border-primary/22 bg-surface p-3 shadow-2xl shadow-primary/20 transition-all duration-200 ease-out sm:bg-surface/28 sm:backdrop-blur-md",
                isOpen
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-2 opacity-0",
              )}
            >
              <ul className="grid gap-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={(event) => handleAnchorClick(event, item.href)}
                      aria-current={activeHref === item.href ? "location" : undefined}
                      className={cn(
                        "block rounded-2xl border px-4 py-3 text-sm font-medium transition-[color,background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        activeHref === item.href
                          ? "border-primary/24 bg-primary-soft/72 text-primary"
                          : "border-transparent text-text-primary hover:bg-surface-soft",
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
