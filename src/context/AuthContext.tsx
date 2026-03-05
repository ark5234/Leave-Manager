'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveUserProfile, getProfile, updateCustomProfile, UserProfile } from '@/lib/firebaseStore';

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  /** Effective photo URL: custom override first, then Google account photo */
  photoURL: string;
  /** Effective display name: custom override first, then Google account name */
  displayName: string;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (fields: { customDisplayName?: string; customPhotoURL?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  photoURL: '',
  displayName: '',
  signInWithGoogle: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          // Sync Google-sourced fields (won't overwrite custom fields thanks to merge: true + separate handling)
          await saveUserProfile(u.uid, {
            email: u.email || '',
            displayName: u.displayName || '',
            photoURL: u.photoURL || '',
          });
          // Load full profile including any custom overrides
          const p = await getProfile(u.uid);
          setProfile(p);
        } else {
          setProfile(null);
        }
      } catch (err) {
        // Don't let a Firestore error on profile sync block the whole app
        console.error('Auth profile sync error:', err);
      } finally {
        // Always unblock the loading gate so the page renders
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const updateUserProfile = async (fields: { customDisplayName?: string; customPhotoURL?: string }) => {
    if (!user) return;
    await updateCustomProfile(user.uid, fields);
    // Refresh local profile state
    const updated = await getProfile(user.uid);
    setProfile(updated);
  };

  const isAdmin = !!user && !!adminEmail && user.email === adminEmail;

  // Resolve effective values: custom override wins over Google account values
  const photoURL = profile?.customPhotoURL || user?.photoURL || '';
  const displayName = profile?.customDisplayName || user?.displayName || user?.email || '';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, photoURL, displayName, signInWithGoogle, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
