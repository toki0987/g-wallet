import React, { useState } from 'react';
import {
  CheckCircle2,
  Crown,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { formatSupabaseError, supabase } from '../lib/supabase';
import { compressImageUnder100KB } from '../lib/imageCompressor';
import { distributeFiveGenReferrals, recordWalletMovement } from '../lib/gwalletService';
import { formatMoneyFromUsd } from '../lib/seedData';
import {
  AppConfig,
  CountryCurrencyConfig,
  MarketplaceProduct,
  SellerDokan,
  ShopOrder,
  UserProfile,
} from '../types/gwallet';
import { ProductVisual } from './BrandVisuals';
import { TranslationDictionary } from '../i18n/translations';

interface ShopDokanViewProps {
  profile: UserProfile | null;
  country: CountryCurrencyConfig;
  products: MarketplaceProduct[];
  dokans: SellerDokan[];
  orders: ShopOrder[];
  appConfig: AppConfig;
  onOpenAuth: () => void;
  onRefreshData: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  t: TranslationDictionary;
}

interface CartItem {
  product: MarketplaceProduct;
  qty: number;
}

export const ShopDokanView: React.FC<ShopDokanViewProps> = ({
  profile,
  country,
  products,
  dokans,
  orders,
  appConfig,
  onOpenAuth,
  onRefreshData,
  onToast,
  t,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const [sellerPlanModal, setSellerPlanModal] = useState(false);
  const [dokanModal, setDokanModal] = useState(false);
  const [chosenPlan, setChosenPlan] = useState<'starter_dokan' | 'gold_dokan' | 'enterprise_dokan'>('gold_dokan');
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('Electronics');

  const [prodTitle, setProdTitle] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState('Wearables');
  const [prodPriceUsd, setProdPriceUsd] = useState('39');
  const [prodStock, setProdStock] = useState('25');
  const [prodFlash, setProdFlash] = useState(false);
  const [prodImage, setProdImage] = useState<string>('');

  const myDokan = profile ? dokans.find((d) => d.ownerUid === profile.uid && d.status === 'active') : null;
  const hasSellerMembership = profile?.membershipTier === 'seller_pro' || Boolean(myDokan);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.shopName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const flashSales = filteredProducts.filter((p) => p.isFlashSale);
  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartTotalUsd = cart.reduce((acc, item) => acc + item.product.priceUsd * item.qty, 0);

  const addToCart = (product: MarketplaceProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { product, qty: 1 }];
    });
    onToast(`Added "${product.title}" to cart.`, 'success');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (cart.length === 0) return;
    if (profile.shopBalanceUsd < cartTotalUsd) {
      onToast('Insufficient Shop Wallet balance. Please deposit into Shop Wallet.', 'error');
      return;
    }

    setCheckingOut(true);
    try {
      const firstItem = cart[0].product;

      await recordWalletMovement({
        profile,
        walletType: 'shop',
        deltaUsd: -Number(cartTotalUsd.toFixed(2)),
        txType: 'shop_checkout',
        method: 'Shop Wallet',
        country,
        note: `Order (${cartCount} items)`,
      });

      const { error: ordErr } = await supabase.from('orders').insert({
        buyer_uid: profile.uid,
        seller_uid: firstItem.sellerUid,
        dokan_id: firstItem.dokanId,
        items_summary: cart.map((i) => `${i.qty}x ${i.product.title}`).join(', ').slice(0, 380),
        item_count: cartCount,
        total_usd: Number(cartTotalUsd.toFixed(2)),
        shipping_address: shippingAddress.trim() || `${country.name} Verified Delivery`,
        status: 'paid',
      });
      if (ordErr) formatSupabaseError(ordErr, 'orders.insert');

      await distributeFiveGenReferrals({
        fromProfile: profile,
        baseAmountUsd: cartTotalUsd,
        sourceAction: 'G Wallet Shop Order',
        rates: appConfig.referralRates,
      });

      await onRefreshData();
      setCart([]);
      setCartOpen(false);
      setShippingAddress('');
      onToast('Order confirmed via Shop Wallet!', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Checkout failed', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleActivateSellerPlan = async (plan: 'starter_dokan' | 'gold_dokan' | 'enterprise_dokan', priceUsd: number) => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (profile.telecomBalanceUsd < priceUsd) {
      onToast('Insufficient Main Telecom Wallet balance to purchase Seller Membership.', 'error');
      return;
    }
    try {
      await recordWalletMovement({
        profile,
        walletType: 'telecom',
        deltaUsd: -priceUsd,
        txType: 'membership_buy',
        method: 'Main Telecom Wallet',
        country,
        note: `Seller Membership: ${plan}`,
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          role: profile.role === 'admin' ? 'admin' : 'seller',
          membership_tier: 'seller_pro',
          updated_at: new Date().toISOString(),
        })
        .eq('uid', profile.uid);
      if (error) formatSupabaseError(error, 'profiles.sellerUpgrade');

      await onRefreshData();
      setChosenPlan(plan);
      setSellerPlanModal(false);
      setDokanModal(true);
      onToast('Seller Membership activated! Now create your Seller Dokan slot.', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Plan activation failed', 'error');
    }
  };

  const handleCreateDokan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!hasSellerMembership) {
      setDokanModal(false);
      setSellerPlanModal(true);
      onToast('Mandatory Seller Membership required before opening a Dokan.', 'error');
      return;
    }
    try {
      const { error } = await supabase.from('seller_dokans').insert({
        owner_uid: profile.uid,
        member_id: profile.memberId,
        shop_name: shopName.trim(),
        category: shopCategory.trim(),
        membership_plan: chosenPlan,
        country_code: country.code,
        status: 'active',
      });
      if (error) formatSupabaseError(error, 'seller_dokans.insert');

      await supabase
        .from('member_directory')
        .update({
          is_verified_seller: true,
          role: profile.role === 'admin' ? 'admin' : 'seller',
        })
        .eq('member_id', profile.memberId);

      await onRefreshData();
      setShopName('');
      onToast('Your verified Seller Dokan is now live!', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Could not create Dokan', 'error');
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressImageUnder100KB(file, 720);
      setProdImage(res.dataUrl);
      onToast(`Product WebP ready (${(res.sizeBytes / 1024).toFixed(1)} KB)`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Image compression failed', 'error');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !myDokan) return;
    try {
      const { error } = await supabase.from('products').insert({
        dokan_id: myDokan.id,
        seller_uid: profile.uid,
        shop_name: myDokan.shopName,
        title: prodTitle.trim(),
        description: prodDesc.trim(),
        category: prodCategory.trim(),
        price_usd: Number(prodPriceUsd) || 10,
        original_price_usd: Number(((Number(prodPriceUsd) || 10) * 1.25).toFixed(2)),
        is_flash_sale: prodFlash,
        stock: Number(prodStock) || 10,
        country_scope: country.code,
        image_data: prodImage,
      });
      if (error) formatSupabaseError(error, 'products.insert');
      await onRefreshData();
      setProdTitle('');
      setProdDesc('');
      setProdImage('');
      onToast('Product published to G Wallet Shop!', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Failed to publish product', 'error');
    }
  };

  return (
    <div className="space-y-7">
      <div className="gw-glass rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">{t.shopTitle}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Verified Dokan storefronts · Seamless Shop Wallet Checkout
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative h-11 px-4 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white glow-blue font-semibold text-xs flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <Sparkles className="w-3 h-3 text-blue-200" />
            <span>{t.cart}</span>
            {cartCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white text-blue-900 font-mono-tabular text-[11px] font-bold">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSellerPlanModal(true)}
            className="h-11 px-4 rounded-xl bg-gradient-to-br from-[#FCE3A6] via-[#F5B041] to-[#B87314] text-[#060D1F] glow-gold font-semibold text-xs flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            <Sparkles className="w-3 h-3" />
            <span>{t.sellerMembership}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!profile) {
                onOpenAuth();
                return;
              }
              setDokanModal(true);
            }}
            className="h-11 px-4 rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-red-800 text-white glow-red font-semibold text-xs flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <Sparkles className="w-3 h-3 text-red-200" />
            <span>{t.openSellerDokan}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products or Seller Dokans..."
            className="w-full rounded-xl bg-[#10192E] border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5B041]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#10192E] border border-white/10">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                categoryFilter === cat ? 'bg-[#F5B041] text-[#060D1F]' : 'text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {flashSales.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#F5B041]">{t.flashSales}</h3>
            <span className="text-xs text-slate-400">{flashSales.length} featured deals</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {flashSales.map((prod) => (
              <div
                key={`flash-${prod.id}`}
                className="gw-glass rounded-2xl overflow-hidden flex flex-col justify-between group"
              >
                <div className="h-44 overflow-hidden">
                  <ProductVisual imageData={prod.imageData} category={prod.category} title={prod.title} />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-[#F5B041] font-medium">
                      Flash Deal · {prod.shopName}
                    </p>
                    <h4 className="font-display text-sm font-bold text-white mt-1 line-clamp-2">
                      {prod.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div>
                      <p className="font-mono-tabular text-sm font-bold text-white">
                        {formatMoneyFromUsd(prod.priceUsd, country)}
                      </p>
                      {prod.originalPriceUsd && (
                        <p className="font-mono-tabular text-[11px] text-slate-500 line-through">
                          {formatMoneyFromUsd(prod.originalPriceUsd, country)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(prod)}
                      className="px-3 py-1.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold text-white">Marketplace Catalog</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="gw-glass rounded-2xl overflow-hidden flex flex-col justify-between group"
            >
              <div className="h-44 overflow-hidden">
                <ProductVisual imageData={prod.imageData} category={prod.category} title={prod.title} />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-[11px] text-slate-400">
                    {prod.category} · {prod.shopName}
                  </p>
                  <h4 className="font-display text-sm font-bold text-white mt-1">{prod.title}</h4>
                  {prod.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{prod.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <p className="font-mono-tabular text-sm font-bold text-[#F5B041]">
                    {formatMoneyFromUsd(prod.priceUsd, country)}
                  </p>
                  <button
                    type="button"
                    onClick={() => addToCart(prod)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#F5B041] hover:text-[#060D1F] text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {orders.length > 0 && (
        <div className="gw-glass rounded-3xl p-6">
          <h3 className="font-display text-base font-bold text-white mb-3">Your Shop Orders</h3>
          <div className="space-y-2">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-xl bg-[#060D1F]/80 border border-white/10 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-white">{ord.itemsSummary}</p>
                  <p className="text-slate-400">{ord.shippingAddress}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono-tabular text-[#F5B041] font-bold">
                    {formatMoneyFromUsd(ord.totalUsd, country)}
                  </p>
                  <p className="text-emerald-400 capitalize">{ord.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#060D1F] border-l border-[#F5B041]/25 h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="font-display text-lg font-bold text-white">
                  Shopping Cart ({cartCount})
                </h3>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Your cart is empty.</p>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="rounded-xl bg-[#10192E] border border-white/10 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{item.product.title}</p>
                        <p className="font-mono-tabular text-xs text-[#F5B041]">
                          {formatMoneyFromUsd(item.product.priceUsd * item.qty, country)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setCart((prev) =>
                              prev
                                .map((c) =>
                                  c.product.id === item.product.id ? { ...c, qty: c.qty - 1 } : c
                                )
                                .filter((c) => c.qty > 0)
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono-tabular text-xs px-1.5 text-white">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(item.product)}
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCart((prev) => prev.filter((c) => c.product.id !== item.product.id))
                          }
                          className="w-7 h-7 rounded-lg bg-red-500/15 text-red-300 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <form onSubmit={handleCheckout} className="pt-4 border-t border-white/10 space-y-3">
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Delivery address & phone..."
                  className="w-full rounded-xl bg-[#10192E] border border-white/15 px-3.5 py-2.5 text-xs text-white"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Shop Wallet Total</span>
                  <span className="font-mono-tabular font-bold text-[#F5B041]">
                    {formatMoneyFromUsd(cartTotalUsd, country)}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={checkingOut}
                  className="w-full py-3 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer"
                >
                  {checkingOut ? 'Settling Order...' : 'Pay with Shop Wallet'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {sellerPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="gw-glass max-w-2xl w-full rounded-3xl p-6 space-y-5 relative">
            <button
              type="button"
              onClick={() => setSellerPlanModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-display text-xl font-bold text-white">
                Mandatory Seller Membership Plans
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Sellers must activate a membership slot before creating a verified Dokan and listing products.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'starter_dokan' as const, name: 'Starter Dokan', price: 19, limit: '25 Products' },
                { id: 'gold_dokan' as const, name: 'Gold Dokan', price: 29, limit: 'Unlimited + Flash' },
                { id: 'enterprise_dokan' as const, name: 'Enterprise Dokan', price: 59, limit: 'Priority Featured' },
              ].map((plan) => (
                <div key={plan.id} className="rounded-2xl bg-[#060D1F]/90 border border-[#F5B041]/25 p-4 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#F5B041]">{plan.name}</p>
                    <p className="font-mono-tabular text-2xl font-bold text-white mt-1">${plan.price}</p>
                    <p className="text-xs text-slate-400 mt-1">{plan.limit}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActivateSellerPlan(plan.id, plan.price)}
                    className="w-full py-2 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer"
                  >
                    Activate Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {dokanModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="gw-glass max-w-lg w-full rounded-3xl p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setDokanModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {!hasSellerMembership ? (
              <div className="text-center space-y-4 py-4">
                <Crown className="w-10 h-10 text-[#F5B041] mx-auto" />
                <h3 className="font-display text-lg font-bold text-white">
                  Seller Membership Required
                </h3>
                <p className="text-xs text-slate-300">
                  To preserve marketplace trust, sellers must purchase a Seller Membership plan before opening a Seller Slot / Dokan.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDokanModal(false);
                    setSellerPlanModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-xs cursor-pointer"
                >
                  View Seller Plans
                </button>
              </div>
            ) : !myDokan ? (
              <form onSubmit={handleCreateDokan} className="space-y-4">
                <h3 className="font-display text-xl font-bold text-white">
                  Create Your Verified Seller Dokan
                </h3>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Dokan Store Name"
                  className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                />
                <input
                  type="text"
                  required
                  value={shopCategory}
                  onChange={(e) => setShopCategory(e.target.value)}
                  placeholder="Primary Category (e.g. Electronics, Fashion)"
                  className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer"
                >
                  Launch Verified Dokan
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddProduct} className="space-y-3.5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Active Dokan: {myDokan.shopName}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-white">Add Product to Dokan</h3>
                <input
                  type="text"
                  required
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  placeholder="Product Title"
                  className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2.5 text-xs text-white"
                />
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Short product description"
                  className="w-full rounded-xl bg-[#060D1F] border border-white/15 px-3.5 py-2 text-xs text-white"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="Category"
                    className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={prodPriceUsd}
                    onChange={(e) => setProdPriceUsd(e.target.value)}
                    placeholder="USD"
                    className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs font-mono-tabular text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="Stock"
                    className="rounded-xl bg-[#060D1F] border border-white/15 px-3 py-2 text-xs font-mono-tabular text-white"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodFlash}
                    onChange={(e) => setProdFlash(e.target.checked)}
                  />
                  Include in Flash Sales showcase
                </label>
                <label className="flex items-center justify-center gap-2 border border-dashed border-white/20 rounded-xl p-3 text-xs text-slate-300 cursor-pointer">
                  <Upload className="w-4 h-4 text-[#F5B041]" />
                  <span>{prodImage ? 'WebP Image Ready (<100KB)' : 'Upload Product Photo (WebP <100KB)'}</span>
                  <input type="file" accept="image/*" onChange={handleProductImageUpload} className="hidden" />
                </label>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer"
                >
                  Publish Product
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
