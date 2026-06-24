import { create } from "zustand";

export interface CartItem {
  productId: string;
  name: string;
  barcode?: string | null;
  hsnCode?: string | null;
  shadeCode?: string | null;
  unit: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  gstPercentage: number;
  stockQuantity: number;
}

interface BillingState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discountPercent: number) => void;
  updateRate: (productId: string, rate: number) => void;
  updateGst: (productId: string, gstPercentage: number) => void;
  updateShadeCode: (productId: string, shadeCode: string) => void;
  removeItem: (productId: string) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  clearCart: () => void;
  loadCart: (items: CartItem[]) => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,

  addItem: (item) => {
    const existing = get().items.find((i) => i.productId === item.productId);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i
        ),
      });
    } else {
      set({ items: [...get().items, item] });
    }
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.productId !== productId) });
      return;
    }
    set({
      items: get().items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    });
  },

  updateDiscount: (productId, discountPercent) => {
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, discountPercent } : i
      ),
    });
  },

  updateRate: (productId, rate) => {
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, rate: Math.max(0, rate) } : i
      ),
    });
  },

  updateGst: (productId, gstPercentage) => {
    set({
      items: get().items.map((i) =>
        i.productId === productId
          ? { ...i, gstPercentage: Math.min(100, Math.max(0, gstPercentage)) }
          : i
      ),
    });
  },

  updateShadeCode: (productId, shadeCode) => {
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, shadeCode } : i
      ),
    });
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },

  setCustomer: (id, name) => set({ customerId: id, customerName: name }),

  clearCart: () => set({ items: [], customerId: null, customerName: null }),

  loadCart: (items) => set({ items }),
}));
