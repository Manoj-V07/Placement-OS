"use client";

import { useAuth } from "../../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Compass, User, LogOut, Menu, X, Code2, Calendar } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile && !profile.onboardingCompleted && (!profile.placementGoal || !profile.targetDate)) {
        router.push("/onboarding");
      }
    }
  }, [user, profile, loading, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading PlacementOS...</p>
        </div>
      </div>
    );
  }

  const avatarUrl = profile?.profileImage || user.photoURL || "https://api.dicebear.com/7.x/bottts/svg?seed=dev";
  const displayName = profile?.name || user.displayName || user.email?.split("@")[0] || "Candidate";

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Header with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            P
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-slate-900">
            Placement<span className="text-indigo-600">OS</span>
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 md:justify-start">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
              P
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-900">
              Placement<span className="text-indigo-600">OS</span>
            </span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              pathname === "/dashboard"
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${pathname === "/dashboard" ? "text-indigo-600" : "text-slate-400"}`} />
            Overview
          </Link>
          <Link
            href="/dashboard/skills"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              pathname?.startsWith("/dashboard/skills")
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Compass className={`w-5 h-5 ${pathname?.startsWith("/dashboard/skills") ? "text-indigo-600" : "text-slate-400"}`} />
            Skills Roadmap
          </Link>
          <Link
            href="/dashboard/dsa"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              pathname?.startsWith("/dashboard/dsa")
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Code2 className={`w-5 h-5 ${pathname?.startsWith("/dashboard/dsa") ? "text-indigo-600" : "text-slate-400"}`} />
            DSA Tracker
          </Link>
          <Link
            href="/dashboard/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              pathname === "/dashboard/profile"
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <User className={`w-5 h-5 ${pathname === "/dashboard/profile" ? "text-indigo-600" : "text-slate-400"}`} />
            Profile & Goals
          </Link>
          <Link
            href="/dashboard/planner"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              pathname?.startsWith("/dashboard/planner")
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Calendar className={`w-5 h-5 ${pathname?.startsWith("/dashboard/planner") ? "text-indigo-600" : "text-slate-400"}`} />
            Daily Planner
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/bottts/svg?seed=dev";
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{profile?.placementGoal || "No Goal Set"}</p>
              </div>
            </Link>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto w-full pt-16 md:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
