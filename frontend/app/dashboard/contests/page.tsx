"use client";

import { useEffect, useState, useRef } from "react";
import api from "../../../lib/api";
import { 
  Trophy, 
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
  ShieldCheck,
  Sparkles,
  Timer,
  Play,
  Maximize2,
  Minimize2,
  Terminal,
  Send,
  RotateCcw,
  Clock,
  Target,
  Award,
  Zap,
  Check,
  Copy,
  Info,
  ChevronRight,
  Lock,
  Unlock,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  Type,
  FileCode,
  CornerDownRight
} from "lucide-react";

type SupportedLanguage = "python" | "cpp" | "c" | "java";

interface TestCase {
  input: string;
  output: string;
  explanation?: string;
}

interface GeneratedProblem {
  id: string; // 'p1', 'p2', 'p3'
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  targetMinutes: number;
  points: number;
  topic: string;
  pattern: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: Array<{
    input: string;
    output: string;
    explanation: string;
  }>;
  publicTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  starterTemplates: {
    python: string;
    cpp: string;
    c: string;
    java: string;
  };
}

interface ContestSubmission {
  id: string;
  problemId: string;
  language: SupportedLanguage;
  code: string;
  verdict: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error" | "Compilation Error";
  passedCases: number;
  totalCases: number;
  runtimeMs: number;
  submittedAt: string;
}

interface AIContest {
  id: string;
  contestNumber: number;
  title: string;
  createdAt: string;
  startedAt?: string;
  endsAt?: string;
  finishedAt?: string;
  disqualifiedAt?: string;
  disqualificationReason?: string | null;
  status: "ready" | "in_progress" | "completed" | "disqualified";
  durationMinutes: number;
  totalDurationSeconds: number;
  currentProblemIndex?: number;
  problemDurations?: number[]; // [20, 30, 40]
  problemStartedAt?: string | null;
  fullscreenExits?: number;
  contestLeaves?: number;
  analysis: {
    identifiedTopics: string[];
    focusWeaknesses: string[];
    summary: string;
    dsaPlannerProblems: any[];
    leetcodeProblems: any[];
    codechefProblems: any[];
  };
  problems: GeneratedProblem[];
  submissions: ContestSubmission[];
  solvedProblemIds: string[];
  timeTakenPerProblem: Record<string, number | null>;
  totalScore: number;
  performance?: {
    problemsSolved: number;
    totalProblems: number;
    contestScore: number;
    accuracy: number;
    totalSubmissions: number;
    totalTimeTakenMinutes: number;
    difficultyPerformance: Record<string, { solved: boolean; attempts: number; timeTaken: number | null }>;
    topicsMastered: string[];
    weaknesses: string[];
    finishedAt: string;
  };
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
  const [activeTab, setActiveTab] = useState<"arena" | "cp" | "comparison">("arena");

