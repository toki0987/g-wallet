-- ============================================================================
-- G Wallet — Complete Supabase PostgreSQL Schema, RLS Policies & Seed Data
-- Run this script once in your Supabase Dashboard -> SQL Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  uid uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  member_id text NOT NULL UNIQUE CHECK (member_id ~ '^GW-[0-9]{6}$'),
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  membership_tier text NOT NULL DEFAULT 'standard' CHECK (membership_tier IN ('standard', 'gold', 'platinum', 'seller_pro')),
  country_code text NOT NULL DEFAULT 'BD',
  currency_code text NOT NULL DEFAULT 'BDT',
  telecom_balance_usd numeric(14, 4) NOT NULL DEFAULT 120 CHECK (telecom_balance_usd >= 0),
  shop_balance_usd numeric(14, 4) NOT NULL DEFAULT 85 CHECK (shop_balance_usd >= 0),
  kyc_status text NOT NULL DEFAULT 'unsubmitted' CHECK (kyc_status IN ('unsubmitted', 'pending', 'verified', 'rejected')),
  kyc_doc_type text DEFAULT '',
  kyc_doc_base64 text DEFAULT '',
  biometric_enabled boolean NOT NULL DEFAULT false,
  referred_by_code text DEFAULT '',
  referral_ancestors uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_directory (
  member_id text PRIMARY KEY CHECK (member_id ~ '^GW-[0-9]{6}$'),
  uid uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  is_verified_seller boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_type text NOT NULL CHECK (wallet_type IN ('telecom', 'shop')),
  tx_type text NOT NULL,
  amount_usd numeric(14, 4) NOT NULL CHECK (amount_usd > 0),
  local_amount numeric(14, 2) NOT NULL CHECK (local_amount > 0),
  currency_code text NOT NULL,
  method text NOT NULL,
  counterparty_member_id text DEFAULT '',
  note text DEFAULT '',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_type text NOT NULL CHECK (wallet_type IN ('telecom', 'shop')),
  amount_usd numeric(14, 4) NOT NULL CHECK (amount_usd > 0),
  source_type text NOT NULL CHECK (source_type IN ('p2p', 'escrow_release', 'escrow_refund', 'referral_bonus', 'shop_payout')),
  note text NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_member_id text NOT NULL,
  seller_member_id text NOT NULL,
  title text NOT NULL,
  amount_usd numeric(14, 4) NOT NULL CHECK (amount_usd > 0),
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'released', 'disputed', 'refunded')),
  dispute_reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_dokans (
  id text PRIMARY KEY DEFAULT ('dokan-' || replace(gen_random_uuid()::text, '-', '')),
  owner_uid uuid NOT NULL,
  member_id text NOT NULL,
  shop_name text NOT NULL,
  category text NOT NULL,
  membership_plan text NOT NULL CHECK (membership_plan IN ('starter_dokan', 'gold_dokan', 'enterprise_dokan')),
  country_code text NOT NULL DEFAULT 'BD',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY DEFAULT ('prod-' || replace(gen_random_uuid()::text, '-', '')),
  dokan_id text NOT NULL REFERENCES public.seller_dokans(id) ON DELETE CASCADE,
  seller_uid uuid NOT NULL,
  shop_name text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  price_usd numeric(14, 2) NOT NULL CHECK (price_usd > 0),
  original_price_usd numeric(14, 2),
  is_flash_sale boolean NOT NULL DEFAULT false,
  stock integer NOT NULL DEFAULT 10 CHECK (stock >= 0),
  country_scope text NOT NULL DEFAULT 'GLOBAL',
  image_data text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_uid uuid NOT NULL,
  dokan_id text NOT NULL,
  items_summary text NOT NULL,
  item_count integer NOT NULL CHECK (item_count > 0),
  total_usd numeric(14, 2) NOT NULL CHECK (total_usd > 0),
  shipping_address text NOT NULL,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'shipped', 'delivered', 'disputed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telecom_offers (
  id text PRIMARY KEY DEFAULT ('tel-' || replace(gen_random_uuid()::text, '-', '')),
  creator_uid text NOT NULL,
  creator_name text NOT NULL,
  creator_member_id text NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  operator text NOT NULL,
  offer_type text NOT NULL CHECK (offer_type IN ('topup', 'data', 'minutes', 'combo')),
  title text NOT NULL,
  volume_label text NOT NULL,
  country_code text NOT NULL DEFAULT 'BD',
  price_usd numeric(14, 2) NOT NULL CHECK (price_usd > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_chats (
  id text PRIMARY KEY,
  offer_id text NOT NULL,
  buyer_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_uid text NOT NULL,
  buyer_name text NOT NULL,
  seller_name text NOT NULL,
  offer_title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL REFERENCES public.deal_chats(id) ON DELETE CASCADE,
  sender_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id text PRIMARY KEY DEFAULT ('post-' || replace(gen_random_uuid()::text, '-', '')),
  author_uid text NOT NULL,
  author_name text NOT NULL,
  author_member_id text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('regional', 'global')),
  country_code text NOT NULL DEFAULT 'BD',
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_member_id text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('regional', 'global')),
  country_code text NOT NULL DEFAULT 'BD',
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.virtual_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand text NOT NULL CHECK (brand IN ('Visa', 'Mastercard')),
  cardholder_name text NOT NULL,
  masked_number text NOT NULL,
  last4 text NOT NULL,
  full_number text NOT NULL,
  cvv text NOT NULL,
  expiry text NOT NULL,
  tier_name text NOT NULL,
  ai_design_theme text NOT NULL,
  ai_benefits text[] NOT NULL DEFAULT '{}',
  balance_usd numeric(14, 2) NOT NULL DEFAULT 0 CHECK (balance_usd >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_member_id text NOT NULL,
  generation integer NOT NULL CHECK (generation BETWEEN 1 AND 5),
  amount_usd numeric(14, 4) NOT NULL CHECK (amount_usd > 0),
  source_action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_config (
  id text PRIMARY KEY,
  join_me_apps jsonb NOT NULL DEFAULT '[]'::jsonb,
  startup_ad jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned_mini_ad jsonb NOT NULL DEFAULT '{}'::jsonb,
  carousel_banners jsonb NOT NULL DEFAULT '[]'::jsonb,
  referral_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  virtual_card_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  wheel_prizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Security Helper & Atomic RPC Functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(auth.jwt() ->> 'email', '') IN ('admin@gwallet.com', 'mdtokiuddinnasrullah@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.uid = auth.uid() AND p.role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.claim_wallet_credits()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_telecom numeric := 0;
  v_shop numeric := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT
    coalesce(sum(CASE WHEN wallet_type = 'telecom' THEN amount_usd ELSE 0 END), 0),
    coalesce(sum(CASE WHEN wallet_type = 'shop' THEN amount_usd ELSE 0 END), 0)
  INTO v_telecom, v_shop
  FROM public.wallet_credits
  WHERE recipient_uid = v_uid AND claimed = false;

  IF (v_telecom + v_shop) > 0 THEN
    UPDATE public.wallet_credits
    SET claimed = true
    WHERE recipient_uid = v_uid AND claimed = false;

    UPDATE public.profiles
    SET
      telecom_balance_usd = telecom_balance_usd + v_telecom,
      shop_balance_usd = shop_balance_usd + v_shop,
      updated_at = now()
    WHERE uid = v_uid;
  END IF;

  RETURN v_telecom + v_shop;
END;
$$;

CREATE OR REPLACE FUNCTION public.like_community_post(p_post_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.community_posts
  SET likes_count = likes_count + 1
  WHERE id = p_post_id;
$$;

-- ----------------------------------------------------------------------------
-- 3. Row-Level Security (RLS) Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_dokans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telecom_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Profiles (Owner + Admin only)
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = uid OR public.is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = uid AND role IN ('buyer', 'seller'));
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE USING (auth.uid() = uid OR public.is_admin())
  WITH CHECK (auth.uid() = uid OR public.is_admin());

-- Member Directory (Public non-PII lookup)
CREATE POLICY "member_dir_select_all" ON public.member_directory
  FOR SELECT USING (true);
CREATE POLICY "member_dir_insert_own" ON public.member_directory
  FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "member_dir_update_own_or_admin" ON public.member_directory
  FOR UPDATE USING (auth.uid() = uid OR public.is_admin());

-- Transactions
CREATE POLICY "tx_select_own_or_admin" ON public.transactions
  FOR SELECT USING (auth.uid() = uid OR public.is_admin());
CREATE POLICY "tx_insert_own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = uid);

-- Wallet Credits
CREATE POLICY "credits_select_party_or_admin" ON public.wallet_credits
  FOR SELECT USING (auth.uid() = sender_uid OR auth.uid() = recipient_uid OR public.is_admin());
CREATE POLICY "credits_insert_sender" ON public.wallet_credits
  FOR INSERT WITH CHECK (auth.uid() = sender_uid AND claimed = false);
CREATE POLICY "credits_update_recipient_or_admin" ON public.wallet_credits
  FOR UPDATE USING (auth.uid() = recipient_uid OR public.is_admin());

-- Escrows
CREATE POLICY "escrows_select_party_or_admin" ON public.escrows
  FOR SELECT USING (auth.uid() = buyer_uid OR auth.uid() = seller_uid OR public.is_admin());
CREATE POLICY "escrows_insert_buyer" ON public.escrows
  FOR INSERT WITH CHECK (auth.uid() = buyer_uid AND status = 'locked');
CREATE POLICY "escrows_update_party_or_admin" ON public.escrows
  FOR UPDATE USING (auth.uid() = buyer_uid OR auth.uid() = seller_uid OR public.is_admin());

-- Seller Dokans
CREATE POLICY "dokans_select_all" ON public.seller_dokans
  FOR SELECT USING (true);
CREATE POLICY "dokans_insert_owner" ON public.seller_dokans
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);
CREATE POLICY "dokans_update_owner_or_admin" ON public.seller_dokans
  FOR UPDATE USING (auth.uid() = owner_uid OR public.is_admin());

-- Products
CREATE POLICY "products_select_all" ON public.products
  FOR SELECT USING (true);
CREATE POLICY "products_insert_verified_dokan" ON public.products
  FOR INSERT WITH CHECK (
    public.is_admin() OR (
      auth.uid() = seller_uid AND
      EXISTS (SELECT 1 FROM public.seller_dokans d WHERE d.id = dokan_id AND d.owner_uid = auth.uid() AND d.status = 'active')
    )
  );
CREATE POLICY "products_update_owner_or_admin" ON public.products
  FOR UPDATE USING (auth.uid() = seller_uid OR public.is_admin());
CREATE POLICY "products_delete_owner_or_admin" ON public.products
  FOR DELETE USING (auth.uid() = seller_uid OR public.is_admin());

-- Orders
CREATE POLICY "orders_select_party_or_admin" ON public.orders
  FOR SELECT USING (auth.uid() = buyer_uid OR auth.uid() = seller_uid OR public.is_admin());
CREATE POLICY "orders_insert_buyer" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_uid);
CREATE POLICY "orders_update_party_or_admin" ON public.orders
  FOR UPDATE USING (auth.uid() = buyer_uid OR auth.uid() = seller_uid OR public.is_admin());

-- Telecom Offers
CREATE POLICY "telecom_select_all" ON public.telecom_offers
  FOR SELECT USING (true);
CREATE POLICY "telecom_insert_auth" ON public.telecom_offers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (is_official = false OR public.is_admin()));
CREATE POLICY "telecom_update_owner_or_admin" ON public.telecom_offers
  FOR UPDATE USING (auth.uid()::text = creator_uid OR public.is_admin());
CREATE POLICY "telecom_delete_owner_or_admin" ON public.telecom_offers
  FOR DELETE USING (auth.uid()::text = creator_uid OR public.is_admin());

-- Deal Chats & Messages
CREATE POLICY "deal_chats_select_party" ON public.deal_chats
  FOR SELECT USING (auth.uid() = buyer_uid OR auth.uid()::text = seller_uid OR public.is_admin());
CREATE POLICY "deal_chats_insert_buyer" ON public.deal_chats
  FOR INSERT WITH CHECK (auth.uid() = buyer_uid);

CREATE POLICY "deal_msgs_select_party" ON public.deal_chat_messages
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.deal_chats dc
      WHERE dc.id = chat_id AND (dc.buyer_uid = auth.uid() OR dc.seller_uid = auth.uid()::text)
    )
  );
