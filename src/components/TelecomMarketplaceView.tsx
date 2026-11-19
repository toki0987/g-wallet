import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Radio,
  Send,
  Smartphone,
  Wifi,
  Clock,
  Layers,
  X,
} from 'lucide-react';
import { formatSupabaseError, supabase } from '../lib/supabase';
import { distributeFiveGenReferrals, recordWalletMovement } from '../lib/gwalletService';
import { formatMoneyFromUsd } from '../lib/seedData';
import {
  AppConfig,
  CountryCurrencyConfig,
  TelecomOffer,
  UserProfile,
} from '../types/gwallet';
import { TranslationDictionary } from '../i18n/translations';

interface TelecomMarketplaceViewProps {
  profile: UserProfile | null;
  country: CountryCurrencyConfig;
  offers: TelecomOffer[];
  appConfig: AppConfig;
  onOpenAuth: () => void;
  onRefreshData: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  t: TranslationDictionary;
}

interface DealChatMsg {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
}

export const TelecomMarketplaceView: React.FC<TelecomMarketplaceViewProps> = ({
  profile,
  country,
  offers,
  appConfig,
  onOpenAuth,
  onRefreshData,
  onToast,
  t,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'topup' | 'data' | 'minutes' | 'combo' | 'p2p'>('all');
  const [regionScope, setRegionScope] = useState<'local' | 'global'>('local');
  const [targetPhone, setTargetPhone] = useState('');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const [showCreateP2P, setShowCreateP2P] = useState(false);
  const [newOperator, setNewOperator] = useState('');
  const [newOfferType, setNewOfferType] = useState<'topup' | 'data' | 'minutes' | 'combo'>('data');
  const [newTitle, setNewTitle] = useState('');
  const [newVolume, setNewVolume] = useState('');
  const [newPriceUsd, setNewPriceUsd] = useState('4.50');

  const [activeDealOffer, setActiveDealOffer] = useState<TelecomOffer | null>(null);
  const [chatMessages, setChatMessages] = useState<DealChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  const activeChatId =
    activeDealOffer && profile ? `${activeDealOffer.id}_${profile.uid}` : null;

  useEffect(() => {
    if (!activeChatId || !profile) return;

    supabase
      .from('deal_chat_messages')
      .select('*')
      .eq('chat_id', activeChatId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setChatMessages(
            data.map((m: any) => ({
              id: m.id,
              senderUid: m.sender_uid,
              senderName: m.sender_name,
              text: m.text,
            }))
          );
        }
      });

    const channel = supabase
      .channel(`deal_chat:${activeChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_chat_messages',
          filter: `chat_id=eq.${activeChatId}`,
        },
        (payload) => {
          const row = payload.new as any;
          const nextMsg: DealChatMsg = {
            id: row.id,
            senderUid: row.sender_uid,
            senderName: row.sender_name,
            text: row.text,
          };
          setChatMessages((prev) =>
            prev.some((m) => m.id === nextMsg.id) ? prev : [...prev, nextMsg]
          );
        }
      )
      .subscribe();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'join',
          room: `deal:${activeChatId}`,
          senderUid: profile.uid,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'chat:message' && parsed.payload) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === parsed.payload.id)) return prev;
            return [...prev, parsed.payload];
          });
        }
      } catch {
        // Ignore malformed frame
      }
    };

    return () => {
      supabase.removeChannel(channel);
      ws.close();
      wsRef.current = null;
    };
  }, [activeChatId, profile]);

  const handleBuyOffer = async (offer: TelecomOffer) => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (profile.telecomBalanceUsd < offer.priceUsd) {
      onToast('Insufficient Main Telecom Wallet balance.', 'error');
      return;
    }

    setBuyingId(offer.id);
    try {
      await recordWalletMovement({
        profile,
        walletType: 'telecom',
        deltaUsd: -offer.priceUsd,
        txType: 'telecom_buy',
        method: offer.operator,
        country,
        counterpartyMemberId: offer.creatorMemberId,
        note: `${offer.title}${targetPhone ? ` (${targetPhone})` : ''}`,
      });

      await distributeFiveGenReferrals({
        fromProfile: profile,
        baseAmountUsd: offer.priceUsd,
        sourceAction: `Telecom: ${offer.title}`,
        rates: appConfig.referralRates,
      });

      await onRefreshData();
      onToast(`Activated ${offer.title}!`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Purchase failed', 'error');
    } finally {
      setBuyingId(null);
    }
  };

  const handleCreateP2POffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    try {
      const { error } = await supabase.from('telecom_offers').insert({
        creator_uid: profile.uid,
        creator_name: profile.displayName,
        creator_member_id: profile.memberId,
        is_official: false,
        operator: newOperator.trim(),
        offer_type: newOfferType,
        title: newTitle.trim(),
        volume_label: newVolume.trim(),
        country_code: country.code,
        price_usd: Number(newPriceUsd) || 1,
        status: 'active',
      });
      if (error) formatSupabaseError(error, 'telecom_offers.insert');
      await onRefreshData();
      onToast('Custom P2P Telecom Offer published!', 'success');
      setShowCreateP2P(false);
      setNewTitle('');
      setNewOperator('');
      setNewVolume('');
    } catch (err: any) {
      onToast(err?.message || 'Failed to create P2P offer', 'error');
    }
  };

  const handleOpenDealChat = async (offer: TelecomOffer) => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setActiveDealOffer(offer);
    const chatId = `${offer.id}_${profile.uid}`;
    await supabase.from('deal_chats').upsert(
      {
        id: chatId,
        offer_id: offer.id,
        buyer_uid: profile.uid,
        seller_uid: offer.creatorUid,
        buyer_name: profile.displayName,
        seller_name: offer.creatorName,
        offer_title: offer.title,
      },
      { onConflict: 'id' }
    );
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !activeChatId || !chatInput.trim()) return;
    const text = chatInput.trim().slice(0, 380);
    setChatInput('');

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:message',
          room: `deal:${activeChatId}`,
          payload: {
            id: msgId,
            senderUid: profile.uid,
            senderName: profile.displayName,
            text,
          },
        })
      );
    }

    try {
      const { error } = await supabase.from('deal_chat_messages').insert({
        chat_id: activeChatId,
        sender_uid: profile.uid,
        sender_name: profile.displayName,
        text,
      });
      if (error) console.warn('Deal chat persist note:', error.message);
    } catch (err) {
      console.warn('Deal chat error:', err);
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (regionScope === 'local' && o.countryCode !== country.code && o.countryCode !== 'GLOBAL') {
      return false;
    }
    if (typeFilter === 'p2p') return !o.isOfficial;
    if (typeFilter !== 'all') return o.offerType === typeFilter;
    return true;
  });

  const typeIcon = (type: TelecomOffer['offerType']) => {
    if (type === 'data') return Wifi;
    if (type === 'minutes') return Clock;
    if (type === 'combo') return Layers;
    return Smartphone;
  };

  return (
    <div className="space-y-6">
      <div className="gw-glass rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-[#F5B041]" />
            {t.telecomTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mobile Top-Up, MB Data, Minutes & Combo Packs · Region: {country.name} ({country.currencyCode})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center p-1 rounded-xl bg-[#060D1F] border border-white/10">
            <button
              type="button"
              onClick={() => setRegionScope('local')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                regionScope === 'local' ? 'bg-[#F5B041] text-[#060D1F]' : 'text-slate-300'
              }`}
            >
              {country.code} Local
            </button>
            <button
              type="button"
              onClick={() => setRegionScope('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                regionScope === 'global' ? 'bg-[#F5B041] text-[#060D1F]' : 'text-slate-300'
              }`}
            >
              All Countries
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateP2P(true)}
            className="px-4 py-2 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Post P2P Offer
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#10192E] border border-white/10">
          {(
            [
              { id: 'all', label: 'All Packs' },
              { id: 'topup', label: 'Top-Up' },
              { id: 'data', label: 'MB Data' },
              { id: 'minutes', label: 'Minutes' },
              { id: 'combo', label: 'Combo' },
              { id: 'p2p', label: 'P2P Market' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                typeFilter === tab.id ? 'bg-[#F5B041] text-[#060D1F]' : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="tel"
          value={targetPhone}
          onChange={(e) => setTargetPhone(e.target.value)}
          placeholder="Recipient mobile number (optional)"
          className="w-full sm:w-64 rounded-xl bg-[#10192E] border border-white/15 px-3.5 py-2 text-xs font-mono-tabular text-white focus:outline-none focus:border-[#F5B041]"
        />
      </div>

      {filteredOffers.length === 0 ? (
        <div className="gw-glass rounded-3xl p-10 text-center">
          <p className="text-sm text-slate-300 mb-3">
            No telecom offers found for {country.name} in this filter.
          </p>
          <button
            type="button"
            onClick={() => setRegionScope('global')}
            className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold cursor-pointer"
          >
            Show All Countries
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOffers.map((offer) => {
            const Icon = typeIcon(offer.offerType);
            return (
              <div key={offer.id} className="gw-glass rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>
                      {offer.operator} · {offer.countryCode}
                    </span>
                    <span className="text-[#F5B041] font-medium">
                      {offer.isOfficial ? 'Official' : `P2P · ${offer.creatorMemberId}`}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5B041]/15 border border-[#F5B041]/30 text-[#F5B041] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white">{offer.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{offer.volumeLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-mono-tabular text-base font-bold text-white">
                      {formatMoneyFromUsd(offer.priceUsd, country)}
                    </p>
                    <p className="font-mono-tabular text-[11px] text-slate-400">
                      ${offer.priceUsd.toFixed(2)} USD
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDealChat(offer)}
                      title="Live Deal Chat"
                      className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat
                    </button>
                    <button
                      type="button"
                      disabled={buyingId === offer.id}
                      onClick={() => handleBuyOffer(offer)}
                      className="h-9 px-3.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer disabled:opacity-60"
                    >
                      {buyingId === offer.id ? 'Activating...' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateP2P && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleCreateP2POffer} className="gw-glass max-w-md w-full rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">Post Custom P2P Offer</h3>
              <button type="button" onClick={() => setShowCreateP2P(false)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newOperator}
              onChange={(e) => setNewOperator(e.target.value)}
              placeholder="Operator (e.g. Grameenphone, Airtel, T-Mobile)"
              className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
            />
            <select
              value={newOfferType}
              onChange={(e) => setNewOfferType(e.target.value as any)}
              className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
            >
              <option value="data">MB Data Bundle</option>
              <option value="topup">Mobile Top-Up</option>
              <option value="minutes">Minutes Pack</option>
              <option value="combo">Combo Pack</option>
            </select>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Offer Title (e.g. GP 40GB Discounted Gift)"
              className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newVolume}
                onChange={(e) => setNewVolume(e.target.value)}
                placeholder="40 GB · 30 Days"
                className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2.5 text-xs text-white"
              />
              <input
                type="number"
                min="0.5"
                step="0.01"
                required
                value={newPriceUsd}
                onChange={(e) => setNewPriceUsd(e.target.value)}
                placeholder="Price USD"
                className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2.5 text-xs font-mono-tabular text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer"
            >
              Publish to P2P Market
            </button>
          </form>
        </div>
      )}

      {activeDealOffer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="gw-glass max-w-md w-full rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-white">
                  Deal Chat · {activeDealOffer.title}
                </h4>
                <p className="text-xs text-slate-400">
                  With {activeDealOffer.creatorName} ({activeDealOffer.creatorMemberId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDealOffer(null)}
                className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto min-h-[240px]">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Start negotiating this telecom deal live. Messages sync via WebSocket & Supabase Realtime.
                </p>
              ) : (
                chatMessages.map((m) => {
                  const mine = m.senderUid === profile?.uid;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-slate-400 mb-0.5">{m.senderName}</span>
                      <div
                        className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] ${
                          mine ? 'gw-gold-gradient text-[#060D1F] font-medium' : 'bg-white/10 text-white'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message..."
                className="flex-1 rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-xl gw-gold-gradient text-[#060D1F] flex items-center justify-center cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
