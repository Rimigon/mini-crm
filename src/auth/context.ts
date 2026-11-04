import { createContext } from 'react';
import type { Profile } from '../lib/types';

export type AuthState = {
  status: 'loading' | 'signed-out' | 'signed-in';
  profile: Profile | null;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
};

export const AuthContext = createContext<AuthState | null>(null);

