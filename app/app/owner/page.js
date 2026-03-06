"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Palette,
  Users,
  Share2,
  Image,
  Crown,
  ClipboardList,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "questions", label: "Questions", icon: ClipboardList },
  { id: "design", label: "Design", icon: Palette },
  { id: "users", label: "Users", icon: Users },
  { id: "socials", label: "Socials", icon: Share2 },
  { id: "og", label: "OG Creator", icon: Image },
];

export default function Owner() {
  const { isOwner } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");

  // Non-owners get bounced
  if (!isOwner) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div
            style={{
              padding: "var(--space-2-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Crown size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
              Owner Portal
            </span>
          </div>

          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-1)",
              padding: "0 var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1-5)",
                    padding: "var(--space-2-5) var(--space-3)",
                    border: "none",
                    borderBottom: active ? "1px solid var(--color-text)" : "1px solid transparent",
                    background: "transparent",
                    borderRadius: 0,
                    color: active ? "var(--color-text)" : "var(--color-text-muted)",
                    fontWeight: "var(--font-weight-medium)",
                    marginBottom: -1,
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-primary)",
                    cursor: "pointer",
                    transition: `all var(--duration-fast) var(--ease-default)`,
                  }}
                >
                  <t.icon size={14} strokeWidth={1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6)" }}>
            {tab === "dashboard" && <DashboardTab />}
            {tab === "questions" && <QuestionsTab />}
            {tab === "design" && <PlaceholderTab title="Design System" description="Color editor, type preview, component preview. Coming soon." />}
            {tab === "users" && <PlaceholderTab title="Users" description="Invite tree, usage stats, revenue per user. Coming soon." />}
            {tab === "socials" && <PlaceholderTab title="Socials" description="Social post templates, scheduling, brand voice. Coming soon." />}
            {tab === "og" && <PlaceholderTab title="OG Image Creator" description="Template editor with brand tokens. Coming soon." />}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function DashboardTab() {
  const metrics = [
    { label: "Total Users", value: "1", change: "You" },
    { label: "Active This Week", value: "1", change: "100%" },
    { label: "Messages Today", value: "0", change: "—" },
    { label: "MRR", value: "$0", change: "Pre-launch" },
  ];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
        {metrics.map((m, i) => (
          <div
            key={i}
            style={{
              padding: "var(--space-4)",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              {m.label}
            </div>
            <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>
              {m.value}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginTop: "var(--space-1)" }}>
              {m.change}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "var(--space-4)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)",
        }}
      >
        This is your command center. Metrics, user management, design tools, and content creation — all here. Tabs will fill in as we build them out.
      </div>
    </div>
  );
}

function PlaceholderTab({ title, description }) {
  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)" }}>
        {title}
      </h2>
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
        {description}
      </p>
    </div>
  );
}

/* ─── Shared inline-style helpers ─── */
const inputStyle = {
  width: "100%",
  padding: "var(--space-2) var(--space-2-5)",
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-text)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "var(--font-primary)",
  outline: "none",
};

const btnSmall = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  padding: "var(--space-1-5) var(--space-2-5)",
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-xs)",
  fontFamily: "var(--font-primary)",
  fontWeight: "var(--font-weight-medium)",
  cursor: "pointer",
};

const btnDanger = {
  ...btnSmall,
  border: "1px solid var(--color-error, #e53e3e)",
  color: "var(--color-error, #e53e3e)",
};

const btnPrimary = {
  ...btnSmall,
  background: "var(--color-text)",
  color: "var(--color-bg)",
  border: "1px solid var(--color-text)",
};

const cardStyle = {
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-lg)",
  background: "var(--color-bg-elevated)",
  marginBottom: "var(--space-2)",
};

