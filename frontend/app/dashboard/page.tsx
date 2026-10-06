"use client";

import { useEffect, useState } from "react";
import api from "../../lib/api";

interface UserProfile {
  name: string;
  email: string;
  placementGoal: string | null;
  targetDate: string | null;
  dailyStudyTarget: number | null;
  phoneUsageLimit: number | null;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/me");
      if (res.data.success) {
        setProfile(res.data.data);
        setEditForm(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-error font-medium">Couldn't load your profile. Please try again.</p>
        <button onClick={fetchProfile} className="btn-secondary mt-4">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold">Welcome back, {profile.name}</h2>
        <p className="text-muted mt-2 text-lg">Here's your preparation overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card md:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-border-soft pb-4">
            <h3 className="font-display font-semibold text-xl">Your Goals</h3>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="text-electric font-medium hover:underline text-sm">
                Edit Goals
              </button>
            ) : (
              <div className="flex space-x-3">
                <button onClick={() => { setIsEditing(false); setEditForm(profile); }} className="text-muted hover:text-ink text-sm font-medium">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary py-1.5 px-4 text-sm">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-2">
              <div>
                <span className="text-muted text-sm font-medium">Placement Goal</span>
                <p className="font-medium text-lg mt-1">{profile.placementGoal || "Not set"}</p>
              </div>
              <div>
                <span className="text-muted text-sm font-medium">Target Date</span>
                <p className="font-medium text-lg mt-1">
                  {profile.targetDate ? new Date(profile.targetDate).toLocaleDateString() : "Not set"}
                </p>
              </div>
              <div>
                <span className="text-muted text-sm font-medium">Daily Study Target</span>
                <p className="font-display font-bold text-2xl mt-1 text-electric">
                  {profile.dailyStudyTarget ? `${profile.dailyStudyTarget} min` : "Not set"}
                </p>
              </div>
              <div>
                <span className="text-muted text-sm font-medium">Phone Usage Limit</span>
                <p className="font-display font-bold text-2xl mt-1 text-warning">
                  {profile.phoneUsageLimit ? `${profile.phoneUsageLimit} min` : "Not set"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
              <div className="space-y-1">
                <label className="label">Placement Goal</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editForm.placementGoal || ""}
                  onChange={(e) => setEditForm({...editForm, placementGoal: e.target.value})}
                  placeholder="e.g. SDE at Google"
                />
              </div>
              <div className="space-y-1">
                <label className="label">Target Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={editForm.targetDate ? editForm.targetDate.split('T')[0] : ""}
                  onChange={(e) => setEditForm({...editForm, targetDate: e.target.value ? new Date(e.target.value).toISOString() : ""})}
                />
              </div>
              <div className="space-y-1">
                <label className="label">Daily Study Target (minutes)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editForm.dailyStudyTarget || ""}
                  onChange={(e) => setEditForm({...editForm, dailyStudyTarget: parseInt(e.target.value) || 0})}
                  placeholder="e.g. 180"
                />
              </div>
              <div className="space-y-1">
                <label className="label">Phone Usage Limit (minutes)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editForm.phoneUsageLimit || ""}
                  onChange={(e) => setEditForm({...editForm, phoneUsageLimit: parseInt(e.target.value) || 0})}
                  placeholder="e.g. 60"
                />
              </div>
            </div>
          )}
        </div>

        <div className="card bg-pale/30 border-none space-y-4">
          <h3 className="font-display font-semibold text-lg">Quick Stats</h3>
          <div className="space-y-6 pt-2">
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-medium text-muted">Study Progress</span>
                <span className="text-xs font-mono font-medium">0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-electric h-2 rounded-full" style={{ width: "0%" }}></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border-soft/50">
              <span className="text-sm font-medium text-muted block mb-2">Status</span>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                <span className="mr-2">○</span> Not Started Today
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
