"use client";

import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { Toaster, toast } from "react-hot-toast";
import {
  FolderGit2,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  GitBranch,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  GitCommit,
  Layers,
  Terminal,
  Clock,
  Calendar,
  Check,
  Edit3,
  Trash2,
  ChevronRight,
  TrendingUp,
  Cpu,
  Lock,
  FileText,
  Rocket,
  Search,
  RefreshCw,
  Award,
  Zap,
  Info,
  Sliders,
  Send,
  HelpCircle,
  Activity,
  BarChart2,
  FileUp,
  UploadCloud,
  ListChecks,
  Target
} from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  lifecycleStage: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  tasks: Array<{ id: string; title: string; completed: boolean }>;
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  features: string[];
  milestones: Milestone[];
  progress: number;
  githubUrl: string;
  liveUrl: string;
  startDate: string;
  targetDate?: string;
  projectStatus?: "completed" | "fresh";
  roadmapFileName?: string;
  roadmapText?: string;
  deploymentStatus: "not_deployed" | "staging" | "production" | "failing" | "healthy";
  documentationStatus: "none" | "basic_readme" | "comprehensive" | "api_docs";
  resumeReadiness: "not_ready" | "in_progress" | "needs_revision" | "interview_ready";
  analysisStatus: "never_analyzed" | "analyzing" | "completed" | "failed";
  latestAnalysisId: string | null;
  latestScores?: {
    overall: number;
    implementationQuality: number;
    codeQuality: number;
    security: number;
    architecture: number;
    testing: number;
    documentation: number;
    gitDiscipline: number;
    deploymentReadiness: number;
    technologyCredibility: number;
    interviewReadiness: number;
  } | null;
  majorRisks?: string[];
  nextActions?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsTrackerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetCount, setTargetCount] = useState<number>(3);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tempTargetCount, setTempTargetCount] = useState<number>(3);

  // Active / Selected project for detailed inspection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<
    "milestones" | "verification" | "git" | "architecture" | "security" | "interview" | "history" | "updates" | "roadmap"
  >("milestones");

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  // Create / Edit Project Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    technologies: "",
    features: "",
    githubUrl: "",
    liveUrl: "",
    startDate: new Date().toISOString().split("T")[0],
    targetDate: "",
    projectStatus: "fresh" as "completed" | "fresh",
    roadmapFileName: "",
    roadmapBase64Pdf: "",
    deploymentStatus: "not_deployed",
    documentationStatus: "basic_readme"
  });

  // Interview Practice State
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [answerEvaluation, setAnswerEvaluation] = useState<any>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects");
      const data = res.data.data;
      setProjects(data.projects || []);
      if (data.trackerConfig?.targetProjectCount) {
        setTargetCount(data.trackerConfig.targetProjectCount);
        setTempTargetCount(data.trackerConfig.targetProjectCount);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
      toast.error("Failed to load projects. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (id: string) => {
    try {
      const res = await api.get(`/projects/${id}`);
      const data = res.data.data;
      setSelectedProject(data);
      setLatestAnalysis(data.latestAnalysis || null);

      // Also fetch history
      const histRes = await api.get(`/projects/${id}/analyses`);
      setAnalysisHistory(histRes.data.data || []);
    } catch (err) {
      console.error("Failed to load project details:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetails(selectedProjectId);
    } else {
      setSelectedProject(null);
      setLatestAnalysis(null);
    }
  }, [selectedProjectId]);

  // Update target project count
  const handleUpdateTargetCount = async () => {
    try {
      await api.put("/projects/config", { targetProjectCount: tempTargetCount });
      setTargetCount(tempTargetCount);
      setIsConfigModalOpen(false);
      toast.success(`Target updated to ${tempTargetCount} projects.`);
    } catch (err) {
      toast.error("Failed to update target count.");
    }
  };

  // Toggle milestone completion & automatically calculate new progress
  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedProject) return;

    const updatedMilestones = selectedProject.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );

    // Optimistic local update
    const completedCount = updatedMilestones.filter((m) => m.completed).length;
    const computedProgress = Math.round((completedCount / updatedMilestones.length) * 100);

    setSelectedProject({
      ...selectedProject,
      milestones: updatedMilestones,
      progress: computedProgress
    });

    try {
      const res = await api.patch(`/projects/${selectedProject.id}/milestones`, {
        milestones: updatedMilestones
      });
      toast.success(`Progress automatically updated to ${res.data.data.progress}% (${completedCount}/${updatedMilestones.length} milestones)`);
      fetchProjects();
    } catch (err) {
      toast.error("Failed to update milestone status.");
      fetchProjectDetails(selectedProject.id);
    }
  };

  // Run Project Verification Analysis
  const handleRunAnalysis = async (projectId: string) => {
    setIsAnalyzing(true);
    setAnalysisStep(1);

    const stepTimer = setInterval(() => {
      setAnalysisStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1500);

    try {
      const res = await api.post(`/projects/${projectId}/analyze`);
      clearInterval(stepTimer);
      setAnalysisStep(4);
      const report = res.data.data;
      setLatestAnalysis(report);
      toast.success("Verification analysis completed successfully!");
      fetchProjectDetails(projectId);
      fetchProjects();
      setActiveTab("verification");
    } catch (err: any) {
      clearInterval(stepTimer);
      console.error("Analysis failed:", err);
      toast.error(err.response?.data?.message || "Analysis failed. Please check repository URL.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  // PDF Roadmap file upload handler
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a valid PDF file (.pdf).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF file size must be less than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        roadmapBase64Pdf: base64,
        roadmapFileName: file.name
      }));
      toast.success(`Attached roadmap: ${file.name}`);
    };
    reader.onerror = () => {
      toast.error("Failed to read the PDF file.");
    };
    reader.readAsDataURL(file);
  };

  // Create or Update Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Project name is required.");
      return;
    }

    if (formData.projectStatus === "fresh" && !formData.targetDate) {
      toast.error("Target completion date is required for fresh projects.");
      return;
    }

    const payload: any = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      technologies: formData.technologies.split(",").map((t) => t.trim()).filter(Boolean),
      features: formData.features.split("\n").map((f) => f.trim()).filter(Boolean),
      githubUrl: formData.githubUrl.trim(),
      liveUrl: formData.liveUrl.trim(),
      startDate: formData.startDate,
      projectStatus: formData.projectStatus,
      deploymentStatus: formData.deploymentStatus,
      documentationStatus: formData.documentationStatus
    };

    // Only attach targetDate and roadmap for fresh projects
    if (formData.projectStatus === "fresh") {
      payload.targetDate = formData.targetDate;
      if (formData.roadmapBase64Pdf) {
        payload.roadmapBase64Pdf = formData.roadmapBase64Pdf;
        payload.roadmapFileName = formData.roadmapFileName;
      }
    }

    try {
      if (isEditMode && selectedProject) {
        await api.put(`/projects/${selectedProject.id}`, payload);
        toast.success("Project updated successfully!");
        fetchProjectDetails(selectedProject.id);
      } else {
        const res = await api.post("/projects", payload);
        toast.success(
          formData.projectStatus === "completed"
            ? "Completed project added! Milestones initialized at 100%."
            : "Fresh project registered with roadmap tracking & milestone roadmap!"
        );
        setSelectedProjectId(res.data.data.id);
      }
      setIsCreateModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save project.");
    }
  };

  // Delete project
  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success("Project deleted.");
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
      fetchProjects();
    } catch (err) {
      toast.error("Failed to delete project.");
    }
  };

  // Submit Practice Interview Answer
  const handleEvaluateAnswer = async () => {
    if (!selectedProject || !selectedQuestion || !userAnswer.trim()) {
      toast.error("Please enter an answer to evaluate.");
      return;
    }

    setIsEvaluatingAnswer(true);
    try {
      const res = await api.post(`/projects/${selectedProject.id}/interview/practice`, {
        questionId: selectedQuestion.id,
        answer: userAnswer
      });
      setAnswerEvaluation(res.data.data);
      toast.success("Answer evaluated by AI interviewer!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Evaluation failed.");
    } finally {
      setIsEvaluatingAnswer(false);
    }
  };

  // Helper score color
  const getScoreColor = (score?: number) => {
    if (!score && score !== 0) return "text-slate-400";
    if (score >= 75) return "text-emerald-600";
    if (score >= 55) return "text-amber-500";
    return "text-rose-500";
  };

  const getScoreBadgeBg = (score?: number) => {
    if (!score && score !== 0) return "bg-slate-100 text-slate-600 border-slate-200";
    if (score >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 55) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-in fade-in">
      <Toaster position="bottom-right" />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-8 border border-indigo-100 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Resume Projects & Technical Interview Defense
            </h1>
            <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
              Verify whether your projects are genuinely strong enough to put on your resume.
              Audits actual Git commits, codebase architecture, security vulnerabilities, testing coverage,
              and prepares you for rigorous interview defense.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Target count pill */}
            <button
              onClick={() => {
                setTempTargetCount(targetCount);
                setIsConfigModalOpen(true);
              }}
              className="px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-medium text-xs flex items-center gap-2 shadow-xs transition-all"
            >
              <Sliders className="w-4 h-4 text-indigo-600" />
              Target: <span className="font-bold text-slate-900">{projects.length}/{targetCount}</span> Projects
            </button>

            <button
              onClick={() => {
                setIsEditMode(false);
                setFormData({
                  name: "",
                  description: "",
                  technologies: "",
                  features: "",
                  githubUrl: "",
                  liveUrl: "",
                  startDate: new Date().toISOString().split("T")[0],
                  targetDate: "",
                  projectStatus: "fresh",
                  roadmapFileName: "",
                  roadmapBase64Pdf: "",
                  deploymentStatus: "not_deployed",
                  documentationStatus: "basic_readme"
                });
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Resume Project
            </button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200/60">
          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Tracked Projects</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {projects.length} <span className="text-xs font-normal text-slate-400">/ {targetCount} target</span>
            </div>
          </div>
          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Resume Ready</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {projects.filter((p) => p.resumeReadiness === "interview_ready").length}
            </div>
          </div>
          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Average Readiness</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {projects.length > 0
                ? Math.round(
                  projects.reduce((acc, p) => acc + (p.latestScores?.overall || 0), 0) /
                  (projects.filter((p) => p.latestScores?.overall).length || 1)
                )
                : 0}
              <span className="text-xs font-normal text-slate-400"> / 100</span>
            </div>
          </div>
          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Avg Milestone Progress</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {projects.length > 0
                ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Projects List / Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Resume Showcase Projects
          </h2>
          <span className="text-xs text-slate-500">
            Progress is strictly calculated from completed milestones (e.g. 6/10 = 60%, 8/10 = 80%).
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading resume projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <FolderGit2 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">No Resume Projects Tracked Yet</h3>
              <p className="text-slate-500 text-sm">
                Add your 3 or 4 target portfolio projects. PlacementOS will structure their 11-stage lifecycle
                and analyze your GitHub repository for authentic interview readiness.
              </p>
            </div>
            <button
              onClick={() => {
                setIsEditMode(false);
                setFormData({
                  name: "",
                  description: "",
                  technologies: "",
                  features: "",
                  githubUrl: "",
                  liveUrl: "",
                  startDate: new Date().toISOString().split("T")[0],
                  targetDate: "",
                  projectStatus: "fresh",
                  roadmapFileName: "",
                  roadmapBase64Pdf: "",
                  deploymentStatus: "not_deployed",
                  documentationStatus: "basic_readme"
                });
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
            >
              Add First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              const hasAnalysis = !!project.latestScores;

              return (
                <div
                  key={project.id}
                  className={`bg-white rounded-3xl border transition-all p-6 space-y-5 flex flex-col justify-between shadow-xs hover:shadow-md ${isSelected
                      ? "border-indigo-400 ring-2 ring-indigo-500/20"
                      : "border-slate-200/80 hover:border-slate-300"
                    }`}
                >
                  <div className="space-y-4">
                    {/* Header + Badges */}
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {project.projectStatus === "completed" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
                              <Award className="w-3 h-3 text-emerald-600" /> Completed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold inline-flex items-center gap-1">
                              <Rocket className="w-3 h-3 text-indigo-600" /> Fresh
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{project.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{project.description || "No objective stated."}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${getScoreBadgeBg(
                          project.latestScores?.overall
                        )}`}
                      >
                        {hasAnalysis ? `${project.latestScores?.overall}/100 Score` : "Unverified"}
                      </span>
                    </div>

                    {/* Milestone Progress Bar (Strictly Calculated!) */}
                    <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700">Calculated Progress</span>
                        <span className="font-extrabold text-indigo-600">{project.progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
                        <span>{project.milestones?.filter((m) => m.completed).length || 0} of {project.milestones?.length || 0} Milestones</span>
                        <span>{project.resumeReadiness === "interview_ready" ? "🟢 Resume Ready" : "🟡 In Progress"}</span>
                      </div>
                    </div>

                    {/* Tech Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {project.technologies.slice(0, 4).map((tech, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/70"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.technologies.length > 4 && (
                        <span className="px-1.5 py-0.5 text-xs text-slate-400">+{project.technologies.length - 4}</span>
                      )}
                    </div>

                    {/* Status Pill & Target Date / Roadmap */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1 border-t border-slate-100">
                      {project.projectStatus === "completed" ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Finished project (target date omitted)
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {project.targetDate && (
                            <span className="text-slate-600 font-medium flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Deadline: {project.targetDate}
                            </span>
                          )}
                          {project.roadmapFileName && (
                            <span className="text-indigo-600 font-semibold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md">
                              <FileText className="w-3 h-3" /> {project.roadmapFileName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Links & Statuses */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <GitBranch className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {project.githubUrl ? (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-600 truncate underline"
                          >
                            Repository Linked
                          </a>
                        ) : (
                          <span className="text-rose-500">No Repo URL</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <Rocket className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {project.liveUrl ? (
                          <a
                            href={project.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-600 truncate underline"
                          >
                            Live URL
                          </a>
                        ) : (
                          <span className="text-slate-400">Not Deployed</span>
                        )}
                      </div>
                    </div>

                    {/* Major Risks & Missing Items preview */}
                    {project.majorRisks && project.majorRisks.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-800 text-xs space-y-1">
                        <div className="flex items-center gap-1 font-bold text-[11px] uppercase tracking-wide">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Key Action Needed
                        </div>
                        <p className="text-[11px] line-clamp-1">{project.majorRisks[0]}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleRunAnalysis(project.id)}
                      disabled={isAnalyzing || !project.githubUrl}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      {project.analysisStatus === "analyzing" ? "Analyzing..." : "Analyze Repo"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          window.scrollTo({ top: 600, behavior: "smooth" });
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                          }`}
                      >
                        Inspect Audit <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILED PROJECT AUDIT & DEFENSE DRAWER */}
      {selectedProject && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-8 animate-in fade-in">
          {/* Detailed Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedProject.name}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreBadgeBg(
                    selectedProject.latestScores?.overall
                  )}`}
                >
                  {selectedProject.resumeReadiness === "interview_ready"
                    ? "✓ Resume Ready"
                    : selectedProject.resumeReadiness === "needs_revision"
                      ? "⚠ Needs Revision Before Resume"
                      : "⏳ In Development"}
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">{selectedProject.description}</p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                {selectedProject.githubUrl && (
                  <a
                    href={selectedProject.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
                  >
                    <GitBranch className="w-3.5 h-3.5" /> View GitHub Repo <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {selectedProject.liveUrl && (
                  <a
                    href={selectedProject.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-emerald-600 hover:underline font-semibold"
                  >
                    <Rocket className="w-3.5 h-3.5" /> Live Deployment <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Started: {selectedProject.startDate || "N/A"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => handleRunAnalysis(selectedProject.id)}
                disabled={isAnalyzing || !selectedProject.githubUrl}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
                {isAnalyzing ? "Analyzing Repository..." : "Run Deep Verification"}
              </button>

              <button
                onClick={() => {
                  setFormData({
                    name: selectedProject.name,
                    description: selectedProject.description,
                    technologies: selectedProject.technologies.join(", "),
                    features: selectedProject.features.join("\n"),
                    githubUrl: selectedProject.githubUrl,
                    liveUrl: selectedProject.liveUrl,
                    startDate: selectedProject.startDate,
                    targetDate: selectedProject.targetDate || "",
                    projectStatus: selectedProject.projectStatus || "fresh",
                    roadmapFileName: selectedProject.roadmapFileName || "",
                    roadmapBase64Pdf: "",
                    deploymentStatus: selectedProject.deploymentStatus,
                    documentationStatus: selectedProject.documentationStatus
                  });
                  setIsEditMode(true);
                  setIsCreateModalOpen(true);
                }}
                className="p-3 border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600"
                title="Edit Project Details"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Analysis Progress Steps Animation */}
          {isAnalyzing && (
            <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-700">
                <span className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                  Running Multi-Layer Repository Verification Pipeline
                </span>
                <span>Step {analysisStep} of 4</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div
                  className={`p-3 rounded-xl border ${analysisStep >= 1
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-500 border-slate-200"
                    }`}
                >
                  1. Isolated Git Sandbox Clone
                </div>
                <div
                  className={`p-3 rounded-xl border ${analysisStep >= 2
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-500 border-slate-200"
                    }`}
                >
                  2. Commits & Cadence Audit
                </div>
                <div
                  className={`p-3 rounded-xl border ${analysisStep >= 3
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-500 border-slate-200"
                    }`}
                >
                  3. Semgrep Security & Secrets Scan
                </div>
                <div
                  className={`p-3 rounded-xl border ${analysisStep >= 4
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-500 border-slate-200"
                    }`}
                >
                  4. AI Reasoning & Defense Synthesis
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs for Project Inspection */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab("milestones")}
              className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "milestones"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              11-Stage Milestones ({selectedProject.progress}%)
            </button>
            <button
              onClick={() => setActiveTab("verification")}
              className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "verification"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <Award className="w-4 h-4 text-indigo-600" />
              Resume Readiness & Scores
            </button>

            {/* Conditional Tab for Completed vs Fresh */}
            {selectedProject.projectStatus === "completed" ? (
              <button
                onClick={() => setActiveTab("updates")}
                className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "updates"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Update & Modernization Suggestions
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("roadmap")}
                className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "roadmap"
                    ? "bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                Roadmap vs. Actual Progress
              </button>
            )}

            <button
              onClick={() => setActiveTab("git")}
              className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "git"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <GitCommit className="w-4 h-4 text-indigo-600" />
              Git & Commit Credibility
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "architecture"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <Cpu className="w-4 h-4 text-indigo-600" />
              Tech & Architecture Audit
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "security"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              Semgrep & Security Rules
            </button>
            <button
              onClick={() => setActiveTab("interview")}
              className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "interview"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Technical Interview Defense
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "history"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <Activity className="w-4 h-4 text-indigo-600" />
              Audit History ({analysisHistory.length})
            </button>
          </div>

          {/* TAB 1: 11-STAGE MILESTONES & STRICT AUTO PROGRESS */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Automatic Milestone-Driven Progress Calculation</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Progress is strictly computed from completed milestones:{" "}
                    <strong>{selectedProject.milestones.filter((m) => m.completed).length}</strong> of{" "}
                    <strong>{selectedProject.milestones.length}</strong> stages completed (
                    <strong>{selectedProject.progress}%</strong>).
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-600">{selectedProject.progress}%</div>
                </div>
              </div>

              {/* Milestones List */}
              <div className="space-y-3">
                {selectedProject.milestones.map((m, idx) => {
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleToggleMilestone(m.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${m.completed
                          ? "bg-emerald-50/50 border-emerald-200"
                          : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${m.completed
                            ? "bg-emerald-600 text-white"
                            : "border-2 border-slate-300 text-transparent"
                          }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                            Stage {idx + 1}: {m.lifecycleStage}
                          </span>
                          {m.completed && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                        <h4 className={`font-bold text-sm text-slate-900 mt-0.5 ${m.completed ? "line-through text-slate-500" : ""}`}>
                          {m.title}
                        </h4>
                        {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RESUME READINESS & SCORES */}
          {activeTab === "verification" && (
            <div className="space-y-6">
              {!latestAnalysis ? (
                <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <Sparkles className="w-8 h-8 text-indigo-600 mx-auto" />
                  <h4 className="font-bold text-slate-900">No Verification Report Yet</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    Click "Run Deep Verification" above to analyze this repository's Git history,
                    technologies, tests, and security posture.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Overall Verdict Card */}
                  <div
                    className={`p-6 rounded-3xl border space-y-4 ${latestAnalysis.resumeReadinessVerdict?.isResumeReady
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-amber-50/60 border-amber-200"
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Resume Readiness Verdict · Analyzed by {latestAnalysis.providerUsed}
                        </span>
                        <h3 className="text-xl font-black text-slate-900">
                          {latestAnalysis.resumeReadinessVerdict?.isResumeReady
                            ? "✅ Qualified for Technical Resume"
                            : "⚠️ Not Yet Resume Ready — Gaps Detected"}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-slate-900">
                          {latestAnalysis.readinessScores?.overall}
                          <span className="text-xs font-normal text-slate-500"> / 100</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">
                      {latestAnalysis.resumeReadinessVerdict?.summaryVerdict}
                    </p>
                  </div>

                  {/* 10 Sub-Scores Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {Object.entries(latestAnalysis.readinessScores || {})
                      .filter(([key]) => key !== "overall")
                      .map(([key, val]: any) => (
                        <div key={key} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                          <span className="text-[11px] font-semibold text-slate-500 capitalize block truncate">
                            {key.replace(/([A-Z])/g, " $1")}
                          </span>
                          <div className={`text-xl font-black mt-1 ${getScoreColor(val)}`}>
                            {val}
                            <span className="text-[11px] font-normal text-slate-400">/100</span>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Critical Mismatches Alert Banner */}
                  {(latestAnalysis.techVerification?.missingOrUnverifiedTechs?.length > 0 ||
                    latestAnalysis.featureVerification?.unverifiedFeatures?.length > 0 ||
                    latestAnalysis.repositoryStats?.cadence?.singleCommitDumpDetected) && (
                      <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                        <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                          Discrepancies & Interview Risks Detected
                        </div>

                        <ul className="text-xs text-rose-700 space-y-1.5 list-disc list-inside">
                          {latestAnalysis.techVerification?.missingOrUnverifiedTechs?.length > 0 && (
                            <li>
                              <strong>Declared technologies missing from repository:</strong>{" "}
                              {latestAnalysis.techVerification.missingOrUnverifiedTechs.join(", ")}. An interviewer will
                              penalize this if asked to demonstrate code.
                            </li>
                          )}
                          {latestAnalysis.featureVerification?.unverifiedFeatures?.length > 0 && (
                            <li>
                              <strong>Claimed features without code evidence:</strong>{" "}
                              {latestAnalysis.featureVerification.unverifiedFeatures.join(", ")}.
                            </li>
                          )}
                          {latestAnalysis.repositoryStats?.cadence?.singleCommitDumpDetected && (
                            <li>
                              <strong>Single-commit dump detected:</strong> Code appears to have been uploaded all at once
                              rather than developed incrementally.
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                  {/* Missing Before Resume Ready Checklist */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      What is Missing Before this Project is Truly Resume-Ready
                    </h4>
                    <div className="space-y-2">
                      {(latestAnalysis.resumeReadinessVerdict?.missingBeforeResumeReady || []).map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resume Bullet Point Recommendations */}
                  <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
                    <h4 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      Recommended Verified Resume Bullet Points
                    </h4>
                    <div className="space-y-2.5">
                      {(latestAnalysis.resumeReadinessVerdict?.resumeBulletRecommendations || []).map((bullet: string, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 leading-relaxed">
                          • {bullet}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Highlights Callout for Completed vs Fresh Analysis */}
                  {latestAnalysis.updateSuggestions && (
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          Modernization Suggestions Generated for Completed Project
                        </div>
                        <p className="text-xs text-slate-600">
                          {latestAnalysis.updateSuggestions.architecturalEnhancements?.length || 0} architectural suggestions,{" "}
                          {latestAnalysis.updateSuggestions.modernizationAndSecurity?.length || 0} security enhancements, and{" "}
                          {latestAnalysis.updateSuggestions.resumeImpactMultipliers?.length || 0} resume impact multipliers ready.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("updates")}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1.5"
                      >
                        Inspect Update Suggestions <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {latestAnalysis.roadmapComparison && (
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 uppercase tracking-wide">
                          <BarChart2 className="w-4 h-4 text-indigo-600" />
                          Roadmap Deliverables vs. Actual Repository Comparison
                        </div>
                        <p className="text-xs text-slate-600">
                          Status: <strong>{latestAnalysis.roadmapComparison.deadlineAdherence?.replace("_", " ").toUpperCase()}</strong> ·{" "}
                          {latestAnalysis.roadmapComparison.completedDeliverables?.length || 0} deliverables verified ·{" "}
                          {latestAnalysis.roadmapComparison.pendingDeliverables?.length || 0} pending.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("roadmap")}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1.5"
                      >
                        Inspect Roadmap Comparison <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GIT & COMMIT CREDIBILITY */}
          {activeTab === "git" && (
            <div className="space-y-6">
              {!latestAnalysis ? (
                <p className="text-slate-500 text-xs">Run analysis to inspect Git history.</p>
              ) : (
                <div className="space-y-6">
                  {/* Cadence Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-xs text-slate-500 block">Total Audited Commits</span>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {latestAnalysis.repositoryStats?.totalCommits || 0}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-xs text-slate-500 block">Commit Cadence</span>
                      <div className="text-sm font-bold text-slate-800 mt-2">
                        {latestAnalysis.repositoryStats?.cadence?.commitFrequencyDescription}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-xs text-slate-500 block">Meaningful Message Ratio</span>
                      <div className="text-2xl font-black text-indigo-600 mt-1">
                        {latestAnalysis.commitAnalysis?.meaningfulCommitRatio}%
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-xs text-slate-500 block">Incremental Dev</span>
                      <div className="text-sm font-bold mt-2">
                        {latestAnalysis.commitAnalysis?.genuineIncrementalDevelopment ? (
                          <span className="text-emerald-600">✓ Genuine Incremental</span>
                        ) : (
                          <span className="text-amber-600">⚠ Irregular Cadence</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Suspicious Commits / Discrepancies */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">Commit Quality & Discrepancies</h4>
                    {latestAnalysis.commitAnalysis?.suspiciousCommits?.length === 0 ? (
                      <p className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                        ✓ No suspicious or misrepresentative commits detected across the audited log.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {latestAnalysis.commitAnalysis.suspiciousCommits.map((sc: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                            <div className="flex items-center gap-2 font-bold text-amber-900">
                              <span className="font-mono text-slate-500">{sc.sha}</span>
                              <span>"{sc.message}"</span>
                            </div>
                            <p className="text-amber-800">{sc.discrepancy}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TECH & ARCHITECTURE AUDIT */}
          {activeTab === "architecture" && (
            <div className="space-y-6">
              {!latestAnalysis ? (
                <p className="text-slate-500 text-xs">Run analysis to inspect architecture.</p>
              ) : (
                <div className="space-y-6">
                  {/* Verified Tech Comparison */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">Declared vs Verified Stack</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                          ✓ Verified Technologies Found in Repo
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {latestAnalysis.techVerification?.verifiedTechs?.map((t: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2">
                        <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                          ✕ Declared but Unverified / Missing
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {latestAnalysis.techVerification?.missingOrUnverifiedTechs?.length === 0 ? (
                            <span className="text-xs text-slate-500">None! All declared technologies verified.</span>
                          ) : (
                            latestAnalysis.techVerification.missingOrUnverifiedTechs.map((t: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-medium">
                                {t}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Architecture Overview */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">Detected Architecture & Patterns</h4>
                    <p>
                      <strong>Architecture Style:</strong> {latestAnalysis.codeAnalysis?.architectureType}
                    </p>
                    <p>
                      <strong>Separation of Concerns:</strong>{" "}
                      {latestAnalysis.codeAnalysis?.separationOfConcerns ? "✓ Yes (Modular layers)" : "⚠️ Monolithic mixing"}
                    </p>
                    <p>
                      <strong>Database Clients:</strong>{" "}
                      {latestAnalysis.codeAnalysis?.databaseDesignDetected?.join(", ") || "None detected"}
                    </p>
                    <p>
                      <strong>Authentication Mechanism:</strong>{" "}
                      {latestAnalysis.codeAnalysis?.authMechanismDetected?.join(", ") || "None detected"}
                    </p>
                    <p>
                      <strong>Docker & CI/CD:</strong>{" "}
                      {latestAnalysis.codeAnalysis?.dockerAndCiCdDetected?.hasDockerfile ? "✓ Dockerfile Present" : "No Docker"} ·{" "}
                      {latestAnalysis.codeAnalysis?.dockerAndCiCdDetected?.hasCiCd ? "✓ CI/CD Configured" : "No CI/CD"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SEMGREP & SECURITY RULES */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {!latestAnalysis ? (
                <p className="text-slate-500 text-xs">Run analysis to inspect security posture.</p>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Static Security & Secrets Audit</h4>
                      <p className="text-xs text-slate-500">
                        Scanned against SQL Injection, eval/exec injection, hardcoded private keys, and npm audit vulnerabilities.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${getScoreColor(latestAnalysis.securityAnalysis?.securityScore)}`}>
                        {latestAnalysis.securityAnalysis?.securityScore}/100
                      </div>
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Security Vulnerabilities</h5>
                    {latestAnalysis.securityAnalysis?.vulnerabilitiesFound?.length === 0 ? (
                      <p className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                        ✓ No critical or high severity vulnerabilities detected by Semgrep static rules.
                      </p>
                    ) : (
                      latestAnalysis.securityAnalysis.vulnerabilitiesFound.map((vuln: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-rose-900">
                            <span>{vuln.description}</span>
                            <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-rose-200 text-rose-800">
                              {vuln.severity}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-slate-500">
                            {vuln.file}:{vuln.line} ({vuln.ruleId})
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Secrets */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Hardcoded Secret Findings</h5>
                    {latestAnalysis.securityAnalysis?.secretsFound?.length === 0 ? (
                      <p className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                        ✓ No plaintext API keys, JWT secrets, or cryptographic private keys committed to Git.
                      </p>
                    ) : (
                      latestAnalysis.securityAnalysis.secretsFound.map((sec: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                          <div className="font-bold text-amber-900">{sec.type}</div>
                          <p className="text-slate-600">{sec.description}</p>
                          <p className="font-mono text-[11px] text-slate-500">{sec.file}:{sec.line}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TECHNICAL INTERVIEW DEFENSE & PRACTICE */}
          {activeTab === "interview" && (
            <div className="space-y-6">
              {!latestAnalysis?.interviewQuestions?.length ? (
                <p className="text-slate-500 text-xs">Run analysis to generate project-specific interview questions.</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Repository-Grounded Technical Defense Questions
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Interview-grade questions derived strictly from your codebase, architectural decisions, and detected weaknesses.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Questions List */}
                    <div className="space-y-3">
                      {latestAnalysis.interviewQuestions.map((q: any) => {
                        const isSelectedQ = selectedQuestion?.id === q.id;
                        return (
                          <div
                            key={q.id}
                            onClick={() => {
                              setSelectedQuestion(q);
                              setUserAnswer("");
                              setAnswerEvaluation(null);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${isSelectedQ
                                ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-indigo-700">{q.topic}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.difficulty === "Expert"
                                    ? "bg-rose-100 text-rose-800"
                                    : q.difficulty === "Advanced"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                            <h5 className="font-bold text-sm text-slate-900">{q.question}</h5>
                            <p className="text-[11px] text-slate-500">
                              Traceable Evidence: <em>{q.traceableEvidence}</em>
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Practice Arena & AI Evaluation Box */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                      {selectedQuestion ? (
                        <>
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                              Defense Practice · {selectedQuestion.topic}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm">{selectedQuestion.question}</h4>
                            <div className="text-[11px] text-slate-500 pt-1">
                              <strong>Expected Concepts:</strong> {selectedQuestion.expectedConcepts?.join(", ")}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">Your Technical Answer:</label>
                            <textarea
                              rows={5}
                              value={userAnswer}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              placeholder="Explain your architectural reasoning, data flow, error handling, or trade-offs as you would to a senior engineer..."
                              className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <button
                              onClick={handleEvaluateAnswer}
                              disabled={isEvaluatingAnswer || !userAnswer.trim()}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {isEvaluatingAnswer ? "AI Evaluating..." : "Submit Answer for Evaluation"}
                            </button>
                          </div>

                          {/* Evaluation Result */}
                          {answerEvaluation && (
                            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 animate-in fade-in text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900">AI Interview Feedback</span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-bold ${getScoreBadgeBg(
                                    answerEvaluation.score
                                  )}`}
                                >
                                  Score: {answerEvaluation.score}/100 ({answerEvaluation.feedback?.technicalDepth} depth)
                                </span>
                              </div>

                              <p className="text-slate-700 leading-relaxed">
                                {answerEvaluation.feedback?.detailedReview}
                              </p>

                              {answerEvaluation.feedback?.missingConcepts?.length > 0 && (
                                <div className="p-2.5 bg-amber-50 rounded-lg text-amber-800">
                                  <strong>Concepts to Strengthen:</strong>{" "}
                                  {answerEvaluation.feedback.missingConcepts.join(", ")}
                                </div>
                              )}

                              {answerEvaluation.followUpQuestion && (
                                <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-900">
                                  <strong>Follow-up Probing Question:</strong> {answerEvaluation.followUpQuestion}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12 text-slate-400 space-y-2">
                          <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="text-xs">Select a question on the left to practice your technical defense.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: AUDIT HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">Readiness Improvement Over Time</h4>
              {analysisHistory.length === 0 ? (
                <p className="text-slate-500 text-xs">No previous audit runs recorded.</p>
              ) : (
                <div className="space-y-3">
                  {analysisHistory.map((hist, i) => (
                    <div
                      key={hist.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Run #{analysisHistory.length - i}</span>
                          <span className="text-slate-500">{new Date(hist.analyzedAt).toLocaleString()}</span>
                          <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] text-slate-700">
                            {hist.providerUsed}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 line-clamp-1">{hist.summaryVerdict}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-lg font-black ${getScoreColor(hist.readinessScores?.overall)}`}>
                          {hist.readinessScores?.overall}/100
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {hist.isResumeReady ? "🟢 Ready" : "🟡 Needs Revision"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: UPDATE & MODERNIZATION SUGGESTIONS (FOR COMPLETED PROJECTS) */}
          {activeTab === "updates" && (
            <div className="space-y-6">
              {!latestAnalysis ? (
                <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <Sparkles className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-slate-900">No Modernization Analysis Yet</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    Click "Run Deep Verification" above to analyze this completed project repository and receive actionable upgrade suggestions for your resume.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Banner */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-emerald-600 text-white">
                        <Sparkles className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          Actionable Modernization & Update Suggestions
                        </h3>
                        <p className="text-xs text-emerald-800">
                          Tailored for completed projects to elevate architectural depth and technical interview defense.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pt-2">
                      Because this project is marked as <strong>Completed</strong>, target completion date is omitted. PlacementOS evaluated your repository code, libraries, and security patterns to identify high-leverage enhancements that recruiters look for.
                    </p>
                  </div>

                  {/* 5 Suggestion Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* 1. Architectural Enhancements */}
                    <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                        <Cpu className="w-4 h-4 text-indigo-600" />
                        <span>Architectural Enhancements & Scalability</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Structural patterns, caching, concurrency, and performance decoupling to discuss in system design interviews.
                      </p>
                      <div className="space-y-2 pt-1">
                        {(latestAnalysis.updateSuggestions?.architecturalEnhancements || []).map((item: string, i: number) => (
                          <div key={i} className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-800 flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. Modernization & Security */}
                    <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>Security Hardening & Modernization</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        OWASP compliance, secrets management, rate limiting, and zero-trust security practices.
                      </p>
                      <div className="space-y-2 pt-1">
                        {(latestAnalysis.updateSuggestions?.modernizationAndSecurity || []).map((item: string, i: number) => (
                          <div key={i} className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs text-slate-800 flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-lg bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Feature Additions */}
                    <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-violet-700 font-bold text-sm">
                        <Zap className="w-4 h-4 text-violet-600" />
                        <span>High-Impact Feature Additions</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Advanced capabilities that make your project stand out from cookie-cutter tutorial projects.
                      </p>
                      <div className="space-y-2 pt-1">
                        {(latestAnalysis.updateSuggestions?.featureAdditions || []).map((item: string, i: number) => (
                          <div key={i} className="p-3 rounded-2xl bg-violet-50/50 border border-violet-100 text-xs text-slate-800 flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-lg bg-violet-100 text-violet-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. Testing & Observability */}
                    <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Testing, CI/CD & Observability</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Automated testing suites, structured logging, health checks, and production readiness proofs.
                      </p>
                      <div className="space-y-2 pt-1">
                        {(latestAnalysis.updateSuggestions?.testingAndObservability || []).map((item: string, i: number) => (
                          <div key={i} className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-800 flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5. Resume Multipliers */}
                  <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      <h4 className="font-bold text-sm text-amber-300">Resume Impact Multipliers</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Recommended quantitative metrics, architectural phrasing, and high-impact bullet formulas based on this project.
                    </p>
                    <div className="space-y-2.5">
                      {(latestAnalysis.updateSuggestions?.resumeImpactMultipliers || []).map((item: string, i: number) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 leading-relaxed flex items-start gap-3">
                          <span className="w-5 h-5 rounded-lg bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                            ★
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: ROADMAP VS ACTUAL PROGRESS (FOR FRESH PROJECTS) */}
          {activeTab === "roadmap" && (
            <div className="space-y-6">
              {!latestAnalysis ? (
                <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <BarChart2 className="w-8 h-8 text-indigo-600 mx-auto" />
                  <h4 className="font-bold text-slate-900">No Roadmap Comparison Report Yet</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    Click "Run Deep Verification" above to parse your project roadmap PDF and compare planned deliverables against your live Git commits.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Deadline Adherence & File Header */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 via-slate-50 to-white border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                          Roadmap vs. Actual Repository Execution
                        </span>
                        {latestAnalysis.roadmapComparison?.deadlineAdherence === "on_track" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            🟢 On Track for Deadline
                          </span>
                        )}
                        {latestAnalysis.roadmapComparison?.deadlineAdherence === "at_risk" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            🟡 At Risk of Slippage
                          </span>
                        )}
                        {latestAnalysis.roadmapComparison?.deadlineAdherence === "behind_schedule" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            🔴 Behind Schedule
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-slate-900">
                        Delivery Velocity & Milestone Gap Analysis
                      </h3>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Target className="w-3.5 h-3.5 text-indigo-600" />
                          Target Deadline: {latestAnalysis.targetDate || selectedProject.targetDate || "Not Specified"}
                        </span>
                        {(latestAnalysis.roadmapFileName || selectedProject.roadmapFileName) && (
                          <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            Source: {latestAnalysis.roadmapFileName || selectedProject.roadmapFileName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500 block font-medium">Milestone Completion</span>
                      <span className="text-2xl font-black text-indigo-600">{selectedProject.progress}%</span>
                    </div>
                  </div>

                  {/* Velocity Narrative Analysis */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      Delivery Velocity Assessment
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {latestAnalysis.roadmapComparison?.deliveryVelocityAnalysis ||
                        "Analysis of current commit velocity indicates development is actively progressing towards targeted deliverables."}
                    </p>
                  </div>

                  {/* Deliverables Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Completed / Implemented */}
                    <div className="p-5 rounded-3xl bg-white border border-emerald-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Completed & Verified Deliverables
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          {(latestAnalysis.roadmapComparison?.completedDeliverables || []).length} Verified
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(latestAnalysis.roadmapComparison?.completedDeliverables || []).map((item: string, i: number) => (
                          <div key={i} className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                              ✓
                            </span>
                            <span className="leading-relaxed font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Deliverables */}
                    <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-amber-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Pending Roadmap Deliverables
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                          {(latestAnalysis.roadmapComparison?.pendingDeliverables || []).length} Remaining
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(latestAnalysis.roadmapComparison?.pendingDeliverables || []).map((item: string, i: number) => (
                          <div key={i} className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 text-xs text-amber-950 flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                              ⏳
                            </span>
                            <span className="leading-relaxed font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Critical Gap Analysis & Critical Path */}
                  <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4">
                    <h4 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-indigo-400" />
                      Critical Path: Action Items to Hit Target Deadline
                    </h4>
                    <div className="space-y-2.5">
                      {(latestAnalysis.roadmapComparison?.gapAnalysis || []).map((gap: string, i: number) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                            {i + 1}
                          </span>
                          <span>{gap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT PROJECT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {isEditMode ? "Edit Project Details" : "Add Resume Showcase Project"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-populates the 11 lifecycle milestones from Idea to Resume Readiness.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-5 text-xs">
              {/* Completed vs Fresh Selector Cards */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block text-xs">
                  Project Lifecycle Status *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, projectStatus: "completed", targetDate: "" })}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${formData.projectStatus === "completed"
                        ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                        <Award className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">Already Completed</h4>
                        <span className="text-[10px] text-emerald-700 font-semibold">100% Built & Implemented</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                      No target deadline needed. Verification will audit code and deliver <strong>actionable modernization & upgrade suggestions</strong> to maximize resume impact.
                    </p>
                    {formData.projectStatus === "completed" && (
                      <span className="absolute top-3 right-3 text-emerald-600 font-bold text-xs">✓ Active</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, projectStatus: "fresh" })}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${formData.projectStatus === "fresh"
                        ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                        <Rocket className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">Fresh / In-Progress</h4>
                        <span className="text-[10px] text-indigo-700 font-semibold">Under Active Development</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                      Requires <strong>target deadline</strong> and accepts a <strong>Project Roadmap PDF</strong>. Backend compares roadmap deliverables against commits for velocity analysis.
                    </p>
                    {formData.projectStatus === "fresh" && (
                      <span className="absolute top-3 right-3 text-indigo-600 font-bold text-xs">✓ Active</span>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Distributed Task Orchestrator"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Project Objective & Description *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain the problem solved, core system architecture, and intended scale..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Technologies (Comma Separated)</label>
                  <input
                    type="text"
                    value={formData.technologies}
                    onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                    placeholder="React, Next.js, Node, PostgreSQL, Redis, Docker"
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">GitHub Repository URL *</label>
                  <input
                    type="text"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    placeholder="https://github.com/username/project-repo"
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Live Deployment URL (Optional)</label>
                  <input
                    type="text"
                    value={formData.liveUrl}
                    onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })}
                    placeholder="https://myproject.vercel.app"
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Project Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Conditional Target Completion Date & Roadmap PDF */}
              {formData.projectStatus === "completed" ? (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Target Completion Date Omitted (Project Completed)</strong>
                    <span className="text-[11px] text-emerald-700 leading-relaxed">
                      Since this project is completed, the target deadline is not needed. All 11 lifecycle milestones start at 100% completion. The AI verification engine will audit your repository and provide actionable modernization & update suggestions to elevate your project on your resume.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Target Completion Date (Project Deadline) *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.targetDate}
                      onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Project Roadmap PDF Upload */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="font-bold text-slate-800 block text-xs">
                          Project Roadmap Document (PDF)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Upload your project roadmap, syllabus, or PRD to compare planned deliverables against your Git commits.
                        </p>
                      </div>
                      {formData.roadmapFileName && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, roadmapFileName: "", roadmapBase64Pdf: "" })}
                          className="text-[11px] text-rose-600 hover:underline font-semibold"
                        >
                          Remove PDF
                        </button>
                      )}
                    </div>

                    {formData.roadmapFileName ? (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-200 text-xs">
                        <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div className="flex-1 truncate">
                          <span className="font-bold text-slate-900 block truncate">{formData.roadmapFileName}</span>
                          <span className="text-[10px] text-emerald-600 font-semibold">✓ Roadmap PDF attached for comparative analysis</span>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-indigo-200 rounded-xl bg-white hover:bg-indigo-50/50 cursor-pointer transition-colors text-center">
                        <FileUp className="w-6 h-6 text-indigo-500 mb-1" />
                        <span className="text-xs font-bold text-indigo-700">Click to upload Project Roadmap PDF</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Supports PDF documents up to 10MB</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={handlePdfUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Key Features Claimed (One per line)</label>
                <textarea
                  rows={3}
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="JWT Authentication & Role-based Access&#10;Real-time WebSocket Notifications&#10;Redis Rate Limiting"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  {isEditMode ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TARGET PROJECT COUNT CONFIG MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Configure Target Project Count</h3>
              <p className="text-xs text-slate-500 mt-1">
                Customize how many key projects you intend to showcase on your resume (e.g. 3, 4, or 5).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Target Number of Projects:</label>
              <div className="flex items-center gap-3">
                {[2, 3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setTempTargetCount(cnt)}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${tempTargetCount === cnt
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateTargetCount}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
              >
                Save Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
