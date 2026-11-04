import { useContext } from 'react';
import { AuthContext } from './context';
import type { AuthState } from './context';
import type { Profile } from '../lib/types';

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth вызван вне AuthProvider');
  return context;
}

export function useProfile(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('Нет активного профиля');
  return profile;
}

