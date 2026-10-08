"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import { Edit2, CheckCircle2, AlertTriangle, Target, Clock } from "lucide-react";

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=coder1",
  "https://api.dicebear.com/7.x/bottts/svg?seed=dev2",
  "https://api.dicebear.com/7.x/bottts/svg?seed=hacker3",
  "https://api.dicebear.com/7.x/bottts/svg?seed=ai4",
  "https://api.dicebear.com/7.x/bottts/svg?seed=ninja5",
  "https://api.dicebear.com/7.x/bottts/svg?seed=architect6"
];

const formatDisplayDate = (dateVal: any) => {
  if (!dateVal) return "Not set";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Not set";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const formatSafeInputDate = (dateVal: any) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return typeof dateVal === "string" ? dateVal.split("T")[0] : "";
};

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit fields
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [placementGoal, setPlacementGoal] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [dailyStudyTarget, setDailyStudyTarget] = useState<number>(180);
  const [phoneUsageLimit, setPhoneUsageLimit] = useState<number>(60);
  const [phoneUsageReal, setPhoneUsageReal] = useState<number>(0);
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [codechefUsername, setCodechefUsername] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setProfileImage(profile.profileImage || PRESET_AVATARS[0]);
      setPlacementGoal(profile.placementGoal || "");
      setTargetDate(formatSafeInputDate(profile.targetDate));
      setDailyStudyTarget(profile.dailyStudyTarget || 180);
      setPhoneUsageLimit(profile.phoneUsageLimit || 60);
      setPhoneUsageReal(profile.phoneUsageReal || 0);
      setLeetcodeUsername(profile.leetcodeUsername || "");
      setCodechefUsername(profile.codechefUsername || "");
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const finalImage = customImageUrl.trim() ? customImageUrl.trim() : profileImage;
      const formattedDate = targetDate ? new Date(targetDate).toISOString() : null;

      await api.patch("/users/me", {
        name,
        profileImage: finalImage,
        placementGoal,
        targetDate: formattedDate,
        dailyStudyTarget: Number(dailyStudyTarget) || 0,
        phoneUsageLimit: Number(phoneUsageLimit) || 0,
        phoneUsageReal: Number(phoneUsageReal) || 0,
        leetcodeUsername: leetcodeUsername.trim() || null,
        codechefUsername: codechefUsername.trim() || null,
        lastPhoneSyncDate: new Date().toISOString()
      });

      await refreshProfile();
      setSuccessMsg("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const targetDateObj = profile?.targetDate ? new Date(profile.targetDate) : null;
  const daysLeft = targetDateObj && !isNaN(targetDateObj.getTime())
    ? Math.max(0, Math.ceil((targetDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const currentAvatar = profile?.profileImage || user?.photoURL || PRESET_AVATARS[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Profile & Preparation Settings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your personal profile, placement goal, daily study targets, and phone limit.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary py-2 px-5 text-sm font-semibold self-start sm:self-auto flex items-center"
          >
            <Edit2 className="w-4 h-4 mr-1.5" /> Edit Profile
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      {!isEditing ? (
        <div className="space-y-6">
          <div className="card glass-card p-8 border-slate-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-slate-100">
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl bg-indigo-50 border-2 border-indigo-200 p-2 shadow-lg shadow-indigo-500/10 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentAvatar}
                    alt={profile?.name || "User Avatar"}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
                    }}
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-5 h-5 rounded-full border-2 border-white shadow-xs" />
              </div>

              <div className="text-center sm:text-left space-y-2 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-2xl font-display font-bold text-slate-900">{profile?.name || "Candidate"}</h2>
                  <span className="badge badge-indigo self-center sm:self-auto">Placement Ready Candidate</span>
                </div>
                <p className="text-sm text-slate-500 font-mono">{profile?.email || user?.email}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 rounded-lg bg-slate-100 text-xs text-slate-700 font-semibold flex items-center">
                    <Target className="w-3.5 h-3.5 mr-1" /> Goal: {profile?.placementGoal || "Not specified"}
                  </span>
                  {daysLeft !== null && (
                    <span className="px-3 py-1 rounded-lg bg-indigo-50 text-xs text-indigo-700 font-semibold flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" /> {daysLeft} Days to Target
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Grid Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Company / Role
                </span>
                <span className="font-semibold text-base text-slate-900">{profile?.placementGoal || "Not set"}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Placement Date
                </span>
                <span className="font-semibold text-base text-slate-900">{formatDisplayDate(profile?.targetDate)}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Daily Study Target
                </span>
                <span className="font-display font-bold text-xl text-indigo-600">
                  {profile?.dailyStudyTarget ? `${profile.dailyStudyTarget} mins` : "Not set"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Daily Phone Usage Limit
                </span>
                <span className="font-display font-bold text-xl text-amber-600">
                  {profile?.phoneUsageLimit ? `${profile.phoneUsageLimit} mins` : "Not set"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Real Phone Screen Time Today
                </span>
                <span className={`font-display font-bold text-xl ${(profile?.phoneUsageReal || 0) > (profile?.phoneUsageLimit || 60) ? "text-rose-600" : "text-emerald-600"}`}>
                  {profile?.phoneUsageReal ?? 0} mins
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  LeetCode Handle
                </span>
                <span className="font-semibold text-base text-slate-900">
                  {profile?.leetcodeUsername ? `@${profile.leetcodeUsername}` : <span className="text-slate-400 font-normal">Not connected</span>}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  CodeChef Handle
                </span>
                <span className="font-semibold text-base text-slate-900">
                  {profile?.codechefUsername ? `@${profile.codechefUsername}` : <span className="text-slate-400 font-normal">Not connected</span>}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Account Created
                </span>
                <span className="font-semibold text-base text-slate-900">
                  {formatDisplayDate(profile?.createdAt || new Date())}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Profile Form */
        <form onSubmit={handleSaveProfile} className="card glass-card p-8 border-slate-200 space-y-6">
          <h2 className="text-xl font-display font-bold text-slate-900 border-b border-slate-100 pb-3">
            Edit Profile Details
          </h2>

          {/* Avatar Selection */}
          <div>
            <label className="label">Profile Avatar</label>
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 border-2 border-indigo-200 p-2 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={customImageUrl.trim() ? customImageUrl.trim() : profileImage}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
                  }}
                />
              </div>

              <div className="space-y-2 flex-1">
                <span className="text-xs font-semibold text-slate-500 block">Choose from Developer Avatars:</span>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setProfileImage(url);
                        setCustomImageUrl("");
                      }}
                      className={`p-1 rounded-xl border-2 transition-all hover:scale-105 ${
                        profileImage === url && !customImageUrl
                          ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20"
                          : "border-slate-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Avatar ${idx}`} className="w-full h-full rounded-lg" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="label">Or Custom Image URL</label>
            <input
              type="url"
              className="input-field"
              placeholder="https://example.com/avatar.png"
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Target Placement Goal / Dream Company</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. SDE at Google"
                value={placementGoal}
                onChange={(e) => setPlacementGoal(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Target Placement Date</label>
              <input
                type="date"
                className="input-field"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Daily Study Target (minutes)</label>
              <input
                type="number"
                min="0"
                max="1440"
                className="input-field"
                value={dailyStudyTarget}
                onChange={(e) => setDailyStudyTarget(Number(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <label className="label">Daily Phone Usage Limit (minutes)</label>
              <input
                type="number"
                min="0"
                max="1440"
                className="input-field"
                value={phoneUsageLimit}
                onChange={(e) => setPhoneUsageLimit(Number(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <label className="label">Real Phone Screen Time Today (minutes)</label>
              <input
                type="number"
                min="0"
                max="1440"
                className="input-field"
                value={phoneUsageReal}
                onChange={(e) => setPhoneUsageReal(Number(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="label flex items-center justify-between">
                <span>LeetCode Username</span>
                <span className="text-xs text-slate-400 font-normal">Public handle only, no password</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. tourist or neal_wu"
                value={leetcodeUsername}
                onChange={(e) => setLeetcodeUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="label flex items-center justify-between">
                <span>CodeChef Handle</span>
                <span className="text-xs text-slate-400 font-normal">Public handle only, no password</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. tourist or chef"
                value={codechefUsername}
                onChange={(e) => setCodechefUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-secondary flex-1 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 py-2.5 text-sm font-semibold"
            >
              {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
