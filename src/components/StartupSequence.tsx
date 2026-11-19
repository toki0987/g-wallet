import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, ExternalLink, Sparkles, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { AppConfig } from '../types/gwallet';
import { TranslationDictionary } from '../i18n/translations';

export type StartupStage = 'membership' | 'join_me' | 'promo_ad' | 'done';

interface JoinMeShutterProps {
  open: boolean;
  apps: AppConfig['joinMeApps'];
  onClose: () => void;
  title: string;
}

export const JoinMeShutter: React.FC<JoinMeShutterProps> = ({ open, apps, onClose, title }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -36, scaleY: 0.92 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -28, scaleY: 0.92 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-b-3xl rounded-t-xl border border-purple-400/35 bg-[#060D1F]/80 backdrop-blur-2xl shadow-2xl shadow-purple-950/50 p-6 origin-top"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 glow-purple flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-white">{title}</h3>
                  <p className="text-xs text-purple-200/75">Connected Ecosystem Apps</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Join Me shutter"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {apps.map((app) => (
                <a
                  key={app.id}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/40 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm shrink-0 shadow-md"
                      style={{ backgroundColor: app.accentHex || '#8B5CF6' }}
                    >
                      {app.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{app.name}</p>
                      <p className="text-xs text-slate-400 truncate">{app.tagline}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-300 shrink-0" />
                </a>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface StartupSequenceProps {
  stage: StartupStage;
  onAdvanceStage: () => void;
  onGoToMembership: () => void;
  onNavigateLink: (targetUrl: string) => void;
  config: AppConfig;
  t: TranslationDictionary;
}

export const StartupSequence: React.FC<StartupSequenceProps> = ({
  stage,
  onAdvanceStage,
  onGoToMembership,
  onNavigateLink,
  config,
  t,
}) => {
  if (stage === 'done') return null;

  return (
    <>
      {/* Pop-Up 1: Membership System Window */}
      <AnimatePresence>
        {stage === 'membership' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="gw-glass max-w-lg w-full rounded-3xl p-6 sm:p-7 relative"
            >
              <button
                type="button"
                onClick={onAdvanceStage}
                aria-label="Close membership popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl gw-gold-gradient glow-gold flex items-center justify-center text-[#060D1F] mb-4">
                <Crown className="w-6 h-6" />
              </div>

              <h2 className="font-display text-2xl font-bold text-white mb-2">
                {t.startupMemberTitle}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-5">
                {t.startupMemberSub}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl bg-[#060D1F]/80 border border-[#F5B041]/25 p-3">
                  <p className="text-xs text-[#F5B041] font-semibold">Gold VIP Member</p>
                  <p className="font-mono-tabular text-lg font-bold text-white mt-0.5">$19 / yr</p>
                  <p className="text-xs text-slate-400 mt-1">Priority Escrow · Lower Card Fees</p>
                </div>
                <div className="rounded-xl bg-[#060D1F]/80 border border-[#F5B041]/25 p-3">
                  <p className="text-xs text-[#F5B041] font-semibold">Seller Dokan Slot</p>
                  <p className="font-mono-tabular text-lg font-bold text-white mt-0.5">$29 / yr</p>
                  <p className="text-xs text-slate-400 mt-1">Verified Storefront · Unlimited Catalog</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onGoToMembership();
                    onAdvanceStage();
                  }}
                  className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.membershipBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={onAdvanceStage}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm cursor-pointer"
                >
                  {t.continueBtn}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pop-Up 2: Join Me Transparent Vertical Shutter */}
      <JoinMeShutter
        open={stage === 'join_me'}
        apps={config.joinMeApps}
        onClose={onAdvanceStage}
        title={t.joinMeBtn}
      />

      {/* Pop-Up 3: Admin Customizable Advertisement Window */}
      <AnimatePresence>
        {stage === 'promo_ad' && config.startupAd.enabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="gw-glass max-w-lg w-full rounded-3xl overflow-hidden relative"
            >
              <button
                type="button"
                onClick={onAdvanceStage}
                aria-label="Close advertisement popup"
                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {config.startupAd.imageData ? (
                <img
                  src={config.startupAd.imageData}
                  alt={config.startupAd.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-[#122452] via-[#09132B] to-[#060D1F] relative flex items-center justify-center px-6">
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 20% 25%, rgba(245, 176, 65, 0.45), transparent 55%)',
                    }}
                  />
                  <div className="relative z-10 w-64 h-36 rounded-2xl border border-[#F5B041]/40 bg-gradient-to-br from-[#1B2A4E] to-[#080E1E] p-4 shadow-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-wider text-[#F5B041]">G WALLET VISA</span>
                      <Sparkles className="w-4 h-4 text-[#F5B041]" />
                    </div>
                    <p className="font-mono-tabular text-sm text-slate-200 tracking-widest">
                      4532 •••• •••• 8841
                    </p>
                    <p className="text-[11px] text-slate-400">AI Sovereign Tier</p>
                  </div>
                </div>
              )}

              <div className="p-6">
                <p className="text-xs font-medium text-[#F5B041] mb-1">Featured Announcement</p>
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  {config.startupAd.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-5">
                  {config.startupAd.subtitle}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateLink(config.startupAd.targetUrl);
                      onAdvanceStage();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{config.startupAd.buttonText || t.joinNow}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onAdvanceStage}
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-medium cursor-pointer"
                  >
                    {t.closeBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
