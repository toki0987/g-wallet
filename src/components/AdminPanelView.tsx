import React, { useState } from 'react';
import {
  CheckCircle,
  Plus,
  Shield,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { formatSupabaseError, supabase } from '../lib/supabase';
import { adminUpdateUserKyc } from '../lib/gwalletService';
import { compressImageUnder100KB } from '../lib/imageCompressor';
import {
  AppConfig,
  EscrowRecord,
  SellerDokan,
  TelecomOffer,
  UserProfile,
} from '../types/gwallet';

interface AdminPanelViewProps {
  profile: UserProfile;
  allUsers: UserProfile[];
  escrows: EscrowRecord[];
  dokans: SellerDokan[];
  telecomOffers: TelecomOffer[];
  appConfig: AppConfig;
  onRefreshData: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  profile,
  allUsers,
  escrows,
  dokans,
  telecomOffers,
  appConfig,
  onRefreshData,
  onToast,
}) => {
  const [adminTab, setAdminTab] = useState<'kyc' | 'telecom' | 'referrals' | 'wheel' | 'dokans' | 'disputes' | 'cms'>('kyc');
  const [draftConfig, setDraftConfig] = useState<AppConfig>(appConfig);
  const [savingCms, setSavingCms] = useState(false);

  // Add Telecom Offer state
  const [telTitle, setTelTitle] = useState('');
  const [telOp, setTelOp] = useState('Grameenphone');
  const [telVol, setTelVol] = useState('30 GB · 30 Days');
  const [telCountry, setTelCountry] = useState('BD');
  const [telPrice, setTelPrice] = useState('5.50');

  // Add Join Me App state
  const [newAppName, setNewAppName] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('https://');
  const [newAppTagline, setNewAppTagline] = useState('');

  // Add Carousel Banner state
  const [newBannerPlace, setNewBannerPlace] = useState<'middle' | 'end'>('middle');
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSub, setNewBannerSub] = useState('');
  const [newBannerUrl, setNewBannerUrl] = useState('#shop');
  const [newBannerDuration, setNewBannerDuration] = useState('4500');

  const saveConfigToSupabase = async (nextConfig: AppConfig) => {
    setSavingCms(true);
    try {
      const { error } = await supabase.from('app_config').upsert(
        {
          id: 'global',
          join_me_apps: nextConfig.joinMeApps,
          startup_ad: nextConfig.startupAd,
          pinned_mini_ad: nextConfig.pinnedMiniAd,
          carousel_banners: nextConfig.carouselBanners,
          referral_rates: nextConfig.referralRates,
          virtual_card_config: nextConfig.virtualCardConfig,
          wheel_prizes: nextConfig.wheelPrizes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) formatSupabaseError(error, 'app_config.upsert');
      setDraftConfig(nextConfig);
      await onRefreshData();
      onToast('Master Admin settings saved live!', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Failed to save configuration', 'error');
    } finally {
      setSavingCms(false);
    }
  };

  const handleResolveEscrow = async (escrow: EscrowRecord, outcome: 'released' | 'refunded') => {
    try {
      const { error: escErr } = await supabase
        .from('escrows')
        .update({ status: outcome, updated_at: new Date().toISOString() })
        .eq('id', escrow.id);
      if (escErr) formatSupabaseError(escErr, 'escrows.resolve');

      const { error: credErr } = await supabase.from('wallet_credits').insert({
        sender_uid: profile.uid,
        recipient_uid: outcome === 'released' ? escrow.sellerUid : escrow.buyerUid,
        wallet_type: 'telecom',
        amount_usd: escrow.amountUsd,
        source_type: outcome === 'released' ? 'escrow_release' : 'escrow_refund',
        note: `Admin resolved escrow (${outcome}): ${escrow.title}`,
        claimed: false,
      });
      if (credErr) formatSupabaseError(credErr, 'wallet_credits.resolve');

      await onRefreshData();
      onToast(`Escrow ${outcome} by Master Admin.`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Escrow resolution failed', 'error');
    }
  };

  const handleAddOfficialOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('telecom_offers').insert({
        creator_uid: profile.uid,
        creator_name: 'G Wallet Official',
        creator_member_id: profile.memberId,
        is_official: true,
        operator: telOp.trim(),
        offer_type: 'combo',
        title: telTitle.trim(),
        volume_label: telVol.trim(),
        country_code: telCountry.trim().toUpperCase(),
        price_usd: Number(telPrice) || 5,
        status: 'active',
      });
      if (error) formatSupabaseError(error, 'telecom_offers.insert');
      setTelTitle('');
      await onRefreshData();
      onToast('Official telecom offer created!', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Failed to add telecom offer', 'error');
    }
  };

  const handleStartupAdImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressImageUnder100KB(file, 960);
      setDraftConfig((prev) => ({
        ...prev,
        startupAd: { ...prev.startupAd, imageData: res.dataUrl },
      }));
      onToast('Startup ad image compressed under 100KB!', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Compression failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="gw-glass rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gw-gold-gradient text-[#060D1F] flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Master Admin Command</h2>
            <p className="text-xs text-slate-400">
              Authenticated as {profile.email} · Full Governance Control
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#060D1F] border border-white/10">
          {(
            [
              { id: 'kyc', label: 'KYC & Users' },
              { id: 'telecom', label: 'Telecom' },
              { id: 'dokans', label: 'Dokans' },
              { id: 'disputes', label: 'Escrow Disputes' },
              { id: 'referrals', label: '5-Gen Rates' },
              { id: 'wheel', label: 'Prize Wheel' },
              { id: 'cms', label: 'Ads, Cards & Join Me' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAdminTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                adminTab === t.id ? 'bg-[#F5B041] text-[#060D1F]' : 'text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. KYC & Users */}
      {adminTab === 'kyc' && (
        <div className="gw-glass rounded-3xl p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-white">KYC Approvals & Users ({allUsers.length})</h3>
          <div className="space-y-3">
            {allUsers.map((u) => (
              <div key={u.uid} className="rounded-2xl bg-[#060D1F]/80 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {u.kycDocBase64 && (
                    <img src={u.kycDocBase64} alt="KYC" className="w-16 h-12 object-cover rounded-lg border border-white/15" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-white">
                      {u.displayName} <span className="font-mono-tabular text-xs text-[#F5B041]">({u.memberId})</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {u.email} · Role: {u.role} · KYC: <span className="text-white capitalize">{u.kycStatus}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      adminUpdateUserKyc(u.uid, 'verified')
                        .then(() => onRefreshData())
                        .then(() => onToast(`Verified ${u.memberId}`, 'success'))
                    }
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve KYC
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      adminUpdateUserKyc(u.uid, 'rejected')
                        .then(() => onRefreshData())
                        .then(() => onToast(`Rejected ${u.memberId}`, 'success'))
                    }
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Telecom Offers */}
      {adminTab === 'telecom' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleAddOfficialOffer} className="gw-glass rounded-3xl p-6 space-y-3">
            <h3 className="font-display text-lg font-bold text-white">Add Official Telecom Offer</h3>
            <input type="text" required value={telTitle} onChange={(e) => setTelTitle(e.target.value)} placeholder="Offer Title" className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" required value={telOp} onChange={(e) => setTelOp(e.target.value)} placeholder="Operator" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
              <input type="text" required value={telCountry} onChange={(e) => setTelCountry(e.target.value)} placeholder="Country (BD/US)" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" required value={telVol} onChange={(e) => setTelVol(e.target.value)} placeholder="Volume Label" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
              <input type="number" step="0.01" required value={telPrice} onChange={(e) => setTelPrice(e.target.value)} placeholder="Price USD" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs font-mono-tabular text-white" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer">
              Publish Telecom Offer
            </button>
          </form>

          <div className="gw-glass rounded-3xl p-6 space-y-2 max-h-96 overflow-y-auto">
            <h3 className="font-display text-lg font-bold text-white mb-2">Active Telecom Catalog ({telecomOffers.length})</h3>
            {telecomOffers.map((o) => (
              <div key={o.id} className="rounded-xl bg-[#060D1F]/80 border border-white/10 p-3 flex justify-between text-xs">
                <div>
                  <p className="font-semibold text-white">{o.title}</p>
                  <p className="text-slate-400">{o.operator} · {o.countryCode} · ${o.priceUsd}</p>
                </div>
                <span className="text-[#F5B041]">{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Seller Dokans */}
      {adminTab === 'dokans' && (
        <div className="gw-glass rounded-3xl p-6 space-y-3">
          <h3 className="font-display text-lg font-bold text-white">Seller Store Slots / Dokans ({dokans.length})</h3>
          {dokans.map((d) => (
            <div key={d.id} className="rounded-xl bg-[#060D1F]/80 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-white text-sm">{d.shopName}</p>
                <p className="text-slate-400">Owner: {d.memberId} · Plan: {d.membershipPlan} · Status: {d.status}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase
                    .from('seller_dokans')
                    .update({ status: d.status === 'active' ? 'suspended' : 'active' })
                    .eq('id', d.id);
                  if (error) {
                    onToast(error.message, 'error');
                    return;
                  }
                  await onRefreshData();
                  onToast('Updated Dokan status', 'success');
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white cursor-pointer"
              >
                {d.status === 'active' ? 'Suspend Slot' : 'Activate Slot'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 4. Escrow Disputes */}
      {adminTab === 'disputes' && (
        <div className="gw-glass rounded-3xl p-6 space-y-3">
          <h3 className="font-display text-lg font-bold text-white">Escrow Dispute Resolution</h3>
          {escrows.length === 0 ? (
            <p className="text-xs text-slate-400">No escrow records found.</p>
          ) : (
            escrows.map((e) => (
              <div key={e.id} className="rounded-xl bg-[#060D1F]/80 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-white">{e.title} · ${e.amountUsd}</p>
                  <p className="text-slate-400">
                    {e.buyerMemberId} → {e.sellerMemberId} · Status: <span className="text-[#F5B041]">{e.status}</span>
                  </p>
                  {e.disputeReason && <p className="text-red-300 mt-1">Reason: {e.disputeReason}</p>}
                </div>
                {(e.status === 'locked' || e.status === 'disputed') && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleResolveEscrow(e, 'released')} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 cursor-pointer">
                      Release to Seller
                    </button>
                    <button type="button" onClick={() => handleResolveEscrow(e, 'refunded')} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 cursor-pointer">
                      Refund Buyer
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. 5-Gen Referral Commission Controls */}
      {adminTab === 'referrals' && (
        <div className="gw-glass rounded-3xl p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-white">5-Generation Referral Commission (%)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['gen1', 'gen2', 'gen3', 'gen4', 'gen5'] as const).map((k, idx) => (
              <div key={k}>
                <label className="block text-xs text-slate-400 mb-1">Generation {idx + 1} (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={draftConfig.referralRates[k]}
                  onChange={(e) =>
                    setDraftConfig((p) => ({
                      ...p,
                      referralRates: { ...p.referralRates, [k]: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-sm font-mono-tabular text-white"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={savingCms}
            onClick={() => saveConfigToSupabase(draftConfig)}
            className="px-5 py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer"
          >
            Save Referral Rates
          </button>
        </div>
      )}

      {/* 6. Prize Wheel Config */}
      {adminTab === 'wheel' && (
        <div className="gw-glass rounded-3xl p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-white">Prize Wheel Slices</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {draftConfig.wheelPrizes.map((slice, idx) => (
              <div key={slice.id} className="rounded-xl bg-[#060D1F] border border-white/10 p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={slice.label}
                  onChange={(e) => {
                    const updated = [...draftConfig.wheelPrizes];
                    updated[idx] = { ...slice, label: e.target.value };
                    setDraftConfig((p) => ({ ...p, wheelPrizes: updated }));
                  }}
                  className="flex-1 rounded-lg bg-[#10192E] px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="number"
                  step="0.25"
                  value={slice.rewardUsd}
                  onChange={(e) => {
                    const updated = [...draftConfig.wheelPrizes];
                    updated[idx] = { ...slice, rewardUsd: Number(e.target.value) };
                    setDraftConfig((p) => ({ ...p, wheelPrizes: updated }));
                  }}
                  className="w-20 rounded-lg bg-[#10192E] px-2.5 py-1.5 text-xs font-mono-tabular text-[#F5B041]"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={savingCms}
            onClick={() => saveConfigToSupabase(draftConfig)}
            className="px-5 py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer"
          >
            Save Wheel Prizes
          </button>
        </div>
      )}

      {/* 7. Ads, Carousels, Join Me Shutter, Pinned Mini-Ad, Virtual Card Pricing */}
      {adminTab === 'cms' && (
        <div className="space-y-6">
          {/* Virtual Card Pricing & Pinned Mini-Ad */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="gw-glass rounded-3xl p-6 space-y-3">
              <h3 className="font-display text-base font-bold text-white">Virtual Card Pricing (USD)</h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">Visa Fee</label>
                  <input
                    type="number"
                    value={draftConfig.virtualCardConfig.visaPriceUsd}
                    onChange={(e) =>
                      setDraftConfig((p) => ({
                        ...p,
                        virtualCardConfig: { ...p.virtualCardConfig, visaPriceUsd: Number(e.target.value) },
                      }))
                    }
                    className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Mastercard</label>
                  <input
                    type="number"
                    value={draftConfig.virtualCardConfig.mastercardPriceUsd}
                    onChange={(e) =>
                      setDraftConfig((p) => ({
                        ...p,
                        virtualCardConfig: { ...p.virtualCardConfig, mastercardPriceUsd: Number(e.target.value) },
                      }))
                    }
                    className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Min Deposit</label>
                  <input
                    type="number"
                    value={draftConfig.virtualCardConfig.minDepositUsd}
                    onChange={(e) =>
                      setDraftConfig((p) => ({
                        ...p,
                        virtualCardConfig: { ...p.virtualCardConfig, minDepositUsd: Number(e.target.value) },
                      }))
                    }
                    className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs font-mono-tabular text-white"
                  />
                </div>
              </div>

              <h3 className="font-display text-base font-bold text-white pt-3">Pinned Mini-Ad Ticker</h3>
              <input
                type="text"
                value={draftConfig.pinnedMiniAd.text}
                onChange={(e) =>
                  setDraftConfig((p) => ({ ...p, pinnedMiniAd: { ...p.pinnedMiniAd, text: e.target.value } }))
                }
                className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>

            {/* Startup Pop-Up #3 Ad */}
            <div className="gw-glass rounded-3xl p-6 space-y-3">
              <h3 className="font-display text-base font-bold text-white">Startup Pop-Up #3 Advertisement</h3>
              <input
                type="text"
                value={draftConfig.startupAd.title}
                onChange={(e) =>
                  setDraftConfig((p) => ({ ...p, startupAd: { ...p.startupAd, title: e.target.value } }))
                }
                placeholder="Ad Title"
                className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <textarea
                rows={2}
                value={draftConfig.startupAd.subtitle}
                onChange={(e) =>
                  setDraftConfig((p) => ({ ...p, startupAd: { ...p.startupAd, subtitle: e.target.value } }))
                }
                className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={draftConfig.startupAd.buttonText}
                  onChange={(e) =>
                    setDraftConfig((p) => ({ ...p, startupAd: { ...p.startupAd, buttonText: e.target.value } }))
                  }
                  placeholder="Button Label"
                  className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  value={draftConfig.startupAd.targetUrl}
                  onChange={(e) =>
                    setDraftConfig((p) => ({ ...p, startupAd: { ...p.startupAd, targetUrl: e.target.value } }))
                  }
                  placeholder="Target Link"
                  className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#F5B041] cursor-pointer">
                <Upload className="w-4 h-4" /> Upload Ad Image (WebP &lt;100KB)
                <input type="file" accept="image/*" onChange={handleStartupAdImage} className="hidden" />
              </label>
            </div>
          </div>

          {/* Join Me Shutter Apps Editor */}
          <div className="gw-glass rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-white">Join Me Shutter External Apps</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {draftConfig.joinMeApps.map((app) => (
                <div key={app.id} className="rounded-xl bg-[#060D1F] border border-white/10 p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-white">{app.name}</p>
                    <p className="text-slate-400">{app.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftConfig((p) => ({
                        ...p,
                        joinMeApps: p.joinMeApps.filter((a) => a.id !== app.id),
                      }))
                    }
                    className="text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input type="text" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="App Name" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
              <input type="text" value={newAppTagline} onChange={(e) => setNewAppTagline(e.target.value)} placeholder="Tagline" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
              <input type="text" value={newAppUrl} onChange={(e) => setNewAppUrl(e.target.value)} placeholder="https://..." className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
              <button
                type="button"
                onClick={() => {
                  if (!newAppName.trim()) return;
                  setDraftConfig((p) => ({
                    ...p,
                    joinMeApps: [
                      ...p.joinMeApps,
                      {
                        id: `app-${Date.now()}`,
                        name: newAppName.trim(),
                        tagline: newAppTagline.trim() || 'Connected App',
                        url: newAppUrl.trim(),
                        accentHex: '#A855F7',
                      },
                    ],
                  }));
                  setNewAppName('');
                  setNewAppTagline('');
                }}
                className="rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add App
              </button>
            </div>
          </div>

          {/* Carousel Banners Editor */}
          <div className="gw-glass rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-white">Middle & End Carousel Banners</h3>
            <div className="space-y-2">
              {draftConfig.carouselBanners.map((b) => (
                <div key={b.id} className="rounded-xl bg-[#060D1F] border border-white/10 p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-white">
                      [{b.placement.toUpperCase()}] {b.title}
                    </p>
                    <p className="text-slate-400">
                      Link: {b.targetUrl} · Slide Duration: {b.durationMs}ms
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftConfig((p) => ({
                        ...p,
                        carouselBanners: p.carouselBanners.filter((x) => x.id !== b.id),
                      }))
                    }
                    className="text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <select value={newBannerPlace} onChange={(e) => setNewBannerPlace(e.target.value as any)} className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white">
                <option value="middle">Middle</option>
                <option value="end">End</option>
              </select>
              <input type="text" value={newBannerTitle} onChange={(e) => setNewBannerTitle(e.target.value)} placeholder="Banner Title" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
              <input type="text" value={newBannerSub} onChange={(e) => setNewBannerSub(e.target.value)} placeholder="Subtitle" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white" />
              <input type="number" value={newBannerDuration} onChange={(e) => setNewBannerDuration(e.target.value)} placeholder="Duration ms" className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs font-mono-tabular text-white" />
              <button
                type="button"
                onClick={() => {
                  if (!newBannerTitle.trim()) return;
                  setDraftConfig((p) => ({
                    ...p,
                    carouselBanners: [
                      ...p.carouselBanners,
                      {
                        id: `ban-${Date.now()}`,
                        placement: newBannerPlace,
                        title: newBannerTitle.trim(),
                        subtitle: newBannerSub.trim() || 'Explore G Wallet ecosystem',
                        ctaText: 'Explore',
                        targetUrl: newBannerUrl,
                        durationMs: Number(newBannerDuration) || 4500,
                      },
                    ],
                  }));
                  setNewBannerTitle('');
                  setNewBannerSub('');
                }}
                className="rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Banner
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={savingCms}
            onClick={() => saveConfigToSupabase(draftConfig)}
            className="w-full py-3 rounded-2xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer"
          >
            {savingCms ? 'Publishing Changes...' : 'Save All CMS, Ads & Pricing Settings'}
          </button>
        </div>
      )}
    </div>
  );
};
