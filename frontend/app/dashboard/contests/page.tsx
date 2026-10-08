"use client";

import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { 
  Trophy, 
  Plus, 
  ExternalLink, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle,
  Calendar,
  Code2,
  TrendingUp,
  RefreshCw,
  Link2,
  CheckCircle2,
  XCircle,
  BarChart2,
  Star,
  ShieldCheck,
  Sparkles,
  Layers,
  BookOpen,
  Info
} from "lucide-react";

interface Mistake {
  id: string;
  problemName: string;
  topic: string;
  description: string;
}

interface Contest {
  id: string;
  platform: string;
  contestDate: string;
  contestUrl?: string;
  attended: boolean;
  problemsAttempted: number;
  problemsSolved: number;
  rank?: number;
  ratingBefore?: number;
  ratingAfter?: number;
  notes?: string;
  mistakes: Mistake[];
}

interface LeetCodeStats {
  available: boolean;
  username: string;
  error?: string;
  profile?: {
    ranking: number | null;
    reputation: number | null;
  };
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number | null;
  globalContestRanking: number | null;
  totalParticipants: number | null;
  topPercentage: number | null;
  contestsParticipated: number;
  ratingHistory: Array<{
    contestTitle: string;
    rating: number;
    ranking: number;
    startTime: number;
    attended: boolean;
  }>;
  recentActivity: Array<{
    title: string;
    titleSlug: string;
    timestamp: string;
    status: string;
    lang: string;
  }>;
  syncedAt: string;
}

interface CodeChefStats {
  available: boolean;
  username: string;
  error?: string;
  rating: number | null;
  stars: number;
  highestRating: number | null;
  globalRank: string | null;
  countryRank: string | null;
  totalSolved: number;
  contestsParticipated: number;
  ratingHistory: Array<{
    contestCode: string;
    contestName: string;
    rating: number;
    ranking: number;
    date: string;
    color?: string;
  }>;
  recentActivity: Array<{
    time: string;
    problemName: string;
    problemUrl?: string;
    status: string;
    lang: string;
  }>;
  syncedAt: string;
}

interface ComparisonData {
  plannedDSA: {
    problemsSolved: number;
    problemsAttempted: number;
    totalTasksPlanned: number;
    tasksCompleted: number;
    manualContestsLogged: number;
    mistakesLogged: number;
    byDifficulty: Record<string, number>;
  };
  actualCP: {
    totalCPSolved: number;
    leetcode: {
      available: boolean;
      username: string | null;
      solved: number;
      easy: number;
      medium: number;
      hard: number;
      rating: number | null;
      contests: number;
    };
    codechef: {
      available: boolean;
      username: string | null;
      solved: number;
      stars: number;
      rating: number | null;
      highestRating: number | null;
      contests: number;
    };
    totalContestsParticipated: number;
    lastSyncedAt: string | null;
  };
  insights: {
    solvedComparisonRatio: number | null;
    practiceConsistency: number;
    summary: string;
  };
}

