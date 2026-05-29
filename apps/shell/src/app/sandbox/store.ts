import { create } from 'zustand';

interface CounterState {
  count: number;
}

interface CounterActions {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export type CounterStore = CounterState & CounterActions;

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
