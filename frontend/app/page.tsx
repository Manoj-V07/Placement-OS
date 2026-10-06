"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center space-y-6">
      <h1 className="font-display text-4xl font-bold md:text-6xl max-w-2xl">
        Track your preparation with precision.
      </h1>
      <p className="text-lg text-muted max-w-lg mb-8">
        Personal-Tracker is your go-to companion for placement preparation, keeping you organized and on top of your goals.
      </p>
      
      <button 
        onClick={signInWithGoogle}
        className="btn-primary text-lg px-8 py-4"
      >
        Sign in with Google
      </button>
    </main>
  );
}
