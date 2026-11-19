export type LanguageCode = 'en' | 'bn' | 'ar' | 'hi';

export type AppTab =
  | 'overview'
  | 'wallets'
  | 'telecom'
  | 'shop'
  | 'cards'
  | 'community'
  | 'referrals'
  | 'membership'
  | 'admin';

export interface CountryCurrencyConfig {
  code: string;
  name: string;
  currencyCode: string;
  symbol: string;
  rateFromUsd: number;
  isBangladesh: boolean;
}

export const SUPPORTED_COUNTRIES: CountryCurrencyConfig[] = [
  { code: 'BD', name: 'Bangladesh', currencyCode: 'BDT', symbol: '৳', rateFromUsd: 119.5, isBangladesh: true },
  { code: 'US', name: 'United States', currencyCode: 'USD', symbol: '$', rateFromUsd: 1, isBangladesh: false },
  { code: 'SA', name: 'Saudi Arabia', currencyCode: 'SAR', symbol: '﷼', rateFromUsd: 3.75, isBangladesh: false },
  { code: 'AE', name: 'UAE', currencyCode: 'AED', symbol: 'د.إ', rateFromUsd: 3.67, isBangladesh: false },
  { code: 'IN', name: 'India', currencyCode: 'INR', symbol: '₹', rateFromUsd: 84.2, isBangladesh: false },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', symbol: '£', rateFromUsd: 0.79, isBangladesh: false },
];

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  memberId: string;
  role: 'buyer' | 'seller' | 'admin';
  membershipTier: 'standard' | 'gold' | 'platinum' | 'seller_pro';
  countryCode: string;
  currencyCode: string;
  telecomBalanceUsd: number;
  shopBalanceUsd: number;
  kycStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  kycDocType?: string;
  kycDocBase64?: string;
  biometricEnabled: boolean;
  referredByCode?: string;
  referralAncestors?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MemberDirectoryEntry {
  memberId: string;
  uid: string;
  displayName: string;
  role: 'buyer' | 'seller' | 'admin';
  isVerifiedSeller: boolean;
}

export interface WalletTransaction {
  id: string;
  uid: string;
  walletType: 'telecom' | 'shop';
  txType: string;
  amountUsd: number;
  localAmount: number;
  currencyCode: string;
  method: string;
  counterpartyMemberId?: string;
  note?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt?: unknown;
}

export interface EscrowRecord {
  id: string;
  buyerUid: string;
  sellerUid: string;
  buyerMemberId: string;
  sellerMemberId: string;
  title: string;
  amountUsd: number;
  status: 'locked' | 'released' | 'disputed' | 'refunded';
  disputeReason?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SellerDokan {
  id: string;
  ownerUid: string;
  memberId: string;
  shopName: string;
  category: string;
  membershipPlan: 'starter_dokan' | 'gold_dokan' | 'enterprise_dokan';
  countryCode: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt?: unknown;
}

export interface MarketplaceProduct {
  id: string;
  dokanId: string;
  sellerUid: string;
  shopName: string;
  title: string;
  description?: string;
  category: string;
  priceUsd: number;
  originalPriceUsd?: number;
  isFlashSale: boolean;
  stock: number;
  countryScope: string;
  imageData?: string;
  createdAt?: unknown;
}

export interface ShopOrder {
  id: string;
  buyerUid: string;
  sellerUid: string;
  dokanId: string;
  itemsSummary: string;
  itemCount: number;
  totalUsd: number;
  shippingAddress: string;
  status: 'paid' | 'shipped' | 'delivered' | 'disputed';
  createdAt?: unknown;
}

export interface TelecomOffer {
  id: string;
  creatorUid: string;
  creatorName: string;
  creatorMemberId: string;
  isOfficial: boolean;
  operator: string;
  offerType: 'topup' | 'data' | 'minutes' | 'combo';
  title: string;
  volumeLabel: string;
  countryCode: string;
  priceUsd: number;
  status: 'active' | 'paused';
  createdAt?: unknown;
}

export interface CommunityPost {
  id: string;
  authorUid: string;
  authorName: string;
  authorMemberId: string;
  scope: 'regional' | 'global';
  countryCode: string;
  content: string;
  likesCount: number;
  createdAt?: unknown;
}

export interface CommunityMessage {
  id: string;
  authorUid: string;
  authorName: string;
  authorMemberId: string;
  channel: 'regional' | 'global';
  countryCode: string;
  text: string;
  createdAt?: unknown;
}

export interface VirtualCard {
  id: string;
  ownerUid: string;
  brand: 'Visa' | 'Mastercard';
  cardholderName: string;
  maskedNumber: string;
  last4: string;
  fullNumber: string;
  cvv: string;
  expiry: string;
  tierName: string;
  aiDesignTheme: string;
  aiBenefits: string[];
  balanceUsd: number;
  status: 'active' | 'frozen';
  createdAt?: unknown;
}

export interface ReferralCommission {
  id: string;
  beneficiaryUid: string;
  fromUid: string;
  fromMemberId: string;
  generation: number;
  amountUsd: number;
  sourceAction: string;
  createdAt?: unknown;
}

export interface JoinMeAppItem {
  id: string;
  name: string;
  tagline: string;
  url: string;
  accentHex: string;
}

export interface CarouselBannerItem {
  id: string;
  placement: 'middle' | 'end';
  title: string;
  subtitle: string;
  ctaText: string;
  targetUrl: string;
  durationMs: number;
  imageData?: string;
}

export interface WheelPrizeSlice {
  id: string;
  label: string;
  rewardUsd: number;
  color: string;
}

export interface AppConfig {
  joinMeApps: JoinMeAppItem[];
  startupAd: {
    enabled: boolean;
    title: string;
    subtitle: string;
    buttonText: string;
    targetUrl: string;
    imageData?: string;
  };
  pinnedMiniAd: {
    text: string;
    linkText: string;
    targetUrl: string;
  };
  carouselBanners: CarouselBannerItem[];
  referralRates: {
    gen1: number;
    gen2: number;
    gen3: number;
    gen4: number;
    gen5: number;
  };
  virtualCardConfig: {
    visaPriceUsd: number;
    mastercardPriceUsd: number;
    minDepositUsd: number;
  };
  wheelPrizes: WheelPrizeSlice[];
  }
