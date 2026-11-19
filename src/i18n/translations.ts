import { LanguageCode } from '../types/gwallet';

export interface TranslationDictionary {
  brandName: string;
  navOverview: string;
  navWallets: string;
  navTelecom: string;
  navShop: string;
  navCards: string;
  navCommunity: string;
  navReferrals: string;
  navAdmin: string;
  membershipBtn: string;
  joinMeBtn: string;
  signIn: string;
  signOut: string;
  mainTelecomWallet: string;
  shopWallet: string;
  deposit: string;
  withdraw: string;
  p2pSend: string;
  escrowLock: string;
  telecomTitle: string;
  shopTitle: string;
  cart: string;
  sellerMembership: string;
  openSellerDokan: string;
  flashSales: string;
  virtualCardsTitle: string;
  issueCard: string;
  regionalTab: string;
  globalTab: string;
  communityTitle: string;
  prizeWheelTitle: string;
  spinWheel: string;
  referralsTitle: string;
  adminPanelTitle: string;
  kycStatus: string;
  biometricLock: string;
  detectGps: string;
  startupMemberTitle: string;
  startupMemberSub: string;
  continueBtn: string;
  closeBtn: string;
  joinNow: string;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  en: {
    brandName: 'G Wallet',
    navOverview: 'Overview',
    navWallets: 'Wallets & P2P',
    navTelecom: 'Telecom',
    navShop: 'Shop',
    navCards: 'Virtual Cards',
    navCommunity: 'Community',
    navReferrals: 'Referrals',
    navAdmin: 'Master Admin',
    membershipBtn: 'Membership',
    joinMeBtn: 'Join Me',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    mainTelecomWallet: 'Main Telecom Wallet',
    shopWallet: 'Shop Wallet',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    p2pSend: 'P2P Send',
    escrowLock: 'Escrow',
    telecomTitle: 'Global Telecom Marketplace',
    shopTitle: 'G Wallet Shop & Dokan',
    cart: 'Cart',
    sellerMembership: 'Seller Plan',
    openSellerDokan: 'Open Dokan',
    flashSales: 'Flash Sales',
    virtualCardsTitle: 'Virtual Visa & Mastercard',
    issueCard: 'Generate AI Virtual Card',
    regionalTab: 'Regional',
    globalTab: 'Global',
    communityTitle: 'Community Feed & Live Chat',
    prizeWheelTitle: 'Member Prize Wheel',
    spinWheel: 'Spin Wheel',
    referralsTitle: '5-Generation Referral Engine',
    adminPanelTitle: 'Master Admin Command',
    kycStatus: 'KYC Verification',
    biometricLock: 'Biometric Auth',
    detectGps: 'Auto GPS',
    startupMemberTitle: 'G Wallet Sovereign Membership',
    startupMemberSub: 'Unlock VIP escrow limits, reduced virtual card fees, Seller Dokan slots, and 5-generation referral overrides.',
    continueBtn: 'Continue',
    closeBtn: 'Close',
    joinNow: 'Join Now',
  },
  bn: {
    brandName: 'জি ওয়ালেট',
    navOverview: 'ড্যাশবোর্ড',
    navWallets: 'ওয়ালেট ও P2P',
    navTelecom: 'টেলিকম',
    navShop: 'শপ ও দোকান',
    navCards: 'ভার্চুয়াল কার্ড',
    navCommunity: 'কমিউনিটি',
    navReferrals: 'রেফারেল',
    navAdmin: 'মাস্টার অ্যাডমিন',
    membershipBtn: 'মেম্বারশিপ',
    joinMeBtn: 'জয়েন মি',
    signIn: 'সাইন ইন',
    signOut: 'সাইন আউট',
    mainTelecomWallet: 'মেইন টেলিকম ওয়ালেট',
    shopWallet: 'শপ ওয়ালেট',
    deposit: 'জমা করুন',
    withdraw: 'উত্তোলন',
    p2pSend: 'P2P পাঠান',
    escrowLock: 'এসক্রো',
    telecomTitle: 'গ্লোবাল টেলিকম মার্কেটপ্লেস',
    shopTitle: 'জি ওয়ালেট শপ ও দোকান',
    cart: 'কার্ট',
    sellerMembership: 'সেলার প্ল্যান',
    openSellerDokan: 'দোকান খুলুন',
    flashSales: 'ফ্ল্যাশ সেল',
    virtualCardsTitle: 'ভার্চুয়াল ভিসা ও মাস্টারকার্ড',
    issueCard: 'AI ভার্চুয়াল কার্ড তৈরি করুন',
    regionalTab: 'আঞ্চলিক',
    globalTab: 'গ্লোবাল',
    communityTitle: 'কমিউনিটি ফিড ও লাইভ চ্যাট',
    prizeWheelTitle: 'মেম্বার প্রাইজ হুইল',
    spinWheel: 'হুইল ঘোরান',
    referralsTitle: '৫-জেনারেশন রেফারেল সিস্টেম',
    adminPanelTitle: 'মাস্টার অ্যাডমিন প্যানেল',
    kycStatus: 'KYC ভেরিফিকেশন',
    biometricLock: 'বায়োমেট্রিক লক',
    detectGps: 'অটো GPS',
    startupMemberTitle: 'জি ওয়ালেট ভিআইপি মেম্বারশিপ',
    startupMemberSub: 'ভিআইপি এসক্রো সুবিধা, কম ভার্চুয়াল কার্ড ফি, সেলার দোকান স্লট এবং ৫-স্তরের রেফারেল আয় আনলক করুন।',
    continueBtn: 'পরবর্তী',
    closeBtn: 'বন্ধ করুন',
    joinNow: 'যোগ দিন',
  },
  ar: {
    brandName: 'محفظة G',
    navOverview: 'الرئيسية',
    navWallets: 'المحافظ والتحويل',
    navTelecom: 'الاتصالات',
    navShop: 'المتجر',
    navCards: 'البطاقات الافتراضية',
    navCommunity: 'المجتمع',
    navReferrals: 'الإحالات',
    navAdmin: 'الإدارة العامة',
    membershipBtn: 'العضوية',
    joinMeBtn: 'انضم إلي',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    mainTelecomWallet: 'محفظة الاتصالات الرئيسية',
    shopWallet: 'محفظة التسوق',
    deposit: 'إيداع',
    withdraw: 'سحب',
    p2pSend: 'تحويل P2P',
    escrowLock: 'الضمان',
    telecomTitle: 'سوق الاتصالات العالمي',
    shopTitle: 'متجر G وركن البائعين',
    cart: 'السلة',
    sellerMembership: 'خطة البائع',
    openSellerDokan: 'فتح متجر',
    flashSales: 'عروض خاطفة',
    virtualCardsTitle: 'بطاقات فيزا وماستركارد الافتراضية',
    issueCard: 'إنشاء بطاقة بالذكاء الاصطناعي',
    regionalTab: 'إقليمي',
    globalTab: 'عالمي',
    communityTitle: 'المجتمع والدردشة المباشرة',
    prizeWheelTitle: 'عجلة الجوائز',
    spinWheel: 'تدوير العجلة',
    referralsTitle: 'نظام الإحالة لـ 5 أجيال',
    adminPanelTitle: 'لوحة تحكم المسؤول',
    kycStatus: 'توثيق الهوية KYC',
    biometricLock: 'القفل البيومتري',
    detectGps: 'تحديد الموقع',
    startupMemberTitle: 'عضوية محفظة G الذهبية',
    startupMemberSub: 'افتح حدود الضمان المرتفعة ورسوم البطاقات المخفضة ومتاجر البائعين وعمولات 5 أجيال.',
    continueBtn: 'متابعة',
    closeBtn: 'إغلاق',
    joinNow: 'انضم الآن',
  },
  hi: {
    brandName: 'जी वॉलेट',
    navOverview: 'डैशबोर्ड',
    navWallets: 'वॉलेट और P2P',
    navTelecom: 'टेलीकॉम',
    navShop: 'शॉप व दुकान',
    navCards: 'वर्चुअल कार्ड',
    navCommunity: 'कम्युनिटी',
    navReferrals: 'रेफरल',
    navAdmin: 'मास्टर एडमिन',
    membershipBtn: 'मेंबरशिप',
    joinMeBtn: 'जॉइन मी',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    mainTelecomWallet: 'मेन टेलीकॉम वॉलेट',
    shopWallet: 'शॉप वॉलेट',
    deposit: 'जमा करें',
    withdraw: 'निकासी',
    p2pSend: 'P2P भेजें',
    escrowLock: 'एस्क्रो',
    telecomTitle: 'ग्लोबल टेलीकॉम मार्केटप्लेस',
    shopTitle: 'जी वॉलेट शॉप व दुकान',
    cart: 'कार्ट',
    sellerMembership: 'सेलर प्लान',
    openSellerDokan: 'दुकान खोलें',
    flashSales: 'फ्लैश सेल',
    virtualCardsTitle: 'वर्चुअल वीज़ा व मास्टरकार्ड',
    issueCard: 'AI वर्चुअल कार्ड बनाएं',
    regionalTab: 'क्षेत्रीय',
    globalTab: 'ग्लोबल',
    communityTitle: 'कम्युनिटी फ़ीड व लाइव चैट',
    prizeWheelTitle: 'मेंबर प्राइज़ व्हील',
    spinWheel: 'व्हील घुमाएं',
    referralsTitle: '5-पीढ़ी रेफरल सिस्टम',
    adminPanelTitle: 'मास्टर एडमिन पैनल',
    kycStatus: 'KYC सत्यापन',
    biometricLock: 'बायोमेट्रिक लॉक',
    detectGps: 'ऑटो GPS',
    startupMemberTitle: 'जी वॉलेट गोल्ड मेंबरशिप',
    startupMemberSub: 'वीआईपी एस्क्रो सीमा, कम वर्चुअल कार्ड शुल्क, सेलर दुकान स्लॉट और 5-पीढ़ी रेफरल अनलॉक करें।',
    continueBtn: 'आगे बढ़ें',
    closeBtn: 'बंद करें',
    joinNow: 'अभी जुड़ें',
  },
};
