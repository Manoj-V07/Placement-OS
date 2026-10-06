"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { AlertTriangle, Clock, Rocket } from "lucide-react";

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=coder1",
  "https://api.dicebear.com/7.x/bottts/svg?seed=dev2",
  "https://api.dicebear.com/7.x/bottts/svg?seed=hacker3",
  "https://api.dicebear.com/7.x/bottts/svg?seed=ai4",
  "https://api.dicebear.com/7.x/bottts/svg?seed=ninja5",
  "https://api.dicebear.com/7.x/bottts/svg?seed=architect6"
];

const PRESET_COMPANIES = ["Google SDE", "Microsoft SWE", "Amazon SDE-1", "Meta", "Goldman Sachs", "Uber"];

export default function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState(PRESET_AVATARS[0]);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [placementGoal, setPlacementGoal] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [dailyStudyTarget, setDailyStudyTarget] = useState(180); // 3 hours
  const [phoneUsageLimit, setPhoneUsageLimit] = useState(60); // 1 hour
  const [phoneUsageReal, setPhoneUsageReal] = useState(45); // initial phone screen time

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (profile) {
      if (profile.name && !name) setName(profile.name);
      if (profile.profileImage) setProfileImage(profile.profileImage);
      if (profile.placementGoal) setPlacementGoal(profile.placementGoal);
      if (profile.targetDate) {
        try {
          const d = new Date(profile.targetDate);
          if (!isNaN(d.getTime())) {
            setTargetDate(d.toISOString().split("T")[0]);
          }
        } catch (_) {}
      }
      if (profile.dailyStudyTarget) setDailyStudyTarget(profile.dailyStudyTarget);
      if (profile.phoneUsageLimit) setPhoneUsageLimit(profile.phoneUsageLimit);
      if (profile.phoneUsageReal !== undefined && profile.phoneUsageReal !== null) {
        setPhoneUsageReal(profile.phoneUsageReal);
      }
    }
  }, [user, profile, loading, router, name]);

  const handleNextStep = () => {
    setErrorMsg("");
    if (step === 1) {
      if (!name.trim()) {
        setErrorMsg("Please enter your name.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!placementGoal.trim()) {
        setErrorMsg("Please specify your placement goal or target company.");
        return;
      }
      if (!targetDate) {
        setErrorMsg("Please select your target placement date.");
        return;
      }
      setStep(3);
    }
  };

  const handleCompleteOnboarding = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const finalAvatar = customImageUrl.trim() ? customImageUrl.trim() : profileImage;
      const formattedDate = targetDate ? new Date(targetDate).toISOString() : null;

      await api.patch("/users/me", {
        name,
        profileImage: finalAvatar,
        placementGoal,
        targetDate: formattedDate,
        dailyStudyTarget: Number(dailyStudyTarget) || 180,
        phoneUsageLimit: Number(phoneUsageLimit) || 60,
        phoneUsageReal: Number(phoneUsageReal) || 0,
        onboardingCompleted: true,
        lastPhoneSyncDate: new Date().toISOString()
      });

      await refreshProfile();
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Failed to complete onboarding", err);
      setErrorMsg(err.response?.data?.message || "Failed to save profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Calculate days remaining preview
  const targetDateObj = targetDate ? new Date(targetDate) : null;
  const daysLeft = targetDateObj && !isNaN(targetDateObj.getTime())
    ? Math.max(0, Math.ceil((targetDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl">
        {/* Progress Stepper Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="badge badge-indigo">Setup Your Placement Operating System</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Personalize Your Goals</h1>
          <p className="text-slate-500 text-sm mt-1">Step {step} of 3</p>

          <div className="flex items-center justify-center gap-2 mt-4 max-w-xs mx-auto">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 1 ? "bg-indigo-600" : "bg-slate-200"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 2 ? "bg-indigo-600" : "bg-slate-200"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 3 ? "bg-indigo-600" : "bg-slate-200"}`} />
          </div>
        </div>

        {/* Card */}
        <div className="card glass-card p-8 border border-slate-200/90 shadow-xl">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* STEP 1: Profile & Avatar */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900">Choose Profile & Avatar</h2>
                <p className="text-sm text-slate-500 mt-1">Pick a developer avatar or upload your own photo.</p>
              </div>

              {/* Avatar Preview */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-24 h-24 rounded-2xl bg-indigo-50 border-2 border-indigo-500/40 p-2 shadow-lg shadow-indigo-500/10 mb-3 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customImageUrl.trim() ? customImageUrl.trim() : profileImage}
                    alt="Avatar Preview"
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-indigo-600">Selected Avatar</span>
              </div>

              {/* Preset Avatars */}
              <div>
                <label className="label">Preset Developer Avatars</label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setProfileImage(url);
                        setCustomImageUrl("");
                      }}
                      className={`p-1.5 rounded-xl border-2 transition-all hover:scale-105 ${
                        profileImage === url && !customImageUrl
                          ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full rounded-lg" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL or Upload */}
              <div>
                <label className="label">Or enter Custom Image / Photo URL (Optional)</label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://example.com/my-photo.jpg"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Your Display Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Manoj V"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <button type="button" onClick={handleNextStep} className="btn-primary w-full py-3 font-semibold mt-4">
                Continue to Placement Goal →
              </button>
            </div>
          )}

          {/* STEP 2: Placement Goal & Target Date */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900">Your Placement Target</h2>
                <p className="text-sm text-slate-500 mt-1">Define what company and date you are preparing for.</p>
              </div>

              <div>
                <label className="label">Dream Company / Role Target</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. SDE at Google, Microsoft SWE"
                  value={placementGoal}
                  onChange={(e) => setPlacementGoal(e.target.value)}
                  required
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_COMPANIES.map((comp) => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => setPlacementGoal(comp)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                    >
                      + {comp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Target Placement Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={targetDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                />
                {daysLeft !== null && (
                  <div className="mt-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> Countdown:</span>
                    <span className="font-bold">{daysLeft} days remaining</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">
                  ← Back
                </button>
                <button type="button" onClick={handleNextStep} className="btn-primary flex-1 py-3 font-semibold">
                  Next: Study & Phone Limits →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Study Target & Real Phone Usage Control */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900">Daily Study & Phone Control</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enforce strict focus by tracking study targets and real phone screen time.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">Daily Study Target</label>
                  <span className="text-sm font-bold text-indigo-600">{dailyStudyTarget} mins ({(dailyStudyTarget / 60).toFixed(1)} hrs)</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="600"
                  step="30"
                  value={dailyStudyTarget}
                  onChange={(e) => setDailyStudyTarget(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>30 mins</span>
                  <span>3 hrs (180m)</span>
                  <span>5 hrs (300m)</span>
                  <span>10 hrs</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">Phone Usage Limit (Max Allowed)</label>
                  <span className="text-sm font-bold text-amber-600">{phoneUsageLimit} mins ({(phoneUsageLimit / 60).toFixed(1)} hrs)</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="360"
                  step="15"
                  value={phoneUsageLimit}
                  onChange={(e) => setPhoneUsageLimit(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>15 mins</span>
                  <span>1 hr (60m)</span>
                  <span>2 hrs (120m)</span>
                  <span>6 hrs</span>
                </div>
              </div>

              {/* Real Phone Usage Input */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <label className="label mb-0 text-slate-900 font-bold">Today's Real Phone Usage (Screen Time)</label>
                    <p className="text-xs text-slate-500">Check your Digital Wellbeing or Screen Time on your phone.</p>
                  </div>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${phoneUsageReal > phoneUsageLimit ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {phoneUsageReal} mins
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    value={phoneUsageReal}
                    onChange={(e) => setPhoneUsageReal(Number(e.target.value) || 0)}
                    className="input-field py-2"
                    placeholder="Enter today's screen time (mins)"
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">minutes</span>
                </div>
                {phoneUsageReal > phoneUsageLimit && (
                  <p className="text-xs text-rose-600 mt-2 font-medium flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" /> Current phone screen time exceeds your set limit by {phoneUsageReal - phoneUsageLimit} minutes!
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCompleteOnboarding}
                  className="btn-primary flex-1 py-3 font-semibold flex items-center justify-center"
                >
                  {submitting ? "Launching PlacementOS..." : (
                    <>Complete & Enter Dashboard <Rocket className="w-4 h-4 ml-1.5" /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
