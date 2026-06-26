import { create } from "zustand";

interface DemoState {
  blockedOpen: boolean;
  showBlocked: () => void;
  hideBlocked: () => void;
}

let lastShown = 0;

export const useDemoStore = create<DemoState>((set) => ({
  blockedOpen: false,
  // Debounce so a burst of blocked writes only opens the dialog once
  showBlocked: () => {
    const now = Date.now();
    if (now - lastShown < 800) return;
    lastShown = now;
    set({ blockedOpen: true });
  },
  hideBlocked: () => set({ blockedOpen: false }),
}));
