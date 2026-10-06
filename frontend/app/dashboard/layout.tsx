"use client";

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-border-soft px-8 py-4 flex justify-between items-center">
        <h1 className="font-display font-bold text-xl">Tracker</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">{user.displayName}</span>
          <button onClick={logout} className="btn-secondary text-sm">
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
