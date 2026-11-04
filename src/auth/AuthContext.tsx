import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { fetchProfile } from '../lib/api';
import type { Profile } from '../lib/types';

type AuthState = {
  status: 'loading' | 'signed-out' | 'signed-in';
  profile: Profile | null;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string, userEmail: string | null) => {
    try {
      const data = await fetchProfile(userId);
      setProfile(data);
      setEmail(userEmail);
      setStatus('signed-in');
    } catch {
      // Профиль заводит администратор, без него входить некуда.
      await supabase.auth.signOut();
      setError('Для этой учётной записи нет профиля сотрудника. Обратитесь к администратору.');
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const session = data.session;
      if (session?.user) {
        void loadProfile(session.user.id, session.user.email ?? null);
      } else {
        setStatus('signed-out');
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
        setEmail(null);
        setStatus('signed-out');
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (nextEmail: string, password: string) => {
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: nextEmail.trim(),
      password,
    });
    if (signInError) {
      throw new Error(
        signInError.message.includes('Invalid login credentials')
          ? 'Неверная почта или пароль'
          : 'Не удалось войти, попробуйте ещё раз',
      );
    }
    if (data.user) await loadProfile(data.user.id, data.user.email ?? null);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setEmail(null);
    setStatus('signed-out');
  }, []);

  const value = useMemo(
    () => ({ status, profile, email, signIn, signOut, error }),
    [status, profile, email, signIn, signOut, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

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
