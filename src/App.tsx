import React, { useEffect, useState } from 'react';
import { AdminPanelView } from './components/AdminPanelView';
import { AuthGate } from './components/AuthGate';
import { CartDrawer } from './components/CartDrawer';
import { DashboardShell } from './components/DashboardShell';
import { DownloadView, LaunchGuidesView } from './components/GuidesOrdersDownload';
import { OverviewView } from './components/OverviewView';
import { ProductsView } from './components/ProductsView';
import { RedeemKeyView } from './components/RedeemKeyView';
import { SettingsView } from './components/SettingsView';
import { TopBar, type DashboardTab, type MainSection } from './components/TopBar';
import { TopUpModal } from './components/TopUpModal';
import { api, clearStoredToken, getStoredToken } from './lib/api';
import type { CartItem, DurationTier, Product, PublicUser, Subscription } from './types';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [section, setSection] = useState<MainSection>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [topUpModal, setTopUpModal] = useState<{ open: boolean; context: 'topup' | 'checkout' }>({
    open: false,
    context: 'topup',
  });

  async function hydrateCatalog() {
    try {
      const res = await api.getProducts();
      setProducts(res.products);
    } catch {
      // Ignore if unauthenticated
    }
  }

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setBooting(false);
      return;
    }

    api
      .me()
      .then(async (res) => {
        setUser(res.user);
        setSubscriptions(res.subscriptions);
        await hydrateCatalog();
      })
      .catch(() => {
        clearStoredToken();
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  async function handleAuthenticated(payload: {
    user: PublicUser;
    subscriptions: Subscription[];
  }) {
    setUser(payload.user);
    setSubscriptions(payload.subscriptions);
    setSection('dashboard');
    setDashboardTab('overview');
    await hydrateCatalog();
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    clearStoredToken();
    setUser(null);
    setSubscriptions([]);
    setProducts([]);
    setCart([]);
  }

  function handleNavigateSection(nextSection: MainSection, tab?: DashboardTab) {
    setSection(nextSection);
    if (tab) {
      setDashboardTab(tab);
    }
  }

  function handleAddToCart(product: Product, durationTier: DurationTier, priceCents: number) {
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === product.id && i.durationTier === durationTier
      );
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          durationTier,
          priceCents,
          quantity: 1,
        },
      ];
    });
  }

  function handleUpdateCartQty(productId: string, durationTier: DurationTier, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.durationTier === durationTier
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function handleRemoveCartItem(productId: string, durationTier: DurationTier) {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.durationTier === durationTier))
    );
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-[#0A0D12] flex items-center justify-center text-xs text-[#8B98AC]">
        Loading DMCheats...
      </div>
    );
  }

  if (!user) {
    return <AuthGate onAuthenticated={handleAuthenticated} />;
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#EDF2F7] flex flex-col">
      <TopBar
        user={user}
        section={section}
        cartCount={cartCount}
        onNavigateSection={handleNavigateSection}
        onOpenCart={() => setCartOpen(true)}
        onLogout={handleLogout}
      />

      {section === 'products' ? (
        <ProductsView
          products={products}
          onAddToCart={handleAddToCart}
          onGoToRedeem={() => handleNavigateSection('dashboard', 'redeem')}
        />
      ) : (
        <DashboardShell
          user={user}
          activeTab={dashboardTab}
          onSelectTab={(tab) => setDashboardTab(tab)}
        >
          {dashboardTab === 'overview' && (
            <OverviewView
              user={user}
              subscriptions={subscriptions}
              onNavigateTab={(tab) => setDashboardTab(tab)}
              onOpenProducts={() => setSection('products')}
              onOpenTopUp={() => setTopUpModal({ open: true, context: 'topup' })}
            />
          )}

          {dashboardTab === 'redeem' && (
            <RedeemKeyView
              onRedeemed={(res) => {
                setUser(res.user);
                setSubscriptions(res.subscriptions);
              }}
            />
          )}

          {dashboardTab === 'guides' && <LaunchGuidesView products={products} />}

          {dashboardTab === 'download' && (
            <DownloadView
              user={user}
              products={products}
              subscriptions={subscriptions}
              onNavigateTab={(tab) => setDashboardTab(tab)}
            />
          )}

          {dashboardTab === 'settings' && (
            <SettingsView user={user} onUserUpdated={(updated) => setUser(updated)} />
          )}

          {dashboardTab === 'admin' && user.role === 'admin' && (
            <AdminPanelView
              currentUser={user}
              products={products}
              onProductsChanged={(nextProducts) => setProducts(nextProducts)}
              onCurrentUserUpdated={(updated) => setUser(updated)}
            />
          )}
        </DashboardShell>
      )}

      <CartDrawer
        open={cartOpen}
        user={user}
        items={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClear={() => setCart([])}
        onCheckoutSuccess={(res) => {
          setUser(res.user);
          setSubscriptions(res.subscriptions);
          setSection('dashboard');
          setDashboardTab('overview');
        }}
        onInsufficientBalance={() => {
          setCartOpen(false);
          setTopUpModal({ open: true, context: 'checkout' });
        }}
      />

      <TopUpModal
        open={topUpModal.open}
        context={topUpModal.context}
        onClose={() => setTopUpModal((prev) => ({ ...prev, open: false }))}
        onGoToRedeem={() => handleNavigateSection('dashboard', 'redeem')}
      />
    </div>
  );
}
