import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  userId: string;
  setUserId: (id: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: '',
      setUserId: (id) => set({ userId: id }),
      clearUser: () => set({ userId: '' }),
    }),
    {
      name: 'user',
      partialize: (state) => ({ userId: state.userId }),
    },
  ),
);
