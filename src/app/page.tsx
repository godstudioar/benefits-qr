import HowItWorks from "@/components/landing/HowItWorks";
import LandingAudienceCtas from "@/components/landing/LandingAudienceCtas";
import LandingHero from "@/components/landing/LandingHero";
import LandingNavbar from "@/components/landing/LandingNavbar";
import Playbooks from "@/components/landing/Playbooks";
import PublicBenefitsSection from "@/components/public-benefits/PublicBenefitsSection";

export const revalidate = 60;

export default function Home() {
  return (
    <main className="relative">
      <LandingNavbar />
      <LandingHero />
      <LandingAudienceCtas />

      <PublicBenefitsSection />
      <HowItWorks />
      <Playbooks />
      {/* <Pricing /> */}

      <footer className="bg-surface-soft border-t border-border-default py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted/60 mb-2">Contacto y reclamos</p>
            <div className="flex flex-col gap-1">
              <a
                href="mailto:qupon.qr@gmail.com"
                className="inline-flex items-center gap-1.5 text-sm text-text-muted/80 hover:text-primary transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                qupon.qr@gmail.com
              </a>
              <a
                href="https://instagram.com/qupon.com.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-text-muted/80 hover:text-primary transition-colors"
                aria-label="Instagram @qupon.com.ar"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
                @qupon.com.ar
              </a>
            </div>
          </div>
          <p className="text-sm text-text-muted/80">
            Creado por{" "}
            <a
              href="https://god.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full py-1 font-semibold transition-[transform,opacity] duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
              aria-label="GOD, abre god.com.ar en una nueva pestaña"
            >
              <span className="text-black">G</span>
              <span className="text-black">O</span>
              <span className="text-primary">D</span>
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
