import React from 'react';
import { Copy, Network, Users } from 'lucide-react';
import { formatMoneyFromUsd } from '../lib/seedData';
import {
  AppConfig,
  CountryCurrencyConfig,
  ReferralCommission,
  UserProfile,
} from '../types/gwallet';
import { TranslationDictionary } from '../i18n/translations';

interface ReferralSystemViewProps {
  profile: UserProfile | null;
  country: CountryCurrencyConfig;
  referrals: ReferralCommission[];
  appConfig: AppConfig;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  t: TranslationDictionary;
}

export const ReferralSystemView: React.FC<ReferralSystemViewProps> = ({
  profile,
  country,
  referrals,
  appConfig,
  onToast,
  t,
}) => {
  const rates = [
    { gen: 1, pct: appConfig.referralRates.gen1 },
    { gen: 2, pct: appConfig.referralRates.gen2 },
    { gen: 3, pct: appConfig.referralRates.gen3 },
    { gen: 4, pct: appConfig.referralRates.gen4 },
    { gen: 5, pct: appConfig.referralRates.gen5 },
  ];

  const totalEarnedUsd = referrals.reduce((sum, r) => sum + Number(r.amountUsd || 0), 0);

  return (
    <div className="space-y-6">
      <div className="gw-glass rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
            <Network className="w-6 h-6 text-[#F5B041]" />
            {t.referralsTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Earn automated multi-tier commissions across Generations 1 to 5 on every telecom and shop order.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#060D1F] border border-[#F5B041]/35 rounded-2xl px-4 py-2.5">
          <div>
            <p className="text-[11px] text-slate-400">Your Referral Member ID</p>
            <p className="font-mono-tabular text-base font-bold text-[#F5B041]">
              {profile?.memberId || 'Sign in for ID'}
            </p>
          </div>
          {profile && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(profile.memberId);
                onToast('Referral Member ID copied!', 'success');
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          )}
        </div>
      </div>

      {/* 5-Generation Rate Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {rates.map((r) => {
          const genEarned = referrals
            .filter((x) => x.generation === r.gen)
            .reduce((sum, x) => sum + x.amountUsd, 0);
          return (
            <div key={r.gen} className="gw-glass rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F5B041]">Gen {r.gen}</span>
                <Users className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="font-mono-tabular text-2xl font-bold text-white">{r.pct}%</p>
              <p className="font-mono-tabular text-xs text-slate-400">
                Earned: {formatMoneyFromUsd(genEarned, country)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Commission History Table */}
      <div className="gw-glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-white">5-Generation Commission Ledger</h3>
          <span className="font-mono-tabular text-sm font-bold text-[#F5B041]">
            Total: {formatMoneyFromUsd(totalEarnedUsd, country)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Generation</th>
                <th className="py-2.5 pr-4 font-medium">From Member</th>
                <th className="py-2.5 pr-4 font-medium">Activity</th>
                <th className="py-2.5 font-medium text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Share your Member ID to start earning 1st–5th generation commissions.
                  </td>
                </tr>
              ) : (
                referrals.map((ref) => (
                  <tr key={ref.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-semibold text-[#F5B041]">Gen {ref.generation}</td>
                    <td className="py-3 pr-4 font-mono-tabular text-white">{ref.fromMemberId}</td>
                    <td className="py-3 pr-4 text-slate-300">{ref.sourceAction}</td>
                    <td className="py-3 text-right font-mono-tabular text-emerald-400">
                      +{formatMoneyFromUsd(ref.amountUsd, country)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
