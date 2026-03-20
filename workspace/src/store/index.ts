import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, CartItem, Product, SyncStatus } from "@/types";

// ============================================
// AUTH STORE
// ============================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "kioskoia-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// CART STORE
// ============================================

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find((item) => item.productId === product.id);

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          const newSubtotal = newQuantity * existingItem.unitPrice;
          const newItems = items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: newQuantity, subtotal: newSubtotal }
              : item
          );
          const newTotal = newItems.reduce((acc, item) => acc + item.subtotal, 0);
          set({ items: newItems, total: newTotal });
        } else {
          const newItem: CartItem = {
            productId: product.id,
            product,
            quantity,
            unitPrice: product.salePrice,
            subtotal: quantity * product.salePrice,
          };
          const newItems = [...items, newItem];
          const newTotal = newItems.reduce((acc, item) => acc + item.subtotal, 0);
          set({ items: newItems, total: newTotal });
        }
      },
      removeItem: (productId) => {
        const { items } = get();
        const newItems = items.filter((item) => item.productId !== productId);
        const newTotal = newItems.reduce((acc, item) => acc + item.subtotal, 0);
        set({ items: newItems, total: newTotal });
      },
      updateQuantity: (productId, quantity) => {
        const { items } = get();
        if (quantity <= 0) {
          const newItems = items.filter((item) => item.productId !== productId);
          const newTotal = newItems.reduce((acc, item) => acc + item.subtotal, 0);
          set({ items: newItems, total: newTotal });
          return;
        }
        const newItems = items.map((item) =>
          item.productId === productId
            ? { ...item, quantity, subtotal: quantity * item.unitPrice }
            : item
        );
        const newTotal = newItems.reduce((acc, item) => acc + item.subtotal, 0);
        set({ items: newItems, total: newTotal });
      },
      clearCart: () => set({ items: [], total: 0 }),
      getItemCount: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
    }),
    {
      name: "kioskoia-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================
// SYNC STORE
// ============================================

interface SyncState {
  isOnline: boolean;
  pendingItems: number;
  lastSync: Date | null;
  isSyncing: boolean;
  setOnline: (online: boolean) => void;
  setPendingItems: (count: number) => void;
  setLastSync: (date: Date) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isOnline: true,
      pendingItems: 0,
      lastSync: null,
      isSyncing: false,
      setOnline: (online) => set({ isOnline: online }),
      setPendingItems: (count) => set({ pendingItems: count }),
      setLastSync: (date) => set({ lastSync: date }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),
    }),
    {
      name: "kioskoia-sync",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSync: state.lastSync,
        pendingItems: state.pendingItems,
      }),
    }
  )
);

// ============================================
// UI STORE
// ============================================

interface UIState {
  sidebarOpen: boolean;
  currentPath: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPath: (path: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentPath: "/",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentPath: (path) => set({ currentPath: path }),
}));
