import React, { useState } from 'react';
import { Check, Crown, ShieldCheck } from 'lucide-react';
import { formatSupabaseError, supabase } from '../lib/supabase';
import { recordWalletMovement } from '../lib/gwalletService';
import { formatMoneyFromUsd } from '../lib/seedData';
import { CountryCurrencyConfig, UserProfile } from '../types/gwallet';

interface MembershipViewProps {
  profile: UserProfile | null;
  country: CountryCurrencyConfig;
  onOpenAuth: () => void;
  onRefreshData: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const MembershipView: React.FC<MembershipViewProps> = ({
  profile,
  country,
  onOpenAuth,
  onRefreshData,
  onToast,
}) => {
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const plans = [
    {
      id: 'gold' as const,
      name: 'Gold VIP Member',
      priceUsd: 19,
      audience: 'For active buyers & P2P traders',
      perks: [
        'Priority P2P Escrow Resolution',
        '20% discount on Virtual Visa issuance',
        'Higher daily deposit & withdrawal limits',
      ],
    },
    {
      id: 'platinum' as const,
      name: 'Platinum Sovereign',
      priceUsd: 49,
      audience: 'For high-volume global members',
      perks: [
        'Zero P2P transfer fees worldwide',
        'Complimentary AI Mastercard issuance',
        'Priority 5-generation referral boosts',
      ],
    },
    {
      id: 'seller_pro' as const,
      name: 'Seller Pro Dokan',
      priceUsd: 29,
      audience: 'Mandatory for Seller Dokan storefronts',
      perks: [
        'Unlocks Verified Seller Dokan Slot',
        'Flash Sales & Daraz-core product listing',
        'Shop Wallet automated settlement',
      ],
    },
  ];

  const handleSubscribe = async (planId: 'gold' | 'platinum' | 'seller_pro', priceUsd: number) => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (profile.telecomBalanceUsd < priceUsd) {
      onToast('Insufficient Main Telecom Wallet balance.', 'error');
      return;
    }
    setUpgrading(planId);
    try {
      await recordWalletMovement({
        profile,
        walletType: 'telecom',
        deltaUsd: -priceUsd,
        txType: 'membership_buy',
        method: 'Main Telecom Wallet',
        country,
        note: `Activated ${planId} membership`,
      });
      const { error } = await supabase
        .from('profiles')
        .update({ membership_tier: planId, updated_at: new Date().toISOString() })
        .eq('uid', profile.uid);
      if (error) formatSupabaseError(error, 'profiles.membershipUpdate');
      await onRefreshData();
      onToast(`Membership upgraded to ${planId}!`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Membership upgrade failed', 'error');
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="gw-glass rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gw-gold-gradient glow-gold flex items-center justify-center text-[#060D1F]">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white">G Wallet Membership Plans</h2>
            <p className="text-xs text-slate-400">
              Current Tier: <span className="text-[#F5B041] font-semibold uppercase">{profile?.membershipTier || 'Standard'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <ShieldCheck className="w-4 h-4" /> Instant activation via Main Telecom Wallet
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = profile?.membershipTier === p.id;
          return (
            <div key={p.id} className="gw-glass rounded-3xl p-6 flex flex-col justify-between gap-6">
              <div>
                <p className="text-xs font-medium text-[#F5B041]">{p.audience}</p>
                <h3 className="font-display text-xl font-bold text-white mt-1">{p.name}</h3>
                <p className="font-mono-tabular text-3xl font-bold text-white mt-3">
                  {formatMoneyFromUsd(p.priceUsd, country)}
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                  {p.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#F5B041] shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                disabled={isCurrent || upgrading === p.id}
                onClick={() => handleSubscribe(p.id, p.priceUsd)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                    : 'gw-gold-gradient text-[#060D1F]'
                }`}
              >
                {isCurrent ? 'Active Plan' : upgrading === p.id ? 'Activating...' : 'Upgrade Now'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