  // AI Contest Arena States
  const [aiContests, setAiContests] = useState<AIContest[]>([]);
  const [loadingContests, setLoadingContests] = useState(true);
  const [isGeneratingContest, setIsGeneratingContest] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  // Fullscreen Arena Active Contest State
  const [activeContest, setActiveContest] = useState<AIContest | null>(null);
  const [isFullscreenArenaOpen, setIsFullscreenArenaOpen] = useState(false);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0); // 0: Easy (20m), 1: Medium (30m), 2: Hard (40m)
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>("python");
  const [codePerProblem, setCodePerProblem] = useState<Record<string, Record<SupportedLanguage, string>>>({});
  
  // Strict Fixed Timing States
  // Problem Allocations: Easy: 20m (1200s), Medium: 30m (1800s), Hard: 40m (2400s)
  const PROBLEM_TIME_ALLOCATIONS = [20 * 60, 30 * 60, 40 * 60];
  const [problemTimeRemaining, setProblemTimeRemaining] = useState<number>(1200);
  const [overallTimeRemaining, setOverallTimeRemaining] = useState<number>(5400); // 90 min = 5400s
  const arenaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-Malpractice & Fullscreen Tracking States
  const [fullscreenExits, setFullscreenExits] = useState<number>(0);
  const [contestLeaves, setContestLeaves] = useState<number>(0);
  const [showFullscreenWarningModal, setShowFullscreenWarningModal] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualificationReason, setDisqualificationReason] = useState<string>("");
  const [showAdvanceConfirmModal, setShowAdvanceConfirmModal] = useState(false);

  // Code Editor UI States
  const [editorFontSize, setEditorFontSize] = useState<number>(14);
  const [cursorPosition, setCursorPosition] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);

  // Runner & Submissions State in Arena
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [runResults, setRunResults] = useState<{
    results: any[];
    overallStatus: string;
  } | null>(null);
  const [submissionVerdict, setSubmissionVerdict] = useState<{
    verdict: string;
    passedCases: number;
    totalCases: number;
    message?: string;
  } | null>(null);
  const [consoleTab, setConsoleTab] = useState<"cases" | "output">("cases");
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);

  // Post-Contest Review Modal
  const [reviewContest, setReviewContest] = useState<AIContest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

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

  // Fetch AI Contests
  const fetchAIContests = async () => {
    try {
      setLoadingContests(true);
      const res = await api.get("/contests/ai");
      setAiContests(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch AI contests:", err);
    } finally {
      setLoadingContests(false);
    }
  };

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
      setConnectMsg({ type: "success", text: "Competitive profiles successfully connected and synchronized!" });
      setTimeout(() => {
        setIsConnectModalOpen(false);
        setConnectMsg(null);
      }, 1500);
    } catch (error: any) {
      setConnectMsg({ type: "error", text: error.response?.data?.message || "Failed to connect profiles. Please check your usernames." });
    } finally {
      setConnecting(false);
    }
  };

  // Fetch Comparison
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

  useEffect(() => {
    fetchAIContests();
    fetchCPStats();
  }, []);

  useEffect(() => {
    if (activeTab === "comparison") {
      fetchComparison();
    }
  }, [activeTab]);

  // Generate a new AI contest with multi-step synthesis indicator
  const handleGenerateContest = async () => {
    setIsGeneratingContest(true);
    setGenerationStep(1);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1200);

    try {
      const res = await api.post("/contests/ai/generate");
      const createdContest = res.data.data;
      setAiContests([createdContest, ...aiContests]);
      clearInterval(stepInterval);
      setGenerationStep(4);
      setTimeout(() => {
        setIsGeneratingContest(false);
        setGenerationStep(0);
        enterContestArena(createdContest);
      }, 1000);
    } catch (err) {
      clearInterval(stepInterval);
      setIsGeneratingContest(false);
      setGenerationStep(0);
      console.error("Contest generation failed:", err);
      alert("Failed to generate AI contest. Please check backend connection.");
    }
  };

  // Launch Dedicated Fullscreen Contest Arena
  const enterContestArena = async (contest: AIContest) => {
    if (contest.status === "disqualified") {
      setIsDisqualified(true);
      setDisqualificationReason(contest.disqualificationReason || "Contest disqualified due to malpractice.");
      setActiveContest(contest);
      setIsFullscreenArenaOpen(true);
      return;
    }

    setActiveContest(contest);
    const pIdx = contest.currentProblemIndex ?? 0;
    setCurrentProblemIndex(pIdx);
    setProblemTimeRemaining(PROBLEM_TIME_ALLOCATIONS[pIdx] || 1200);
    setFullscreenExits(contest.fullscreenExits || 0);
    setContestLeaves(contest.contestLeaves || 0);
    setIsDisqualified(false);
    setRunResults(null);
    setSubmissionVerdict(null);
    setConsoleTab("cases");

    // Initialize code buffers with problem starter templates
    const initialCode: Record<string, Record<SupportedLanguage, string>> = {};
    (contest.problems || []).forEach((p) => {
      initialCode[p.id] = {
        python: p.starterTemplates?.python || "# Python solution",
        cpp: p.starterTemplates?.cpp || "// C++ solution",
        c: p.starterTemplates?.c || "// C solution",
        java: p.starterTemplates?.java || "// Java solution"
      };
    });
    setCodePerProblem(initialCode);

    // Call start endpoint or track re-entry
    try {
      const res = await api.post(`/contests/ai/${contest.id}/start`);
      setActiveContest(res.data.data);
      if (res.data.data.status === "disqualified") {
        setIsDisqualified(true);
        setDisqualificationReason(res.data.data.disqualificationReason || "Disqualified");
      }
    } catch (e) {
      console.error("Failed to start contest session:", e);
    }

    setIsFullscreenArenaOpen(true);

    // Mandatory Fullscreen Mode Trigger
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request requires user gesture, prompting user:", err);
      setShowFullscreenWarningModal(true);
    }
  };

  // Anti-Malpractice: Detect Fullscreen Exit
  useEffect(() => {
    const handleFullscreenChange = async () => {
      if (isFullscreenArenaOpen && activeContest && activeContest.status === "in_progress" && !isDisqualified) {
        if (!document.fullscreenElement) {
          // User exited fullscreen!
          const nextExits = fullscreenExits + 1;
          setFullscreenExits(nextExits);

          try {
            const res = await api.post(`/contests/ai/${activeContest.id}/malpractice`, {
              violationType: "fullscreen_exit"
            });
            const data = res.data.data;
            if (data.isDisqualified) {
              setIsDisqualified(true);
              setDisqualificationReason(data.disqualificationReason);
              setActiveContest((prev) => prev ? { ...prev, status: "disqualified" } : null);
            } else {
              setShowFullscreenWarningModal(true);
            }
          } catch (e) {
            console.error("Failed to record malpractice:", e);
          }
        } else {
          setShowFullscreenWarningModal(false);
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isFullscreenArenaOpen, activeContest?.id, activeContest?.status, fullscreenExits, isDisqualified]);

  // Anti-Malpractice: Detect Window/Tab Departure (Max 3 entries/exits within 90 mins)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (isFullscreenArenaOpen && activeContest && activeContest.status === "in_progress" && !isDisqualified) {
        if (document.hidden) {
          const nextLeaves = contestLeaves + 1;
          setContestLeaves(nextLeaves);

          try {
            const res = await api.post(`/contests/ai/${activeContest.id}/malpractice`, {
              violationType: "contest_leave"
            });
            const data = res.data.data;
            if (data.isDisqualified) {
              setIsDisqualified(true);
              setDisqualificationReason(data.disqualificationReason);
              setActiveContest((prev) => prev ? { ...prev, status: "disqualified" } : null);
            }
          } catch (e) {
            console.error("Failed to record contest leave:", e);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isFullscreenArenaOpen, activeContest?.id, activeContest?.status, contestLeaves, isDisqualified]);

  // Mandatory Fullscreen Re-entry handler
  const handleReEnterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setShowFullscreenWarningModal(false);
    } catch (e) {
      console.error("Failed to re-enter fullscreen:", e);
    }
  };

  // Fixed Problem Timer & Overall Contest Timer Countdown
  useEffect(() => {
    if (isFullscreenArenaOpen && activeContest && activeContest.status === "in_progress" && !isDisqualified) {
      arenaTimerRef.current = setInterval(() => {
        setOverallTimeRemaining((prevOverall) => {
          if (prevOverall <= 1) {
            clearInterval(arenaTimerRef.current!);
            handleFinishContest();
            return 0;
          }
          return prevOverall - 1;
        });

        setProblemTimeRemaining((prevProb) => {
          if (prevProb <= 1) {
            // Problem fixed time has elapsed! Automatically advance to next problem
            handleAutoAdvanceProblem();
            return 0;
          }
          return prevProb - 1;
        });
      }, 1000);
    }

    return () => {
      if (arenaTimerRef.current) clearInterval(arenaTimerRef.current);
    };
  }, [isFullscreenArenaOpen, activeContest?.id, activeContest?.status, currentProblemIndex, isDisqualified]);

  // Format seconds to MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Advance sequentially to next problem (Easy -> Medium -> Hard)
  const handleAdvanceProblem = async () => {
    if (!activeContest) return;
    if (currentProblemIndex >= 2) {
      // Reached Hard problem end -> Finish contest
      handleFinishContest();
      return;
    }

    const nextIdx = currentProblemIndex + 1;
    try {
      await api.post(`/contests/ai/${activeContest.id}/advance`);
      setCurrentProblemIndex(nextIdx);
      setProblemTimeRemaining(PROBLEM_TIME_ALLOCATIONS[nextIdx]);
      setRunResults(null);
      setSubmissionVerdict(null);
      setConsoleTab("cases");
      setShowAdvanceConfirmModal(false);
    } catch (e) {
      console.error("Failed to advance problem:", e);
    }
  };

  // Auto-advance when current problem's allocated timer reaches 00:00
  const handleAutoAdvanceProblem = async () => {
    if (currentProblemIndex < 2) {
      await handleAdvanceProblem();
    } else {
      await handleFinishContest();
    }
  };

  // Run Code against public test cases
  const handleRunCode = async () => {
    if (!activeContest || isDisqualified) return;
    const currentProblem = activeContest.problems[currentProblemIndex];
    if (!currentProblem) return;

    const currentCode = codePerProblem[currentProblem.id]?.[activeLanguage] || "";
    setIsRunningCode(true);
    setConsoleTab("output");
    setSubmissionVerdict(null);

    try {
      const res = await api.post("/contests/ai/run-code", {
        language: activeLanguage,
        code: currentCode,
        testCases: currentProblem.publicTestCases
      });
      setRunResults(res.data.data);
    } catch (err: any) {
      console.error("Failed to run code:", err);
      setRunResults({
        results: [],
        overallStatus: "Runtime Error"
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // Submit Problem in Sandbox
  const handleProblemSubmit = async () => {
    if (!activeContest || isDisqualified) return;
    const currentProblem = activeContest.problems[currentProblemIndex];
    if (!currentProblem) return;

    const currentCode = codePerProblem[currentProblem.id]?.[activeLanguage] || "";
    setIsSubmittingCode(true);
    setConsoleTab("output");
    setRunResults(null);

    try {
      const res = await api.post(`/contests/ai/${activeContest.id}/submit`, {
        problemId: currentProblem.id,
        language: activeLanguage,
        code: currentCode
      });
      const data = res.data.data;
      setSubmissionVerdict({
        verdict: data.verdict,
        passedCases: data.passedCases,
        totalCases: data.totalCases,
        message: data.verdict === "Accepted" ? "All test cases passed!" : `Failed on testcase ${data.passedCases + 1}`
      });

      // Update contest state locally
      setActiveContest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totalScore: data.totalScore,
          solvedProblemIds: data.solvedProblemIds,
          submissions: [...(prev.submissions || []), data.submission]
        };
      });

      fetchAIContests();
    } catch (err: any) {
      console.error("Failed to submit problem:", err);
      setSubmissionVerdict({
        verdict: "Runtime Error",
        passedCases: 0,
        totalCases: 0,
        message: err.response?.data?.message || "Submission failed"
      });
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Finish Contest & Show Review Report
  const handleFinishContest = async () => {
    if (!activeContest) return;

    try {
      const res = await api.post(`/contests/ai/${activeContest.id}/finish`);
      const finished = res.data.data;
      setActiveContest(finished);
      setReviewContest(finished);
      setIsFullscreenArenaOpen(false);
      setIsReviewModalOpen(true);
      fetchAIContests();

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {
      console.error("Failed to finish contest:", e);
    }
  };

  // Reset starter code
  const handleResetStarterCode = () => {
    if (!activeContest) return;
    const currentProblem = activeContest.problems[currentProblemIndex];
    if (!currentProblem) return;

    const template = currentProblem.starterTemplates?.[activeLanguage] || "";
    setCodePerProblem({
      ...codePerProblem,
      [currentProblem.id]: {
        ...codePerProblem[currentProblem.id],
        [activeLanguage]: template
      }
    });
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!activeContest) return;
    const currentProblem = activeContest.problems[currentProblemIndex];
    const code = codePerProblem[currentProblem?.id]?.[activeLanguage] || "";
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Format code / Indent cleaner
  const handleFormatCode = () => {
    if (!activeContest) return;
    const currentProblem = activeContest.problems[currentProblemIndex];
    const code = codePerProblem[currentProblem?.id]?.[activeLanguage] || "";
    const lines = code.split("\n");
    const formatted = lines.map((l) => l.trimEnd()).join("\n");
    setCodePerProblem({
      ...codePerProblem,
      [currentProblem.id]: {
        ...codePerProblem[currentProblem.id],
        [activeLanguage]: formatted
      }
    });
  };

  // Synchronized line numbers scrolling
  const handleEditorScroll = () => {
    if (editorTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editorTextareaRef.current.scrollTop;
    }
  };

  // Update cursor position on keyup / click
  const updateCursorPos = () => {
    if (editorTextareaRef.current) {
      const pos = editorTextareaRef.current.selectionStart;
      const text = editorTextareaRef.current.value.substring(0, pos);
      const lines = text.split("\n");
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      setCursorPosition({ line, col });
    }
  };

  const currentProblem = activeContest?.problems?.[currentProblemIndex];
  const isCurrentProblemSolved = activeContest && currentProblem && activeContest.solvedProblemIds?.includes(currentProblem.id);
  const currentProblemCode = currentProblem ? (codePerProblem[currentProblem.id]?.[activeLanguage] || "") : "";
  const totalEditorLines = Math.max(25, currentProblemCode.split("\n").length);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display text-slate-900">Competitive Programming Arena</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Anti-Malpractice Active
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              90-minute contests with mandatory fullscreen enforcement and sequential fixed problem timings (Easy 20m, Medium 30m, Hard 40m).
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("arena")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${
            activeTab === "arena"
              ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          AI Contest Arena (Phase 5)
        </button>
        <button
          onClick={() => setActiveTab("cp")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${
            activeTab === "cp"
              ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-indigo-600" />
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
      </div>

      {/* TAB 1: AI CONTEST ARENA */}
      {activeTab === "arena" && (
        <div className="space-y-6">
          {/* Hero Banner: Generate Contest */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-8 text-white border border-indigo-900/40 shadow-xl">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                  Strict Anti-Malpractice Rules Active
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  90-Minute Sequential Contest Arena
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Synthesized from your <strong>last 5 DSA Planner</strong>, <strong>5 LeetCode</strong>, and <strong>5 CodeChef</strong> items. 
                  Enforces <strong>mandatory fullscreen mode</strong> (max 3 exits allowed) and <strong>sequential fixed timing</strong>:
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Problem 1: Easy (20 min fixed)
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-amber-500/30 text-amber-400 text-xs font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Problem 2: Medium (30 min fixed)
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    Problem 3: Hard (40 min fixed)
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                <button
                  onClick={handleGenerateContest}
                  disabled={isGeneratingContest}
                  className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-60 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2.5 active:scale-95"
                >
                  <Sparkles className={`w-5 h-5 ${isGeneratingContest ? "animate-spin" : ""}`} />
                  {isGeneratingContest ? "Synthesizing Practice..." : "Generate Fresh Contest"}
                </button>
              </div>
            </div>

            {/* AI Generation Step Indicator */}
            {isGeneratingContest && (
              <div className="mt-6 pt-6 border-t border-slate-800/80 animate-in fade-in">
                <div className="text-xs font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  Generating Personalized 3-Problem Set...
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className={`p-2.5 rounded-xl border ${generationStep >= 1 ? "bg-indigo-900/40 border-indigo-500/50 text-indigo-200" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
                    1. Analyzing last 5 DSA Planner items
                  </div>
                  <div className={`p-2.5 rounded-xl border ${generationStep >= 2 ? "bg-indigo-900/40 border-indigo-500/50 text-indigo-200" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
                    2. Analyzing last 5 LeetCode solves
                  </div>
                  <div className={`p-2.5 rounded-xl border ${generationStep >= 3 ? "bg-indigo-900/40 border-indigo-500/50 text-indigo-200" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
                    3. Analyzing last 5 CodeChef solves
                  </div>
                  <div className={`p-2.5 rounded-xl border ${generationStep >= 4 ? "bg-emerald-900/40 border-emerald-500/50 text-emerald-200" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
                    4. Synthesizing 3 original problems
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Aggregate Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Contests Generated
              </span>
              <div className="text-2xl font-black text-slate-900">{aiContests.length}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Completed
              </span>
              <div className="text-2xl font-black text-indigo-600">
                {aiContests.filter((c) => c.status === "completed").length}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Problems Solved
              </span>
              <div className="text-2xl font-black text-emerald-600">
                {aiContests.reduce((acc, c) => acc + (c.solvedProblemIds?.length || 0), 0)}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Highest Score
              </span>
              <div className="text-2xl font-black text-amber-600">
                {aiContests.length > 0 ? Math.max(0, ...aiContests.map((c) => c.totalScore || 0)) : 0} <span className="text-xs font-normal text-slate-400">/ 600</span>
              </div>
            </div>
          </div>

          {/* Active / In-Progress Contest Spotlight */}
          {aiContests.find((c) => c.status !== "completed") && (
            <div className="bg-white rounded-3xl border-2 border-indigo-200 p-6 shadow-md shadow-indigo-100/50 space-y-4">
              {(() => {
                const current = aiContests.find((c) => c.status !== "completed")!;
                const isDisq = current.status === "disqualified";
                return (
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          #{current.contestNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">{current.title}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isDisq
                                ? "bg-rose-100 text-rose-800"
                                : current.status === "in_progress"
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {isDisq ? "Disqualified (Malpractice)" : current.status === "in_progress" ? "In Progress" : "Ready to Start"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{current.analysis?.summary}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => enterContestArena(current)}
                        className={`px-5 py-2.5 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 ${
                          isDisq ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                      >
                        <Play className="w-4 h-4 fill-white" />
                        {isDisq ? "View Malpractice Report" : current.status === "in_progress" ? "Resume Arena (Fullscreen)" : "Enter Fullscreen Arena"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      {(current.problems || []).map((prob, idx) => {
                        const isSolved = current.solvedProblemIds?.includes(prob.id);
                        const isCurrentActive = (current.currentProblemIndex ?? 0) === idx;
                        const isLocked = (current.currentProblemIndex ?? 0) < idx;

                        return (
                          <div
                            key={prob.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isSolved
                                ? "bg-emerald-50/60 border-emerald-200"
                                : isCurrentActive
                                ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20"
                                : isLocked
                                ? "bg-slate-50/50 border-slate-200 opacity-70"
                                : "bg-slate-50/80 border-slate-200"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                prob.difficulty === "Easy"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : prob.difficulty === "Medium"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {prob.difficulty} · {prob.targetMinutes}m
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                                <span className="text-xs font-bold text-slate-700">{prob.points} pts</span>
                              </div>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{prob.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">Topic: {prob.topic}</p>
                            <div className="mt-3 flex justify-between items-center text-xs">
                              <span className="text-slate-400">Pattern: {prob.pattern}</span>
                              {isSolved ? (
                                <span className="font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Solved
                                </span>
                              ) : isCurrentActive ? (
                                <span className="font-bold text-indigo-600 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> Active
                                </span>
                              ) : (
                                <span className="text-slate-400 text-2xs">
                                  {isLocked ? "Unlocks Next" : "Locked"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Past Contests List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">AI Contest History & Integrity Logs</h3>
                <p className="text-xs text-slate-500">
                  Review historical scores, difficulty-wise accuracy, and adaptive feedback used in future contests.
                </p>
              </div>
            </div>

            {loadingContests ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
            ) : aiContests.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center">
                  <Award className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">No AI contests generated yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click &ldquo;Generate Fresh Contest&rdquo; above to create your first 90-minute competition synthesized directly from your DSA Planner, LeetCode, and CodeChef progress.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {aiContests.map((contest) => {
                  const isCompleted = contest.status === "completed";
                  const isDisq = contest.status === "disqualified";

                  return (
                    <div
                      key={contest.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-all shadow-xs"
                    >
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-black text-slate-900 text-base">{contest.title}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isDisq
                                ? "bg-rose-100 text-rose-800"
                                : isCompleted
                                ? "bg-slate-100 text-slate-700"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {isDisq ? "Disqualified (Malpractice)" : isCompleted ? "Completed" : "Active"}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(contest.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                            <div>
                              Score: <strong className="text-indigo-600">{contest.totalScore} / 600</strong>
                            </div>
                            <div>
                              Solved: <strong>{contest.solvedProblemIds?.length || 0} / 3</strong>
                            </div>
                            <div>
                              Accuracy: <strong>{contest.performance?.accuracy ?? 0}%</strong>
                            </div>
                            <div>
                              Exits: <strong>{contest.fullscreenExits || 0} / 3</strong>
                            </div>
                            <div>
                              Leaves: <strong>{contest.contestLeaves || 0} / 3</strong>
                            </div>
                          </div>

                          {/* Identified Weaknesses Badges */}
                          {contest.performance?.weaknesses && contest.performance.weaknesses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {contest.performance.weaknesses.slice(0, 2).map((weakness, wIdx) => (
                                <span
                                  key={wIdx}
                                  className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-2xs font-medium"
                                >
                                  {weakness}
                                </span>
                              ))}
                            </div>
                          )}

                          {isDisq && (
                            <div className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 pt-1">
                              <AlertTriangle className="w-4 h-4" />
                              Reason: {contest.disqualificationReason}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {isCompleted ? (
                            <button
                              onClick={() => {
                                setReviewContest(contest);
                                setIsReviewModalOpen(true);
                              }}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                            >
                              <BarChart2 className="w-4 h-4 text-slate-500" />
                              Performance Report
                            </button>
                          ) : (
                            <button
                              onClick={() => enterContestArena(contest)}
                              className={`px-4 py-2 font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                                isDisq
                                  ? "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              }`}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              {isDisq ? "Review Incident" : "Enter Arena"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE CP SYNC (LEETCODE & CODECHEF) */}
      {activeTab === "cp" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Competitive Programming Sync</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time rating tracking, recent contest performances, and solve statistics synchronized directly from LeetCode and CodeChef.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Synced: <strong>{formatRelativeTime(lastSyncedAt)}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LeetCode Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center font-bold text-orange-600 text-lg">
                    LC
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">LeetCode</h3>
                    <span className="text-xs text-slate-400">
                      {connectedProfiles.leetcode ? `@${connectedProfiles.leetcode}` : "Not connected"}
                    </span>
                  </div>
                </div>
                {connectedProfiles.leetcode && (
                  <a
                    href={`https://leetcode.com/${connectedProfiles.leetcode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {leetcodeData?.available ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-2xs font-bold text-slate-400 uppercase">Contest Rating</span>
                      <div className="text-lg font-black text-slate-900">{leetcodeData.contestRating ? Math.round(leetcodeData.contestRating) : "Unrated"}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-2xs font-bold text-slate-400 uppercase">Global Rank</span>
                      <div className="text-lg font-black text-slate-900">{leetcodeData.globalContestRanking ? `#${leetcodeData.globalContestRanking}` : "-"}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-2xs font-bold text-slate-400 uppercase">Total Solved</span>
                      <div className="text-lg font-black text-indigo-600">{leetcodeData.totalSolved}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 font-semibold">
                      Easy: {leetcodeData.easySolved}
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-800 font-semibold">
                      Medium: {leetcodeData.mediumSolved}
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50 text-rose-800 font-semibold">
                      Hard: {leetcodeData.hardSolved}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Recent Solved Submissions</h4>
                    <div className="space-y-1.5">
                      {(leetcodeData.recentActivity || []).slice(0, 5).map((act, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 text-xs">
                          <span className="font-semibold text-slate-800 line-clamp-1">{act.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800 uppercase">
                            {act.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <p className="text-xs text-slate-500">Connect your LeetCode profile handle to synchronize live stats.</p>
                  <button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Connect LeetCode
                  </button>
                </div>
              )}
            </div>

            {/* CodeChef Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center font-bold text-amber-700 text-lg">
                    CC
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">CodeChef</h3>
                    <span className="text-xs text-slate-400">
                      {connectedProfiles.codechef ? `@${connectedProfiles.codechef}` : "Not connected"}
                    </span>
                  </div>
                </div>
                {connectedProfiles.codechef && (
                  <a
                    href={`https://www.codechef.com/users/${connectedProfiles.codechef}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {codechefData?.available ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-2xs font-bold text-slate-400 uppercase">Rating & Stars</span>
                      <div className="text-lg font-black text-slate-900">
                        {codechefData.rating || "Unrated"} {codechefData.stars > 0 && <span className="text-amber-500">★{codechefData.stars}</span>}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-2xs font-bold text-slate-400 uppercase">Global Rank</span>
                      <div className="text-lg font-black text-slate-900">{codechefData.globalRank ? `#${codechefData.globalRank}` : "-"}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-2xs font-bold text-slate-400 uppercase">Total Solved</span>
                      <div className="text-lg font-black text-indigo-600">{codechefData.totalSolved}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Recent Solved Submissions</h4>
                    <div className="space-y-1.5">
                      {(codechefData.recentActivity || []).slice(0, 5).map((act, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 text-xs">
                          <span className="font-semibold text-slate-800 line-clamp-1">{act.problemName}</span>
                          <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800 uppercase">
                            {act.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <p className="text-xs text-slate-500">Connect your CodeChef handle to synchronize live rating and submissions.</p>
                  <button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Connect CodeChef
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPARISON (DSA ROADMAP VS CP) */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Roadmap Curriculum vs Live CP Performance</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cross-analyze planned placement curriculum milestones against verified competitive programming records.
              </p>
            </div>
            <button
              onClick={fetchComparison}
              disabled={comparisonLoading}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${comparisonLoading ? "animate-spin" : ""}`} />
              Refresh Analytics
            </button>
          </div>

          {comparisonLoading || !comparisonData ? (
            <div className="flex justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-indigo-900 mb-1">Consistency & Sync Diagnosis</h4>
                  <p className="text-xs text-indigo-800 leading-relaxed">{comparisonData.insights.summary}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Planned DSA Sheet Progress</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Problems Solved in Tracker</span>
                      <span className="text-lg font-bold text-indigo-600">{comparisonData.plannedDSA.problemsSolved}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Planned Tasks Completed</span>
                      <span className="text-lg font-bold text-slate-900">
                        {comparisonData.plannedDSA.tasksCompleted} / {comparisonData.plannedDSA.totalTasksPlanned}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-slate-900">Actual Competitive Performance</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Total Competitive Solved</span>
                      <span className="text-lg font-bold text-indigo-600">{comparisonData.actualCP.totalCPSolved}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-semibold text-slate-500">Total Live Contests</span>
                      <span className="text-lg font-bold text-amber-600">{comparisonData.actualCP.totalContestsParticipated}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN CONTEST ARENA MODAL (DEDICATED FULLSCREEN INTERFACE) */}
      {isFullscreenArenaOpen && activeContest && currentProblem && (
        <div className="fixed inset-0 z-50 bg-[#0c1017] text-slate-100 flex flex-col font-sans select-none overflow-hidden animate-in fade-in">
          {/* Header Bar */}
          <div className="h-14 bg-[#111722] border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-indigo-600/30">
                OS
              </div>
              <div>
                <span className="font-bold text-sm text-white">{activeContest.title}</span>
                <span className="text-xs text-slate-400 ml-2 hidden sm:inline">
                  Score: <strong className="text-indigo-400">{activeContest.totalScore} pts</strong>
                </span>
              </div>
            </div>

            {/* Problem Progression Pills (Strictly Sequential - No arbitrary switching!) */}
            <div className="flex items-center gap-2">
              {(activeContest.problems || []).map((prob, idx) => {
                const isCurrentActive = currentProblemIndex === idx;
                const isPassed = currentProblemIndex > idx;
                const isSolved = activeContest.solvedProblemIds?.includes(prob.id);

                return (
                  <div
                    key={prob.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      isCurrentActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/40"
                        : isPassed
                        ? "bg-slate-800/80 text-slate-300 border border-slate-700/60"
                        : "bg-slate-900/60 text-slate-500 border border-slate-800 cursor-not-allowed"
                    }`}
                    title={
                      isCurrentActive
                        ? `Current Problem (${prob.difficulty}) - Time: ${formatTimer(problemTimeRemaining)}`
                        : isPassed
                        ? `Completed / Locked (${prob.difficulty})`
                        : `Locked. Solved in fixed sequence after previous problems.`
                    }
                  >
                    {!isCurrentActive && !isPassed && <Lock className="w-3 h-3 text-slate-500" />}
                    <span>P{idx + 1}: {prob.difficulty} ({prob.targetMinutes}m)</span>
                    {isSolved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
                  </div>
                );
              })}
            </div>

            {/* Security Guard Badges, Timers, Finish */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Malpractice Warning Counter */}
              <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                fullscreenExits > 0 ? "bg-rose-950/80 text-rose-300 border-rose-800/80" : "bg-slate-800/60 text-slate-300 border-slate-700/60"
              }`}>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Exits: <strong>{fullscreenExits}/3</strong></span>
                <span className="text-slate-500">|</span>
                <span>Leaves: <strong>{contestLeaves}/3</strong></span>
              </div>

              {/* Problem Fixed Timer */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black border bg-indigo-950/70 text-indigo-300 border-indigo-800/80 shadow-xs">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{currentProblem.difficulty}: {formatTimer(problemTimeRemaining)}</span>
              </div>

              {/* Total 90m Timer */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black border ${
                overallTimeRemaining < 600
                  ? "bg-rose-950 text-rose-300 border-rose-800 animate-pulse"
                  : "bg-slate-800 text-emerald-400 border-slate-700"
              }`}>
                <Timer className="w-3.5 h-3.5" />
                <span>Total: {formatTimer(overallTimeRemaining)}</span>
              </div>

              <button
                onClick={handleFinishContest}
                className="px-3.5 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
              >
                Finish Contest
              </button>
            </div>
          </div>

          {/* Disqualification / Malpractice Screen */}
          {isDisqualified ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-950 border-2 border-rose-600 text-rose-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-950">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-rose-400">Contest Terminated — Malpractice Disqualification</h2>
              <p className="text-slate-300 max-w-lg text-sm leading-relaxed">
                {disqualificationReason || "You have exceeded the permitted limit of fullscreen exits (> 3) or contest leaves. This session has been closed to preserve fair competition."}
              </p>
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs max-w-md">
                <strong>Recorded Infractions:</strong> {fullscreenExits} Fullscreen Exits · {contestLeaves} Contest Departures.
              </div>
              <button
                onClick={() => {
                  setIsFullscreenArenaOpen(false);
                  fetchAIContests();
                }}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Exit Contest Arena
              </button>
            </div>
          ) : (
            /* Main Workspace (Split View) */
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: Problem Statement & Examples */}
              <div className="w-full lg:w-1/2 border-r border-slate-800/80 flex flex-col bg-[#0e131d] overflow-y-auto p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                      currentProblem.difficulty === "Easy"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : currentProblem.difficulty === "Medium"
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}>
                      {currentProblem.difficulty} · {currentProblem.targetMinutes} Mins Allocated
                    </span>
                    <span className="text-xs text-slate-400">Points: <strong>{currentProblem.points}</strong></span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs">
                      {currentProblem.topic}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white">{currentProblem.title}</h2>
                  <div className="text-xs text-indigo-400 font-semibold mt-1">
                    Target Pattern: {currentProblem.pattern}
                  </div>
                </div>

                {/* Description */}
                <div className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">
                  {currentProblem.description}
                </div>

                {/* Input & Output Format */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Input Format</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-line font-mono">{currentProblem.inputFormat}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Output Format</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-line font-mono">{currentProblem.outputFormat}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Constraints</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-line font-mono">{currentProblem.constraints}</p>
                  </div>
                </div>

                {/* Examples */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Examples</h4>
                  {(currentProblem.examples || []).map((ex, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-indigo-400">Example {idx + 1}</span>
                      <div>
                        <span className="text-slate-500 font-bold block mb-0.5">Input:</span>
                        <pre className="p-2 rounded-lg bg-slate-900 font-mono text-emerald-300 overflow-x-auto">{ex.input}</pre>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block mb-0.5">Output:</span>
                        <pre className="p-2 rounded-lg bg-slate-900 font-mono text-amber-300 overflow-x-auto">{ex.output}</pre>
                      </div>
                      {ex.explanation && (
                        <p className="text-slate-400 text-xs italic">
                          <strong>Explanation:</strong> {ex.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Code Editor & Sandboxed Runner */}
              <div className="w-full lg:w-1/2 flex flex-col bg-[#0b0f17]">
                {/* Redesigned Code Editor Toolbar */}
                <div className="h-11 bg-[#121824] border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                      <FileCode className="w-4 h-4 text-indigo-400" />
                      <span>solution.{activeLanguage === "python" ? "py" : activeLanguage === "cpp" ? "cpp" : activeLanguage === "c" ? "c" : "java"}</span>
                    </div>

                    <select
                      value={activeLanguage}
                      onChange={(e) => setActiveLanguage(e.target.value as SupportedLanguage)}
                      className="bg-slate-800/90 border border-slate-700 text-white rounded-lg text-xs py-1 px-2.5 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="python">🐍 Python 3.10</option>
                      <option value="cpp">⚡ C++ (g++ 17)</option>
                      <option value="c">🔷 C (gcc)</option>
                      <option value="java">☕ Java 21 (OpenJDK)</option>
                    </select>

                    {isCurrentProblemSolved && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-2xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Solved
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Font Size Adjuster */}
                    <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 text-2xs text-slate-300 border border-slate-700/60">
                      <button
                        onClick={() => setEditorFontSize(Math.max(12, editorFontSize - 1))}
                        className="px-1.5 py-0.5 hover:text-white"
                        title="Decrease font size"
                      >
                        A-
                      </button>
                      <span className="px-1 text-slate-500 font-mono">{editorFontSize}px</span>
                      <button
                        onClick={() => setEditorFontSize(Math.min(18, editorFontSize + 1))}
                        className="px-1.5 py-0.5 hover:text-white"
                        title="Increase font size"
                      >
                        A+
                      </button>
                    </div>

                    <button
                      onClick={handleFormatCode}
                      className="px-2 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1"
                      title="Format indentation"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Format
                    </button>

                    <button
                      onClick={handleResetStarterCode}
                      className="px-2 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1"
                      title="Reset to starter template"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>

                    <button
                      onClick={handleCopyCode}
                      className="px-2 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1"
                    >
                      {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Professional Code Editor Surface with Synchronized Line Numbers */}
                <div className="flex-1 relative flex overflow-hidden bg-[#0c1017]">
                  {/* Line Numbers Gutter */}
                  <div
                    ref={lineNumbersRef}
                    className="w-12 select-none bg-[#0a0d14] text-slate-600 font-mono text-right pr-3 pt-4 border-r border-slate-800/60 overflow-hidden"
                    style={{ fontSize: `${editorFontSize}px`, lineHeight: "1.6" }}
                  >
                    {Array.from({ length: totalEditorLines }, (_, i) => i + 1).map((lineNum) => (
                      <div
                        key={lineNum}
                        className={`${cursorPosition.line === lineNum ? "text-indigo-400 font-bold" : ""}`}
                      >
                        {lineNum}
                      </div>
                    ))}
                  </div>

                  {/* Interactive Textarea Canvas */}
                  <div className="flex-1 relative h-full">
                    <textarea
                      ref={editorTextareaRef}
                      value={codePerProblem[currentProblem.id]?.[activeLanguage] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCodePerProblem({
                          ...codePerProblem,
                          [currentProblem.id]: {
                            ...codePerProblem[currentProblem.id],
                            [activeLanguage]: val
                          }
                        });
                        updateCursorPos();
                      }}
                      onScroll={handleEditorScroll}
                      onKeyUp={updateCursorPos}
                      onClick={updateCursorPos}
                      onKeyDown={(e) => {
                        if (e.key === "Tab") {
                          e.preventDefault();
                          const target = e.target as HTMLTextAreaElement;
                          const start = target.selectionStart;
                          const end = target.selectionEnd;
                          const currentVal = target.value;
                          const newVal = currentVal.substring(0, start) + "    " + currentVal.substring(end);
                          setCodePerProblem({
                            ...codePerProblem,
                            [currentProblem.id]: {
                              ...codePerProblem[currentProblem.id],
                              [activeLanguage]: newVal
                            }
                          });
                          setTimeout(() => {
                            target.selectionStart = target.selectionEnd = start + 4;
                            updateCursorPos();
                          }, 0);
                        } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                          e.preventDefault();
                          handleRunCode();
                        }
                      }}
                      className="w-full h-full p-4 bg-[#0c1017] text-slate-100 font-mono leading-relaxed focus:outline-none resize-none selection:bg-indigo-600/40"
                      style={{ fontSize: `${editorFontSize}px`, lineHeight: "1.6" }}
                      spellCheck={false}
                    />
                  </div>
                </div>

                {/* Editor Status Bar (Ln/Col, Encoding, Sandbox Info) */}
                <div className="h-6 bg-[#0a0d14] border-t border-slate-800/80 px-4 flex items-center justify-between text-2xs text-slate-400 font-mono shrink-0">
                  <div className="flex items-center gap-4">
                    <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
                    <span>Spaces: 4</span>
                    <span>UTF-8</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Sandbox Ready (3.0s Timeout)
                    </span>
                    <span className="text-slate-500">Ctrl+Enter to Run</span>
                  </div>
                </div>

                {/* Test Console & Execution Tabs */}
                <div className="h-64 border-t border-slate-800/80 bg-[#0e131d] flex flex-col shrink-0">
                  <div className="h-10 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-[#121824]">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setConsoleTab("cases")}
                        className={`text-xs font-bold py-1 px-2.5 rounded-lg transition-colors ${
                          consoleTab === "cases"
                            ? "bg-slate-800 text-indigo-400"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Public Test Cases
                      </button>
                      <button
                        onClick={() => setConsoleTab("output")}
                        className={`text-xs font-bold py-1 px-2.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          consoleTab === "output"
                            ? "bg-slate-800 text-indigo-400"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        Execution Console
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRunCode}
                        disabled={isRunningCode || isSubmittingCode}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-slate-200" />
                        {isRunningCode ? "Running..." : "Run Code"}
                      </button>
                      <button
                        onClick={handleProblemSubmit}
                        disabled={isSubmittingCode || isRunningCode}
                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/40 flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Send className="w-3 h-3" />
                        {isSubmittingCode ? "Submitting..." : "Submit Problem"}
                      </button>

                      {currentProblemIndex < 2 && (
                        <button
                          onClick={() => setShowAdvanceConfirmModal(true)}
                          className="px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                          title="Advance to next problem (locks current problem)"
                        >
                          <span>Next</span>
                          <CornerDownRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Console Content */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
                    {consoleTab === "cases" && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          {(currentProblem.publicTestCases || []).map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedTestCaseIndex(idx)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                selectedTestCaseIndex === idx
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              Case {idx + 1}
                            </button>
                          ))}
                        </div>

                        {currentProblem.publicTestCases?.[selectedTestCaseIndex] && (
                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-500 font-bold block mb-1">Input:</span>
                              <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
                                {currentProblem.publicTestCases[selectedTestCaseIndex].input}
                              </pre>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold block mb-1">Expected Output:</span>
                              <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
                                {currentProblem.publicTestCases[selectedTestCaseIndex].output}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {consoleTab === "output" && (
                      <div className="space-y-3">
                        {/* Submission Verdict Banner */}
                        {submissionVerdict && (
                          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                            submissionVerdict.verdict === "Accepted"
                              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                              : submissionVerdict.verdict === "Wrong Answer"
                              ? "bg-rose-950/80 border-rose-800 text-rose-300"
                              : submissionVerdict.verdict === "Time Limit Exceeded"
                              ? "bg-amber-950/80 border-amber-800 text-amber-300"
                              : "bg-red-950/80 border-red-800 text-red-300"
                          }`}>
                            <div className="flex items-center gap-2">
                              {submissionVerdict.verdict === "Accepted" ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-400" />
                              )}
                              <div>
                                <strong className="text-sm font-black">{submissionVerdict.verdict}</strong>
                                <p className="text-xs opacity-90 mt-0.5">{submissionVerdict.message}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold">
                              {submissionVerdict.passedCases} / {submissionVerdict.totalCases} Passed
                            </span>
                          </div>
                        )}

                        {/* Run Code Public Testcases Output */}
                        {runResults && (
                          <div className="space-y-3">
                            <div className={`px-3 py-1.5 rounded-lg font-bold text-xs inline-block ${
                              runResults.overallStatus === "Accepted"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-rose-950 text-rose-400 border border-rose-800"
                            }`}>
                              Verdict: {runResults.overallStatus}
                            </div>

                            <div className="space-y-2">
                              {runResults.results.map((res: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-indigo-400">Test Case {idx + 1}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-500 text-2xs">{res.executionTimeMs}ms</span>
                                      <span className={`px-2 py-0.5 rounded text-2xs font-bold ${
                                        res.status === "Accepted"
                                          ? "bg-emerald-900 text-emerald-300"
                                          : "bg-rose-900 text-rose-300"
                                      }`}>
                                        {res.status}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-2xs">
                                    <div>
                                      <span className="text-slate-500 block">Expected:</span>
                                      <pre className="text-emerald-400 bg-slate-900 p-1.5 rounded overflow-x-auto">{res.expectedOutput}</pre>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Actual:</span>
                                      <pre className="text-slate-200 bg-slate-900 p-1.5 rounded overflow-x-auto">{res.actualOutput || "(empty)"}</pre>
                                    </div>
                                  </div>
                                  {res.errorSnippet && (
                                    <div className="text-rose-400 text-2xs pt-1">
                                      Error: {res.errorSnippet}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!submissionVerdict && !runResults && (
                          <div className="text-slate-500 text-center py-6">
                            Click &ldquo;Run Code&rdquo; (Ctrl+Enter) to evaluate public test cases, or &ldquo;Submit Problem&rdquo; to test all cases in the sandbox runner.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Urgent Fullscreen Violation Warning Modal */}
          {showFullscreenWarningModal && !isDisqualified && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 border-2 border-rose-600 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
                <div className="w-16 h-16 bg-rose-950 text-rose-400 border border-rose-800 rounded-2xl mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-rose-400">MALPRACTICE WARNING: FULLSCREEN EXITED</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Warning <strong>{fullscreenExits} of 3</strong>: You must remain in fullscreen mode throughout the contest. 
                  Exiting fullscreen more than 3 times will immediately terminate your session and mark your contest as <strong>Malpractice Disqualified</strong>.
                </p>
                <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-900 text-2xs text-rose-300">
                  Remaining Fullscreen Violations Allowed: <strong>{Math.max(0, 3 - fullscreenExits)}</strong>
                </div>
                <button
                  onClick={handleReEnterFullscreen}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
                >
                  Re-Enter Fullscreen Mode (Mandatory)
                </button>
              </div>
            </div>
          )}

          {/* Advance Problem Confirmation Modal */}
          {showAdvanceConfirmModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
                <div className="w-14 h-14 bg-indigo-950 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center">
                  <CornerDownRight className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Advance to Next Problem?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Advancing will permanently <strong>lock Problem {currentProblemIndex + 1} ({currentProblem.difficulty})</strong>. 
                  You will NOT be able to switch back or submit further solutions for this problem.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAdvanceConfirmModal(false)}
                    className="flex-1 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Cancel & Continue Working
                  </button>
                  <button
                    onClick={handleAdvanceProblem}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    Confirm & Lock
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POST-CONTEST REVIEW REPORT MODAL */}
      {isReviewModalOpen && reviewContest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Contest Complete!</h2>
              <p className="text-xs text-slate-500">
                PlacementOS has analyzed your submissions, time usage, and difficulty-wise accuracy to adapt your future contests.
              </p>
            </div>

            {/* Score & Solved Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <span className="text-2xs font-bold text-indigo-700 uppercase">Final Score</span>
                <div className="text-2xl font-black text-indigo-900">
                  {reviewContest.totalScore} <span className="text-xs font-normal text-slate-500">/ 600</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-2xs font-bold text-emerald-700 uppercase">Problems Solved</span>
                <div className="text-2xl font-black text-emerald-900">
                  {reviewContest.solvedProblemIds?.length || 0} / 3
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <span className="text-2xs font-bold text-amber-700 uppercase">Accuracy</span>
                <div className="text-2xl font-black text-amber-900">
                  {reviewContest.performance?.accuracy ?? 0}%
                </div>
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Difficulty Breakdown</h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {["Easy", "Medium", "Hard"].map((diff) => {
                  const prob = reviewContest.problems?.find((p) => p.difficulty === diff);
                  const isSolved = prob && reviewContest.solvedProblemIds?.includes(prob.id);
                  const timeTaken = prob ? reviewContest.timeTakenPerProblem?.[prob.id] : null;

                  return (
                    <div key={diff} className={`p-3.5 rounded-xl border text-center ${
                      isSolved ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                    }`}>
                      <span className="font-bold text-slate-900 block">{diff}</span>
                      <span className={`text-xs font-bold block my-1 ${isSolved ? "text-emerald-700" : "text-slate-400"}`}>
                        {isSolved ? "Solved" : "Unsolved"}
                      </span>
                      {timeTaken && <span className="text-2xs text-slate-500">{timeTaken} mins</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Integrity / Anti-Malpractice Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Contest Integrity Status:
              </span>
              <span className="font-bold text-slate-800">
                {reviewContest.fullscreenExits || 0} Exits · {reviewContest.contestLeaves || 0} Leaves (Within Threshold)
              </span>
            </div>

            {/* Identified Weaknesses & Future AI Adaptations */}
            {reviewContest.performance?.weaknesses && reviewContest.performance.weaknesses.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 space-y-2">
                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Identified Weaknesses & Target Areas
                </h4>
                <ul className="space-y-1 text-xs text-rose-800">
                  {reviewContest.performance.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-2xs text-rose-700 pt-1 italic">
                  💡 This performance data has been stored and will automatically be used to challenge you with tailored problems in your next AI-generated contest!
                </p>
              </div>
            )}

            <button
              onClick={() => setIsReviewModalOpen(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
            >
              Return to Contests Arena
            </button>
          </div>
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
                <strong>Privacy Guaranteed:</strong> Enter only your public profile usernames. PlacementOS does not ask for or store passwords.
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
    </div>
  );
}
