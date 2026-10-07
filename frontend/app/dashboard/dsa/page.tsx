"use client";

import { useEffect, useState } from "react";
import api from "../../../lib/api";
import {
  CheckCircle2,
  Circle,
  Clock,
  Target,
  AlertTriangle,
  RotateCcw,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Search,
  Filter,
  Code,
  FileText,
  Mic,
} from "lucide-react";

interface UserAttempt {
  solved: boolean;
  attemptCount: number;
  timeTaken?: number;
  understandingLevel: number;
  hintUsed?: boolean;
  editorialUsed?: boolean;
  failureReason?: string;
  revisionCount: number;
  revisitStatus: boolean;
  nextRevisionDate?: string;
  lastAttemptedAt?: string;
  code?: string;
  approach?: string;
  mediaUrl?: string;
}

interface DSAProblem {
  id: string;
  topic: string;
  section: string;
  name: string;
  leetcodeNo: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  userAttempt: UserAttempt | null;
}

export default function DSAPage() {
  const [problems, setProblems] = useState<DSAProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTopic, setActiveTopic] = useState<string>("All");
  const [expandedTopic, setExpandedTopic] = useState<string | null>("Arrays");
  const [selectedProblem, setSelectedProblem] = useState<DSAProblem | null>(null);
  const [codeModalProblem, setCodeModalProblem] = useState<DSAProblem | null>(null);
  const [approachModalProblem, setApproachModalProblem] = useState<DSAProblem | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Reset Solved Count Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetError, setResetError] = useState("");
  const [resettingAll, setResettingAll] = useState(false);

  // Attempt Form State
  const [solved, setSolved] = useState(true);
  const [timeTaken, setTimeTaken] = useState("");
  const [understanding, setUnderstanding] = useState(5);
  const [hintUsed, setHintUsed] = useState(false);
  const [editorialUsed, setEditorialUsed] = useState(false);
  const [code, setCode] = useState("");
  const [approach, setApproach] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Set initial states when opening modals
  useEffect(() => {
    const activeProblem = selectedProblem || codeModalProblem || approachModalProblem;
    if (activeProblem?.userAttempt) {
      setSolved(activeProblem.userAttempt.solved);
      setTimeTaken(activeProblem.userAttempt.timeTaken?.toString() || "");
      setUnderstanding(activeProblem.userAttempt.understandingLevel || 5);
      setHintUsed(activeProblem.userAttempt.hintUsed || false);
      setEditorialUsed(activeProblem.userAttempt.editorialUsed || false);
      setCode(activeProblem.userAttempt.code || "");
      setApproach(activeProblem.userAttempt.approach || "");
      setMediaUrl(activeProblem.userAttempt.mediaUrl || "");
    } else if (activeProblem) {
      setSolved(true);
      setTimeTaken("");
      setUnderstanding(5);
      setHintUsed(false);
      setEditorialUsed(false);
      setCode("");
      setApproach("");
      setMediaUrl("");
    }
  }, [selectedProblem, codeModalProblem, approachModalProblem]);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const res = await api.get("/dsa/problems");
      if (res.data.success) {
        // Sort by topic then section
        const sorted = res.data.data.sort((a: DSAProblem, b: DSAProblem) => {
          if (a.topic === b.topic) return a.section.localeCompare(b.section);
          return a.topic.localeCompare(b.topic);
        });
        setProblems(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAttempt = async (targetProblem: DSAProblem | null = selectedProblem, isPartialUpdate = false) => {
    if (!targetProblem) return;
    setSubmitting(true);
    try {
      let payload;
      
      if (isPartialUpdate && targetProblem.userAttempt) {
        // When saving code or approach, preserve the existing attempt stats
        payload = {
          solved: targetProblem.userAttempt.solved,
          understandingLevel: targetProblem.userAttempt.understandingLevel,
          timeTaken: targetProblem.userAttempt.timeTaken,
          hintUsed: targetProblem.userAttempt.hintUsed,
          editorialUsed: targetProblem.userAttempt.editorialUsed,
          code,
          approach,
          mediaUrl
        };
      } else {
        payload = {
          solved,
          understandingLevel: understanding,
          timeTaken: timeTaken ? Number(timeTaken) : undefined,
          hintUsed,
          editorialUsed,
          code,
          approach,
          mediaUrl
        };
      }

      const res = await api.post(
        `/dsa/problems/${targetProblem.id}/attempt`,
        payload,
      );

      if (res.data.success) {
        setProblems((prev) =>
          prev.map((p) =>
            p.id === targetProblem.id
              ? { ...p, userAttempt: res.data.data }
              : p,
          ),
        );
        setSelectedProblem(null);
        setCodeModalProblem(null);
        setApproachModalProblem(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setApproach((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
  };

  const handleResetAttempt = async (problemId: string) => {
    if (!confirm("Are you sure you want to reset your progress for this problem?")) return;
    try {
      const res = await api.delete(`/dsa/problems/${problemId}/attempt`);
      if (res.data.success) {
        setProblems((prev) =>
          prev.map((p) =>
            p.id === problemId
              ? { ...p, userAttempt: null }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAllProblems = async () => {
    if (resetConfirmText.trim().toLowerCase() !== "confirm") {
      setResetError("Please type 'confirm' to proceed.");
      return;
    }

    setResettingAll(true);
    setResetError("");
    try {
      const res = await api.delete("/dsa/problems/reset-all");
      if (res.data.success) {
        setProblems((prev) =>
          prev.map((p) => ({
            ...p,
            userAttempt: null,
          }))
        );
        setResetModalOpen(false);
        setResetConfirmText("");
      } else {
        setResetError(res.data.message || "Failed to reset. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setResetError(err.response?.data?.message || "Failed to reset. Please try again.");
    } finally {
      setResettingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Derive stats
  const totalSolved = problems.filter((p) => p.userAttempt?.solved).length;
  const needRevision = problems.filter(
    (p) =>
      p.userAttempt?.nextRevisionDate &&
      new Date(p.userAttempt.nextRevisionDate) <= new Date(),
  ).length;

  const topics = Array.from(new Set(problems.map((p) => p.topic)));
  const filteredProblems = problems.filter((p) => {
    if (activeTopic !== "All" && p.topic !== activeTopic) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const groupedProblems = filteredProblems.reduce(
    (acc, problem) => {
      if (!acc[problem.topic]) acc[problem.topic] = [];
      acc[problem.topic].push(problem);
      return acc;
    },
    {} as Record<string, DSAProblem[]>,
  );

  const getDifficultyColor = (diff: string) => {
    if (diff === "Easy")
      return "text-emerald-600 bg-emerald-50 ring-emerald-500/20";
    if (diff === "Medium")
      return "text-amber-600 bg-amber-50 ring-amber-500/20";
    if (diff === "Hard") return "text-rose-600 bg-rose-50 ring-rose-500/20";
    return "text-slate-600 bg-slate-50 ring-slate-500/20";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in">
      {/* Premium Header & Stats */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-10 shadow-xl border border-slate-800">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-center">
          <div className="w-full md:w-auto text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-4">
              <Zap className="w-4 h-4 text-indigo-400" />
              Spaced Repetition
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-white mb-2">
              DSA Revision Engine
            </h1>
            <p className="text-slate-300 max-w-xl text-sm md:text-base leading-relaxed mx-auto md:mx-0">
              Master core patterns, track your understanding iteratively, and let the smart algorithm dictate your daily review schedule.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
            {/* Stats Row */}
            <div className="flex gap-3 w-full">
              {/* Solved Stat */}
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center backdrop-blur-sm min-w-[120px]">
                <CheckSquare className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-3xl font-bold font-display text-white">{totalSolved}</p>
                <p className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-widest mt-0.5">Solved</p>
              </div>
              
              {/* Due Review Stat */}
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative backdrop-blur-sm min-w-[120px]">
                {needRevision > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                )}
                <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-3xl font-bold font-display text-white">{needRevision}</p>
                <p className="text-[10px] text-amber-300/80 font-bold uppercase tracking-widest mt-0.5">Due Review</p>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setResetModalOpen(true);
                setResetConfirmText("");
                setResetError("");
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-rose-600 font-bold transition-all shadow-sm active:scale-95 w-full"
              title="Reset solved count to zero"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Reset Count</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={activeTopic}
            onChange={(e) => setActiveTopic(e.target.value)}
            className="pl-9 pr-8 py-2 appearance-none bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
          >
            <option value="All">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Problem List */}
      <div className="space-y-4">
        {Object.entries(groupedProblems).map(([topicName, topicProblems]) => {
          const isExpanded = expandedTopic === topicName || search !== "";
          const solvedInTopic = topicProblems.filter(
            (p) => p.userAttempt?.solved,
          ).length;

          return (
            <div
              key={topicName}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setExpandedTopic(isExpanded ? null : topicName)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                  <h3 className="font-bold text-lg text-slate-800">
                    {topicName}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200/50 text-slate-600 text-xs font-semibold">
                    {solvedInTopic} / {topicProblems.length}
                  </span>
                </div>

                {/* Mini progress bar */}
                <div className="w-32 h-2 rounded-full bg-slate-200 hidden sm:block">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{
                      width: `${(solvedInTopic / topicProblems.length) * 100}%`,
                    }}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {topicProblems.map((problem) => {
                    const isDue =
                      problem.userAttempt?.nextRevisionDate &&
                      new Date(problem.userAttempt.nextRevisionDate) <=
                        new Date();
                    const isSolved = problem.userAttempt?.solved;

                    return (
                      <div
                        key={problem.id}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => setSelectedProblem(problem)}
                            className={`mt-1 flex-shrink-0 transition-colors ${isSolved ? "text-emerald-500" : "text-slate-300 hover:text-indigo-400"}`}
                          >
                            {isSolved ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ring-1 ring-inset ${getDifficultyColor(problem.difficulty)}`}
                              >
                                {problem.difficulty}
                              </span>
                              {problem.leetcodeNo && (
                                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                  LC-{problem.leetcodeNo}
                                </span>
                              )}
                              {isDue && (
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-500/20">
                                  <Clock className="w-3 h-3" /> Due Review
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-slate-800 text-base flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                              {problem.name}
                              {problem.leetcodeNo && (
                                <a
                                  href={`https://leetcode.com/problems/${problem.name.toLowerCase().replace(/ /g, "-")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Section: {problem.section}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:ml-auto pl-9 sm:pl-0">
                          {problem.userAttempt && (
                            <div className="flex items-center text-xs text-slate-500">
                              <span
                                title={`Attempts: ${problem.userAttempt.attemptCount}`}
                                className="flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                              >
                                <Target className="w-3.5 h-3.5 text-slate-400" />
                                {problem.userAttempt.attemptCount}
                              </span>
                            </div>
                          )}
                          {problem.userAttempt && (
                            <>
                              <button
                                onClick={() => setCodeModalProblem(problem)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Code Solution"
                              >
                                <Code className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setApproachModalProblem(problem)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Approach & Notes"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleResetAttempt(problem.id)}
                                className="text-xs text-rose-500 hover:text-rose-600 font-medium ml-1"
                              >
                                Reset
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedProblem(problem)}
                            className="btn-secondary py-1.5 px-4 text-xs ml-2"
                          >
                            {isSolved ? "Update" : "Log Attempt"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredProblems.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 font-medium">
              No problems found matching your criteria.
            </p>
          </div>
        )}
      </div>

      {/* Record Attempt Modal */}
      {selectedProblem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ring-1 ring-inset ${getDifficultyColor(selectedProblem.difficulty)}`}
                >
                  {selectedProblem.difficulty}
                </span>
                <span className="text-xs text-slate-500 font-semibold uppercase">
                  {selectedProblem.topic}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {selectedProblem.name}
              </h3>
            </div>

            <div className="space-y-5">
              {/* Solved Status */}
              <div className="flex gap-4">
                <label
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${solved ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
                  onClick={() => setSolved(true)}
                >
                  <CheckCircle2
                    className={`w-6 h-6 ${solved ? "text-emerald-500" : "text-slate-400"}`}
                  />
                  <span
                    className={`font-semibold text-sm ${solved ? "text-emerald-700" : "text-slate-600"}`}
                  >
                    Solved It
                  </span>
                </label>
                <label
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${!solved ? "border-rose-500 bg-rose-50" : "border-slate-200 hover:border-slate-300"}`}
                  onClick={() => setSolved(false)}
                >
                  <AlertTriangle
                    className={`w-6 h-6 ${!solved ? "text-rose-500" : "text-slate-400"}`}
                  />
                  <span
                    className={`font-semibold text-sm ${!solved ? "text-rose-700" : "text-slate-600"}`}
                  >
                    Needs Work
                  </span>
                </label>
              </div>

              {/* Time taken */}
              <div>
                <label className="label">Time Taken (minutes)</label>
                <input
                  type="number"
                  value={timeTaken}
                  onChange={(e) => setTimeTaken(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 45"
                />
              </div>

              {/* Understanding Level */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="label mb-0">Understanding Level</label>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {understanding}/5
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={understanding}
                  onChange={(e) => setUnderstanding(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase mt-1">
                  <span>Clueless</span>
                  <span>Mastered</span>
                </div>
              </div>

              {/* Assists */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hintUsed}
                    onChange={(e) => setHintUsed(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Used Hints
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editorialUsed}
                    onChange={(e) => setEditorialUsed(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Read Editorial
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  onClick={() => setSelectedProblem(null)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRecordAttempt(selectedProblem, false)}
                  disabled={submitting}
                  className="btn-primary flex-1 py-2.5"
                >
                  {submitting ? "Saving..." : "Save Attempt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Modal */}
      {codeModalProblem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Code: {codeModalProblem.name}
            </h3>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="input-field min-h-[300px] font-mono text-sm resize-y"
              placeholder="Paste your solution code here..."
              spellCheck={false}
            />
            <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setCodeModalProblem(null)}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRecordAttempt(codeModalProblem, true)}
                disabled={submitting}
                className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
              >
                <Code className="w-4 h-4" />
                {submitting ? "Saving..." : "Save Code"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approach Modal */}
      {approachModalProblem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Approach: {approachModalProblem.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="label mb-0">Approach Notes</label>
                  <button 
                    onClick={startRecording}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${isRecording ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {isRecording ? "Recording..." : "Voice to Text"}
                  </button>
                </div>
                <textarea
                  value={approach}
                  onChange={(e) => setApproach(e.target.value)}
                  className="input-field min-h-[150px] resize-y"
                  placeholder="How did you solve it? E.g., used a hash map to store frequencies... You can also paste image links here."
                />
              </div>

              <div>
                <label className="label">Media Link (Image/Drive) (Optional)</label>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="input-field"
                  placeholder="Link to an image, voice note, or drive file..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 mt-6 border-t border-slate-100">
              <button
                onClick={() => setApproachModalProblem(null)}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRecordAttempt(approachModalProblem, true)}
                disabled={submitting}
                className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {submitting ? "Saving..." : "Save Approach"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Reset Solved Count
                </h3>
                <p className="text-xs text-slate-500">
                  Permanent action • Cannot be undone
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to reset your solved count? This will reset all your problem attempts, solved status, and revision intervals back to zero.
            </p>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type <span className="font-mono text-rose-600 font-bold uppercase select-all">confirm</span> and click OK:
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Type 'confirm'"
                value={resetConfirmText}
                onChange={(e) => {
                  setResetConfirmText(e.target.value);
                  if (resetError) setResetError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && resetConfirmText.trim().toLowerCase() === "confirm") {
                    handleResetAllProblems();
                  }
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-white outline-none transition-all ${
                  resetError
                    ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                }`}
              />
              {resetError && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">
                  {resetError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmText("");
                  setResetError("");
                }}
                disabled={resettingAll}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAllProblems}
                disabled={resettingAll || resetConfirmText.trim().toLowerCase() !== "confirm"}
                className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                  resetConfirmText.trim().toLowerCase() === "confirm"
                    ? "bg-rose-600 hover:bg-rose-700 text-white hover:shadow cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {resettingAll ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "OK"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
