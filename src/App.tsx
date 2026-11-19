import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CreditCard,
  Fingerprint,
  Network,
  Radio,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import { formatSupabaseError, supabase } from './lib/supabase';
import {
  claimPendingWalletCredits,
  ensureUserProfile,
  isMasterAdminEmail,
  mapAppConfigRow,
  mapCardRow,
  mapCommunityMsgRow,
  mapDokanRow,
  mapEscrowRow,
  mapOrderRow,
  mapPostRow,
  mapProductRow,
  mapProfileRow,
  mapReferralRow,
  mapTelecomRow,
  mapTxRow,
} from './lib/gwalletService';
import {
  DEFAULT_APP_CONFIG,
  INITIAL_COMMUNITY_POSTS,
  INITIAL_DOKANS,
  INITIAL_PRODUCTS,
  INITIAL_TELECOM_OFFERS,
  formatMoneyFromUsd,
  getCountryConfig,
} from './lib/seedData';
import { TRANSLATIONS } from './i18n/translations';
import {
  AppConfig,
  AppTab,
  CommunityMessage,
  CommunityPost,
  EscrowRecord,
  LanguageCode,
  MarketplaceProduct,
  ReferralCommission,
  SellerDokan,
  ShopOrder,
  TelecomOffer,
  UserProfile,
  VirtualCard,
  WalletTransaction,
} from './types/gwallet';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { JoinMeShutter, StartupSequence, StartupStage } from './components/StartupSequence';
import { CarouselBanner } from './components/CarouselBanner';
import { AuthKycModal } from './components/AuthKycModal';
import { WalletEscrowView } from './components/WalletEscrowView';
import { TelecomMarketplaceView } from './components/TelecomMarketplaceView';
import { ShopDokanView } from './components/ShopDokanView';
import { VirtualCardsView } from './components/VirtualCardsView';
import { CommunityWheelView } from './components/CommunityWheelView';
import { ReferralSystemView } from './components/ReferralSystemView';
import { MembershipView } from './components/MembershipView';
import { AdminPanelView } from './components/AdminPanelView';