/* ─── Questions Tab ─── */
function QuestionsTab() {
  const [phases, setPhases] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingPhase, setEditingPhase] = useState(null);
  const [addingTo, setAddingTo] = useState(null); // phase_id currently adding to

  const fetchAll = useCallback(async () => {
    const [{ data: p }, { data: q }] = await Promise.all([
      supabase.from("question_phases").select("*").order("sort_order"),
      supabase.from("questions").select("*").order("sort_order"),
    ]);
    setPhases(p || []);
    setQuestions(q || []);
    // expand all phases by default on first load
    if (Object.keys(expandedPhases).length === 0 && p?.length) {
      const exp = {};
      p.forEach((ph) => (exp[ph.id] = true));
      setExpandedPhases(exp);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const togglePhase = (id) =>
    setExpandedPhases((prev) => ({ ...prev, [id]: !prev[id] }));

  /* ── Phase CRUD ── */
  const savePhase = async (phase) => {
    const { error } = await supabase
      .from("question_phases")
      .update({ label: phase.label, intro: phase.intro })
      .eq("id", phase.id);
    if (!error) {
      setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, ...phase } : p)));
      setEditingPhase(null);
    }
  };

  const addPhase = async () => {
    const maxSort = phases.reduce((mx, p) => Math.max(mx, p.sort_order || 0), 0);
    const { data, error } = await supabase
      .from("question_phases")
      .insert({ label: "New Phase", intro: "", sort_order: maxSort + 1 })
      .select()
      .single();
    if (!error && data) {
      setPhases((prev) => [...prev, data]);
      setExpandedPhases((prev) => ({ ...prev, [data.id]: true }));
      setEditingPhase(data.id);
    }
  };

  const deletePhase = async (id) => {
    const count = questions.filter((q) => q.phase_id === id).length;
    if (count > 0 && !window.confirm(`Delete phase and its ${count} question(s)?`)) return;
    await supabase.from("questions").delete().eq("phase_id", id);
    await supabase.from("question_phases").delete().eq("id", id);
    setPhases((prev) => prev.filter((p) => p.id !== id));
    setQuestions((prev) => prev.filter((q) => q.phase_id !== id));
  };

  /* ── Question CRUD ── */
  const saveQuestion = async (q) => {
    const { error } = await supabase
      .from("questions")
      .update({
        text: q.text,
        why: q.why,
        type: q.type,
        options: q.options,
        placeholder: q.placeholder,
        skippable: q.skippable,
        multi: q.multi,
      })
      .eq("id", q.id);
    if (!error) {
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...q } : x)));
      setEditingQuestion(null);
    }
  };

  const addQuestion = async (phaseId) => {
    const phaseQs = questions.filter((q) => q.phase_id === phaseId);
    const maxSort = phaseQs.reduce((mx, q) => Math.max(mx, q.sort_order || 0), 0);
    const { data, error } = await supabase
      .from("questions")
      .insert({
        phase_id: phaseId,
        question_id: `q_${Date.now()}`,
        text: "",
        why: "",
        type: "text",
        options: null,
        placeholder: "",
        skippable: true,
        multi: false,
        sort_order: maxSort + 1,
      })
      .select()
      .single();
    if (!error && data) {
      setQuestions((prev) => [...prev, data]);
      setEditingQuestion(data.id);
      setAddingTo(null);
    }
  };

  const deleteQuestion = async (id) => {
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (editingQuestion === id) setEditingQuestion(null);
  };

  if (loading) {
    return (
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
        Loading questions...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <div>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-1)" }}>
            Onboarding Questions
          </h2>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            {phases.length} phases, {questions.length} questions
          </p>
        </div>
        <button onClick={addPhase} style={btnPrimary}>
          <Plus size={12} /> Add Phase
        </button>
      </div>

      {phases.map((phase) => {
        const phaseQs = questions
          .filter((q) => q.phase_id === phase.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const expanded = expandedPhases[phase.id];

        return (
          <div key={phase.id} style={{ ...cardStyle, marginBottom: "var(--space-4)" }}>
            {/* Phase header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-3) var(--space-4)",
                cursor: "pointer",
              }}
              onClick={() => togglePhase(phase.id)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {editingPhase === phase.id ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }} onClick={(e) => e.stopPropagation()}>
                  <input
                    value={phase.label}
                    onChange={(e) => setPhases((prev) => prev.map((p) => p.id === phase.id ? { ...p, label: e.target.value } : p))}
                    style={{ ...inputStyle, fontWeight: "var(--font-weight-semibold)" }}
                    placeholder="Phase name"
                  />
                  <input
                    value={phase.intro || ""}
                    onChange={(e) => setPhases((prev) => prev.map((p) => p.id === phase.id ? { ...p, intro: e.target.value } : p))}
                    style={inputStyle}
                    placeholder="Intro text shown to user"
                  />
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button onClick={() => savePhase(phase)} style={btnPrimary}>Save</button>
                    <button onClick={() => setEditingPhase(null)} style={btnSmall}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                      {phase.label}
                    </span>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginLeft: "var(--space-2)" }}>
                      {phaseQs.length} question{phaseQs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingPhase(phase.id); }}
                    style={{ ...btnSmall, padding: "var(--space-1) var(--space-2)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePhase(phase.id); }}
                    style={{ ...btnDanger, padding: "var(--space-1) var(--space-2)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>

            {phase.intro && editingPhase !== phase.id && (
              <div style={{ padding: "0 var(--space-4) var(--space-2)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                {phase.intro}
              </div>
            )}

            {/* Questions list */}
            {expanded && (
              <div style={{ padding: "0 var(--space-4) var(--space-3)" }}>
                {phaseQs.map((q, qi) => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    index={qi}
                    editing={editingQuestion === q.id}
                    onEdit={() => setEditingQuestion(q.id)}
                    onSave={saveQuestion}
                    onCancel={() => setEditingQuestion(null)}
                    onDelete={() => deleteQuestion(q.id)}
                  />
                ))}

                <button
                  onClick={() => addQuestion(phase.id)}
                  style={{ ...btnSmall, marginTop: "var(--space-2)" }}
                >
                  <Plus size={12} /> Add Question
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Single question row ─── */
function QuestionRow({ q, index, editing, onEdit, onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(q);

  useEffect(() => { setDraft(q); }, [q]);

  const update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const toggleType = () => {
    if (draft.type === "text") {
      update("type", "choice");
      if (!draft.options || draft.options.length === 0) {
        setDraft((prev) => ({ ...prev, type: "choice", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] }));
      }
    } else {
      setDraft((prev) => ({ ...prev, type: "text", options: null }));
    }
  };

  const addOption = () => {
    const opts = draft.options || [];
    const letters = "ABCDEFGHIJ";
    const next = letters[opts.length] || String(opts.length + 1);
    setDraft((prev) => ({ ...prev, options: [...opts, { label: next, value: next.toLowerCase() }] }));
  };

  const removeOption = (i) => {
    setDraft((prev) => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }));
  };

  const updateOption = (i, field, value) => {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.map((opt, idx) => (idx === i ? { ...opt, [field]: value } : opt)),
    }));
  };

  if (!editing) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-2)",
          padding: "var(--space-2) 0",
          borderBottom: "1px solid var(--color-border-light)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", minWidth: 20, paddingTop: 2 }}>
          {index + 1}.
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-normal)" }}>
            {q.text || <span style={{ color: "var(--color-text-dim)", fontStyle: "italic" }}>Empty question</span>}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
            <span style={{
              fontSize: "var(--font-size-2xs)",
              padding: "1px var(--space-1-5)",
              borderRadius: "var(--radius-sm)",
              background: q.type === "choice" ? "var(--color-accent-dim, rgba(99,102,241,0.1))" : "var(--color-bg-surface)",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--letter-spacing-wider)",
            }}>
              {q.type === "choice" ? `${q.options?.length || 0} choices` : "text"}
            </span>
            {q.skippable && (
              <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>skippable</span>
            )}
          </div>
        </div>
        <button onClick={onEdit} style={{ ...btnSmall, padding: "var(--space-1) var(--space-2)" }}>Edit</button>
        <button onClick={onDelete} style={{ ...btnDanger, padding: "var(--space-1) var(--space-2)" }}>
          <Trash2 size={11} />
        </button>
      </div>
    );
  }

  // Editing mode
  return (
    <div
      style={{
        padding: "var(--space-3)",
        border: "1px solid var(--color-text)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--space-2)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {/* Question text */}
      <div>
        <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
          Question
        </label>
        <textarea
          value={draft.text}
          onChange={(e) => update("text", e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="What do you want to ask?"
        />
      </div>

      {/* Why */}
      <div>
        <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
          Why we ask (shown to user)
        </label>
        <input
          value={draft.why || ""}
          onChange={(e) => update("why", e.target.value)}
          style={inputStyle}
          placeholder="Helps us understand..."
        />
      </div>

      {/* Type toggle + placeholder */}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
            Type
          </label>
          <button onClick={toggleType} style={{ ...btnSmall, width: "100%", justifyContent: "center" }}>
            {draft.type === "choice" ? "Multiple Choice" : "Free Text"}
          </button>
        </div>
        {draft.type === "text" && (
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
              Placeholder
            </label>
            <input
              value={draft.placeholder || ""}
              onChange={(e) => update("placeholder", e.target.value)}
              style={inputStyle}
              placeholder="Input placeholder text"
            />
          </div>
        )}
        <div>
          <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
            Skip
          </label>
          <button
            onClick={() => update("skippable", !draft.skippable)}
            style={{ ...btnSmall, width: "100%", justifyContent: "center", background: draft.skippable ? "var(--color-bg-surface)" : "var(--color-bg-elevated)" }}
          >
            {draft.skippable ? "Yes" : "No"}
          </button>
        </div>
      </div>

      {/* Choice options editor */}
      {draft.type === "choice" && (
        <div>
          <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)", display: "block" }}>
            Options
          </label>
          {(draft.options || []).map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-1-5)", alignItems: "center" }}>
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-muted)", minWidth: 16 }}>
                {String.fromCharCode(65 + i)}
              </span>
              <input
                value={opt.label}
                onChange={(e) => updateOption(i, "label", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Option label"
              />
              {(draft.options?.length || 0) > 2 && (
                <button onClick={() => removeOption(i)} style={{ ...btnDanger, padding: "var(--space-1)" }}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addOption} style={{ ...btnSmall, marginTop: "var(--space-1)" }}>
            <Plus size={11} /> Add Option
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={btnSmall}>Cancel</button>
        <button onClick={() => onSave(draft)} style={btnPrimary}>Save</button>
      </div>
    </div>
  );
}
