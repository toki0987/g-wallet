import { formatSupabaseError, supabase } from './supabase';
import {
  AppConfig,
  CommunityMessage,
  CommunityPost,
  CountryCurrencyConfig,
  EscrowRecord,
  MarketplaceProduct,
  MemberDirectoryEntry,
  ReferralCommission,
  SellerDokan,
  ShopOrder,
  TelecomOffer,
  UserProfile,
  VirtualCard,
  WalletTransaction,
} from '../types/gwallet';
import { DEFAULT_APP_CONFIG } from './seedData';

export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower === 'admin@gwallet.com' || lower === 'mdtokiuddinnasrullah@gmail.com';
}

function generateMemberId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `GW-${num}`;
}

export function mapProfileRow(row: any): UserProfile {
  return {
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    memberId: row.member_id,
    role: row.role,
    membershipTier: row.membership_tier,
    countryCode: row.country_code,
    currencyCode: row.currency_code,
    telecomBalanceUsd: Number(row.telecom_balance_usd ?? 0),
    shopBalanceUsd: Number(row.shop_balance_usd ?? 0),
    kycStatus: row.kyc_status,
    kycDocType: row.kyc_doc_type || '',
    kycDocBase64: row.kyc_doc_base64 || '',
    biometricEnabled: Boolean(row.biometric_enabled),
    referredByCode: row.referred_by_code || '',
    referralAncestors: Array.isArray(row.referral_ancestors) ? row.referral_ancestors : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTxRow(row: any): WalletTransaction {
  return {
    id: row.id,
    uid: row.uid,
    walletType: row.wallet_type,
    txType: row.tx_type,
    amountUsd: Number(row.amount_usd),
    localAmount: Number(row.local_amount),
    currencyCode: row.currency_code,
    method: row.method,
    counterpartyMemberId: row.counterparty_member_id || '',
    note: row.note || '',
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapEscrowRow(row: any): EscrowRecord {
  return {
    id: row.id,
    buyerUid: row.buyer_uid,
    sellerUid: row.seller_uid,
    buyerMemberId: row.buyer_member_id,
    sellerMemberId: row.seller_member_id,
    title: row.title,
    amountUsd: Number(row.amount_usd),
    status: row.status,
    disputeReason: row.dispute_reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDokanRow(row: any): SellerDokan {
  return {
    id: row.id,
    ownerUid: row.owner_uid,
    memberId: row.member_id,
    shopName: row.shop_name,
    category: row.category,
    membershipPlan: row.membership_plan,
    countryCode: row.country_code,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapProductRow(row: any): MarketplaceProduct {
  return {
    id: row.id,
    dokanId: row.dokan_id,
    sellerUid: row.seller_uid,
    shopName: row.shop_name,
    title: row.title,
    description: row.description || '',
    category: row.category,
    priceUsd: Number(row.price_usd),
    originalPriceUsd: row.original_price_usd ? Number(row.original_price_usd) : undefined,
    isFlashSale: Boolean(row.is_flash_sale),
    stock: Number(row.stock ?? 0),
    countryScope: row.country_scope,
    imageData: row.image_data || '',
    createdAt: row.created_at,
  };
}

export function mapOrderRow(row: any): ShopOrder {
  return {
    id: row.id,
    buyerUid: row.buyer_uid,
    sellerUid: row.seller_uid,
    dokanId: row.dokan_id,
    itemsSummary: row.items_summary,
    itemCount: Number(row.item_count),
    totalUsd: Number(row.total_usd),
    shippingAddress: row.shipping_address,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapTelecomRow(row: any): TelecomOffer {
  return {
    id: row.id,
    creatorUid: row.creator_uid,
    creatorName: row.creator_name,
    creatorMemberId: row.creator_member_id,
    isOfficial: Boolean(row.is_official),
    operator: row.operator,
    offerType: row.offer_type,
    title: row.title,
    volumeLabel: row.volume_label,
    countryCode: row.country_code,
    priceUsd: Number(row.price_usd),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapPostRow(row: any): CommunityPost {
  return {
    id: row.id,
    authorUid: row.author_uid,
    authorName: row.author_name,
    authorMemberId: row.author_member_id,
    scope: row.scope,
    countryCode: row.country_code,
    content: row.content,
    likesCount: Number(row.likes_count ?? 0),
    createdAt: row.created_at,
  };
}

export function mapCommunityMsgRow(row: any): CommunityMessage {
  return {
    id: row.id,
    authorUid: row.author_uid,
    authorName: row.author_name,
    authorMemberId: row.author_member_id,
    channel: row.channel,
    countryCode: row.country_code,
    text: row.text,
    createdAt: row.created_at,
  };
}

export function mapCardRow(row: any): VirtualCard {
  return {
    id: row.id,
    ownerUid: row.owner_uid,
    brand: row.brand,
    cardholderName: row.cardholder_name,
    maskedNumber: row.masked_number,
    last4: row.last4,
    fullNumber: row.full_number,
    cvv: row.cvv,
    expiry: row.expiry,
    tierName: row.tier_name,
    aiDesignTheme: row.ai_design_theme,
    aiBenefits: Array.isArray(row.ai_benefits) ? row.ai_benefits : [],
    balanceUsd: Number(row.balance_usd ?? 0),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapReferralRow(row: any): ReferralCommission {
  return {
    id: row.id,
    beneficiaryUid: row.beneficiary_uid,
    fromUid: row.from_uid,
    fromMemberId: row.from_member_id,
    generation: Number(row.generation),
    amountUsd: Number(row.amount_usd),
    sourceAction: row.source_action,
    createdAt: row.created_at,
  };
}

export function mapAppConfigRow(row: any): AppConfig {
  return {
    joinMeApps: Array.isArray(row.join_me_apps) ? row.join_me_apps : DEFAULT_APP_CONFIG.joinMeApps,
    startupAd: row.startup_ad?.title ? row.startup_ad : DEFAULT_APP_CONFIG.startupAd,
    pinnedMiniAd: row.pinned_mini_ad?.text ? row.pinned_mini_ad : DEFAULT_APP_CONFIG.pinnedMiniAd,
    carouselBanners: Array.isArray(row.carousel_banners)
      ? row.carousel_banners
      : DEFAULT_APP_CONFIG.carouselBanners,
    referralRates: row.referral_rates?.gen1 !== undefined
      ? row.referral_rates
      : DEFAULT_APP_CONFIG.referralRates,
    virtualCardConfig: row.virtual_card_config?.visaPriceUsd !== undefined
      ? row.virtual_card_config
      : DEFAULT_APP_CONFIG.virtualCardConfig,
    wheelPrizes: Array.isArray(row.wheel_prizes) ? row.wheel_prizes : DEFAULT_APP_CONFIG.wheelPrizes,
  };
}

export async function ensureUserProfile(params: {
  uid: string;
  email: string;
  displayName: string;
  preferredRole?: 'buyer' | 'seller';
  countryCode?: string;
  currencyCode?: string;
  referredByCode?: string;
}): Promise<UserProfile> {
  const { data: existing, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('uid', params.uid)
    .maybeSingle();

  if (fetchErr) {
    formatSupabaseError(fetchErr, 'profiles.select');
  }
  if (existing) {
    return mapProfileRow(existing);
  }

  const memberId = generateMemberId();
  let referralAncestors: string[] = [];

  if (params.referredByCode && /^GW-\d{6}$/.test(params.referredByCode.trim().toUpperCase())) {
    const code = params.referredByCode.trim().toUpperCase();
    const { data: sponsorDir } = await supabase
      .from('member_directory')
      .select('uid')
      .eq('member_id', code)
      .maybeSingle();

    if (sponsorDir?.uid && sponsorDir.uid !== params.uid) {
      const { data: sponsorProfile } = await supabase
        .from('profiles')
        .select('referral_ancestors')
        .eq('uid', sponsorDir.uid)
        .maybeSingle();
      const parentChain = Array.isArray(sponsorProfile?.referral_ancestors)
        ? sponsorProfile.referral_ancestors
        : [];
      referralAncestors = [sponsorDir.uid, ...parentChain].slice(0, 5);
    }
  }

  const role = params.preferredRole === 'seller' ? 'seller' : 'buyer';
  const cleanName = (params.displayName || 'G Wallet Member').slice(0, 80);

  const { data: inserted, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      uid: params.uid,
      email: params.email,
      display_name: cleanName,
      member_id: memberId,
      role,
      membership_tier: 'standard',
      country_code: params.countryCode || 'BD',
      currency_code: params.currencyCode || 'BDT',
      telecom_balance_usd: 120,
      shop_balance_usd: 85,
      kyc_status: 'unsubmitted',
      biometric_enabled: false,
      referred_by_code: params.referredByCode?.trim().toUpperCase() || '',
      referral_ancestors: referralAncestors,
    })
    .select()
    .single();

  if (insertErr) {
    formatSupabaseError(insertErr, 'profiles.insert');
  }

  const { error: dirErr } = await supabase.from('member_directory').insert({
    member_id: memberId,
    uid: params.uid,
    display_name: cleanName,
    role,
    is_verified_seller: false,
  });
  if (dirErr) {
    console.warn('Directory insert note:', dirErr.message);
  }

  return mapProfileRow(inserted);
}

export async function claimPendingWalletCredits(): Promise<number> {
  const { data, error } = await supabase.rpc('claim_wallet_credits');
  if (error) {
    console.warn('Claim credits note:', error.message);
    return 0;
  }
  return Number(data || 0);
}

export async function distributeFiveGenReferrals(params: {
  fromProfile: UserProfile;
  baseAmountUsd: number;
  sourceAction: string;
  rates: AppConfig['referralRates'];
}): Promise<void> {
  const ancestors = params.fromProfile.referralAncestors || [];
  if (ancestors.length === 0 || params.baseAmountUsd <= 0) return;

  const rateList = [
    params.rates.gen1,
    params.rates.gen2,
    params.rates.gen3,
    params.rates.gen4,
    params.rates.gen5,
  ];

  const referralRows: any[] = [];
  const creditRows: any[] = [];

  ancestors.slice(0, 5).forEach((beneficiaryUid, idx) => {
    const pct = rateList[idx] || 0;
    const bonus = Number(((params.baseAmountUsd * pct) / 100).toFixed(4));
    if (bonus > 0 && beneficiaryUid !== params.fromProfile.uid) {
      referralRows.push({
        beneficiary_uid: beneficiaryUid,
        from_uid: params.fromProfile.uid,
        from_member_id: params.fromProfile.memberId,
        generation: idx + 1,
        amount_usd: bonus,
        source_action: params.sourceAction.slice(0, 75),
      });
      creditRows.push({
        sender_uid: params.fromProfile.uid,
        recipient_uid: beneficiaryUid,
        wallet_type: 'telecom',
        amount_usd: bonus,
        source_type: 'referral_bonus',
        note: `Gen ${idx + 1} referral commission from ${params.fromProfile.memberId}`,
        claimed: false,
      });
    }
  });

  if (referralRows.length > 0) {
    await supabase.from('referrals').insert(referralRows);
    await supabase.from('wallet_credits').insert(creditRows);
  }
}

export async function recordWalletMovement(params: {
  profile: UserProfile;
  walletType: 'telecom' | 'shop';
  deltaUsd: number;
  txType: string;
  method: string;
  country: CountryCurrencyConfig;
  counterpartyMemberId?: string;
  note?: string;
}): Promise<void> {
  const current =
    params.walletType === 'telecom' ? params.profile.telecomBalanceUsd : params.profile.shopBalanceUsd;

  if (params.deltaUsd < 0 && current + params.deltaUsd < -0.0001) {
    throw new Error('Insufficient wallet balance.');
  }

  const nextBalance = Number((current + params.deltaUsd).toFixed(4));
  const field = params.walletType === 'telecom' ? 'telecom_balance_usd' : 'shop_balance_usd';

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ [field]: nextBalance, updated_at: new Date().toISOString() })
    .eq('uid', params.profile.uid);

  if (updErr) {
    formatSupabaseError(updErr, 'profiles.balanceUpdate');
  }

  const absUsd = Math.abs(params.deltaUsd);
  const { error: txErr } = await supabase.from('transactions').insert({
    uid: params.profile.uid,
    wallet_type: params.walletType,
    tx_type: params.txType,
    amount_usd: absUsd,
    local_amount: Number((absUsd * params.country.rateFromUsd).toFixed(2)),
    currency_code: params.country.currencyCode,
    method: params.method.slice(0, 58),
    counterparty_member_id: params.counterpartyMemberId || '',
    note: (params.note || '').slice(0, 190),
    status: 'completed',
  });

  if (txErr) {
    formatSupabaseError(txErr, 'transactions.insert');
  }
}

export async function lookupMemberById(memberId: string): Promise<MemberDirectoryEntry | null> {
  const normalized = memberId.trim().toUpperCase();
  if (!/^GW-\d{6}$/.test(normalized)) return null;
  const { data, error } = await supabase
    .from('member_directory')
    .select('*')
    .eq('member_id', normalized)
    .maybeSingle();

  if (error) {
    formatSupabaseError(error, 'member_directory.lookup');
  }
  if (!data) return null;
  return {
    memberId: data.member_id,
    uid: data.uid,
    displayName: data.display_name,
    role: data.role,
    isVerifiedSeller: Boolean(data.is_verified_seller),
  };
}

export async function adminUpdateUserKyc(
  targetUid: string,
  status: 'verified' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ kyc_status: status, updated_at: new Date().toISOString() })
    .eq('uid', targetUid);

  if (error) {
    formatSupabaseError(error, 'profiles.kycUpdate');
  }
      }
