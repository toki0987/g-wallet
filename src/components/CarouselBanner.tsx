import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselBannerItem } from '../types/gwallet';

interface CarouselBannerProps {
  banners: CarouselBannerItem[];
  placement: 'middle' | 'end';
  onNavigateLink: (targetUrl: string) => void;
}

export const CarouselBanner: React.FC<CarouselBannerProps> = ({
  banners,
  placement,
  onNavigateLink,
}) => {
  const filtered = banners.filter((b) => b.placement === placement);
  const [index, setIndex] = useState(0);

  const safeIndex = filtered.length > 0 ? index % filtered.length : 0;
  const activeBanner = filtered[safeIndex];

  useEffect(() => {
    if (filtered.length <= 1 || !activeBanner) return;
    const ms = Math.max(2000, Math.min(20000, activeBanner.durationMs || 4500));
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % filtered.length);
    }, ms);
    return () => clearTimeout(timer);
  }, [filtered.length, safeIndex, activeBanner]);

  if (!activeBanner) return null;

  return (
    <section className="gw-glass rounded-2xl overflow-hidden relative">
      <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-[#F5B041] mb-2">
              {placement === 'middle' ? 'Spotlight Campaign' : 'Ecosystem Showcase'} · {safeIndex + 1} / {filtered.length}
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
              {activeBanner.title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              {activeBanner.subtitle}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => onNavigateLink(activeBanner.targetUrl)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs sm:text-sm cursor-pointer"
            >
              <span>{activeBanner.ctaText || 'Learn More'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {filtered.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev - 1 + filtered.length) % filtered.length)}
                  aria-label="Previous slide"
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev + 1) % filtered.length)}
                  aria-label="Next slide"
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-5 min-h-[170px] relative bg-gradient-to-br from-[#13224A] via-[#0B142C] to-[#060D1F] flex items-center justify-center overflow-hidden">
          {activeBanner.imageData ? (
            <img
              src={activeBanner.imageData}
              alt={activeBanner.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-6 text-center relative z-10">
              <div
                className="w-28 h-28 rounded-full mx-auto border border-[#F5B041]/30 flex items-center justify-center"
                style={{
                  background:
                    'radial-gradient(circle, rgba(245,176,65,0.22) 0%, rgba(6,13,31,0.9) 70%)',
                }}
              >
                <span className="font-display text-2xl font-bold gw-gold-text">GW</span>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Slide duration {(activeBanner.durationMs / 1000).toFixed(1)}s
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