export default function ContestsPage() {
  const [activeTab, setActiveTab] = useState<"cp" | "comparison" | "manual">("cp");
  
  // CP Live Sync States
  const [cpLoading, setCpLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [leetcodeData, setLeetcodeData] = useState<LeetCodeStats | null>(null);
  const [codechefData, setCodechefData] = useState<CodeChefStats | null>(null);
  const [connectedProfiles, setConnectedProfiles] = useState<{ leetcode: string | null; codechef: string | null }>({ leetcode: null, codechef: null });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Connect Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectHandles, setConnectHandles] = useState({ leetcode: "", codechef: "" });
  const [connectMsg, setConnectMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Comparison State
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Manual Contests States
  const [manualContests, setManualContests] = useState<Contest[]>([]);
  const [manualLoading, setManualLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMistakeModalOpen, setIsMistakeModalOpen] = useState(false);
  const [activeContestId, setActiveContestId] = useState<string | null>(null);

  const [newContest, setNewContest] = useState({
    platform: "LeetCode",
    contestDate: new Date().toISOString().split("T")[0],
    contestUrl: "",
    problemsAttempted: 0,
    problemsSolved: 0,
    rank: "",
    ratingBefore: "",
    ratingAfter: "",
    notes: ""
  });

  const [newMistake, setNewMistake] = useState({
    problemName: "",
    topic: "",
    description: ""
  });

  // Fetch CP Stats
  const fetchCPStats = async () => {
    try {
      setCpLoading(true);
      const res = await api.get("/cp/stats");
      const data = res.data.data;
      setConnectedProfiles(data.connected);
      setLeetcodeData(data.leetcode);
      setCodechefData(data.codechef);
      setLastSyncedAt(data.lastSyncedAt);
      setConnectHandles({
        leetcode: data.connected?.leetcode || "",
        codechef: data.connected?.codechef || ""
      });
    } catch (error) {
      console.error("Failed to fetch CP stats:", error);
    } finally {
      setCpLoading(false);
    }
  };

  // Sync CP Stats Force
  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const res = await api.post("/cp/sync");
      const data = res.data.data;
      setConnectedProfiles(data.connected);
      setLeetcodeData(data.leetcode);
      setCodechefData(data.codechef);
      setLastSyncedAt(data.lastSyncedAt);
      if (activeTab === "comparison") {
        fetchComparison();
      }
    } catch (error: any) {
      console.error("Failed to sync CP stats:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Connect Profiles
  const handleConnectProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setConnectMsg(null);
    try {
      const res = await api.post("/cp/connect", {
        leetcodeUsername: connectHandles.leetcode,
        codechefUsername: connectHandles.codechef
      });
      const data = res.data.data;
      setConnectedProfiles(data.connected);
      setLeetcodeData(data.leetcode);
      setCodechefData(data.codechef);
      setLastSyncedAt(data.lastSyncedAt);
      setConnectMsg({ type: "success", text: "Profiles connected & synchronized successfully!" });
      setTimeout(() => {
        setIsConnectModalOpen(false);
        setConnectMsg(null);
      }, 1500);
      if (activeTab === "comparison") {
        fetchComparison();
      }
    } catch (error: any) {
      setConnectMsg({ type: "error", text: error.response?.data?.message || "Failed to connect profiles" });
    } finally {
      setConnecting(false);
    }
  };

  // Fetch Comparison Data
  const fetchComparison = async () => {
    try {
      setComparisonLoading(true);
      const res = await api.get("/cp/comparison");
      setComparisonData(res.data.data);
    } catch (error) {
      console.error("Failed to fetch comparison:", error);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Fetch Manual Contests
  const fetchManualContests = async () => {
    try {
      setManualLoading(true);
      const res = await api.get("/contests");
      setManualContests(res.data.data);
    } catch (error) {
      console.error("Failed to fetch manual contests:", error);
    } finally {
      setManualLoading(false);
    }
  };

  useEffect(() => {
    fetchCPStats();
    fetchManualContests();
  }, []);

  useEffect(() => {
    if (activeTab === "comparison") {
      fetchComparison();
    }
  }, [activeTab]);

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/contests", {
        ...newContest,
        rank: newContest.rank ? parseInt(newContest.rank) : null,
        ratingBefore: newContest.ratingBefore ? parseInt(newContest.ratingBefore) : null,
        ratingAfter: newContest.ratingAfter ? parseInt(newContest.ratingAfter) : null,
      });
      setIsCreateModalOpen(false);
      setNewContest({
        platform: "LeetCode",
        contestDate: new Date().toISOString().split("T")[0],
        contestUrl: "",
        problemsAttempted: 0,
        problemsSolved: 0,
        rank: "",
        ratingBefore: "",
        ratingAfter: "",
        notes: ""
      });
      fetchManualContests();
    } catch (error) {
      console.error("Failed to create contest:", error);
    }
  };

  const handleAddMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContestId) return;
    try {
      await api.post(`/contests/${activeContestId}/mistakes`, newMistake);
      setIsMistakeModalOpen(false);
      setNewMistake({ problemName: "", topic: "", description: "" });
      setActiveContestId(null);
      fetchManualContests();
    } catch (error) {
      console.error("Failed to add mistake:", error);
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "LeetCode": return "bg-orange-100 text-orange-700 border-orange-200";
      case "CodeChef": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Codeforces": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return "Never synced";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recently";
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display text-slate-900">Competitive Programming</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Auto-Sync Active
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Sync live ratings & statistics from LeetCode and CodeChef, separate from manual DSA tasks.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <Link2 className="w-4 h-4 text-slate-600" />
            Connect Handles
          </button>
          <button
            onClick={handleSyncNow}
            disabled={syncing || (!connectedProfiles.leetcode && !connectedProfiles.codechef)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shadow-indigo-600/20"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("cp")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${
            activeTab === "cp"
              ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Live CP Sync (LeetCode & CodeChef)
        </button>
        <button
          onClick={() => setActiveTab("comparison")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${
            activeTab === "comparison"
              ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <BarChart2 className="w-4 h-4 text-indigo-600" />
          DSA vs CP Analytics
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${
            activeTab === "manual"
              ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Manual Contest Journal ({manualContests.length})
        </button>
      </div>

      {/* TAB 1: LIVE CP SYNC */}
      {activeTab === "cp" && (
        <div className="space-y-6">
          {/* Sync Header Bar */}
          <div className="bg-slate-900 text-white p-4 px-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-sm text-slate-300">
                Connected Handles:{" "}
                <span className="text-white font-semibold">
                  LeetCode: {connectedProfiles.leetcode ? `@${connectedProfiles.leetcode}` : "None"} | CodeChef: {connectedProfiles.codechef ? `@${connectedProfiles.codechef}` : "None"}
                </span>
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Last auto-synced: <span className="text-slate-200 font-medium">{formatRelativeTime(lastSyncedAt)}</span>
            </div>
          </div>

          {cpLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
              <p className="text-sm text-slate-500">Retrieving public platform metrics...</p>
            </div>
          ) : !connectedProfiles.leetcode && !connectedProfiles.codechef ? (
            /* Empty state when no handles connected */
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-inner">
                <Link2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Connect Your Competitive Profiles</h2>
              <p className="text-slate-500 max-w-md mb-6 text-sm">
                Connect your public LeetCode and CodeChef handles. PlacementOS will automatically synchronize your contest ratings, rating history, problem breakdown, and recent submissions.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Public usernames only. No passwords required or stored.
              </div>
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Connect Profiles Now
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* LeetCode Platform Card */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      LC
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">LeetCode Profile</h2>
                        {leetcodeData?.available ? (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {connectedProfiles.leetcode ? `@${connectedProfiles.leetcode}` : "Not connected"}
                      </span>
                    </div>
                  </div>

                  {connectedProfiles.leetcode && (
                    <a
                      href={`https://leetcode.com/u/${connectedProfiles.leetcode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                    >
                      View on LeetCode <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="p-6">
                  {!leetcodeData || !leetcodeData.available ? (
                    <div className="p-6 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-bold text-amber-900">LeetCode Statistics Unavailable</h3>
                        <p className="text-xs text-amber-700 mt-1">
                          {leetcodeData?.error || "LeetCode profile not connected or restricted. Please verify your handle or check back shortly."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Metric KPIs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-orange-500" /> Contest Rating
                          </div>
                          <div className="text-2xl font-bold font-display text-slate-900">
                            {leetcodeData.contestRating ? leetcodeData.contestRating : "Unrated"}
                          </div>
                          {leetcodeData.topPercentage !== null && (
                            <span className="text-xs text-emerald-600 font-medium">
                              Top {leetcodeData.topPercentage}%
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-blue-500" /> Global Rank
                          </div>
                          <div className="text-2xl font-bold font-display text-slate-900">
                            {leetcodeData.globalContestRanking ? `#${leetcodeData.globalContestRanking.toLocaleString()}` : "-"}
                          </div>
                          <span className="text-xs text-slate-400">
                            of {leetcodeData.totalParticipants?.toLocaleString() || "active"} users
                          </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-indigo-500" /> Total Solved
                          </div>
                          <div className="text-2xl font-bold font-display text-slate-900">
                            {leetcodeData.totalSolved}
                          </div>
                          <span className="text-xs text-slate-400">Accepted problems</span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" /> Contests
                          </div>
                          <div className="text-2xl font-bold font-display text-slate-900">
                            {leetcodeData.contestsParticipated}
                          </div>
                          <span className="text-xs text-slate-400">Participated</span>
                        </div>
                      </div>

                      {/* Difficulty Breakdown */}
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-slate-600" /> Difficulty Breakdown
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold text-emerald-600">Easy</span>
                              <span className="text-sm font-bold text-slate-900">{leetcodeData.easySolved}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-full rounded-full" 
                                style={{ width: `${leetcodeData.totalSolved > 0 ? (leetcodeData.easySolved / leetcodeData.totalSolved) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold text-amber-600">Medium</span>
                              <span className="text-sm font-bold text-slate-900">{leetcodeData.mediumSolved}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-amber-500 h-full rounded-full" 
                                style={{ width: `${leetcodeData.totalSolved > 0 ? (leetcodeData.mediumSolved / leetcodeData.totalSolved) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold text-rose-600">Hard</span>
                              <span className="text-sm font-bold text-slate-900">{leetcodeData.hardSolved}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-rose-500 h-full rounded-full" 
                                style={{ width: `${leetcodeData.totalSolved > 0 ? (leetcodeData.hardSolved / leetcodeData.totalSolved) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contest Rating History & Recent Activity (2-column layout) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Rating History */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 text-orange-500" /> Contest History ({leetcodeData.ratingHistory.length})
                            </span>
                            <span className="text-slate-400 font-normal">Recent ratings</span>
                          </h3>
                          {leetcodeData.ratingHistory.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-6 text-center">No contest rating history yet.</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {leetcodeData.ratingHistory.slice(-8).reverse().map((c, idx) => (
                                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                  <div>
                                    <div className="font-semibold text-slate-900">{c.contestTitle}</div>
                                    <div className="text-slate-400">Rank: #{c.ranking}</div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-indigo-600 text-sm">{c.rating}</span>
                                    <span className="block text-slate-400 text-2xs">Rating</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-blue-500" /> Recent Submissions
                            </span>
                            <span className="text-slate-400 font-normal">Latest activity</span>
                          </h3>
                          {leetcodeData.recentActivity.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-6 text-center">No recent submissions found.</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {leetcodeData.recentActivity.slice(0, 8).map((sub, idx) => (
                                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                  <div className="truncate pr-2">
                                    <div className="font-semibold text-slate-900 truncate">{sub.title}</div>
                                    <div className="text-slate-400 text-2xs">{sub.lang} • {formatRelativeTime(sub.timestamp)}</div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-2xs font-bold shrink-0 ${
                                    sub.status.toLowerCase().includes("accepted")
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}>
                                    {sub.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CodeChef Platform Card */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      CC
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">CodeChef Profile</h2>
                        {codechefData?.available ? (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {connectedProfiles.codechef ? `@${connectedProfiles.codechef}` : "Not connected"}
                      </span>
                    </div>
                  </div>

                  {connectedProfiles.codechef && (
                    <a
                      href={`https://www.codechef.com/users/${connectedProfiles.codechef}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                    >
                      View on CodeChef <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="p-6">
                  {!codechefData || !codechefData.available ? (
                    <div className="p-6 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-bold text-amber-900">CodeChef Statistics Unavailable</h3>
                        <p className="text-xs text-amber-700 mt-1">
                          {codechefData?.error || "CodeChef profile not connected or restricted. Please verify your handle or check back shortly."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Metric KPIs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-500" /> Current Rating
                          </div>
                          <div className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                            {codechefData.rating ?? "-"}
                            {codechefData.stars > 0 && (
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold">
                                {codechefData.stars}★
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            Highest: {codechefData.highestRating || "-"}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-blue-500" /> Global Rank
                          </div>
                          <div className="text-2xl font-bold font-display text-slate-900">
                            {codechefData.globalRank ? codechefData.globalRank : "-"}
                          </div>
                          <span className="text-xs text-slate-400">
                            Country Rank: {codechefData.countryRank || "-"}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-indigo-500" /> Total Solved
                          </div>
                          <div className="text-2xl font-bold font-display text-slate-900">
                            {codechefData.totalSolved}
                          </div>
                          <span className="text-xs text-slate-400">Fully solved</span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" /> Contests
                          </div>
                          <div className="text-2xl font-bold font-display text-slate-900">
                            {codechefData.contestsParticipated}
                          </div>
                          <span className="text-xs text-slate-400">Participated</span>
                        </div>
                      </div>

                      {/* Contest Rating History & Recent Activity */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Rating History */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 text-amber-600" /> Contest History ({codechefData.ratingHistory.length})
                            </span>
                            <span className="text-slate-400 font-normal">Recent contests</span>
                          </h3>
                          {codechefData.ratingHistory.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-6 text-center">No contest history recorded.</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {codechefData.ratingHistory.slice(-8).reverse().map((c, idx) => (
                                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                  <div>
                                    <div className="font-semibold text-slate-900 truncate max-w-xs">{c.contestName || c.contestCode}</div>
                                    <div className="text-slate-400">Rank: #{c.ranking} • {c.date}</div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-amber-600 text-sm">{c.rating}</span>
                                    <span className="block text-slate-400 text-2xs">Rating</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-blue-500" /> Recent Submissions
                            </span>
                            <span className="text-slate-400 font-normal">Latest submissions</span>
                          </h3>
                          {codechefData.recentActivity.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-6 text-center">No recent submissions found.</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {codechefData.recentActivity.slice(0, 8).map((sub, idx) => (
                                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                  <div className="truncate pr-2">
                                    <div className="font-semibold text-slate-900 truncate">
                                      {sub.problemUrl ? (
                                        <a href={sub.problemUrl} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 flex items-center gap-1">
                                          {sub.problemName} <ExternalLink className="w-3 h-3" />
                                        </a>
                                      ) : sub.problemName}
                                    </div>
                                    <div className="text-slate-400 text-2xs">{sub.lang} • {sub.time}</div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-2xs font-bold shrink-0 ${
                                    sub.status.toLowerCase().includes("accepted") || sub.status.includes("100")
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}>
                                    {sub.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DSA VS CP COMPARISON */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Performance Analysis
            </div>
            <h2 className="text-xl font-bold font-display">Planned DSA Roadmap vs Actual CP Performance</h2>
            <p className="text-sm text-indigo-200 mt-1 max-w-2xl">
              PlacementOS maintains complete separation between your guided roadmap study tasks and live competitive platform submissions to measure preparation depth against contest readiness.
            </p>
          </div>

          {comparisonLoading ? (
            <div className="flex justify-center py-24 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
          ) : !comparisonData ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              Unable to load comparison analytics. Please connect your profiles first.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Insight Banner */}
              <div className="p-4 px-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                <p className="text-sm text-indigo-900 font-medium">
                  {comparisonData.insights.summary}
                </p>
              </div>

              {/* Side-by-side KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Planned DSA Progress */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Planned DSA Preparation</h3>
                        <span className="text-xs text-slate-400">Curriculum sheets & daily tasks</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold text-xs rounded-lg border border-blue-100">
                      Internal Sheet
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Problems Solved (DSA Sheet)</span>
                      <span className="text-lg font-bold text-slate-900">{comparisonData.plannedDSA.problemsSolved}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Problems Attempted</span>
                      <span className="text-lg font-bold text-slate-900">{comparisonData.plannedDSA.problemsAttempted}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Planned Tasks Completed</span>
                      <span className="text-lg font-bold text-slate-900">
                        {comparisonData.plannedDSA.tasksCompleted} / {comparisonData.plannedDSA.totalTasksPlanned}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Mistakes & Weak Topics Logged</span>
                      <span className="text-lg font-bold text-rose-600">{comparisonData.plannedDSA.mistakesLogged}</span>
                    </div>
                  </div>
                </div>

                {/* Actual CP Performance */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Actual CP Performance</h3>
                        <span className="text-xs text-slate-400">LeetCode + CodeChef Live Data</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold text-xs rounded-lg border border-amber-100">
                      Live Verified
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Total Competitive Solved</span>
                      <span className="text-lg font-bold text-indigo-600">{comparisonData.actualCP.totalCPSolved}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">LeetCode Solved</span>
                      <span className="text-lg font-bold text-slate-900">
                        {comparisonData.actualCP.leetcode.available ? comparisonData.actualCP.leetcode.solved : "Unavailable"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">CodeChef Solved</span>
                      <span className="text-lg font-bold text-slate-900">
                        {comparisonData.actualCP.codechef.available ? comparisonData.actualCP.codechef.solved : "Unavailable"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Total Live Contests Participated</span>
                      <span className="text-lg font-bold text-amber-600">{comparisonData.actualCP.totalContestsParticipated}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Comparison Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-600" />
                  Problem Solving Distribution Comparison
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Easy Problems</span>
                    <div className="text-sm text-slate-600 mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Planned Sheet:</span>
                        <span className="font-semibold text-slate-900">{comparisonData.plannedDSA.byDifficulty?.Easy || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>LeetCode Solved:</span>
                        <span className="font-semibold text-slate-900">{comparisonData.actualCP.leetcode.easy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">Medium Problems</span>
                    <div className="text-sm text-slate-600 mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Planned Sheet:</span>
                        <span className="font-semibold text-slate-900">{comparisonData.plannedDSA.byDifficulty?.Medium || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>LeetCode Solved:</span>
                        <span className="font-semibold text-slate-900">{comparisonData.actualCP.leetcode.medium}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block mb-1">Hard Problems</span>
                    <div className="text-sm text-slate-600 mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Planned Sheet:</span>
                        <span className="font-semibold text-slate-900">{comparisonData.plannedDSA.byDifficulty?.Hard || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>LeetCode Solved:</span>
                        <span className="font-semibold text-slate-900">{comparisonData.actualCP.leetcode.hard}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MANUAL CONTEST JOURNAL & MISTAKES */}
      {activeTab === "manual" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Manual Contest Records & Post-Mortem Analysis</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Log contest notes, failed problems, and weaknesses. PlacementOS turns mistakes into scheduled DSA revision tasks.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Record Contest
            </button>
          </div>

          {manualLoading ? (
            <div className="flex justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
          ) : manualContests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">No manual contests recorded yet</h2>
              <p className="text-slate-500 max-w-md mb-6 text-sm">
                Record your contest experiences, mistakes, and weak topics to generate automatic revision schedules.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Record First Contest
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {manualContests.map((contest) => {
                const ratingChange = (contest.ratingAfter !== undefined && contest.ratingBefore !== undefined) 
                  ? (contest.ratingAfter ?? 0) - (contest.ratingBefore ?? 0)
                  : null;
                
                return (
                  <div key={contest.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:shadow-md">
                    <div className="p-5">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getPlatformColor(contest.platform)}`}>
                              {contest.platform}
                            </span>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {new Date(contest.contestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                            {contest.contestUrl && (
                              <a href={contest.contestUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 p-1">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Code2 className="w-3.5 h-3.5" /> Solved
                              </div>
                              <div className="text-lg font-bold text-slate-900">
                                <span className="text-indigo-600">{contest.problemsSolved}</span> <span className="text-sm font-medium text-slate-400">/ {contest.problemsAttempted}</span>
                              </div>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" /> Rank
                              </div>
                              <div className="text-lg font-bold text-slate-900">
                                {contest.rank ? `#${contest.rank}` : "-"}
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5" /> Rating
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold text-slate-900">
                                  {contest.ratingAfter || contest.ratingBefore || "-"}
                                </div>
                                {ratingChange !== null && ratingChange !== 0 && (
                                  <div className={`flex items-center text-xs font-bold ${ratingChange > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {ratingChange > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                    {Math.abs(ratingChange)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {contest.notes && (
                            <div className="mt-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <strong className="text-slate-800">Notes:</strong> {contest.notes}
                            </div>
                          )}
                        </div>

                        <div className="w-full lg:w-72 flex flex-col gap-3 lg:border-l lg:border-slate-100 lg:pl-5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                              Mistakes & Weaknesses
                            </h3>
                            <button
                              onClick={() => {
                                setActiveContestId(contest.id);
                                setIsMistakeModalOpen(true);
                              }}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1"
                            >
                              + Add Mistake
                            </button>
                          </div>

                          {(!contest.mistakes || contest.mistakes.length === 0) ? (
                            <div className="bg-slate-50 rounded-xl p-4 text-center border border-dashed border-slate-200">
                              <p className="text-xs text-slate-500">No mistakes logged yet.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {contest.mistakes.map((m) => (
                                <div key={m.id} className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-lg text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-rose-900">{m.problemName}</span>
                                    <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-medium text-2xs">
                                      {m.topic}
                                    </span>
                                  </div>
                                  {m.description && <p className="text-slate-600 mt-1 text-2xs line-clamp-2">{m.description}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONNECT HANDLES MODAL */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-600" /> Connect Competitive Profiles
              </h2>
              <button onClick={() => setIsConnectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 mb-5 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Privacy Guaranteed:</strong> Enter only your public profile usernames. PlacementOS does not ask for or store any platform passwords.
              </div>
            </div>

            {connectMsg && (
              <div className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
                connectMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                {connectMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {connectMsg.text}
              </div>
            )}

            <form onSubmit={handleConnectProfiles} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  LeetCode Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">@</span>
                  <input
                    type="text"
                    placeholder="e.g. neal_wu or tourist"
                    value={connectHandles.leetcode}
                    onChange={(e) => setConnectHandles({ ...connectHandles, leetcode: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  CodeChef Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">@</span>
                  <input
                    type="text"
                    placeholder="e.g. tourist or chef"
                    value={connectHandles.codechef}
                    onChange={(e) => setConnectHandles({ ...connectHandles, codechef: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  {connecting ? "Connecting..." : "Save & Sync"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MANUAL CONTEST MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Record Contest Result</h2>
            <form onSubmit={handleCreateContest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Platform</label>
                  <select
                    value={newContest.platform}
                    onChange={(e) => setNewContest({ ...newContest, platform: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="LeetCode">LeetCode</option>
                    <option value="CodeChef">CodeChef</option>
                    <option value="Codeforces">Codeforces</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newContest.contestDate}
                    onChange={(e) => setNewContest({ ...newContest, contestDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contest URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newContest.contestUrl}
                  onChange={(e) => setNewContest({ ...newContest, contestUrl: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Problems Attempted</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newContest.problemsAttempted}
                    onChange={(e) => setNewContest({ ...newContest, problemsAttempted: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Problems Solved</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newContest.problemsSolved}
                    onChange={(e) => setNewContest({ ...newContest, problemsSolved: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rank</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1500"
                    value={newContest.rank}
                    onChange={(e) => setNewContest({ ...newContest, rank: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rating Before</label>
                  <input
                    type="number"
                    placeholder="e.g. 1750"
                    value={newContest.ratingBefore}
                    onChange={(e) => setNewContest({ ...newContest, ratingBefore: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rating After</label>
                  <input
                    type="number"
                    placeholder="e.g. 1780"
                    value={newContest.ratingAfter}
                    onChange={(e) => setNewContest({ ...newContest, ratingAfter: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contest Notes</label>
                <textarea
                  placeholder="How was the contest? Any technical roadblocks or time management issues?"
                  value={newContest.notes}
                  onChange={(e) => setNewContest({ ...newContest, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm h-20"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Save Contest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD MISTAKE MODAL */}
      {isMistakeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Record Post-Contest Mistake</h2>
            <p className="text-xs text-slate-500 mb-4">
              Saving a mistake automatically schedules a high-priority DSA revision task for tomorrow.
            </p>
            <form onSubmit={handleAddMistake} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Problem Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph Valid Tree"
                  value={newMistake.problemName}
                  onChange={(e) => setNewMistake({ ...newMistake, problemName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Topic Requiring Revision</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graphs, Dynamic Programming, Segment Trees"
                  value={newMistake.topic}
                  onChange={(e) => setNewMistake({ ...newMistake, topic: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mistake Breakdown</label>
                <textarea
                  placeholder="What went wrong? Missed edge cases? TLE? Off-by-one error?"
                  value={newMistake.description}
                  onChange={(e) => setNewMistake({ ...newMistake, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm h-24"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsMistakeModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Save & Schedule Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
