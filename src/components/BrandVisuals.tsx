import React from 'react';
import { Cpu, Headphones, ShieldCheck, Smartphone, Watch, Wifi } from 'lucide-react';

export const GWalletEmblem: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="shrink-0"
  >
    <defs>
      <linearGradient id="gwGoldGrad" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FCE3A6" />
        <stop offset="48%" stopColor="#F5B041" />
        <stop offset="100%" stopColor="#B87314" />
      </linearGradient>
      <linearGradient id="gwNavyGrad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#122146" />
        <stop offset="100%" stopColor="#060D1F" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gwNavyGrad)" stroke="url(#gwGoldGrad)" strokeWidth="2.5" />
    <path
      d="M44 24.5C41.5 21 37.3 19 32.5 19C24.5 19 18 25.1 18 32.5C18 39.9 24.5 46 32.5 46C39.8 46 45.2 41.2 46 34.5H33.5V29.5H50.5C50.8 30.6 51 31.8 51 33C51 43.2 43.1 51 32.5 51C21.7 51 13 42.7 13 32.5C13 22.3 21.7 14 32.5 14C38.6 14 44.1 16.6 47.8 20.9L44 24.5Z"
      fill="url(#gwGoldGrad)"
    />
  </svg>
);

export const ProductVisual: React.FC<{
  imageData?: string;
  category: string;
  title: string;
}> = ({ imageData, category, title }) => {
  if (imageData && imageData.startsWith('data:image')) {
    return (
      <img
        src={imageData}
        alt={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  const lower = category.toLowerCase();
  const Icon = lower.includes('wear')
    ? Watch
    : lower.includes('audio')
    ? Headphones
    : lower.includes('connect')
    ? Wifi
    : lower.includes('phone')
    ? Smartphone
    : lower.includes('access')
    ? ShieldCheck
    : Cpu;

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0F1B38] via-[#091124] to-[#060D1F] flex flex-col items-center justify-center relative overflow-hidden p-4">
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 25%, rgba(245, 176, 65, 0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.25), transparent 55%)',
        }}
      />
      <div className="relative z-10 w-16 h-16 rounded-2xl border border-[#F5B041]/30 bg-[#060D1F]/80 flex items-center justify-center text-[#F5B041] shadow-lg">
        <Icon className="w-8 h-8" />
      </div>
      <span className="relative z-10 mt-3 text-[11px] font-medium tracking-wide text-slate-400">
        {category}
      </span>
    </div>
  );
};
