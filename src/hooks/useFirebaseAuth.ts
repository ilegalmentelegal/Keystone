import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGooglePopup, signOutFromFirebase } from '../firebase';

export interface FirebaseAuthState {
  user: User | null;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

export function useFirebaseAuth(): FirebaseAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
      },
      (err) => {
        setAuthError(err.message);
        setAuthReady(true);
      }
    );
    return () => unsub();
  }, []);

  const signIn = async (): Promise<User | null> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const signedInUser = await signInWithGooglePopup();
      setUser(signedInUser);
      return signedInUser;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setAuthError(msg);
      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signOutFromFirebase();
      setUser(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign out failed';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  return {
    user,
    authReady,
    authLoading,
    authError,
    signIn,
    signOut,
    clearAuthError: () => setAuthError(null),
  };
}
