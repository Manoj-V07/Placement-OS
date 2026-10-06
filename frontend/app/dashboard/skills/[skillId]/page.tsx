"use client";

import { useEffect, useState, use } from "react";
import api from "../../../../lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Upload, Check, Bot, FileText, Target, X, ClipboardList, FolderOpen, CheckCircle2 } from "lucide-react";

interface Topic {
  id: string;
  skillId: string;
  name: string;
  orderIndex?: number;
  mastery: number;
  lastStudied: string | null;
  nextReview: string | null;
  studyCount: number;
  lastEvaluation?: {
    score: number;
    evaluatedAt: string;
    feedbackSummary: string;
  };
}

interface Skill {
  id: string;
  name: string;
  category: string;
  mastery: number;
  topics?: Topic[];
}

interface QuizQuestion {
  id: number;
  question: string;
  aspect: string;
}

export default function SkillRoadmapPage({
  params
}: {
  params: Promise<{ skillId: string }>;
}) {
  const resolvedParams = use(params);
  const skillId = resolvedParams.skillId;
  const router = useRouter();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual topic state
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [singleTopicName, setSingleTopicName] = useState("");
  const [savingSingle, setSavingSingle] = useState(false);

  // Bulk topic upload state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTextInput, setBulkTextInput] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkFileName, setBulkFileName] = useState("");

  // AI Topic Generator state
  const [showAiGenModal, setShowAiGenModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState<string[]>([]);
  const [selectedAiTopics, setSelectedAiTopics] = useState<Record<string, boolean>>({});
  const [aiImporting, setAiImporting] = useState(false);

  // AI Chat Evaluator state
  const [evaluatingTopic, setEvaluatingTopic] = useState<Topic | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [chatAnswers, setChatAnswers] = useState<Array<{ question: string; answer: string }>>([]);
  const [currentInputAnswer, setCurrentInputAnswer] = useState("");
  const [evaluatingLoading, setEvaluatingLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  useEffect(() => {
    fetchSkillData();
    // Record view in backend
    api.post("/skills/recent-view", { skillId }).catch(() => {});
  }, [skillId]);

  const fetchSkillData = async () => {
    try {
      const res = await api.get(`/skills/${skillId}`);
      if (res.data.success) {
        setSkill(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch skill roadmap", err);
    } finally {
      setLoading(false);
    }
  };

  // Add single topic
  const handleAddSingleTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTopicName.trim()) return;
    setSavingSingle(true);
    try {
      await api.post("/skills/topics", {
        skillId,
        name: singleTopicName.trim()
      });
      setSingleTopicName("");
      setShowAddSingle(false);
      fetchSkillData();
    } catch (err) {
      console.error("Failed to add topic", err);
    } finally {
      setSavingSingle(false);
    }
  };

  // Parse bulk text into clean array
  const parseBulkTopics = (text: string): string[] => {
    return text
      .split(/\r?\n|,/)
      .map((line) => line.replace(/^[\d+.-]+\s*/, "").trim())
      .filter((line) => line.length > 0);
  };

  const parsedBulkList = parseBulkTopics(bulkTextInput);

  // File upload for bulk upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkTextInput(content);
      }
    };
    reader.readAsText(file);
  };

  // Submit bulk topics
  const handleBulkSubmit = async () => {
    if (parsedBulkList.length === 0) return;
    setBulkSaving(true);
    try {
      await api.post(`/skills/${skillId}/topics/bulk`, {
        topics: parsedBulkList
      });
      setShowBulkModal(false);
      setBulkTextInput("");
      setBulkFileName("");
      fetchSkillData();
    } catch (err) {
      console.error("Failed to bulk upload topics", err);
    } finally {
      setBulkSaving(false);
    }
  };

  // AI Topic Generator
  const handleGenerateTopicsAI = async () => {
    if (!skill) return;
    setAiGenerating(true);
    try {
      const res = await api.post("/skills/generate-topics", {
        skillName: skill.name,
        category: skill.category
      });
      if (res.data.success) {
        const list: string[] = res.data.data.topics || [];
        setGeneratedTopics(list);
        const initialSelected: Record<string, boolean> = {};
        list.forEach((t) => (initialSelected[t] = true));
        setSelectedAiTopics(initialSelected);
      }
    } catch (err) {
      console.error("Failed to generate topics", err);
    } finally {
      setAiGenerating(false);
    }
  };

  // Import selected AI topics
  const handleImportAiTopics = async () => {
    const chosen = generatedTopics.filter((t) => selectedAiTopics[t]);
    if (chosen.length === 0) return;
    setAiImporting(true);
    try {
      await api.post(`/skills/${skillId}/topics/bulk`, {
        topics: chosen
      });
      setShowAiGenModal(false);
      setGeneratedTopics([]);
      fetchSkillData();
    } catch (err) {
      console.error("Failed to import AI topics", err);
    } finally {
      setAiImporting(false);
    }
  };

  // Start AI Chat Evaluation
  const handleStartEvaluation = async (topic: Topic) => {
    setEvaluatingTopic(topic);
    setCurrentQuestionIndex(0);
    setChatAnswers([]);
    setCurrentInputAnswer("");
    setEvaluationResult(null);
    setEvaluatingLoading(true);

    try {
      const res = await api.get(`/skills/topics/${topic.id}/quiz`);
      if (res.data.success) {
        setQuizQuestions(res.data.data.questions || []);
      }
    } catch (err) {
      console.error("Failed to get quiz questions", err);
    } finally {
      setEvaluatingLoading(false);
    }
  };

  // Submit Answer to current question in chat
  const handleSendChatAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInputAnswer.trim()) return;

    const currentQ = quizQuestions[currentQuestionIndex];
    const newAnswers = [
      ...chatAnswers,
      { question: currentQ.question, answer: currentInputAnswer.trim() }
    ];
    setChatAnswers(newAnswers);
    setCurrentInputAnswer("");

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Completed all 3 questions! Trigger AI Evaluation Scoring
      setEvaluatingLoading(true);
      try {
        const res = await api.post(`/skills/topics/${evaluatingTopic?.id}/evaluate`, {
          answers: newAnswers
        });
        if (res.data.success) {
          setEvaluationResult(res.data.data);
          fetchSkillData();
        }
      } catch (err) {
        console.error("Failed to evaluate topic answers", err);
      } finally {
        setEvaluatingLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Loading skill roadmap...</p>
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="text-center py-20 card max-w-md mx-auto">
        <h3 className="font-display font-bold text-xl text-slate-900 mb-2">Skill Not Found</h3>
        <p className="text-xs text-slate-500 mb-6">The requested skill could not be retrieved.</p>
        <Link href="/dashboard/skills" className="btn-primary py-2 px-5 text-xs font-semibold">
          ← Back to Skills
        </Link>
      </div>
    );
  }

  const topicsList = skill.topics || [];
  const completedCount = topicsList.filter((t) => t.mastery >= 80).length;
  const inProgressCount = topicsList.filter((t) => t.mastery > 0 && t.mastery < 80).length;
  const notStartedCount = topicsList.filter((t) => t.mastery === 0).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <Link
            href="/dashboard/skills"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
          >
            ← Back to All Skills
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-slate-900">{skill.name} Roadmap</h1>
            <span className="badge badge-indigo">{skill.category}</span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Order-tracking style milestone progression. Complete topics and verify with AI Evaluator quizzes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setShowAiGenModal(true);
              handleGenerateTopicsAI();
            }}
            className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
          >
            <Sparkles className="w-4 h-4" /> Generate with AI
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Bulk Upload Topics
          </button>
          <button
            onClick={() => setShowAddSingle(true)}
            className="btn-primary py-2 px-4 text-xs font-semibold shadow-xs"
          >
            + Add Topic
          </button>
        </div>
      </div>

      {/* Roadmap Summary Card */}
      <div className="card glass-card p-6 border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="sm:pr-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Overall Skill Mastery
          </span>
          <span className="font-display font-bold text-3xl text-indigo-600">{skill.mastery}%</span>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${skill.mastery}%` }} />
          </div>
        </div>

        <div className="pt-3 sm:pt-0 sm:px-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Topics</span>
          <span className="font-display font-bold text-3xl text-slate-800">{topicsList.length}</span>
          <span className="text-xs text-slate-400 mt-1 block">Syllabus milestones</span>
        </div>

        <div className="pt-3 sm:pt-0 sm:px-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Mastered (≥ 80%)
          </span>
          <span className="font-display font-bold text-3xl text-emerald-600">{completedCount}</span>
          <span className="text-xs text-slate-400 mt-1 block">Verified by AI</span>
        </div>

        <div className="pt-3 sm:pt-0 sm:pl-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">In Progress</span>
          <span className="font-display font-bold text-3xl text-amber-500">{inProgressCount}</span>
          <span className="text-xs text-slate-400 mt-1 block">{notStartedCount} not started</span>
        </div>
      </div>

      {/* ORDER-TRACKING STEPPER TIMELINE */}
      <div className="card glass-card p-6 sm:p-8 border-slate-200">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-xl text-slate-900">Milestone Stepper Roadmap</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow topics in sequential progression from foundations to interview mastery.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {completedCount} / {topicsList.length} Completed
          </span>
        </div>

        {topicsList.length > 0 ? (
          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {topicsList.map((topic, index) => {
              const isMastered = topic.mastery >= 80;
              const isInProgress = topic.mastery > 0 && topic.mastery < 80;
              const isNotStarted = topic.mastery === 0;

              return (
                <div key={topic.id} className="relative group">
                  {/* Stepper Node Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all ${
                      isMastered
                        ? "bg-emerald-500 border-white text-white shadow-md shadow-emerald-500/30"
                        : isInProgress
                        ? "bg-amber-500 border-white text-white shadow-md shadow-amber-500/30 animate-pulse"
                        : "bg-white border-slate-300 text-slate-400"
                    }`}
                  >
                    {isMastered ? <Check className="w-3 h-3 text-white stroke-[3]" /> : index + 1}
                  </div>

                  {/* Topic Card Container */}
                  <div
                    className={`p-5 rounded-2xl border transition-all ${
                      isMastered
                        ? "bg-emerald-50/20 border-emerald-200/80 shadow-xs"
                        : isInProgress
                        ? "bg-amber-50/20 border-amber-200/80 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">Step {index + 1}</span>
                          <span
                            className={`badge ${
                              isMastered
                                ? "badge-emerald"
                                : isInProgress
                                ? "badge-amber"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {isMastered ? "Mastered" : isInProgress ? "Practicing" : "Not Started"}
                          </span>
                        </div>

                        <h4 className="font-display font-bold text-lg text-slate-900">{topic.name}</h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span>
                            Mastery:{" "}
                            <strong
                              className={
                                isMastered ? "text-emerald-600" : isInProgress ? "text-amber-600" : "text-slate-600"
                              }
                            >
                              {topic.mastery}%
                            </strong>
                          </span>
                          <span>•</span>
                          <span>Studies: {topic.studyCount || 0} sessions</span>
                          {topic.lastStudied && (
                            <>
                              <span>•</span>
                              <span>Last tested: {new Date(topic.lastStudied).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action: Test with AI Evaluator */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => handleStartEvaluation(topic)}
                          className={`btn-primary py-2 px-4 text-xs font-semibold shadow-xs flex items-center gap-2 ${
                            isMastered ? "bg-slate-800 hover:bg-slate-900" : ""
                          }`}
                        >
                          <Bot className="w-4 h-4" />
                          <span>{isMastered ? "Retest with AI" : "Test with AI Evaluator"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Feedback summary if previously evaluated */}
                    {topic.lastEvaluation && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" /> Latest Evaluation: <strong className="ml-1">{topic.lastEvaluation.feedbackSummary}</strong>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Score: {topic.lastEvaluation.score}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-3">
              <Target className="w-6 h-6" />
            </div>
            <h4 className="font-display font-bold text-lg text-slate-900 mb-1">No Topics in this Skill Track</h4>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
              Add topics manually, bulk import from a text file, or let AI generate a full curriculum roadmap for you!
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  setShowAiGenModal(true);
                  handleGenerateTopicsAI();
                }}
                className="btn-primary py-2 px-5 text-xs font-semibold flex items-center"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Generate Topics with AI
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="btn-secondary py-2 px-4 text-xs font-semibold flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" /> Bulk Topic Upload
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD SINGLE TOPIC */}
      {showAddSingle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-bold text-xl text-slate-900 mb-1">Add Topic to {skill.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Add a specific topic or milestone to this roadmap.</p>

            <form onSubmit={handleAddSingleTopic} className="space-y-4">
              <div>
                <label className="label">Topic Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Redux Toolkit & RTK Query"
                  value={singleTopicName}
                  onChange={(e) => setSingleTopicName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSingle(false)}
                  className="btn-secondary flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSingle}
                  className="btn-primary flex-1 py-2 text-xs font-semibold"
                >
                  {savingSingle ? "Adding..." : "Add Topic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK TOPIC UPLOAD */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display font-bold text-xl text-slate-900">Bulk Topic Upload</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Import multiple topics at once by typing or uploading a file.
                </p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Instructions Box */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <ClipboardList className="w-4 h-4" /> Accepted Format:
              </span>
              <p className="text-indigo-800">
                Enter one topic per line, or a comma-separated list. Numbers/bullets (e.g. "1. ", "- ") are automatically stripped.
              </p>
              <div className="font-mono text-[11px] bg-white/80 p-2 rounded-lg border border-indigo-200/60 mt-1">
                1. Components & Props<br />
                2. useState & useReducer<br />
                3. Custom Hooks
              </div>
            </div>

            {/* File Upload Option */}
            <div>
              <label className="label">Option A: Upload Text / CSV File</label>
              <div className="flex items-center gap-3">
                <label className="btn-secondary py-2 px-3 text-xs font-semibold cursor-pointer border-dashed border-slate-300 hover:border-indigo-400 flex items-center">
                  <FolderOpen className="w-4 h-4 mr-2" /> Choose File (.txt, .csv, .md)
                  <input
                    type="file"
                    accept=".txt,.csv,.md"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                {bulkFileName && (
                  <span className="flex items-center text-xs font-semibold text-emerald-600 truncate max-w-xs">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> {bulkFileName} loaded
                  </span>
                )}
              </div>
            </div>

            {/* Textarea Option */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Option B: Type / Paste Topics</label>
                <span className="text-xs font-bold text-indigo-600">
                  {parsedBulkList.length} {parsedBulkList.length === 1 ? "topic" : "topics"} detected
                </span>
              </div>
              <textarea
                rows={6}
                className="input-field text-xs font-mono py-2.5 resize-none"
                placeholder="Paste topics here (one per line)..."
                value={bulkTextInput}
                onChange={(e) => setBulkTextInput(e.target.value)}
              />
            </div>

            {/* Preview of Parsed Topics */}
            {parsedBulkList.length > 0 && (
              <div className="max-h-32 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                  Preview ({parsedBulkList.length}):
                </span>
                {parsedBulkList.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-700">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkSaving || parsedBulkList.length === 0}
                onClick={handleBulkSubmit}
                className="btn-primary flex-1 py-2 text-xs font-semibold"
              >
                {bulkSaving ? "Importing Topics..." : `Import All ${parsedBulkList.length} Topics`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AI TOPIC GENERATOR */}
      {showAiGenModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="inline-flex items-center gap-1.5 badge badge-indigo mb-1">
                  <Sparkles className="w-4 h-4" /> AI Curriculum Generator
                </div>
                <h3 className="font-display font-bold text-xl text-slate-900">
                  Recommended Topics for {skill.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI has curated top interview-tested milestones for placement readiness.
                </p>
              </div>
              <button onClick={() => setShowAiGenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiGenerating ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                <p className="text-xs font-medium text-slate-500">
                  AI is crafting the optimal {skill.name} curriculum...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Select topics to add to your roadmap:</span>
                  <button
                    onClick={() => {
                      const allSelected = generatedTopics.every((t) => selectedAiTopics[t]);
                      const updated: Record<string, boolean> = {};
                      generatedTopics.forEach((t) => (updated[t] = !allSelected));
                      setSelectedAiTopics(updated);
                    }}
                    className="font-bold text-indigo-600 hover:underline"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {generatedTopics.map((topic, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedAiTopics[topic]
                          ? "bg-indigo-50/50 border-indigo-300 text-slate-900 font-medium"
                          : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedAiTopics[topic]}
                        onChange={(e) =>
                          setSelectedAiTopics({
                            ...selectedAiTopics,
                            [topic]: e.target.checked
                          })
                        }
                        className="mt-0.5 accent-indigo-600"
                      />
                      <span className="flex-1">
                        <strong>Step {idx + 1}:</strong> {topic}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAiGenModal(false)}
                    className="btn-secondary flex-1 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={aiImporting || Object.values(selectedAiTopics).filter(Boolean).length === 0}
                    onClick={handleImportAiTopics}
                    className="btn-primary flex-1 py-2 text-xs font-semibold"
                  >
                    {aiImporting
                      ? "Importing..."
                      : `Import ${Object.values(selectedAiTopics).filter(Boolean).length} Topics to Roadmap`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: AI TOPIC EVALUATION CHAT */}
      {evaluatingTopic && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 badge badge-emerald mb-1">
                  <Bot className="w-4 h-4" /> AI Placement Evaluator
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  Topic Test: {evaluatingTopic.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Answer 3 technical questions. AI evaluates understanding and assigns your mastery percentage.
                </p>
              </div>
              <button
                onClick={() => setEvaluatingTopic(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Conversation Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {evaluatingLoading && quizQuestions.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
                  <p className="text-xs text-slate-500">AI is formulating interview questions for {evaluatingTopic.name}...</p>
                </div>
              )}

              {/* Chat History */}
              {chatAnswers.map((item, idx) => (
                <div key={idx} className="space-y-3">
                  {/* AI Question Bubble */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                      AI
                    </div>
                    <div className="p-3.5 rounded-2xl rounded-tl-xs bg-slate-100 text-slate-900 text-xs leading-relaxed max-w-[85%]">
                      <span className="font-bold text-slate-500 block mb-1">Question {idx + 1} of 3</span>
                      {item.question}
                    </div>
                  </div>

                  {/* User Answer Bubble */}
                  <div className="flex items-start justify-end gap-2.5">
                    <div className="p-3.5 rounded-2xl rounded-tr-xs bg-indigo-600 text-white text-xs leading-relaxed max-w-[85%]">
                      {item.answer}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs font-bold shrink-0">
                      You
                    </div>
                  </div>
                </div>
              ))}

              {/* Current Active Question (if not finished) */}
              {!evaluationResult && quizQuestions[currentQuestionIndex] && (
                <div className="flex items-start gap-2.5 animate-in fade-in">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                    AI
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-xs bg-slate-100 text-slate-900 text-xs leading-relaxed max-w-[85%]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-500">
                        Question {currentQuestionIndex + 1} of 3
                      </span>
                      <span className="text-[10px] uppercase font-bold text-indigo-600">
                        {quizQuestions[currentQuestionIndex].aspect}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800">{quizQuestions[currentQuestionIndex].question}</p>
                  </div>
                </div>
              )}

              {/* Final AI Evaluation Report Card */}
              {evaluationResult && (
                <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white space-y-4 animate-in zoom-in-95">
                  <div className="flex justify-between items-start border-b border-white/10 pb-3">
                    <div>
                      <span className="badge badge-emerald mb-1">Evaluation Complete</span>
                      <h4 className="font-display font-bold text-lg">AI Evaluator Report Card</h4>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-3xl text-emerald-400">
                        {evaluationResult.understandingPercentage}%
                      </span>
                      <span className="block text-[11px] text-slate-400 font-medium">Assigned Mastery</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{evaluationResult.summary}</p>

                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Feedback Breakdown:
                    </span>
                    {evaluationResult.feedbacks?.map((f: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                        <div className="flex justify-between items-center text-slate-300 font-semibold">
                          <span>Q{i + 1} Feedback</span>
                          <span className="font-mono text-emerald-400 font-bold">{f.score}%</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{f.feedback}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setEvaluatingTopic(null)}
                      className="btn-success py-2 px-6 text-xs font-semibold flex items-center"
                    >
                      Done & Update Roadmap <Check className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar for Answering Current Question */}
            {!evaluationResult && quizQuestions.length > 0 && (
              <form onSubmit={handleSendChatAnswer} className="pt-3 border-t border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input-field text-xs py-3"
                    placeholder={`Type your answer for Question ${currentQuestionIndex + 1}...`}
                    value={currentInputAnswer}
                    onChange={(e) => setCurrentInputAnswer(e.target.value)}
                    autoFocus
                    disabled={evaluatingLoading}
                  />
                  <button
                    type="submit"
                    disabled={evaluatingLoading || !currentInputAnswer.trim()}
                    className="btn-primary py-3 px-5 text-xs font-semibold shrink-0"
                  >
                    {evaluatingLoading ? "Evaluating..." : "Send Answer →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
