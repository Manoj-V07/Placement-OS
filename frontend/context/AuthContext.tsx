"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile
} from "firebase/auth";
import { auth } from "../lib/firebase";
import api from "../lib/api";

export interface UserProfile {
  uid?: string;
  name?: string;
  email?: string;
  profileImage?: string;
  placementGoal?: string | null;
  targetDate?: string | null;
  dailyStudyTarget?: number | null;
  phoneUsageLimit?: number | null;
  phoneUsageReal?: number;
  onboardingCompleted?: boolean;
  lastPhoneSyncDate?: string;
  lastViewedSkillId?: string | null;
  lastViewedTopicId?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, photoURL?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  logout: async () => {},
  refreshProfile: async () => null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await api.get("/users/me");
      if (res.data.success) {
        setProfile(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error("Failed to load user profile in AuthContext", err);
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      await fetchProfile();
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await fetchProfile();
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, photoURL?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      const avatar = photoURL || "https://api.dicebear.com/7.x/bottts/svg?seed=dev";
      await updateFirebaseProfile(result.user, {
        displayName: name,
        photoURL: avatar
      });
      try {
        await api.patch("/users/me", {
          name,
          profileImage: avatar
        });
      } catch (e) {
        console.error("Initial profile setup error", e);
      }
      await fetchProfile();
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    return await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      logout,
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
