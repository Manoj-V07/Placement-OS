"use client";

import { useEffect, useState, useMemo } from "react";
import api from "../../../lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { Zap, Target, BookOpen } from "lucide-react";

interface Topic {
  id: string;
  skillId: string;
  skillName?: string;
  name: string;
  mastery: number;
  lastStudied: string | null;
  nextReview: string | null;
  studyCount: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  mastery: number;
  topics?: Topic[];
  createdAt?: string;
  updatedAt?: string;
}

interface Analytics {
  weakTopics: Topic[];
  topicsToReview: Topic[];
}

export default function SkillsOverviewPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMasteryFilter, setSelectedMasteryFilter] = useState("All");

  // New Skill Modal
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("Frontend");
  const [creatingSkill, setCreatingSkill] = useState(false);

  useEffect(() => {
    fetchSkillsData();
  }, []);

  const fetchSkillsData = async () => {
    try {
      const [skillsRes, analyticsRes] = await Promise.all([
        api.get("/skills"),
        api.get("/skills/analytics").catch(() => ({ data: { success: false, data: null } }))
      ]);

      if (skillsRes.data.success) {
        setSkills(skillsRes.data.data);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load skills", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setCreatingSkill(true);
    try {
      const res = await api.post("/skills", {
        name: newSkillName.trim(),
        category: newSkillCategory || "General"
      });
      if (res.data.success) {
        const newSkill = res.data.data;
        setShowAddSkill(false);
        setNewSkillName("");
        // Navigate immediately to the skill roadmap page
        router.push(`/dashboard/skills/${newSkill.id}`);
      }
    } catch (err) {
      console.error("Failed to create skill", err);
    } finally {
      setCreatingSkill(false);
    }
  };

  // Find recently studied topic or skill
  const recentlyStudied = useMemo(() => {
    if (!skills.length) return null;

    let latestTopic: { skill: Skill; topic: Topic } | null = null;
    let latestTime = 0;

    skills.forEach((skill) => {
      skill.topics?.forEach((topic) => {
        if (topic.lastStudied) {
          const t = new Date(topic.lastStudied).getTime();
          if (t > latestTime) {
            latestTime = t;
            latestTopic = { skill, topic };
          }
        }
      });
    });

    if (latestTopic) return latestTopic;

    // Fallback: check profile.lastViewedSkillId
    if (profile?.lastViewedSkillId) {
      const found = skills.find((s) => s.id === profile.lastViewedSkillId);
      if (found) {
        return {
          skill: found,
          topic: found.topics?.[0] || null
        };
      }
    }

    // Default to first skill if has topics
    if (skills[0]?.topics?.length) {
      return { skill: skills[0], topic: skills[0].topics[0] };
    }

    return null;
  }, [skills, profile]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    skills.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [skills]);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || skill.category === selectedCategory;
      let matchesMastery = true;
      if (selectedMasteryFilter === "Mastered") {
        matchesMastery = skill.mastery >= 80;
      } else if (selectedMasteryFilter === "In Progress") {
        matchesMastery = skill.mastery > 0 && skill.mastery < 80;
      } else if (selectedMasteryFilter === "Not Started") {
        matchesMastery = skill.mastery === 0;
      }
      return matchesSearch && matchesCategory && matchesMastery;
    });
  }, [skills, searchQuery, selectedCategory, selectedMasteryFilter]);

  // Concentrated / High Priority Topics across all skills (mastery < 50% or review due)
  const concentratedTopics = useMemo(() => {
    const list: Array<{ skillId: string; skillName: string; topic: Topic }> = [];
    skills.forEach((skill) => {
      skill.topics?.forEach((topic) => {
        if (topic.mastery < 60 || (topic.nextReview && new Date(topic.nextReview) <= new Date())) {
          list.push({ skillId: skill.id, skillName: skill.name, topic });
        }
      });
    });
    return list.slice(0, 4);
  }, [skills]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Loading skills catalogue & roadmaps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Technical Skills & Roadmaps</h1>
          <p className="text-slate-500 text-sm mt-1">
            Navigate through ordered topic timelines, practice concepts, and get evaluated by AI.
          </p>
        </div>

        <button
          onClick={() => setShowAddSkill(true)}
          className="btn-primary py-2.5 px-5 font-semibold text-sm self-start sm:self-auto shadow-md shadow-indigo-500/20"
        >
          + Add New Skill
        </button>
      </div>

      {/* SECTION 1: PREVIOUSLY VIEWED / RESUME LEARNING */}
      {recentlyStudied && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-indigo-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Recently Studied</span>
            </div>
            <h3 className="text-xl font-display font-bold">
              {recentlyStudied.skill.name} {recentlyStudied.topic ? `→ ${recentlyStudied.topic.name}` : ""}
            </h3>
            <p className="text-xs text-slate-300">
              Mastery: {recentlyStudied.topic ? `${recentlyStudied.topic.mastery}%` : `${recentlyStudied.skill.mastery}%`} •{" "}
              {recentlyStudied.topic?.lastStudied
                ? `Last studied ${new Date(recentlyStudied.topic.lastStudied).toLocaleDateString()}`
                : "Ready to practice"}
            </p>
          </div>

          <Link
            href={`/dashboard/skills/${recentlyStudied.skill.id}`}
            className="btn-primary bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-xl text-sm shadow-md"
          >
            Continue Learning Roadmap →
          </Link>
        </div>
      )}

      {/* SECTION 2: CONCENTRATED PRIORITY TOPICS */}
      {concentratedTopics.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 className="font-display font-bold text-lg text-slate-900">
                Concentrated Topics (Needs Focus Across Skills)
              </h3>
            </div>
            <span className="text-xs text-slate-400">Low mastery or due for revision</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {concentratedTopics.map(({ skillId, skillName, topic }) => (
              <div
                key={topic.id}
                className="card glass-card p-4 border-slate-200/90 hover:border-indigo-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">{skillName}</span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                        topic.mastery < 40 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {topic.mastery}%
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900 line-clamp-2">{topic.name}</h4>
                </div>

                <Link
                  href={`/dashboard/skills/${skillId}`}
                  className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between pt-3 border-t border-slate-100"
                >
                  <span>Practice with AI</span>
                  <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: SEARCH & FILTERS BAR */}
      <div className="card glass-card p-4 border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="w-full md:w-72">
          <input
            type="text"
            className="input-field py-2 text-sm"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Mastery Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedMasteryFilter}
            onChange={(e) => setSelectedMasteryFilter(e.target.value)}
            className="input-field py-2 text-xs w-auto bg-slate-50 font-medium"
          >
            <option value="All">All Mastery Levels</option>
            <option value="In Progress">In Progress (&gt;0% &lt;80%)</option>
            <option value="Mastered">Mastered (&ge;80%)</option>
            <option value="Not Started">Not Started (0%)</option>
          </select>
        </div>
      </div>

      {/* SECTION 4: SKILLS LISTING GRID */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display font-bold text-xl text-slate-900">
            Enrolled Skills ({filteredSkills.length})
          </h3>
          <span className="text-xs text-slate-400">Click any skill to open its order-tracking roadmap</span>
        </div>

        {filteredSkills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSkills.map((skill) => {
              const count = skill.topics?.length || 0;
              const mastered = skill.topics?.filter((t) => t.mastery >= 80).length || 0;
              const statusLabel =
                skill.mastery >= 80 ? "Mastered" : skill.mastery > 0 ? "In Progress" : "Not Started";

              return (
                <div
                  key={skill.id}
                  onClick={() => router.push(`/dashboard/skills/${skill.id}`)}
                  className="card glass-card p-6 border-slate-200/90 hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="badge badge-indigo mb-1.5">{skill.category}</span>
                        <h4 className="font-display font-bold text-xl text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {skill.name}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-2xl text-indigo-600">{skill.mastery}%</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-4">
                      {count} {count === 1 ? "topic" : "topics"} in curriculum • {mastered} mastered
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          skill.mastery >= 80 ? "bg-emerald-500" : skill.mastery > 40 ? "bg-indigo-600" : "bg-amber-500"
                        }`}
                        style={{ width: `${skill.mastery}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500">{statusLabel}</span>
                    <span className="font-bold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Open Roadmap →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 card border-dashed border-2 border-slate-200 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-8 h-8" />
            </div>
            <h4 className="font-display font-bold text-xl text-slate-900 mb-1">No Skills Found</h4>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
              {searchQuery ? "No skills matched your search filter." : "Create your first skill category to start building your placement syllabus."}
            </p>
            <button onClick={() => setShowAddSkill(true)} className="btn-primary py-2.5 px-6 text-sm font-semibold">
              + Add New Skill Track
            </button>
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      {showAddSkill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-bold text-xl text-slate-900 mb-1">Create New Skill Track</h3>
            <p className="text-xs text-slate-500 mb-5">
              Add a technical skill like React, DSA, Docker, or System Design. You will be able to bulk import topics or generate them using AI next!
            </p>

            <form onSubmit={handleCreateSkill} className="space-y-4">
              <div>
                <label className="label">Skill Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. React, Node.js, Dynamic Programming"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="input-field"
                >
                  <option value="Frontend">Frontend Development</option>
                  <option value="Backend">Backend Development</option>
                  <option value="DSA">Data Structures & Algorithms</option>
                  <option value="System Design">System Design & Architecture</option>
                  <option value="DevOps">DevOps & Cloud</option>
                  <option value="Database">Databases & SQL</option>
                  <option value="Core CS">Core CS (OS, Networks, DBMS)</option>
                  <option value="General">General Technical</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSkill(false)}
                  className="btn-secondary flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSkill}
                  className="btn-primary flex-1 py-2 text-xs font-semibold"
                >
                  {creatingSkill ? "Creating..." : "Create & Open Roadmap"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
