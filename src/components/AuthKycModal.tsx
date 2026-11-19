import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  FileCheck,
  Fingerprint,
  Lock,
  ShieldCheck,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { supabase, formatSupabaseError } from '../lib/supabase';
import { compressImageUnder100KB } from '../lib/imageCompressor';
import { UserProfile } from '../types/gwallet';
import { TranslationDictionary } from '../i18n/translations';

interface AuthKycModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onEmailAuth: (params: {
    mode: 'signin' | 'signup';
    email: string;
    password: string;
    displayName: string;
    role: 'buyer' | 'seller';
    referralCode: string;
  }) => Promise<void>;
  onGoogleSignIn: (role: 'buyer' | 'seller', referralCode: string) => Promise<void>;
  onProfileRefresh: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  t: TranslationDictionary;
}

export const AuthKycModal: React.FC<AuthKycModalProps> = ({
  open,
  onClose,
  profile,
  onEmailAuth,
  onGoogleSignIn,
  onProfileRefresh,
  onToast,
  t,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>('buyer');
  const [referralInput, setReferralInput] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [docType, setDocType] = useState('National ID (NID)');
  const [compressedKyc, setCompressedKyc] = useState<{
    dataUrl: string;
    sizeBytes: number;
  } | null>(null);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [togglingBio, setTogglingBio] = useState(false);

  if (!open) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      await onEmailAuth({
        mode: authMode,
        email,
        password,
        displayName,
        role: selectedRole,
        referralCode: referralInput,
      });
      onClose();
    } catch (err: any) {
      onToast(err?.message || 'Authentication failed', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleClick = async () => {
    setSigningIn(true);
    try {
      await onGoogleSignIn(selectedRole, referralInput);
    } catch (err: any) {
      onToast(err?.message || 'Google sign-in failed', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await compressImageUnder100KB(file, 900);
      setCompressedKyc({ dataUrl: result.dataUrl, sizeBytes: result.sizeBytes });
      onToast(`Compressed KYC image to ${(result.sizeBytes / 1024).toFixed(1)} KB`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Compression failed', 'error');
    }
  };

  const handleSubmitKyc = async () => {
    if (!profile || !compressedKyc) return;
    setUploadingKyc(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_doc_type: docType,
          kyc_doc_base64: compressedKyc.dataUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('uid', profile.uid);
      if (error) formatSupabaseError(error, 'profiles.kycSubmit');
      await onProfileRefresh();
      onToast('KYC document submitted for Master Admin review.', 'success');
      setCompressedKyc(null);
    } catch (err: any) {
      onToast(err?.message || 'Failed to submit KYC', 'error');
    } finally {
      setUploadingKyc(false);
    }
  };

  const handleToggleBiometric = async () => {
    if (!profile) return;
    setTogglingBio(true);
    try {
      const next = !profile.biometricEnabled;
      if (next && typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
      }
      const { error } = await supabase
        .from('profiles')
        .update({ biometric_enabled: next, updated_at: new Date().toISOString() })
        .eq('uid', profile.uid);
      if (error) formatSupabaseError(error, 'profiles.biometric');
      await onProfileRefresh();
      onToast(
        next ? 'Biometric authentication enabled.' : 'Biometric authentication disabled.',
        'success'
      );
    } catch (err: any) {
      onToast(err?.message || 'Failed to update biometric toggle', 'error');
    } finally {
      setTogglingBio(false);
    }
  };

  const handleRoleChange = async (role: 'buyer' | 'seller') => {
    if (!profile || profile.role === 'admin') return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('uid', profile.uid);
      if (error) formatSupabaseError(error, 'profiles.roleUpdate');
      await supabase
        .from('member_directory')
        .update({ role })
        .eq('member_id', profile.memberId);
      await onProfileRefresh();
      onToast(`Switched account mode to ${role}.`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Failed to switch role', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="gw-glass max-w-lg w-full rounded-3xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close account modal"
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {!profile ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="w-12 h-12 rounded-2xl gw-gold-gradient flex items-center justify-center text-[#060D1F]">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                {authMode === 'signup' ? 'Create G Wallet Account' : 'Sign In to G Wallet'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Supabase Auth · Dual Buyer & Seller Registration · Instant GW-XXXXXX ID
              </p>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-[#060D1F] border border-white/10">
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  authMode === 'signup' ? 'gw-gold-gradient text-[#060D1F]' : 'text-slate-300'
                }`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  authMode === 'signin' ? 'gw-gold-gradient text-[#060D1F]' : 'text-slate-300'
                }`}
              >
                Sign In
              </button>
            </div>

            {authMode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('buyer')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer ${
                      selectedRole === 'buyer'
                        ? 'border-[#F5B041] bg-[#F5B041]/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">Buyer Account</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Wallets, Shop & Cards</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('seller')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer ${
                      selectedRole === 'seller'
                        ? 'border-[#F5B041] bg-[#F5B041]/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">Seller Account</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Dokan & P2P Trades</p>
                  </button>
                </div>

                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                />
              </>
            )}

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address (e.g. admin@gwallet.com)"
              className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
            />

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
            />

            {authMode === 'signup' && (
              <input
                type="text"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                placeholder="Sponsor Member ID (Optional: GW-XXXXXX)"
                className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-3 px-4 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{signingIn ? 'Authenticating...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}</span>
            </button>

            <button
              type="button"
              disabled={signingIn}
              onClick={handleGoogleClick}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs cursor-pointer"
            >
              Or Continue with Google OAuth
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-[#F5B041] mb-1">Verified G Wallet Identity</p>
              <h2 className="font-display text-xl font-bold text-white">{profile.displayName}</h2>
              <p className="text-xs text-slate-400">{profile.email}</p>
            </div>

            <div className="rounded-2xl bg-[#060D1F]/90 border border-[#F5B041]/25 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">Unique Member ID</p>
                <p className="font-mono-tabular text-lg font-bold text-[#F5B041]">{profile.memberId}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(profile.memberId);
                  onToast('Member ID copied!', 'success');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy ID
              </button>
            </div>

            {profile.role !== 'admin' && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5">
                <span className="text-xs font-medium text-slate-300">Account Mode</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('buyer')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      profile.role === 'buyer'
                        ? 'gw-gold-gradient text-[#060D1F]'
                        : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('seller')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      profile.role === 'seller'
                        ? 'gw-gold-gradient text-[#060D1F]'
                        : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    Seller
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.biometricLock}</p>
                  <p className="text-xs text-slate-400">Fingerprint / Face recognition guard</p>
                </div>
              </div>
              <button
                type="button"
                disabled={togglingBio}
                onClick={handleToggleBiometric}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  profile.biometricEnabled
                    ? 'bg-emerald-500 text-[#060D1F]'
                    : 'bg-white/10 text-slate-200'
                }`}
              >
                {profile.biometricEnabled ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#F5B041]" />
                  <h3 className="text-sm font-semibold text-white">{t.kycStatus}</h3>
                </div>
                <span className="text-xs font-medium text-slate-300 capitalize">
                  Status: {profile.kycStatus}
                </span>
              </div>

              {profile.kycStatus === 'verified' ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Your identity document is verified for high-limit P2P & Dokan trades.</span>
                </div>
              ) : (
                <>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white"
                  >
                    <option value="National ID (NID)">National ID (NID)</option>
                    <option value="Passport">International Passport</option>
                    <option value="Driving License">Driving License</option>
                  </select>

                  <label className="flex items-center justify-center gap-2 border border-dashed border-[#F5B041]/40 rounded-xl p-3.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer">
                    <Upload className="w-4 h-4 text-[#F5B041]" />
                    <span>Upload ID Photo (auto-compressed &lt; 100KB WebP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {compressedKyc && (
                    <div className="flex items-center justify-between bg-[#060D1F] rounded-xl p-2.5 border border-emerald-500/30">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={compressedKyc.dataUrl}
                          alt="Compressed KYC preview"
                          className="w-12 h-9 object-cover rounded-lg"
                        />
                        <div>
                          <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5" /> Ready under 100KB
                          </p>
                          <p className="font-mono-tabular text-[11px] text-slate-400">
                            {(compressedKyc.sizeBytes / 1024).toFixed(1)} KB WebP
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={uploadingKyc}
                        onClick={handleSubmitKyc}
                        className="px-3.5 py-2 rounded-xl gw-gold-gradient text-[#060D1F] text-xs font-semibold cursor-pointer"
                      >
                        {uploadingKyc ? 'Submitting...' : 'Submit KYC'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