function GWalletApp() {
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [lang, setLang] = useState<LanguageCode>('en');
  const [countryCode, setCountryCode] = useState<string>('BD');
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Sequential Startup Pop-Up System: 1 (Membership) -> 2 (Join Me) -> 3 (Admin Ad) -> done
  const [startupStage, setStartupStage] = useState<StartupStage>('membership');
  const [joinMeManualOpen, setJoinMeManualOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);

  // Auth & User State
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Public & CMS State
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [telecomOffers, setTelecomOffers] = useState<TelecomOffer[]>(INITIAL_TELECOM_OFFERS);
  const [dokans, setDokans] = useState<SellerDokan[]>(INITIAL_DOKANS);
  const [products, setProducts] = useState<MarketplaceProduct[]>(INITIAL_PRODUCTS);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(INITIAL_COMMUNITY_POSTS);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);

  // Private User & Admin Data
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [virtualCards, setVirtualCards] = useState<VirtualCard[]>([]);
  const [referrals, setReferrals] = useState<ReferralCommission[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Toast Notification
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 3600);
  }, []);

  const t = TRANSLATIONS[lang];
  const country = getCountryConfig(countryCode);
  const isAdmin = isMasterAdminEmail(profile?.email || authEmail) || profile?.role === 'admin';

  // GPS locale detection
  const handleDetectGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      showToast('GPS unavailable in this browser; switch country manually.', 'error');
      return;
    }
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let detected = 'US';
        if (latitude >= 20 && latitude <= 27 && longitude >= 88 && longitude <= 93) {
          detected = 'BD';
        } else if (latitude >= 6 && latitude <= 36 && longitude >= 68 && longitude <= 97) {
          detected = 'IN';
        } else if (latitude >= 16 && latitude <= 32 && longitude >= 34 && longitude <= 56) {
          detected = longitude > 51 ? 'AE' : 'SA';
        } else if (latitude >= 49 && latitude <= 60 && longitude >= -8 && longitude <= 2) {
          detected = 'GB';
        }
        setCountryCode(detected);
        setGpsDetecting(false);
        showToast(`GPS calibrated region: ${getCountryConfig(detected).name}`, 'success');
      },
      () => {
        setGpsDetecting(false);
      },
      { timeout: 5000 }
    );
  }, [showToast]);

  useEffect(() => {
    handleDetectGps();
  }, [handleDetectGps]);

  // Load Public CMS & Catalog Data from Supabase
  const refreshPublicData = useCallback(async () => {
    try {
      const [cfgRes, telRes, dokRes, prodRes, postRes, msgRes] = await Promise.all([
        supabase.from('app_config').select('*').eq('id', 'global').maybeSingle(),
        supabase.from('telecom_offers').select('*').order('created_at', { ascending: false }),
        supabase.from('seller_dokans').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('community_messages').select('*').order('created_at', { ascending: true }).limit(100),
      ]);

      if (cfgRes.data) setAppConfig(mapAppConfigRow(cfgRes.data));
      if (telRes.data && telRes.data.length > 0) setTelecomOffers(telRes.data.map(mapTelecomRow));
      if (dokRes.data && dokRes.data.length > 0) setDokans(dokRes.data.map(mapDokanRow));
      if (prodRes.data && prodRes.data.length > 0) setProducts(prodRes.data.map(mapProductRow));
      if (postRes.data && postRes.data.length > 0) setCommunityPosts(postRes.data.map(mapPostRow));
      if (msgRes.data) setCommunityMessages(msgRes.data.map(mapCommunityMsgRow));
    } catch (err) {
      console.warn('Supabase public fetch fallback:', err);
    }
  }, []);

  // Load Authenticated User Data from Supabase
  const refreshUserData = useCallback(
    async (uidOverride?: string, emailOverride?: string) => {
      const targetUid = uidOverride || authUid;
      const targetEmail = emailOverride || authEmail;
      if (!targetUid) return;

      try {
        const added = await claimPendingWalletCredits();
        if (added > 0) {
          showToast(`Received +$${added.toFixed(2)} USD credit!`, 'success');
        }

        const adminUser = isMasterAdminEmail(targetEmail);

        const [profRes, txRes, escRes, ordRes, cardRes, refRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('uid', targetUid).maybeSingle(),
          supabase.from('transactions').select('*').eq('uid', targetUid).order('created_at', { ascending: false }),
          adminUser
            ? supabase.from('escrows').select('*').order('created_at', { ascending: false })
            : supabase
                .from('escrows')
                .select('*')
                .or(`buyer_uid.eq.${targetUid},seller_uid.eq.${targetUid}`)
                .order('created_at', { ascending: false }),
          supabase.from('orders').select('*').eq('buyer_uid', targetUid).order('created_at', { ascending: false }),
          supabase.from('virtual_cards').select('*').eq('owner_uid', targetUid).order('created_at', { ascending: false }),
          supabase.from('referrals').select('*').eq('beneficiary_uid', targetUid).order('created_at', { ascending: false }),
        ]);

        if (profRes.data) setProfile(mapProfileRow(profRes.data));
        if (txRes.data) setTransactions(txRes.data.map(mapTxRow));
        if (escRes.data) setEscrows(escRes.data.map(mapEscrowRow));
        if (ordRes.data) setOrders(ordRes.data.map(mapOrderRow));
        if (cardRes.data) setVirtualCards(cardRes.data.map(mapCardRow));
        if (refRes.data) setReferrals(refRes.data.map(mapReferralRow));

        if (adminUser || profRes.data?.role === 'admin') {
          const { data: usersData } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (usersData) setAllUsers(usersData.map(mapProfileRow));
        }
      } catch (err) {
        console.warn('Supabase user refresh warning:', err);
      }
    },
    [authUid, authEmail, showToast]
  );

  const refreshAllData = useCallback(async () => {
    await Promise.all([refreshPublicData(), refreshUserData()]);
  }, [refreshPublicData, refreshUserData]);

  // Initial public load & Supabase Realtime subscription
  useEffect(() => {
    refreshPublicData();

    const channel = supabase
      .channel('gwallet-realtime-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => refreshPublicData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telecom_offers' }, () => refreshPublicData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_dokans' }, () => refreshPublicData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => refreshPublicData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => refreshPublicData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, () => refreshPublicData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshPublicData]);

  // Supabase Auth Session & State Change Listener
  useEffect(() => {
    let active = true;

    const syncSession = async (session: any) => {
      if (!active) return;
      const user = session?.user;
      if (!user) {
        setAuthUid(null);
        setAuthEmail('');
        setProfile(null);
        setTransactions([]);
        setEscrows([]);
        setOrders([]);
        setVirtualCards([]);
        setReferrals([]);
        setAllUsers([]);
        return;
      }

      setAuthUid(user.id);
      setAuthEmail(user.email || '');

      try {
        const meta = user.user_metadata || {};
        const ensured = await ensureUserProfile({
          uid: user.id,
          email: user.email || '',
          displayName: meta.display_name || meta.full_name || user.email?.split('@')[0] || 'G Wallet Member',
          preferredRole: meta.role === 'seller' ? 'seller' : 'buyer',
          countryCode,
          currencyCode: country.currencyCode,
          referredByCode: meta.referral_code || '',
        });
        if (active) setProfile(ensured);
        await refreshUserData(user.id, user.email || '');
      } catch (err) {
        console.warn('Profile ensure/refresh warning:', err);
      }
    };

    supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [countryCode, country.currencyCode, refreshUserData]);

  // Authenticated User Realtime Channel
  useEffect(() => {
    if (!authUid) return;

    const userChannel = supabase
      .channel(`gwallet-user-${authUid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refreshUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_credits' }, () => refreshUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => refreshUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrows' }, () => refreshUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refreshUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'virtual_cards' }, () => refreshUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => refreshUserData())
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, [authUid, refreshUserData]);

  const handleEmailAuth = async (params: {
    mode: 'signin' | 'signup';
    email: string;
    password: string;
    displayName: string;
    role: 'buyer' | 'seller';
    referralCode: string;
  }) => {
    if (params.mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: {
            display_name: params.displayName.trim() || 'G Wallet Member',
            role: params.role,
            referral_code: params.referralCode.trim().toUpperCase(),
          },
        },
      });
      if (error) formatSupabaseError(error, 'auth.signUp');
      if (data.user && data.session) {
        const ensured = await ensureUserProfile({
          uid: data.user.id,
          email: data.user.email || params.email,
          displayName: params.displayName.trim() || 'G Wallet Member',
          preferredRole: params.role,
          countryCode,
          currencyCode: country.currencyCode,
          referredByCode: params.referralCode,
        });
        setProfile(ensured);
        await refreshUserData(data.user.id, data.user.email || params.email);
        showToast(`Welcome to G Wallet (${ensured.memberId})!`, 'success');
      } else {
        showToast('Account created! Verify your email link if required, then sign in.', 'success');
      }
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email.trim(),
      password: params.password,
    });
    if (error) formatSupabaseError(error, 'auth.signIn');
    if (data.user) {
      await refreshUserData(data.user.id, data.user.email || params.email);
      showToast('Signed in to G Wallet!', 'success');
    }
  };

  const handleGoogleSignIn = async (role: 'buyer' | 'seller', referralCode: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          gw_role: role,
          gw_ref: referralCode,
        },
      },
    });
    if (error) formatSupabaseError(error, 'auth.googleOAuth');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    showToast('Signed out cleanly.', 'success');
  };

  const handleNavigateLink = (targetUrl: string) => {
    const clean = targetUrl.replace('#', '') as AppTab;
    const validTabs: AppTab[] = [
      'overview',
      'wallets',
      'telecom',
      'shop',
      'cards',
      'community',
      'referrals',
      'membership',
      'admin',
    ];
    if (validTabs.includes(clean)) {
      setActiveTab(clean);
    } else if (targetUrl.startsWith('http')) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const advanceStartupStage = () => {
    setStartupStage((prev) => {
      if (prev === 'membership') return 'join_me';
      if (prev === 'join_me') return appConfig.startupAd.enabled ? 'promo_ad' : 'done';
      return 'done';
    });
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0B0E14] text-[#F4F6FB] pb-24 lg:pb-12">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lang={lang}
        onChangeLang={setLang}
        country={country}
        onChangeCountry={setCountryCode}
        onDetectGps={handleDetectGps}
        gpsDetecting={gpsDetecting}
        onOpenJoinMe={() => setJoinMeManualOpen((p) => !p)}
        joinMeOpen={joinMeManualOpen}
        profile={profile}
        isAdmin={isAdmin}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
        t={t}
      />

      {/* Sequential Startup Pop-Ups (1 -> 2 -> 3) */}
      <StartupSequence
        stage={startupStage}
        onAdvanceStage={advanceStartupStage}
        onGoToMembership={() => setActiveTab('membership')}
        onNavigateLink={handleNavigateLink}
        config={appConfig}
        t={t}
      />

      {/* Manual Header "Join Me" Shutter */}
      <JoinMeShutter
        open={joinMeManualOpen}
        apps={appConfig.joinMeApps}
        onClose={() => setJoinMeManualOpen(false)}
        title={t.joinMeBtn}
      />

      {/* Biometric Lock Guard */}
      {biometricLocked && profile?.biometricEnabled && (
        <div className="fixed inset-0 z-50 bg-[#060D1F]/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="gw-glass max-w-sm w-full rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto">
              <Fingerprint className="w-8 h-8" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Biometric Vault Locked</h2>
            <p className="text-xs text-slate-400">
              Verify fingerprint or face ID to resume your G Wallet session.
            </p>
            <button
              type="button"
              onClick={() => setBiometricLocked(false)}
              className="w-full py-3 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer"
            >
              Authenticate & Unlock
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Hero Executive Hub */}
            <section className="gw-glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <p className="text-xs font-medium text-[#F5B041]">
                    {country.name} · {country.currencyCode} ({country.symbol}) ·{' '}
                    {country.isBangladesh ? 'bKash, Nagad, Bank & Crypto Active' : 'Global Crypto Rail'}
                  </p>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                    Luxury Dual-Wallet Finance, Marketplace & Global Community
                  </h1>
                  <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                    Manage Main Telecom and Shop wallets, trade P2P with escrow protection, launch verified Seller Dokans, issue AI Virtual Visa/Mastercards, and earn across 5 referral generations.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {!profile ? (
                      <button
                        type="button"
                        onClick={() => setAuthModalOpen(true)}
                        className="px-5 py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Sign In / Register (GW-ID)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('wallets')}
                        className="px-5 py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm flex items-center gap-2 cursor-pointer"
                      >
                        <Wallet className="w-4 h-4" />
                        Open Dual Wallets
                      </button>
                    )}
                    {profile?.biometricEnabled && (
                      <button
                        type="button"
                        onClick={() => setBiometricLocked(true)}
                        className="px-4 py-2.5 rounded-xl bg-white/10 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Fingerprint className="w-4 h-4" /> Lock Vault
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Dual Balance Snapshot */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
                  <div className="rounded-2xl bg-[#060D1F]/90 border border-[#F5B041]/30 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">{t.mainTelecomWallet}</p>
                      <p className="font-mono-tabular text-xl font-bold text-white mt-0.5">
                        {formatMoneyFromUsd(profile?.telecomBalanceUsd ?? 0, country)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('wallets')}
                      className="w-9 h-9 rounded-xl bg-[#F5B041]/15 text-[#F5B041] flex items-center justify-center cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="rounded-2xl bg-[#060D1F]/90 border border-blue-400/30 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">{t.shopWallet}</p>
                      <p className="font-mono-tabular text-xl font-bold text-white mt-0.5">
                        {formatMoneyFromUsd(profile?.shopBalanceUsd ?? 0, country)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('shop')}
                      className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Ecosystem Modules Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  tab: 'telecom' as const,
                  icon: Radio,
                  title: t.telecomTitle,
                  desc: `${telecomOffers.length} active packs & P2P deal chat`,
                },
                {
                  tab: 'shop' as const,
                  icon: ShoppingBag,
                  title: t.shopTitle,
                  desc: `${products.length} products · ${dokans.length} verified Dokans`,
                },
                {
                  tab: 'cards' as const,
                  icon: CreditCard,
                  title: t.virtualCardsTitle,
                  desc: `AI-designed Visa from $${appConfig.virtualCardConfig.visaPriceUsd}`,
                },
                {
                  tab: 'wallets' as const,
                  icon: Wallet,
                  title: 'P2P & Escrow Vault',
                  desc: 'Send via GW-XXXXXX with escrow safety',
                },
                {
                  tab: 'community' as const,
                  icon: Users,
                  title: 'Regional & Global Community',
                  desc: 'Live WebSocket lounge & Member Prize Wheel',
                },
                {
                  tab: 'referrals' as const,
                  icon: Network,
                  title: '5-Generation Referrals',
                  desc: `Gen 1 (${appConfig.referralRates.gen1}%) down to Gen 5 (${appConfig.referralRates.gen5}%)`,
                },
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.tab}
                    type="button"
                    onClick={() => setActiveTab(mod.tab)}
                    className="gw-glass rounded-2xl p-5 text-left hover:border-[#F5B041]/50 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F5B041]/15 text-[#F5B041] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#F5B041] transition-colors" />
                    </div>
                    <h3 className="font-display text-base font-bold text-white">{mod.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{mod.desc}</p>
                  </button>
                );
              })}
            </section>

            {/* Middle Dynamic Carousel Banner */}
            <CarouselBanner
              banners={appConfig.carouselBanners}
              placement="middle"
              onNavigateLink={handleNavigateLink}
            />

            {/* End Dynamic Carousel Banner */}
            <CarouselBanner
              banners={appConfig.carouselBanners}
              placement="end"
              onNavigateLink={handleNavigateLink}
            />
          </div>
        )}

        {activeTab === 'wallets' && (
          <WalletEscrowView
            profile={profile}
            country={country}
            transactions={transactions}
            escrows={escrows}
            onOpenAuth={() => setAuthModalOpen(true)}
            onRefreshData={refreshAllData}
            onToast={showToast}
            t={t}
          />
        )}

        {activeTab === 'telecom' && (
          <div className="space-y-8">
            <TelecomMarketplaceView
              profile={profile}
              country={country}
              offers={telecomOffers}
              appConfig={appConfig}
              onOpenAuth={() => setAuthModalOpen(true)}
              onRefreshData={refreshAllData}
              onToast={showToast}
              t={t}
            />
            <CarouselBanner
              banners={appConfig.carouselBanners}
              placement="end"
              onNavigateLink={handleNavigateLink}
            />
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-8">
            <ShopDokanView
              profile={profile}
              country={country}
              products={products}
              dokans={dokans}
              orders={orders}
              appConfig={appConfig}
              onOpenAuth={() => setAuthModalOpen(true)}
              onRefreshData={refreshAllData}
              onToast={showToast}
              t={t}
            />
            <CarouselBanner
              banners={appConfig.carouselBanners}
              placement="middle"
              onNavigateLink={handleNavigateLink}
            />
          </div>
        )}

        {activeTab === 'cards' && (
          <VirtualCardsView
            profile={profile}
            country={country}
            cards={virtualCards}
            appConfig={appConfig}
            onOpenAuth={() => setAuthModalOpen(true)}
            onRefreshData={refreshAllData}
            onToast={showToast}
            t={t}
          />
        )}

        {activeTab === 'community' && (
          <CommunityWheelView
            profile={profile}
            country={country}
            posts={communityPosts}
            messages={communityMessages}
            appConfig={appConfig}
            onOpenAuth={() => setAuthModalOpen(true)}
            onRefreshData={refreshAllData}
            onNavigateLink={handleNavigateLink}
            onToast={showToast}
            t={t}
          />
        )}

        {activeTab === 'referrals' && (
          <ReferralSystemView
            profile={profile}
            country={country}
            referrals={referrals}
            appConfig={appConfig}
            onToast={showToast}
            t={t}
          />
        )}

        {activeTab === 'membership' && (
          <MembershipView
            profile={profile}
            country={country}
            onOpenAuth={() => setAuthModalOpen(true)}
            onRefreshData={refreshAllData}
            onToast={showToast}
          />
        )}

        {activeTab === 'admin' && isAdmin && profile && (
          <AdminPanelView
            profile={profile}
            allUsers={allUsers}
            escrows={escrows}
            dokans={dokans}
            telecomOffers={telecomOffers}
            appConfig={appConfig}
            onRefreshData={refreshAllData}
            onToast={showToast}
          />
        )}
      </main>

      {/* Account, KYC (<100KB) & Biometric Modal */}
      <AuthKycModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        profile={profile}
        onEmailAuth={handleEmailAuth}
        onGoogleSignIn={handleGoogleSignIn}
        onProfileRefresh={refreshAllData}
        onToast={showToast}
        t={t}
      />

      {/* Non-blocking Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 lg:bottom-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-semibold shadow-2xl border ${
            toast.type === 'error'
              ? 'bg-red-950/95 border-red-400/50 text-red-200'
              : 'bg-[#060D1F]/95 border-[#F5B041]/50 text-[#FCE3A6]'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GWalletApp />
    </ErrorBoundary>
  );
}
