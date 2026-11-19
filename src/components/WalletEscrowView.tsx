import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { formatSupabaseError, supabase } from '../lib/supabase';
import { lookupMemberById, recordWalletMovement } from '../lib/gwalletService';
import { formatMoneyFromUsd } from '../lib/seedData';
import {
  CountryCurrencyConfig,
  EscrowRecord,
  MemberDirectoryEntry,
  UserProfile,
  WalletTransaction,
} from '../types/gwallet';
import { TranslationDictionary } from '../i18n/translations';

interface WalletEscrowViewProps {
  profile: UserProfile | null;
  country: CountryCurrencyConfig;
  transactions: WalletTransaction[];
  escrows: EscrowRecord[];
  onOpenAuth: () => void;
  onRefreshData: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  t: TranslationDictionary;
}

export const WalletEscrowView: React.FC<WalletEscrowViewProps> = ({
  profile,
  country,
  transactions,
  escrows,
  onOpenAuth,
  onRefreshData,
  onToast,
  t,
}) => {
  const [modalMode, setModalMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [targetWallet, setTargetWallet] = useState<'telecom' | 'shop'>('telecom');
  const [amountUsd, setAmountUsd] = useState('25');
  const [method, setMethod] = useState(country.isBangladesh ? 'bKash' : 'Crypto (USDT TRC20)');
  const [busy, setBusy] = useState(false);

  // P2P State
  const [p2pMemberId, setP2pMemberId] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<MemberDirectoryEntry | null>(null);
  const [p2pAmountUsd, setP2pAmountUsd] = useState('10');
  const [p2pWallet, setP2pWallet] = useState<'telecom' | 'shop'>('telecom');
  const [p2pNote, setP2pNote] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  // Escrow State
  const [escrowSellerId, setEscrowSellerId] = useState('');
  const [escrowTitle, setEscrowTitle] = useState('');
  const [escrowAmountUsd, setEscrowAmountUsd] = useState('20');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEscrowId, setDisputeEscrowId] = useState<string | null>(null);

  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'telecom' | 'shop'>('all');

  const paymentMethods = country.isBangladesh
    ? ['bKash', 'Nagad', 'Bank Transfer', 'Crypto (USDT TRC20)']
    : ['Crypto (USDT TRC20)', 'Crypto (BTC)', 'Crypto (USDC ERC20)'];

  const handleWalletRailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    const amt = Number(amountUsd);
    if (!amt || amt <= 0) {
      onToast('Enter a valid positive amount.', 'error');
      return;
    }
    setBusy(true);
    try {
      const chosenMethod = paymentMethods.includes(method) ? method : paymentMethods[0];
      await recordWalletMovement({
        profile,
        walletType: targetWallet,
        deltaUsd: modalMode === 'deposit' ? amt : -amt,
        txType: modalMode === 'deposit' ? 'deposit' : 'withdraw',
        method: chosenMethod,
        country,
        note: `${modalMode === 'deposit' ? 'Deposit' : 'Withdrawal'} via ${chosenMethod}`,
      });
      await onRefreshData();
      onToast(
        `${modalMode === 'deposit' ? 'Deposited' : 'Withdrew'} ${formatMoneyFromUsd(amt, country)}`,
        'success'
      );
      setModalMode(null);
    } catch (err: any) {
      onToast(err?.message || 'Transaction failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyMember = async (code: string) => {
    setLookingUp(true);
    try {
      const found = await lookupMemberById(code);
      setVerifiedRecipient(found);
      if (!found) {
        onToast('Member ID not found in directory.', 'error');
      }
    } catch (err: any) {
      onToast(err?.message || 'Lookup failed', 'error');
    } finally {
      setLookingUp(false);
    }
  };

  const handleP2PSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!verifiedRecipient) {
      onToast('Verify recipient Member ID first.', 'error');
      return;
    }
    if (verifiedRecipient.uid === profile.uid) {
      onToast('Cannot transfer to your own Member ID.', 'error');
      return;
    }
    const amt = Number(p2pAmountUsd);
    const bal = p2pWallet === 'telecom' ? profile.telecomBalanceUsd : profile.shopBalanceUsd;
    if (!amt || amt <= 0 || amt > bal) {
      onToast('Insufficient wallet balance for P2P transfer.', 'error');
      return;
    }

    setBusy(true);
    try {
      await recordWalletMovement({
        profile,
        walletType: p2pWallet,
        deltaUsd: -amt,
        txType: 'p2p_send',
        method: 'P2P Instant',
        country,
        counterpartyMemberId: verifiedRecipient.memberId,
        note: p2pNote || `P2P to ${verifiedRecipient.displayName}`,
      });

      const { error: creditErr } = await supabase.from('wallet_credits').insert({
        sender_uid: profile.uid,
        recipient_uid: verifiedRecipient.uid,
        wallet_type: p2pWallet,
        amount_usd: amt,
        source_type: 'p2p',
        note: `P2P from ${profile.memberId}`,
        claimed: false,
      });
      if (creditErr) formatSupabaseError(creditErr, 'wallet_credits.insert');

      await onRefreshData();
      onToast(`Sent ${formatMoneyFromUsd(amt, country)} to ${verifiedRecipient.memberId}`, 'success');
      setP2pNote('');
    } catch (err: any) {
      onToast(err?.message || 'P2P transfer failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    const seller = await lookupMemberById(escrowSellerId);
    if (!seller || seller.uid === profile.uid) {
      onToast('Enter a valid counterparty Member ID (GW-XXXXXX).', 'error');
      return;
    }
    const amt = Number(escrowAmountUsd);
    if (!amt || amt <= 0 || amt > profile.telecomBalanceUsd) {
      onToast('Insufficient Main Telecom Wallet balance to fund escrow.', 'error');
      return;
    }
    setBusy(true);
    try {
      await recordWalletMovement({
        profile,
        walletType: 'telecom',
        deltaUsd: -amt,
        txType: 'escrow_lock',
        method: 'G Wallet Escrow',
        country,
        counterpartyMemberId: seller.memberId,
        note: escrowTitle || 'Escrow Lock',
      });

      const { error: escErr } = await supabase.from('escrows').insert({
        buyer_uid: profile.uid,
        seller_uid: seller.uid,
        buyer_member_id: profile.memberId,
        seller_member_id: seller.memberId,
        title: escrowTitle.trim() || 'P2P Protected Trade',
        amount_usd: amt,
        status: 'locked',
        dispute_reason: '',
      });
      if (escErr) formatSupabaseError(escErr, 'escrows.insert');

      await onRefreshData();
      onToast(`Escrow locked for ${seller.memberId}`, 'success');
      setEscrowTitle('');
      setEscrowSellerId('');
    } catch (err: any) {
      onToast(err?.message || 'Failed to create escrow', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReleaseEscrow = async (escrow: EscrowRecord) => {
    if (!profile || escrow.buyerUid !== profile.uid) return;
    setBusy(true);
    try {
      const { error: updErr } = await supabase
        .from('escrows')
        .update({ status: 'released', updated_at: new Date().toISOString() })
        .eq('id', escrow.id);
      if (updErr) formatSupabaseError(updErr, 'escrows.release');

      const { error: credErr } = await supabase.from('wallet_credits').insert({
        sender_uid: profile.uid,
        recipient_uid: escrow.sellerUid,
        wallet_type: 'telecom',
        amount_usd: escrow.amountUsd,
        source_type: 'escrow_release',
        note: `Escrow released: ${escrow.title}`,
        claimed: false,
      });
      if (credErr) formatSupabaseError(credErr, 'wallet_credits.escrowRelease');

      await onRefreshData();
      onToast('Escrow funds released to seller.', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Release failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleFlagDispute = async (escrowId: string) => {
    if (!profile || !disputeReason.trim()) return;
    try {
      const { error } = await supabase
        .from('escrows')
        .update({
          status: 'disputed',
          dispute_reason: disputeReason.trim().slice(0, 280),
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);
      if (error) formatSupabaseError(error, 'escrows.dispute');
      await onRefreshData();
      onToast('Dispute escalated to Master Admin.', 'success');
      setDisputeEscrowId(null);
      setDisputeReason('');
    } catch (err: any) {
      onToast(err?.message || 'Failed to open dispute', 'error');
    }
  };

  const visibleTx = transactions.filter((tx) =>
    ledgerFilter === 'all' ? true : tx.walletType === ledgerFilter
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Telecom Wallet */}
        <div className="gw-glass rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl gw-gold-gradient text-[#060D1F] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white">{t.mainTelecomWallet}</h3>
                <p className="text-xs text-slate-400">
                  {country.isBangladesh ? 'bKash · Nagad · Bank · Crypto' : 'Global Crypto Rail Only'}
                </p>
              </div>
            </div>
            <span className="font-mono-tabular text-xs text-[#F5B041]">
              {profile?.memberId || 'Guest Preview'}
            </span>
          </div>

          <div className="my-5">
            <p className="font-mono-tabular text-3xl font-bold text-white">
              {formatMoneyFromUsd(profile?.telecomBalanceUsd ?? 0, country)}
            </p>
            <p className="font-mono-tabular text-xs text-slate-400 mt-1">
              ≈ ${(profile?.telecomBalanceUsd ?? 0).toFixed(2)} USD
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTargetWallet('telecom');
                setMethod(paymentMethods[0]);
                setModalMode('deposit');
              }}
              className="flex-1 min-w-[110px] py-2.5 px-4 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              {t.deposit}
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetWallet('telecom');
                setMethod(paymentMethods[0]);
                setModalMode('withdraw');
              }}
              className="flex-1 min-w-[110px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              {t.withdraw}
            </button>
          </div>
        </div>

        {/* Shop Wallet */}
        <div className="gw-glass rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/40 text-blue-300 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white">{t.shopWallet}</h3>
                <p className="text-xs text-slate-400">Daraz-Core Shop & Dokan Checkout</p>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-medium">Escrow Ready</span>
          </div>

          <div className="my-5">
            <p className="font-mono-tabular text-3xl font-bold text-white">
              {formatMoneyFromUsd(profile?.shopBalanceUsd ?? 0, country)}
            </p>
            <p className="font-mono-tabular text-xs text-slate-400 mt-1">
              ≈ ${(profile?.shopBalanceUsd ?? 0).toFixed(2)} USD
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTargetWallet('shop');
                setMethod(paymentMethods[0]);
                setModalMode('deposit');
              }}
              className="flex-1 min-w-[110px] py-2.5 px-4 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              {t.deposit}
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetWallet('shop');
                setMethod(paymentMethods[0]);
                setModalMode('withdraw');
              }}
              className="flex-1 min-w-[110px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              {t.withdraw}
            </button>
          </div>
        </div>
      </div>

      {/* P2P Instant Transfer & Escrow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleP2PSend} className="gw-glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-[#F5B041]" />
              {t.p2pSend} (Member ID)
            </h3>
            <span className="text-xs text-slate-400">Instant Settlement</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={p2pMemberId}
              onChange={(e) => {
                setP2pMemberId(e.target.value.toUpperCase());
                setVerifiedRecipient(null);
              }}
              placeholder="Recipient GW-XXXXXX"
              className="flex-1 rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#F5B041]"
            />
            <button
              type="button"
              disabled={lookingUp}
              onClick={() => handleVerifyMember(p2pMemberId)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
            >
              {lookingUp ? 'Checking...' : 'Verify ID'}
            </button>
          </div>

          {verifiedRecipient && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {verifiedRecipient.displayName} ({verifiedRecipient.role})
              </span>
              <span className="font-mono-tabular text-emerald-200">{verifiedRecipient.memberId}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Source Wallet</label>
              <select
                value={p2pWallet}
                onChange={(e) => setP2pWallet(e.target.value as 'telecom' | 'shop')}
                className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2.5 text-xs text-white"
              >
                <option value="telecom">Main Telecom</option>
                <option value="shop">Shop Wallet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount (USD)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={p2pAmountUsd}
                onChange={(e) => setP2pAmountUsd(e.target.value)}
                className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2.5 text-sm font-mono-tabular text-white"
              />
            </div>
          </div>

          <input
            type="text"
            value={p2pNote}
            onChange={(e) => setP2pNote(e.target.value)}
            placeholder="Transfer note (optional)"
            className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-xs text-white"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer disabled:opacity-60"
          >
            {busy ? 'Sending...' : `Send ${formatMoneyFromUsd(Number(p2pAmountUsd) || 0, country)}`}
          </button>
        </form>

        {/* Escrow Lock Creator */}
        <form onSubmit={handleCreateEscrow} className="gw-glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#F5B041]" />
              {t.escrowLock} Trade Protection
            </h3>
            <span className="text-xs text-slate-400">Admin Dispute Support</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={escrowSellerId}
              onChange={(e) => setEscrowSellerId(e.target.value.toUpperCase())}
              placeholder="Seller GW-XXXXXX"
              required
              className="rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white"
            />
            <input
              type="number"
              min="1"
              step="0.01"
              value={escrowAmountUsd}
              onChange={(e) => setEscrowAmountUsd(e.target.value)}
              placeholder="Amount USD"
              required
              className="rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white"
            />
          </div>

          <input
            type="text"
            value={escrowTitle}
            onChange={(e) => setEscrowTitle(e.target.value)}
            placeholder="Deal description (e.g. Bulk Telecom Data Lot)"
            required
            className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-[#F5B041] font-semibold text-sm cursor-pointer"
          >
            Lock Funds in Escrow ({formatMoneyFromUsd(Number(escrowAmountUsd) || 0, country)})
          </button>

          <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
            {escrows.length === 0 ? (
              <p className="text-xs text-slate-400">No active escrow deals yet.</p>
            ) : (
              escrows.map((esc) => (
                <div
                  key={esc.id}
                  className="rounded-xl bg-[#060D1F]/90 border border-white/10 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{esc.title}</p>
                    <p className="text-slate-400 font-mono-tabular">
                      {esc.buyerMemberId} → {esc.sellerMemberId} · {formatMoneyFromUsd(esc.amountUsd, country)} ·{' '}
                      <span className="text-[#F5B041] capitalize">{esc.status}</span>
                    </p>
                  </div>
                  {esc.status === 'locked' && profile && (
                    <div className="flex items-center gap-1.5">
                      {esc.buyerUid === profile.uid && (
                        <button
                          type="button"
                          onClick={() => handleReleaseEscrow(esc)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium cursor-pointer"
                        >
                          Release
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDisputeEscrowId(esc.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 font-medium cursor-pointer"
                      >
                        Dispute
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {disputeEscrowId && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 space-y-2">
              <p className="text-xs text-red-300 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Submit Dispute Reason
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe issue for Master Admin..."
                  className="flex-1 rounded-lg bg-[#060D1F] border border-white/15 px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => handleFlagDispute(disputeEscrowId)}
                  className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Transaction Ledger */}
      <div className="gw-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-lg font-bold text-white">Transaction Ledger</h3>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#060D1F] border border-white/10">
            {(['all', 'telecom', 'shop'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLedgerFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                  ledgerFilter === f ? 'bg-[#F5B041] text-[#060D1F]' : 'text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Type</th>
                <th className="py-2.5 pr-4 font-medium">Wallet</th>
                <th className="py-2.5 pr-4 font-medium">Method / Counterparty</th>
                <th className="py-2.5 pr-4 font-medium text-right">Amount</th>
                <th className="py-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleTx.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    {profile ? 'No wallet transactions recorded yet.' : 'Sign in to view your wallet ledger.'}
                  </td>
                </tr>
              ) : (
                visibleTx.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 pr-4 font-medium text-white capitalize">
                      {tx.txType.replace('_', ' ')}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 capitalize">{tx.walletType}</td>
                    <td className="py-3 pr-4 text-slate-400">
                      {tx.method} {tx.counterpartyMemberId ? `· ${tx.counterpartyMemberId}` : ''}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono-tabular text-[#F5B041]">
                      {formatMoneyFromUsd(tx.amountUsd, country)}
                    </td>
                    <td className="py-3 text-right text-emerald-400 capitalize">{tx.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit / Withdraw Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleWalletRailSubmit}
            className="gw-glass max-w-md w-full rounded-3xl p-6 space-y-4"
          >
            <h3 className="font-display text-xl font-bold text-white capitalize">
              {modalMode} · {targetWallet === 'telecom' ? t.mainTelecomWallet : t.shopWallet}
            </h3>
            <p className="text-xs text-slate-400">
              Region: {country.name} ({country.isBangladesh ? 'bKash, Nagad, Bank & Crypto enabled' : 'Global Crypto-only mode'})
            </p>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Payment Rail</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
              >
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Amount in USD (≈ {formatMoneyFromUsd(Number(amountUsd) || 0, country)})
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                required
                className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer"
              >
                {busy ? 'Processing...' : `Confirm ${modalMode}`}
              </button>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-200 text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
