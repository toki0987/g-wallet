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
                  className="w-
