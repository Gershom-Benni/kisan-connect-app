// store/authStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export interface User {
  uid: string;
  name: string;
  phoneNumber: string;
  address?: string;
  userImage?: string; 
  centerId: string;
  centerName: string; 
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

const ASYNC_STORAGE_KEY = 'chcAuthUser';

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false, 
  isHydrated: false, 

  login: (userData) => {
    set({ user: userData, isLoading: false });
    AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(userData));
  },

  logout: () => {
    set({ user: null, isLoading: false });
    AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
  },

  hydrate: async () => {
    set({ isHydrated: false });
    try {
      const storedUser = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        set({ user });
      }
    } catch (e) {
      console.error('Failed to hydrate state:', e);
    } finally {
      set({ isHydrated: true });
    }
  },
}));

export default useAuthStore;