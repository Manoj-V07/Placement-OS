"use client";

import { useEffect, useState } from "react";
import api from "../../lib/api";
import Link from "next/link";
import { Target, BookOpen, Zap, Trophy, Edit2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  profileImage?: string;
  placementGoal: string | null;
  targetDate: string | null;
  dailyStudyTarget: number | null;
  phoneUsageLimit: number | null;
  phoneUsageReal?: number;
  lastPhoneSyncDate?: string;
}

interface SkillSummary {
  id: string;
  name: string;
  category: string;
  mastery: number;
  topics?: Array<{ id: string; name: string; mastery: number }>;
}

const formatDisplayDate = (dateVal: any) => {
  if (!dateVal) return "Not set";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Not set";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const formatSafeInputDate = (dateVal: any) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return typeof dateVal === "string" ? dateVal.split("T")[0] : "";
};

const getDaysRemaining = (dateVal: any) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);

  // Phone screen time quick log modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [screenTimeInput, setScreenTimeInput] = useState<number>(0);
  const [loggingPhone, setLoggingPhone] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [userRes, skillsRes] = await Promise.all([
        api.get("/users/me"),
        api.get("/skills").catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (userRes.data.success) {
        setProfile(userRes.data.data);
        setEditForm(userRes.data.data);
        setScreenTimeInput(userRes.data.data.phoneUsageReal || 0);
      }
      if (skillsRes.data.success) {
        setSkills(skillsRes.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch("/users/me", editForm);
      if (res.data.success) {
        setProfile(res.data.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePhoneUsage = async () => {
    setLoggingPhone(true);
    try {
      const res = await api.patch("/users/me", {
        phoneUsageReal: Number(screenTimeInput) || 0,
        lastPhoneSyncDate: new Date().toISOString()
      });
      if (res.data.success) {
        setProfile(res.data.data);
        setShowPhoneModal(false);
      }
    } catch (err) {
      console.error("Failed to log phone usage", err);
    } finally {
      setLoggingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Loading your preparation cockpit...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 card max-w-md mx-auto">
        <p className="text-rose-600 font-medium">Couldn't load your profile. Please try again.</p>
        <button onClick={fetchDashboardData} className="btn-secondary mt-4">
          Try Again
        </button>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(profile.targetDate);
  const realPhone = profile.phoneUsageReal || 0;
  const phoneLimit = profile.phoneUsageLimit || 60;
  const phonePercent = Math.min(100, Math.round((realPhone / phoneLimit) * 100));
  const isOverLimit = realPhone > phoneLimit;

  // Calculate overall mastery
  const totalTopics = skills.reduce((acc, s) => acc + (s.topics?.length || 0), 0);
  const masteredTopics = skills.reduce(
    (acc, s) => acc + (s.topics?.filter((t) => t.mastery >= 80).length || 0),
    0
  );
  const overallMastery = skills.length
    ? Math.round(skills.reduce((acc, s) => acc + s.mastery, 0) / skills.length)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Target className="w-4 h-4" />
              <span>Target Role:</span>
              <span className="text-white font-bold">{profile.placementGoal || "Set Goal"}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">
              Welcome back, {profile.name}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Stay disciplined. Track daily study targets, keep real screen time under control, and complete skill roadmaps.
            </p>
          </div>

          {daysRemaining !== null && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 text-center min-w-[160px] self-start md:self-auto">
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-300 block mb-1">Countdown</span>
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-white">{daysRemaining}</span>
              <span className="text-xs text-slate-300 block mt-1">Days Until Placement</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Study Target */}
        <div className="card glass-card p-5 border-slate-200">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Daily Study Target</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-slate-900">
            {profile.dailyStudyTarget ? `${profile.dailyStudyTarget} min` : "Not set"}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Target study focus per day ({(Number(profile.dailyStudyTarget || 0) / 60).toFixed(1)} hrs)
          </p>
        </div>

        {/* Real Phone Usage Today */}
        <div className={`card glass-card p-5 border-slate-200 ${isOverLimit ? "bg-rose-50/40 border-rose-200" : ""}`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Real Phone Usage Today</span>
            <button
              onClick={() => setShowPhoneModal(true)}
              className="text-xs font-semibold text-indigo-600 hover:underline bg-indigo-50 px-2 py-1 rounded-md"
            >
              Sync Screen Time
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-3xl font-bold ${isOverLimit ? "text-rose-600" : "text-slate-900"}`}>
              {realPhone} min
            </span>
            <span className="text-xs font-medium text-slate-500">/ limit {phoneLimit}m</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  isOverLimit ? "bg-rose-600" : phonePercent > 80 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, phonePercent)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                {isOverLimit ? <AlertTriangle className="w-3 h-3 text-rose-600" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {isOverLimit ? "Exceeded Limit" : "Disciplined"}
              </span>
              <span>{phonePercent}% of limit</span>
            </div>
          </div>
        </div>

        {/* Overall Mastery */}
        <div className="card glass-card p-5 border-slate-200">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Mastery</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-emerald-600">{overallMastery}%</div>
          <p className="text-xs text-slate-500 mt-2">
            Average across {skills.length} enrolled skill tracks
          </p>
        </div>

        {/* Topics Mastered */}
        <div className="card glass-card p-5 border-slate-200">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Topics Mastered</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-indigo-600">
            {masteredTopics} <span className="text-lg text-slate-400 font-normal">/ {totalTopics}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Topics with ≥ 80% AI evaluation score</p>
        </div>
      </div>

      {/* Main Grid: Goals Card + Active Learning Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals Management Card */}
        <div className="card glass-card lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900">Your Target Goals</h3>
              <p className="text-xs text-slate-500 mt-0.5">Parameters driving your placement preparation strategy</p>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Goals
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(profile);
                  }}
                  className="btn-ghost py-1 px-3 text-xs"
                >
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary py-1 px-4 text-xs font-semibold">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Placement Goal / Company</span>
                <p className="font-semibold text-lg text-slate-900">{profile.placementGoal || "Not set"}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Target Placement Date</span>
                <p className="font-semibold text-lg text-slate-900">{formatDisplayDate(profile.targetDate)}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Daily Study Target</span>
                <p className="font-display font-bold text-2xl text-indigo-600">
                  {profile.dailyStudyTarget ? `${profile.dailyStudyTarget} min` : "Not set"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Daily Phone Usage Limit</span>
                <p className="font-display font-bold text-2xl text-amber-600">
                  {profile.phoneUsageLimit ? `${profile.phoneUsageLimit} min` : "Not set"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div>
                <label className="label">Placement Goal (Target Company)</label>
                <input
                  type="text"
                  className="input-field"
                  value={editForm.placementGoal || ""}
                  onChange={(e) => setEditForm({ ...editForm, placementGoal: e.target.value })}
                  placeholder="e.g. SDE at Google"
                />
              </div>

              <div>
                <label className="label">Target Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={formatSafeInputDate(editForm.targetDate)}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      targetDate: e.target.value ? new Date(e.target.value).toISOString() : ""
                    })
                  }
                />
              </div>

              <div>
                <label className="label">Daily Study Target (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  className="input-field"
                  value={editForm.dailyStudyTarget ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dailyStudyTarget: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div>
                <label className="label">Phone Usage Limit (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  className="input-field"
                  value={editForm.phoneUsageLimit ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phoneUsageLimit: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions & Skills Shortcut */}
        <div className="card glass-card space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display font-bold text-lg text-slate-900">Skills Roadmap</h3>
              <Link href="/dashboard/skills" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All →
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Track your progression step-by-step with order-tracking style timelines.
            </p>

            <div className="space-y-3">
              {skills.slice(0, 3).map((skill) => (
                <Link
                  key={skill.id}
                  href={`/dashboard/skills/${skill.id}`}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-indigo-500/50 hover:bg-indigo-50/30 transition-all flex items-center justify-between group block"
                >
                  <div>
                    <span className="font-semibold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {skill.name}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {skill.topics?.length || 0} topics • {skill.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-indigo-600">{skill.mastery}%</span>
                  </div>
                </Link>
              ))}

              {skills.length === 0 && (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-400">No skills added yet.</p>
                  <Link href="/dashboard/skills" className="btn-primary py-1.5 px-3 text-xs font-semibold mt-2">
                    + Add First Skill
                  </Link>
                </div>
              )}
            </div>
          </div>

          <Link href="/dashboard/skills" className="btn-secondary w-full py-2.5 text-xs font-semibold text-center">
            Explore Skills Roadmap →
          </Link>
        </div>
      </div>

      {/* Screen Time Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-bold text-xl text-slate-900 mb-1">Sync Real Phone Screen Time</h3>
            <p className="text-xs text-slate-500 mb-5">
              Input today's actual screen time from your phone's Digital Wellbeing or iOS Screen Time app.
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Today's Phone Screen Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  className="input-field text-lg font-bold"
                  value={screenTimeInput}
                  onChange={(e) => setScreenTimeInput(Number(e.target.value) || 0)}
                  placeholder="e.g. 75"
                  autoFocus
                />
                <span className="text-xs text-slate-400 mt-1 block">
                  Equivalent to {(screenTimeInput / 60).toFixed(1)} hours
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-200">
                <span>Daily Limit: </span>
                <span className="font-bold text-amber-600">{phoneLimit} min</span>
                {screenTimeInput > phoneLimit && (
                  <span className="flex items-center gap-1 text-rose-600 font-bold mt-1">
                    <AlertTriangle className="w-4 h-4" />
                    You are {screenTimeInput - phoneLimit} minutes over your limit!
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="btn-secondary flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loggingPhone}
                  onClick={handleUpdatePhoneUsage}
                  className="btn-primary flex-1 py-2 text-xs font-semibold"
                >
                  {loggingPhone ? "Saving..." : "Update Screen Time"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