CREATE POLICY "deal_msgs_insert_party" ON public.deal_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_uid AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.deal_chats dc
        WHERE dc.id = chat_id AND (dc.buyer_uid = auth.uid() OR dc.seller_uid = auth.uid()::text)
      )
    )
  );

-- Community Posts & Messages
CREATE POLICY "posts_select_all" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_auth" ON public.community_posts FOR INSERT WITH CHECK (auth.uid()::text = author_uid);
CREATE POLICY "posts_delete_owner_or_admin" ON public.community_posts FOR DELETE USING (auth.uid()::text = author_uid OR public.is_admin());

CREATE POLICY "cmsgs_select_all" ON public.community_messages FOR SELECT USING (true);
CREATE POLICY "cmsgs_insert_auth" ON public.community_messages FOR INSERT WITH CHECK (auth.uid() = author_uid);
CREATE POLICY "cmsgs_delete_owner_or_admin" ON public.community_messages FOR DELETE USING (auth.uid() = author_uid OR public.is_admin());

-- Virtual Cards
CREATE POLICY "cards_select_owner_or_admin" ON public.virtual_cards
  FOR SELECT USING (auth.uid() = owner_uid OR public.is_admin());
CREATE POLICY "cards_insert_owner" ON public.virtual_cards
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);
CREATE POLICY "cards_update_owner_or_admin" ON public.virtual_cards
  FOR UPDATE USING (auth.uid() = owner_uid OR public.is_admin());

