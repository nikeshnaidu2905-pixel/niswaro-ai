import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiFetch } from '../lib/api.ts';
import { ProfileBundle } from '../types/niswaro.ts';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: ProfileBundle | null;
  loading: boolean;
  error: string | null;
  theme: 'dark' | 'light';
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    displayName: string,
    email: string,
    password: string
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTheme: (next: 'dark' | 'light', persist?: boolean) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function formatFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console. Use "Continue with Google" to sign in immediately.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  const applyThemeDom = useCallback((next: 'dark' | 'light') => {
    setThemeState(next);
    const root = document.documentElement;
    if (next === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const bundle = await apiFetch<ProfileBundle>('/api/me');
    setProfile(bundle);
    if (bundle.preferences?.theme === 'light' || bundle.preferences?.theme === 'dark') {
      applyThemeDom(bundle.preferences.theme);
    }
  }, [applyThemeDom]);

  useEffect(() => {
    applyThemeDom('dark');
  }, [applyThemeDom]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          await fetchProfile();
          setError(null);
        } catch (err) {
          console.error('Failed to sync profile:', err);
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load your workspace profile.'
          );
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const registerWithEmail = async (
    displayName: string,
    email: string,
    password: string
  ) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Non-blocking if email verification quota or config restricts immediate send
      }
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  const signOutUser = async () => {
    setError(null);
    await signOut(auth);
    setProfile(null);
  };

  const setTheme = async (next: 'dark' | 'light', persist = true) => {
    applyThemeDom(next);
    if (persist && auth.currentUser) {
      try {
        const updated = await apiFetch<ProfileBundle>('/api/me/settings', {
          method: 'PATCH',
          body: JSON.stringify({ theme: next }),
        });
        setProfile(updated);
      } catch (err) {
        console.error('Failed to persist theme preference:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        error,
        theme,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resetPassword,
        resendVerificationEmail,
        signOutUser,
        refreshProfile: fetchProfile,
        setTheme,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
