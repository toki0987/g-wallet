import React, { useState } from 'react';
import {
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Snowflake,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { formatSupabaseError, supabase } from '../lib/supabase';
import { recordWalletMovement } from '../lib/gwalletService';
import { formatMoneyFromUsd } from '../lib/seedData';
import {
  AppConfig,
  CountryCurrencyConfig,
  UserProfile,
  VirtualCard,
} from '../types/gwallet';
import { TranslationDictionary } from '../i18n/translations';

interface VirtualCardsViewProps {
  profile: UserProfile | null;
  country: CountryCurrencyConfig;
  cards: VirtualCard[];
  appConfig: AppConfig;
  onOpenAuth: () => void;
  onRefreshData: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  t: TranslationDictionary;
}

const THEME_STYLES: Record<string, string> = {
  'obsidian-gold': 'from-[#18223A] via-[#0B1120] to-[#060911] border-[#F5B041]/45',
  'royal-navy': 'from-[#17326B] via-[#0D1E45] to-[#060D1F] border-blue-400/40',
  'emerald-vault': 'from-[#0E3A2F] via-[#08221C] to-[#05120F] border-emerald-400/40',
  'crimson-elite': 'from-[#4A1421] via-[#240B12] to-[#0E0508] border-rose-400/40',
};

export const VirtualCardsView: React.FC<VirtualCardsViewProps> = ({
  profile,
  country,
  cards,
  appConfig,
  onOpenAuth,
  onRefreshData,
  onToast,
  t,
}) => {
  const [brand, setBrand] = useState<'Visa' | 'Mastercard'>('Visa');
  const [initialDeposit, setInitialDeposit] = useState(
    String(appConfig.virtualCardConfig.minDepositUsd || 10)
  );
  const [generating, setGenerating] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const issuanceFee =
    brand === 'Visa'
      ? appConfig.virtualCardConfig.visaPriceUsd
      : appConfig.virtualCardConfig.mastercardPriceUsd;

  const minDeposit = appConfig.virtualCardConfig.minDepositUsd;
  const totalCostUsd = issuanceFee + (Number(initialDeposit) || 0);

  const handleIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }

    const depositNum = Number(initialDeposit);
    if (Number.isNaN(depositNum) || depositNum < minDeposit) {
      onToast(`Minimum initial deposit is $${minDeposit} USD.`, 'error');
      return;
    }
    if (profile.telecomBalanceUsd < totalCostUsd) {
      onToast(
        `Insufficient Main Telecom Wallet balance ($${totalCostUsd.toFixed(2)} USD required).`,
        'error'
      );
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/ai/virtual-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          cardholderName: profile.displayName,
          countryCode: country.code,
          depositUsd: depositNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Virtual Card generation failed.');
      }

      await recordWalletMovement({
        profile,
        walletType: 'telecom',
        deltaUsd: -totalCostUsd,
        txType: 'card_purchase',
        method: `AI ${brand} Virtual Card`,
        country,
        note: `${data.tierName} (Fee $${issuanceFee} + Load $${depositNum})`,
      });

      const { error: cardErr } = await supabase.from('virtual_cards').insert({
        owner_uid: profile.uid,
        brand: data.brand,
        cardholder_name: data.cardholderName,
        masked_number: data.maskedNumber,
        last4: data.last4,
        full_number: data.fullNumber,
        cvv: data.cvv,
        expiry: data.expiry,
        tier_name: data.tierName,
        ai_design_theme: data.aiDesignTheme,
        ai_benefits: data.aiBenefits,
        balance_usd: depositNum,
        status: 'active',
      });
      if (cardErr) formatSupabaseError(cardErr, 'virtual_cards.insert');

      await onRefreshData();
      onToast(`Issued ${data.tierName} ending in ${data.last4}!`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Could not issue virtual card', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleFreeze = async (card: VirtualCard) => {
    try {
      const next = card.status === 'active' ? 'frozen' : 'active';
      const { error } = await supabase
        .from('virtual_cards')
        .update({ status: next })
        .eq('id', card.id);
      if (error) formatSupabaseError(error, 'virtual_cards.toggleFreeze');
      await onRefreshData();
      onToast(`Card ending in ${card.last4} is now ${next}.`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Could not update card state', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleIssueCard} className="lg:col-span-5 gw-glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl gw-gold-gradient text-[#060D1F] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">{t.virtualCardsTitle}</h2>
              <p className="text-xs text-slate-400">
                AI-crafted tier benefits + Luhn-verified card issuance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['Visa', 'Mastercard'] as const).map((b) => {
              const price =
                b === 'Visa'
                  ? appConfig.virtualCardConfig.visaPriceUsd
                  : appConfig.virtualCardConfig.mastercardPriceUsd;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrand(b)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    brand === b
                      ? 'border-[#F5B041] bg-[#F5B041]/15 text-white'
                      : 'border-white/10 bg-[#060D1F] text-slate-300'
                  }`}
                >
                  <p className="font-display text-sm font-bold">{b}</p>
                  <p className="font-mono-tabular text-xs text-[#F5B041] mt-0.5">
                    Fee: ${price} USD
                  </p>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Initial Card Load (Min ${minDeposit} USD)
            </label>
            <input
              type="number"
              min={minDeposit}
              step="1"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white"
            />
          </div>

          <div className="rounded-xl bg-[#060D1F]/90 border border-white/10 p-3.5 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Admin Issuance Price ({brand})</span>
              <span className="font-mono-tabular text-white">${issuanceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Initial Card Balance</span>
              <span className="font-mono-tabular text-white">${(Number(initialDeposit) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-white/10 font-semibold text-[#F5B041]">
              <span>Total Deduction</span>
              <span className="font-mono-tabular">{formatMoneyFromUsd(totalCostUsd, country)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full py-3 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>{generating ? 'AI Designing Card...' : t.issueCard}</span>
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          {cards.length === 0 ? (
            <div className="gw-glass rounded-3xl p-10 text-center">
              <CreditCard className="w-10 h-10 text-[#F5B041] mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-white mb-1">
                No Virtual Cards Issued Yet
              </h3>
              <p className="text-xs text-slate-400">
                Generate an AI-designed Virtual Visa or Mastercard for global online payments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {cards.map((card) => {
                const revealed = Boolean(revealedIds[card.id]);
                const themeClass = THEME_STYLES[card.aiDesignTheme] || THEME_STYLES['obsidian-gold'];
                return (
                  <div key={card.id} className="space-y-3">
                    <div
                      className={`rounded-3xl p-5 bg-gradient-to-br ${themeClass} border shadow-2xl relative overflow-hidden min-h-[205px] flex flex-col justify-between`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-[#F5B041] font-semibold">
                            {card.tierName}
                          </p>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {card.status === 'frozen' ? 'Frozen' : 'Active Virtual'}
                          </p>
                        </div>
                        <span className="font-display text-lg font-bold text-white italic">
                          {card.brand}
                        </span>
                      </div>

                      <div className="my-4">
                        <p className="font-mono-tabular text-lg tracking-widest text-white">
                          {revealed ? card.fullNumber : card.maskedNumber}
                        </p>
                      </div>

                      <div className="flex items-end justify-between text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400">CARDHOLDER</p>
                          <p className="font-medium text-white truncate max-w-[140px]">
                            {card.cardholderName}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 font-mono-tabular">
                          <div>
                            <p className="text-[10px] text-slate-400">EXP</p>
                            <p className="text-white">{card.expiry}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">CVV</p>
                            <p className="text-white">{revealed ? card.cvv : '•••'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="gw-glass rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular text-sm font-bold text-[#F5B041]">
                          Balance: {formatMoneyFromUsd(card.balanceUsd, country)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedIds((p) => ({ ...p, [card.id]: !p[card.id] }))
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs text-white flex items-center gap-1 cursor-pointer"
                          >
                            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {revealed ? 'Hide' : 'Reveal'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleFreeze(card)}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs text-white flex items-center gap-1 cursor-pointer"
                          >
                            {card.status === 'active' ? (
                              <>
                                <Snowflake className="w-3.5 h-3.5 text-sky-300" /> Freeze
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-emerald-300" /> Unfreeze
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 pt-1 border-t border-white/10">
                        {card.aiBenefits.map((b, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-[#F5B041] shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
