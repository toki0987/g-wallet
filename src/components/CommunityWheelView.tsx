import React, { useEffect, useRef, useState } from 'react';
import {
  Gift,
  Globe,
  Heart,
  MapPin,
  Megaphone,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import { formatSupabaseError, supabase } from '../lib/supabase';
import { recordWalletMovement } from '../lib/gwalletService';
import { formatMoneyFromUsd } from '../lib/seedData';
import {
  AppConfig,
  CommunityMessage,
  CommunityPost,
  CountryCurrencyConfig,
  UserProfile,
} from '../types/gwallet';
import { TranslationDictionary } from '../i18n/translations';

interface CommunityWheelViewProps {
  profile: UserProfile | null;
  country: CountryCurrencyConfig;
  posts: CommunityPost[];
  messages: CommunityMessage[];
  appConfig: AppConfig;
  onOpenAuth: () => void;
  onRefreshData: () => Promise<void>;
  onNavigateLink: (targetUrl: string) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  t: TranslationDictionary;
}

export const CommunityWheelView: React.FC<CommunityWheelViewProps> = ({
  profile,
  country,
  posts,
  messages,
  appConfig,
  onOpenAuth,
  onRefreshData,
  onNavigateLink,
  onToast,
  t,
}) => {
  const [scope, setScope] = useState<'regional' | 'global'>('regional');
  const [postText, setPostText] = useState('');
  const [chatText, setChatText] = useState('');
  const [liveSocketMsgs, setLiveSocketMsgs] = useState<CommunityMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Prize Wheel State
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastReward, setLastReward] = useState<string | null>(null);

  const roomKey = scope === 'regional' ? `community:regional:${country.code}` : 'community:global';

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: roomKey, senderUid: profile?.uid }));
    };

    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        if (parsed.type === 'history' && Array.isArray(parsed.messages)) {
          setLiveSocketMsgs(parsed.messages);
        } else if (parsed.type === 'chat:message' && parsed.payload) {
          setLiveSocketMsgs((prev) => {
            if (prev.some((m) => m.id === parsed.payload.id)) return prev;
            return [...prev, parsed.payload];
          });
        }
      } catch {
        // Ignore non-JSON frames
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [roomKey, profile?.uid]);

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!postText.trim()) return;
    try {
      const { error } = await supabase.from('community_posts').insert({
        author_uid: profile.uid,
        author_name: profile.displayName,
        author_member_id: profile.memberId,
        scope,
        country_code: country.code,
        content: postText.trim().slice(0, 580),
        likes_count: 0,
      });
      if (error) formatSupabaseError(error, 'community_posts.insert');
      setPostText('');
      await onRefreshData();
      onToast(`Published to ${scope} feed!`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Failed to publish post', 'error');
    }
  };

  const handleLikePost = async (post: CommunityPost) => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    try {
      const { error } = await supabase.rpc('like_community_post', { p_post_id: post.id });
      if (error) formatSupabaseError(error, 'like_community_post');
      await onRefreshData();
    } catch (err: any) {
      onToast(err?.message || 'Could not like post', 'error');
    }
  };

  const handleSendCommunityChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!chatText.trim()) return;
    const text = chatText.trim().slice(0, 380);
    setChatText('');

    const localMsg: CommunityMessage = {
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorUid: profile.uid,
      authorName: profile.displayName,
      authorMemberId: profile.memberId,
      channel: scope,
      countryCode: country.code,
      text,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:message',
          room: roomKey,
          payload: localMsg,
        })
      );
    }

    try {
      const { error } = await supabase.from('community_messages').insert({
        author_uid: profile.uid,
        author_name: profile.displayName,
        author_member_id: profile.memberId,
        channel: scope,
        country_code: country.code,
        text,
      });
      if (error) formatSupabaseError(error, 'community_messages.insert');
      await onRefreshData();
    } catch (err: any) {
      onToast(err?.message || 'Chat send failed', 'error');
    }
  };

  const handleSpinWheel = async () => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (spinning || appConfig.wheelPrizes.length === 0) return;

    setSpinning(true);
    const slices = appConfig.wheelPrizes;
    const chosenIdx = Math.floor(Math.random() * slices.length);
    const sliceAngle = 360 / slices.length;
    const targetRot = rotation + 1440 + (360 - chosenIdx * sliceAngle - sliceAngle / 2);
    setRotation(targetRot);

    setTimeout(async () => {
      const won = slices[chosenIdx];
      setSpinning(false);
      setLastReward(`${won.label} (+${formatMoneyFromUsd(won.rewardUsd, country)})`);
      try {
        await recordWalletMovement({
          profile,
          walletType: 'telecom',
          deltaUsd: won.rewardUsd,
          txType: 'wheel_reward',
          method: 'Member Prize Wheel',
          country,
          note: `Won ${won.label}`,
        });
        await onRefreshData();
        onToast(`Prize Wheel reward credited: ${won.label}!`, 'success');
      } catch (err: any) {
        onToast(err?.message || 'Reward claim failed', 'error');
      }
    }, 2200);
  };

  const filteredPosts = posts.filter((p) =>
    scope === 'global' ? p.scope === 'global' : p.scope === 'regional' && p.countryCode === country.code
  );

  const combinedMessages = [
    ...messages.filter((m) =>
      scope === 'global'
        ? m.channel === 'global'
        : m.channel === 'regional' && m.countryCode === country.code
    ),
    ...liveSocketMsgs.filter(
      (wm) => !messages.some((fm) => fm.text === wm.text && fm.authorUid === wm.authorUid)
    ),
  ];

  const wheelSlices = appConfig.wheelPrizes;

  return (
    <div className="space-y-6">
      {/* Pinned Mini-Ad Permanent Floating Ticker */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1A274A] via-[#121D3A] to-[#1A274A] border border-[#F5B041]/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-100">
          <Megaphone className="w-4 h-4 text-[#F5B041] shrink-0" />
          <span>{appConfig.pinnedMiniAd.text}</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigateLink(appConfig.pinnedMiniAd.targetUrl)}
          className="px-3 py-1 rounded-lg gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer shrink-0"
        >
          {appConfig.pinnedMiniAd.linkText}
        </button>
      </div>

      {/* Regional vs Global Channel Switcher */}
      <div className="gw-glass rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">{t.communityTitle}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {scope === 'regional'
              ? `Showing ${country.name} (${country.code}) regional community & live chat`
              : 'Showing Global cross-border community feed & live chat'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#060D1F] border border-white/10">
          <button
            type="button"
            onClick={() => setScope('regional')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              scope === 'regional' ? 'gw-gold-gradient text-[#060D1F]' : 'text-slate-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            {t.regionalTab} ({country.code})
          </button>
          <button
            type="button"
            onClick={() => setScope('global')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              scope === 'global' ? 'gw-gold-gradient text-[#060D1F]' : 'text-slate-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {t.globalTab}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* News Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handlePublishPost} className="gw-glass rounded-2xl p-4 space-y-3">
            <textarea
              rows={2}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={`Share an update with the ${scope === 'regional' ? country.name : 'Global'} G Wallet community...`}
              className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5B041]"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer"
              >
                Post to {scope === 'regional' ? country.code : 'Global'} Feed
              </button>
            </div>
          </form>

          {filteredPosts.length === 0 ? (
            <div className="gw-glass rounded-2xl p-8 text-center text-xs text-slate-400">
              No community posts yet in {scope === 'regional' ? country.name : 'Global'}. Be the first to post!
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div key={post.id} className="gw-glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{post.authorName}</span>
                    <span className="text-slate-400 font-mono-tabular ml-2">{post.authorMemberId}</span>
                  </div>
                  <span className="text-[#F5B041]">
                    {post.scope === 'regional' ? `${post.countryCode} Regional` : 'Global'}
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{post.content}</p>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleLikePost(post)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-rose-400 cursor-pointer"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="font-mono-tabular">{post.likesCount}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Chat & Prize Wheel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live WebSocket + Supabase Chat */}
          <div className="gw-glass rounded-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#F5B041]" />
                <h3 className="font-display text-sm font-bold text-white">
                  {scope === 'regional' ? `${country.code} Regional Chat` : 'Global Lounge Chat'}
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400">Live Sync</span>
            </div>

            <div className="p-4 space-y-2.5 h-64 overflow-y-auto">
              {combinedMessages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">
                  Welcome to the live {scope} chat channel.
                </p>
              ) : (
                combinedMessages.map((msg) => (
                  <div key={msg.id} className="rounded-xl bg-[#060D1F]/80 border border-white/10 p-2.5">
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="font-semibold text-[#F5B041]">{msg.authorName}</span>
                      <span className="font-mono-tabular text-slate-500">{msg.authorMemberId}</span>
                    </div>
                    <p className="text-xs text-slate-200">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendCommunityChat} className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={`Message ${scope} channel...`}
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

          {/* Interactive Prize Wheel */}
          <div className="gw-glass rounded-3xl p-5 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Gift className="w-5 h-5 text-[#F5B041]" />
              <h3 className="font-display text-base font-bold text-white">{t.prizeWheelTitle}</h3>
            </div>

            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#F5B041]" />
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full transition-transform duration-[2200ms] ease-out"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                {wheelSlices.map((slice, idx) => {
                  const total = wheelSlices.length;
                  const angle = (2 * Math.PI) / total;
                  const start = idx * angle - Math.PI / 2;
                  const end = start + angle;
                  const x1 = 100 + 95 * Math.cos(start);
                  const y1 = 100 + 95 * Math.sin(start);
                  const x2 = 100 + 95 * Math.cos(end);
                  const y2 = 100 + 95 * Math.sin(end);
                  const mid = start + angle / 2;
                  const tx = 100 + 58 * Math.cos(mid);
                  const ty = 100 + 58 * Math.sin(mid);
                  return (
                    <g key={slice.id}>
                      <path
                        d={`M100,100 L${x1},${y1} A95,95 0 0,1 ${x2},${y2} Z`}
                        fill={slice.color}
                        stroke="#F5B041"
                        strokeWidth="1.5"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontWeight="600"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {slice.label}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="18" fill="#060D1F" stroke="#F5B041" strokeWidth="3" />
              </svg>
            </div>

            {lastReward && (
              <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Won: {lastReward}
              </p>
            )}

            <button
              type="button"
              disabled={spinning}
              onClick={handleSpinWheel}
              className="w-full py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer disabled:opacity-60"
            >
              {spinning ? 'Spinning...' : t.spinWheel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
