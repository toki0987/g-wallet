import React from 'react';
import {
  Crown,
  Fingerprint,
  Globe,
  LogIn,
  LogOut,
  MapPin,
  Shield,
  Sparkles,
  UserCheck,
  Wallet,
  Radio,
  ShoppingBag,
  CreditCard,
  Users,
  Network,
  LayoutGrid,
} from 'lucide-react';
import {
  AppTab,
  CountryCurrencyConfig,
  LanguageCode,
  SUPPORTED_COUNTRIES,
  UserProfile,
} from '../types/gwallet';
import { TranslationDictionary } from '../i18n/translations';
import { GWalletEmblem } from './BrandVisuals';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  lang: LanguageCode;
  onChangeLang: (lang: LanguageCode) => void;
  country: CountryCurrencyConfig;
  onChangeCountry: (code: string) => void;
  onDetectGps: () => void;
  gpsDetecting: boolean;
  onOpenJoinMe: () => void;
  joinMeOpen: boolean;
  profile: UserProfile | null;
  isAdmin: boolean;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  t: TranslationDictionary;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  lang,
  onChangeLang,
  country,
  onChangeCountry,
  onDetectGps,
  gpsDetecting,
  onOpenJoinMe,
  joinMeOpen,
  profile,
  isAdmin,
  onOpenAuthModal,
  onSignOut,
  t,
}) => {
  const navItems: { id: AppTab; label: string }[] = [
    { id: 'overview', label: t.navOverview },
    { id: 'wallets', label: t.navWallets },
    { id: 'telecom', label: t.navTelecom },
    { id: 'shop', label: t.navShop },
    { id: 'cards', label: t.navCards },
    { id: 'community', label: t.navCommunity },
    { id: 'referrals', label: t.navReferrals },
  ];
  if (isAdmin) {
    navItems.push({ id: 'admin', label: t.navAdmin });
  }

  const mobileNavItems: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: t.navOverview, icon: LayoutGrid },
    { id: 'wallets', label: t.navWallets, icon: Wallet },
    { id: 'telecom', label: t.navTelecom, icon: Radio },
    { id: 'shop', label: t.navShop, icon: ShoppingBag },
    { id: 'cards', label: t.navCards, icon: CreditCard },
    { id: 'community', label: t.navCommunity, icon: Users },
    { id: 'referrals', label: t.navReferrals, icon: Network },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#F5B041]/20 bg-[#060D1F]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => onSelectTab('overview')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          >
            <GWalletEmblem size={36} />
            <span className="font-display text-lg font-bold tracking-tight gw-gold-text whitespace-nowrap">
              {t.brandName}
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4 overflow-x-auto">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`text-xs xl:text-sm font-medium whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    active
                      ? 'text-[#F5B041] bg-[#F5B041]/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Action Cluster: GPS/Country, Globe Lang, Gold Membership, Purple Join Me, Account */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Country & GPS Switcher */}
            <div className="hidden sm:flex items-center bg-[#0B142B] border border-white/10 rounded-xl px-2 py-1 gap-1">
              <button
                type="button"
                onClick={onDetectGps}
                title={t.detectGps}
                className="p-1 text-[#F5B041] hover:bg-white/5 rounded-lg cursor-pointer"
              >
                <MapPin className={`w-3.5 h-3.5 ${gpsDetecting ? 'animate-spin' : ''}`} />
              </button>
              <select
                aria-label="Select country and currency"
                value={country.code}
                onChange={(e) => onChangeCountry(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#060D1F] text-white">
                    {c.code} · {c.currencyCode}
                  </option>
                ))}
              </select>
            </div>

            {/* Top-Right Globe Language Switcher */}
            <div className="flex items-center bg-[#0B142B] border border-white/10 rounded-xl px-2 py-1 gap-1">
              <Globe className="w-3.5 h-3.5 text-[#F5B041] shrink-0" />
              <select
                aria-label="Language selector"
                value={lang}
                onChange={(e) => onChangeLang(e.target.value as LanguageCode)}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-[#060D1F] text-white">EN</option>
                <option value="bn" className="bg-[#060D1F] text-white">বাংলা</option>
                <option value="ar" className="bg-[#060D1F] text-white">العربية</option>
                <option value="hi" className="bg-[#060D1F] text-white">हिन्दी</option>
              </select>
            </div>

            {/* 1. Golden Glowing Sparkling Membership Icon */}
            <button
              type="button"
              onClick={() => onSelectTab('membership')}
              title={t.membershipBtn}
              aria-label={t.membershipBtn}
              className="relative min-w-[40px] h-10 px-2.5 rounded-xl bg-gradient-to-br from-[#FCE3A6] via-[#F5B041] to-[#B87314] text-[#060D1F] glow-gold flex items-center gap-1.5 font-semibold text-xs hover:brightness-110 transition-all cursor-pointer shrink-0"
            >
              <Crown className="w-4 h-4" />
              <Sparkles className="w-3 h-3 hidden md:inline" />
              <span className="hidden xl:inline whitespace-nowrap">{t.membershipBtn}</span>
            </button>

            {/* 2. Purplish Glowing Sparkling "Join Me" Icon */}
            <button
              type="button"
              onClick={onOpenJoinMe}
              title={t.joinMeBtn}
              aria-label={t.joinMeBtn}
              aria-expanded={joinMeOpen}
              className="relative min-w-[40px] h-10 px-2.5 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-600 to-indigo-600 text-white glow-purple flex items-center gap-1.5 font-semibold text-xs hover:brightness-110 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden md:inline whitespace-nowrap">{t.joinMeBtn}</span>
            </button>

            {/* Account / Auth Button */}
            {profile ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="h-10 px-3 rounded-xl bg-[#10192E] border border-[#F5B041]/30 hover:border-[#F5B041] flex items-center gap-2 text-xs font-medium text-slate-100 cursor-pointer shrink-0"
                >
                  {profile.biometricEnabled ? (
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-[#F5B041]" />
                  )}
                  <span className="hidden sm:inline font-mono-tabular">{profile.memberId}</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onSelectTab('admin')}
                    title={t.navAdmin}
                    className="lg:hidden h-10 w-10 rounded-xl bg-[#F5B041]/15 border border-[#F5B041]/40 text-[#F5B041] flex items-center justify-center cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSignOut}
                  title={t.signOut}
                  className="h-10 w-10 rounded-xl bg-white/5 hover:bg-red-500/15 text-slate-300 hover:text-red-300 flex items-center justify-center cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="h-10 px-3.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer shrink-0 whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.signIn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Ergonomic Thumb-Zone Navigation (<=15% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#060D1F]/95 backdrop-blur-xl border-t border-[#F5B041]/20 px-1 py-1.5"
      >
        <div className="grid grid-cols-7 gap-0.5 max-w-lg mx-auto">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center rounded-lg px-0.5 transition-colors cursor-pointer ${
                  active ? 'text-[#F5B041] bg-[#F5B041]/10' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium truncate max-w-full mt-0.5">
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