-- Referrals
CREATE POLICY "referrals_select_beneficiary_or_admin" ON public.referrals
  FOR SELECT USING (auth.uid() = beneficiary_uid OR public.is_admin());
CREATE POLICY "referrals_insert_from_user" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = from_uid);

-- App Config CMS
CREATE POLICY "app_config_select_all" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "app_config_write_admin" ON public.app_config FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Realtime Publication
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE
    public.profiles,
    public.transactions,
    public.wallet_credits,
    public.escrows,
    public.seller_dokans,
    public.products,
    public.orders,
    public.telecom_offers,
    public.deal_chat_messages,
    public.community_posts,
    public.community_messages,
    public.virtual_cards,
    public.referrals,
    public.app_config;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Initial Catalog & CMS Seed Data
-- ----------------------------------------------------------------------------

INSERT INTO public.app_config (
  id, join_me_apps, startup_ad, pinned_mini_ad, carousel_banners, referral_rates, virtual_card_config, wheel_prizes
) VALUES (
  'global',
  '[
    {"id":"app-pay","name":"G Pay Express","tagline":"Instant QR & Merchant Rail","url":"https://gwallet.app/pay","accentHex":"#F5B041"},
    {"id":"app-dokan","name":"Dokan Studio","tagline":"Seller Inventory Companion","url":"https://gwallet.app/dokan","accentHex":"#3B82F6"},
    {"id":"app-tele","name":"TeleHub BD","tagline":"Wholesale Data & Minutes","url":"https://gwallet.app/telehub","accentHex":"#A855F7"},
    {"id":"app-vault","name":"G Vault Crypto","tagline":"USDT & Multi-Chain Bridge","url":"https://gwallet.app/vault","accentHex":"#10B981"}
  ]'::jsonb,
  '{"enabled":true,"title":"Zero-Fee Virtual Visa Launch","subtitle":"Activate your AI-tailored Virtual Visa or Mastercard today and earn 5-generation referral rewards across every top-up and Dokan order.","buttonText":"Join Promotion","targetUrl":"#cards"}'::jsonb,
  '{"text":"Pinned Deal: Grameenphone & Robi 50GB Combo Packs at 12% Member Discount — Escrow Protected","linkText":"Claim Offer","targetUrl":"#telecom"}'::jsonb,
  '[
    {"id":"mid-1","placement":"middle","title":"G Wallet Shop Flash Event","subtitle":"Pay seamlessly via Shop Wallet with instant Seller Dokan escrow protection across verified merchants.","ctaText":"Explore Shop","targetUrl":"#shop","durationMs":4500},
    {"id":"mid-2","placement":"middle","title":"Global Virtual Visa & Mastercard","subtitle":"Spend worldwide online with Luhn-verified numbers, dynamic CVV security, and AI usage perks.","ctaText":"Issue Virtual Card","targetUrl":"#cards","durationMs":4500},
    {"id":"end-1","placement":"end","title":"5-Generation Referral Network","subtitle":"Share your GW-XXXXXX Member ID and earn automated commissions across 5 downline generations.","ctaText":"View Referral Tree","targetUrl":"#referrals","durationMs":5500},
    {"id":"end-2","placement":"end","title":"Open Your Verified Seller Dokan","subtitle":"Activate a Seller Membership slot and launch your storefront to thousands of regional and global buyers.","ctaText":"Open Dokan","targetUrl":"#shop","durationMs":5500}
  ]'::jsonb,
  '{"gen1":5,"gen2":3,"gen3":2,"gen4":1,"gen5":0.5}'::jsonb,
  '{"visaPriceUsd":12,"mastercardPriceUsd":15,"minDepositUsd":10}'::jsonb,
  '[
    {"id":"w1","label":"$0.50 Telecom","rewardUsd":0.5,"color":"#1E293B"},
    {"id":"w2","label":"$2.00 Bonus","rewardUsd":2.0,"color":"#D4942A"},
    {"id":"w3","label":"$0.25 Credit","rewardUsd":0.25,"color":"#0F172A"},
    {"id":"w4","label":"$5.00 Gold Jackpot","rewardUsd":5.0,"color":"#F5B041"},
    {"id":"w5","label":"$1.00 Shop","rewardUsd":1.0,"color":"#1E3A8A"},
    {"id":"w6","label":"$0.75 Cashback","rewardUsd":0.75,"color":"#334155"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.telecom_offers (id, creator_uid, creator_name, creator_member_id, is_official, operator, offer_type, title, volume_label, country_code, price_usd, status) VALUES
  ('tel-bd-gp-50', '00000000-0000-0000-0000-000000000001', 'G Wallet Telecom', 'GW-000001', true, 'Grameenphone', 'data', 'GP Super 50GB Monthly Data', '50 GB · 30 Days', 'BD', 5.85, 'active'),
  ('tel-bd-robi-combo', '00000000-0000-0000-0000-000000000001', 'G Wallet Telecom', 'GW-000001', true, 'Robi Axiata', 'combo', 'Robi Power 30GB + 500 Min', '30 GB + 500 Min · 30 Days', 'BD', 4.95, 'active'),
  ('tel-bd-bl-min', '00000000-0000-0000-0000-000000000001', 'G Wallet Telecom', 'GW-000001', true, 'Banglalink', 'minutes', 'BL TalkMax 1000 Minutes', '1000 Mins · 30 Days', 'BD', 4.10, 'active'),
  ('tel-us-tmo-topup', '00000000-0000-0000-0000-000000000001', 'G Wallet Global', 'GW-000001', true, 'T-Mobile US', 'topup', 'Instant Prepaid AirTime Reload', '$20 Instant Top-Up', 'US', 19.50, 'active'),
  ('tel-sa-stc-combo', '00000000-0000-0000-0000-000000000001', 'G Wallet MENA', 'GW-000001', true, 'STC Saudi', 'combo', 'STC Sawa Flex 40GB + Intl Min', '40 GB + 300 Min · 28 Days', 'SA', 24.00, 'active'),
  ('tel-in-jio-data', '00000000-0000-0000-0000-000000000001', 'G Wallet South Asia', 'GW-000001', true, 'Jio 5G', 'data', 'Jio Unlimited 5G + 2GB/Day', '56 GB + Unlimited 5G · 28 Days', 'IN', 4.20, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seller_dokans (id, owner_uid, member_id, shop_name, category, membership_plan, country_code, status) VALUES
  ('dokan-dhaka-lux', '00000000-0000-0000-0000-000000000002', 'GW-104821', 'Dhaka Luxe Electronics', 'Electronics', 'gold_dokan', 'BD', 'active'),
  ('dokan-global-atelier', '00000000-0000-0000-0000-000000000003', 'GW-209314', 'Sovereign Goods Studio', 'Accessories', 'enterprise_dokan', 'US', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, dokan_id, seller_uid, shop_name, title, description, category, price_usd, original_price_usd, is_flash_sale, stock, country_scope) VALUES
  ('prod-watch-01', 'dokan-dhaka-lux', '00000000-0000-0000-0000-000000000002', 'Dhaka Luxe Electronics', 'Chronos Obsidian Gold Smartwatch', 'Sapphire AMOLED bezel, NFC tap payments, 14-day battery, and titanium strap.', 'Wearables', 89.00, 129.00, true, 24, 'BD'),
  ('prod-audio-02', 'dokan-dhaka-lux', '00000000-0000-0000-0000-000000000002', 'Dhaka Luxe Electronics', 'Aurelia ANC Studio Earbuds', 'Active noise cancellation with brushed champagne charging dock and spatial audio.', 'Audio', 46.00, 68.00, true, 41, 'GLOBAL'),
  ('prod-wallet-03', 'dokan-global-atelier', '00000000-0000-0000-0000-000000000003', 'Sovereign Goods Studio', 'Midnight Navy RFID Leather Wallet', 'Hand-stitched full-grain leather cardholder with brushed gold magnetic clasp.', 'Accessories', 34.00, 49.00, false, 18, 'GLOBAL'),
  ('prod-router-04', 'dokan-dhaka-lux', '00000000-0000-0000-0000-000000000002', 'Dhaka Luxe Electronics', 'Pocket 5G Global eSIM MiFi', 'Dual-band Wi-Fi 6 travel hotspot unlocked for 140+ countries with 6000mAh battery.', 'Connectivity', 72.00, 95.00, true, 12, 'BD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, author_uid, author_name, author_member_id, scope, country_code, content, likes_count) VALUES
  ('post-bd-1', '00000000-0000-0000-0000-000000000002', 'Tariqul Hasan', 'GW-104821', 'regional', 'BD', 'Instant bKash & Nagad deposits settled in under 15 seconds on my Main Telecom Wallet today. Also dropped fresh 50GB GP combo packs!', 14),
  ('post-global-1', '00000000-0000-0000-0000-000000000003', 'Nadia Al-Mansoor', 'GW-209314', 'global', 'US', 'Issued my AI Virtual Visa card for SaaS subscriptions—smooth international billing and instant freeze toggle right inside G Wallet.', 22)
ON CONFLICT (id) DO NOTHING;
