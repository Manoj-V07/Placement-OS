"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Rocket, Map, Bot, Smartphone } from "lucide-react";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-500/20">
              P
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-slate-900">
              Placement<span className="text-indigo-600">OS</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4 shadow-sm">
              Get Started Free →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 lg:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-8">
          <Rocket className="w-4 h-4 mr-1.5" /> Next-Gen Placement Preparation Operating System
        </div>

        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl text-slate-900 leading-tight">
          Master Technical Skills.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
            Crush Your Placements.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mt-6 leading-relaxed">
          Order-tracking style skill roadmaps, AI-powered interactive concept evaluations, bulk syllabus import, and real phone usage tracking to ensure peak discipline.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link href="/register" className="btn-primary text-base py-3.5 px-8 shadow-xl shadow-indigo-500/20 w-full sm:w-auto">
            Create Free Account
          </Link>
          <button
            onClick={signInWithGoogle}
            className="btn-secondary text-base py-3.5 px-6 flex items-center justify-center gap-3 w-full sm:w-auto"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign In with Google
          </button>
        </div>

        {/* Feature Grid Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl w-full text-left">
          <div className="card glass-card p-6 border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4">
              <Map className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Order-Tracking Roadmaps</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Step-by-step sequential topic progression. Track completed, in-progress, and pending topics just like tracking a delivery package.
            </p>
          </div>

          <div className="card glass-card p-6 border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">AI Topic Evaluator</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Answer 3 real interview questions after every topic in an interactive chat. Get evaluated with scoring percentages and revision advice.
            </p>
          </div>

          <div className="card glass-card p-6 border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Real Screen Time Control</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Monitor your actual daily phone screen time against strict limits. Stay disciplined and protect your preparation hours.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} PlacementOS. Built for ambitious software engineers.
      </footer>
    </div>
  );
}
