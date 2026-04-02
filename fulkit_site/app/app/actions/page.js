"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { CheckSquare, Plus, X, Clock, Check, MoreHorizontal, ArrowDown, ArrowUp, Minus, Copy, Layers, MessageSquareCode, Home, Trash2, Activity, SquareCheckBig, Clock1, BrushCleaning, Blend, ChevronDown, ChevronRight } from "lucide-react";
// Sidebar + header provided by AppShell in layout
import AuthGuard from "../../components/AuthGuard";
import Tooltip from "../../components/Tooltip";
import { useToolbar } from "../../components/AppShell";

const TAB_ICON_SIZE = 16;
import { useAuth } from "../../lib/auth";
import { useTrack } from "../../lib/track";
import { useOnboardingTrigger } from "../../lib/onboarding-triggers";
import { supabase } from "../../lib/supabase";
import { useIsMobile } from "../../lib/use-mobile";
import { ActionsSkeleton } from "../../components/Skeleton";

const FILTERS = [
  { key: "active", Icon: Activity },
  { key: "done", Icon: SquareCheckBig },
  { key: "deferred", Icon: Clock1 },
  { key: "dismissed", Icon: BrushCleaning },
];
const BASE_LENSES = [
  { key: "all", label: "All", Icon: Layers },
  { key: "build", label: "Build", Icon: MessageSquareCode },
  { key: "life", label: "Life", Icon: Home },
];
const HOUSEHOLD_LENS = { key: "household", label: "Household", Icon: Blend };
const PRIORITY_LABELS = { 1: "High", 2: "Normal", 3: "Low" };
const BUCKET_LABELS = { build: "Build", life: "Life", household: "Household" };


function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function buildRichCopy(action) {
  const lines = [`## ${action.title}`];
  const meta = [];
  if (action.priority) meta.push(`Priority: ${PRIORITY_LABELS[action.priority] || "—"}`);
  if (action.bucket) meta.push(`Bucket: ${BUCKET_LABELS[action.bucket] || "—"}`);
  if (action.source) meta.push(`Source: ${action.source}`);
  meta.push(`Created: ${new Date(action.created_at).toLocaleDateString()}`);
  if (action.completed_at) meta.push(`Completed: ${new Date(action.completed_at).toLocaleDateString()}`);
  lines.push(meta.join(" · "));
  if (action.description) {
    lines.push("");
    lines.push(action.description);
  }
  return lines.join("\n");
}

function PriorityBadge({ priority }) {
  if (priority == null) return <div style={{ width: 20, flexShrink: 0 }} />;
  const config = {
    1: { Icon: ArrowUp, opacity: 1 },
    2: { Icon: Minus, opacity: 0.5 },
    3: { Icon: ArrowDown, opacity: 0.35 },
  };
  const { Icon, opacity } = config[priority] || config[2];
  return (
    <div style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity }}>
      <Icon size={12} strokeWidth={2} />
    </div>
  );
}

const labelStyle = {
  fontSize: "var(--font-size-2xs)",
  fontWeight: "var(--font-weight-semibold)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--color-text-muted)",
  marginBottom: "var(--space-1)",
  display: "block",
};

const fieldInputStyle = {
  width: "100%",
  padding: "var(--space-2) var(--space-2-5)",
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-text)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "var(--font-primary)",
  outline: "none",
};

export default function Actions() {
  const { user, compactMode, accessToken } = useAuth();
  const isMobile = useIsMobile();
  const { setToolbar } = useToolbar();
  const track = useTrack();
  useEffect(() => { track("page_view", { feature: "actions" }); }, []);
  useOnboardingTrigger("actions");

  const [actions, setActions] = useState([]);
  const [actionsLoaded, setActionsLoaded] = useState(false);
  const [filter, setFilter] = useState("active");
  const [lens, setLens] = useState("all");
  const [householdPaired, setHouseholdPaired] = useState(false);
  const [householdItems, setHouseholdItems] = useState([]);
  const [householdExpanded, setHouseholdExpanded] = useState({});
  const LENSES = householdPaired ? [...BASE_LENSES, HOUSEHOLD_LENS] : BASE_LENSES;
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [addingInProgress, setAddingInProgress] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadActions();
    // Check pair status for household tab
    if (accessToken) {
      fetch("/api/household/status", { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.paired) {
            setHouseholdPaired(true);
            fetch("/api/household/items", { headers: { Authorization: `Bearer ${accessToken}` } })
              .then(r => r.ok ? r.json() : null)
              .then(d => { if (d?.items) setHouseholdItems(d.items); })
              .catch(() => {});
          }
        }).catch(() => {});
    }
  }, [user]);

  async function loadActions() {
    const { data, error } = await supabase
      .from("actions")
      .select("*")
      .eq("user_id", user.id)
      .or("scheduled_for.is.null,scheduled_for.lte." + new Date().toISOString())
      .order("priority", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) console.error("[actions] query failed:", error.message);
    if (data) {
      setActions(data);
      setActionsLoaded(true);
      // Auto-resolve onboarding fallback actions when user has completed the feature
      const onboarding = data.filter((a) => a.source === "onboarding" && a.status === "active");
      if (onboarding.length > 0) autoResolveFallbacks(onboarding);
    }
  }

  async function autoResolveFallbacks(onboarding) {
    try {
      const tags = onboarding.map((a) => a.feature_tag);
      const resolved = new Set();

      if (tags.includes("notes")) {
        const { count } = await supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        if (count > 0) resolved.add("notes");
      }
      if (tags.includes("actions")) {
        // Check if user has any non-onboarding actions
        const { count } = await supabase.from("actions").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("source", "onboarding");
        if (count > 0) resolved.add("actions");
      }
      if (tags.includes("integrations")) {
        const { count } = await supabase.from("integrations").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        if (count > 0) resolved.add("integrations");
      }
      if (tags.includes("chat")) {
        const { count } = await supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        if (count > 0) resolved.add("chat");
      }
      if (tags.includes("vault")) {
        const { data: pref } = await supabase.from("preferences").select("value").eq("key", "storage_mode").maybeSingle();
        if (pref?.value) resolved.add("vault");
      }

      if (resolved.size === 0) return;
      const toResolve = onboarding.filter((a) => resolved.has(a.feature_tag));
      const ids = toResolve.map((a) => a.id);
      setActions((prev) => prev.map((a) => ids.includes(a.id) ? { ...a, status: "done", completed_at: new Date().toISOString() } : a));
      await supabase.from("actions").update({ status: "done", completed_at: new Date().toISOString() }).in("id", ids);
    } catch (e) {
      console.error("[actions] auto-resolve failed:", e.message);
    }
  }

  const allActions = actions;
  const lensed = lens === "all" ? allActions : allActions.filter((a) => a.bucket === lens);
  const filtered = lensed.filter((a) => a.status === filter);
  const counts = {};
  for (const { key } of FILTERS) {
    counts[key] = lensed.filter((a) => a.status === key).length;
  }

  async function updateStatus(id, status) {
    if (loadingIds.has(id)) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    const updates = { status };
    if (status === "done") updates.completed_at = new Date().toISOString();
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    try {
      await supabase.from("actions").update(updates).eq("id", id);
    } finally {
      setLoadingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function updateAction(id, updates) {
    if (loadingIds.has(id)) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    try {
      await supabase.from("actions").update(updates).eq("id", id);
    } finally {
      setLoadingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function clearDone() {
    const doneIds = filtered.filter((a) => a.status === "done").map((a) => a.id);
    if (doneIds.length === 0) return;
    setActions((prev) => prev.filter((a) => !doneIds.includes(a.id)));
    setConfirmClear(false);
    await supabase.from("actions").delete().in("id", doneIds);
  }

  async function addAction() {
    const title = newTitle.trim();
    if (!title || addingInProgress) return;
    setAddingInProgress(true);
    setNewTitle("");
    setAdding(false);

    const bucket = lens !== "all" ? lens : null;

    try {
      const { data } = await supabase
        .from("actions")
        .insert({ user_id: user.id, title, source: "manual", status: "active", bucket })
        .select()
        .single();
      if (data) setActions((prev) => [...prev, data]);
    } finally {
      setAddingInProgress(false);
    }
  }

  // ─── Toolbar (AppShell header buttons) ──────────────────
  useEffect(() => {
    return () => setToolbar(null);
  }, [setToolbar]);

  useLayoutEffect(() => {
    setToolbar(
      <button
        onClick={() => setAdding(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          background: "none",
          border: "none",
          outline: "none",
          cursor: "pointer",
          fontFamily: "var(--font-primary)",
          padding: 0,
          borderRadius: "var(--radius-sm)",
          lineHeight: 1,
        }}
        title="Add action"
      >
        <Plus size={18} strokeWidth={2} />
        {!compactMode && "Add"}
      </button>
    );
  }, [compactMode, setToolbar]);

  if (!actionsLoaded) {
    return <AuthGuard><ActionsSkeleton /></AuthGuard>;
  }

  return (
    <AuthGuard>
          {/* Main tab bar — lenses */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-1)",
              padding: isMobile ? "0 var(--space-3)" : "0 var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            {LENSES.map(({ key, label, Icon }) => {
              const active = lens === key;
              return (
                <Tooltip key={key} label={label} position="bottom">
                  <button
                    type="button"
                    onClick={() => { setLens(key); setExpandedId(null); setConfirmClear(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1-5)",
                      padding: "var(--space-2-5) var(--space-3)",
                      border: "none",
                      outline: "none",
                      background: active ? "var(--color-bg-alt)" : "transparent",
                      borderRadius: "var(--radius-md)",
                      color: active ? "var(--color-text)" : "var(--color-text-muted)",
                      fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                      fontSize: "var(--font-size-xs)",
                      fontFamily: "var(--font-primary)",
                      cursor: "pointer",
                      transition: `background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)`,
                    }}
                  >
                    <Icon size={TAB_ICON_SIZE} strokeWidth={1.8} style={{ pointerEvents: "none" }} />
                    {!compactMode && label}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Household tab — full expanded view */}
            {lens === "household" ? (
              <HouseholdView
                items={householdItems}
                setItems={setHouseholdItems}
                expanded={householdExpanded}
                setExpanded={setHouseholdExpanded}
                accessToken={accessToken}
                isMobile={isMobile}
              />
            ) : (<>
            {/* Sub-nav — filters (indented, matches Owner sub-nav pattern) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                padding: isMobile ? "var(--space-3) var(--space-3)" : "var(--space-3) var(--space-6)",
              }}
            >
              {FILTERS.map(({ key, Icon }) => {
                const active = filter === key;
                return (
                  <Tooltip key={key} label={key} position="bottom">
                    <button
                      type="button"
                      onClick={() => { setFilter(key); setExpandedId(null); setConfirmClear(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-1-5)",
                        padding: "var(--space-2-5) var(--space-3)",
                        border: "none",
                        outline: "none",
                        background: active ? "var(--color-bg-alt)" : "transparent",
                        borderRadius: "var(--radius-md)",
                        color: active ? "var(--color-text)" : "var(--color-text-muted)",
                        fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                        fontSize: "var(--font-size-xs)",
                        fontFamily: "var(--font-primary)",
                        cursor: "pointer",
                        textTransform: "capitalize",
                        transition: `background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)`,
                      }}
                    >
                      <Icon size={TAB_ICON_SIZE} strokeWidth={1.8} style={{ pointerEvents: "none" }} />
                      {!compactMode && key}
                      {counts[key] > 0 && (
                        <span
                          style={{
                            fontSize: "var(--font-size-2xs)",
                            fontFamily: "var(--font-mono)",
                            color: active ? "var(--color-text-secondary)" : "var(--color-text-dim)",
                            fontWeight: "var(--font-weight-bold)",
                          }}
                        >
                          {counts[key]}
                        </span>
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </div>

            {/* Action list */}
            <div style={{ padding: isMobile ? "0 var(--space-3) var(--space-6)" : "0 var(--space-6) var(--space-6)" }}>
            <div>
              {/* Add action inline */}
              {adding && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-2-5) var(--space-4)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-accent)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addAction();
                      if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
                    }}
                    placeholder="What needs to get done?"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "var(--font-size-sm)",
                      fontFamily: "var(--font-primary)",
                      color: "var(--color-text)",
                    }}
                  />
                  <button
                    onClick={addAction}
                    style={{
                      padding: "var(--space-1) var(--space-2-5)",
                      background: "var(--color-accent)",
                      color: "var(--color-text-inverse)",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-size-2xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      fontFamily: "var(--font-primary)",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAdding(false); setNewTitle(""); }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              )}

              {/* Clear done */}
              {filter === "done" && filtered.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "var(--space-2)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {confirmClear ? (
                    <>
                      <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>
                        Clear {filtered.length} done?
                      </span>
                      <button
                        onClick={clearDone}
                        style={{
                          padding: "var(--space-1) var(--space-2)",
                          background: "var(--color-accent)",
                          color: "var(--color-text-inverse)",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "var(--font-size-2xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          fontFamily: "var(--font-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-2xs)",
                          fontFamily: "var(--font-primary)",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-dim)",
                        display: "flex",
                        alignItems: "center",
                        padding: "var(--space-1)",
                        borderRadius: "var(--radius-sm)",
                      }}
                      title="Clear done items"
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              )}

              {/* Action list */}
              {filtered.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {filtered.map((action) => (
                    <ActionRow
                      key={action.id}
                      action={action}
                      filter={filter}
                      onUpdateStatus={updateStatus}
                      onUpdateAction={updateAction}
                      expanded={expandedId === action.id}
                      onToggleExpand={() => setExpandedId(expandedId === action.id ? null : action.id)}
                      loading={loadingIds.has(action.id)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "var(--space-8)",
                    textAlign: "center",
                    color: "var(--color-text-dim)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {filter === "active" && "No active actions. Add one or ask in Chat."}
                  {filter === "done" && "Nothing completed yet."}
                  {filter === "deferred" && "No deferred actions."}
                  {filter === "dismissed" && "Nothing dismissed."}
                </div>
              )}
            </div>
            </div>
            </>)}
          </div>
    </AuthGuard>
  );
}

function HouseholdView({ items, setItems, expanded, setExpanded, accessToken, isMobile }) {
  // Group by list_name
  const grouped = {};
  const notes = [];
  for (const item of items) {
    if (item.type === "note" || item.type === "kid_context") {
      notes.push(item);
    } else {
      const key = item.list_name || "_tasks";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
  }
  const listNames = Object.keys(grouped).sort();

  async function checkOff(itemId) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, _fading: true } : i));
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== itemId)), 400);
    fetch("/api/household/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ item_id: itemId }),
    }).catch(() => {});
  }

  const listLabel = (name) => name === "_tasks" ? "Tasks" : name.charAt(0).toUpperCase() + name.slice(1);

  if (items.length === 0) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-dim)", fontSize: "var(--font-size-sm)" }}>
        No household items yet. Try &quot;add milk to the grocery list&quot; in Chat.
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "var(--space-3)" : "var(--space-4) var(--space-6)" }}>
      {/* Lists */}
      {listNames.map(name => {
        const listItems = grouped[name];
        const isOpen = expanded[name] !== false; // default open in expanded view
        return (
          <div key={name} style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-3)", overflow: "hidden",
          }}>
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [name]: !isOpen }))}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                padding: "var(--space-3) var(--space-4)",
                background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-primary)",
              }}
            >
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>
                {listLabel(name)} <span style={{ color: "var(--color-text-dim)", fontWeight: "var(--font-weight-normal)" }}>({listItems.length})</span>
              </span>
              {isOpen
                ? <ChevronDown size={14} strokeWidth={2} style={{ color: "var(--color-text-dim)" }} />
                : <ChevronRight size={14} strokeWidth={2} style={{ color: "var(--color-text-dim)" }} />
              }
            </button>
            {isOpen && (
              <div style={{ padding: "0 var(--space-4) var(--space-3)" }}>
                {listItems.map(item => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-2) 0",
                    borderBottom: "1px solid var(--color-border-light)",
                    opacity: item._fading ? 0.3 : 1,
                    transition: "opacity 400ms ease",
                  }}>
                    <button
                      onClick={() => checkOff(item.id)}
                      style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: "1.5px solid var(--color-border)", background: "none",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text)" }}>{item.title}</div>
                      {item.body && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>{item.body}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Notes & kid context */}
      {notes.length > 0 && (
        <div style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-3)",
        }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: "var(--space-2)" }}>
            Notes & Context
          </div>
          {notes.map(note => (
            <div key={note.id} style={{
              display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
              padding: "var(--space-2) 0",
              borderBottom: "1px solid var(--color-border-light)",
              opacity: note._fading ? 0.3 : 1,
              transition: "opacity 400ms ease",
            }}>
              <Blend size={13} strokeWidth={2} style={{ color: "var(--color-text-dim)", flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text)" }}>{note.body || note.title}</div>
                {note.type === "kid_context" && note.metadata?.kid_name && (
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginTop: 2 }}>{note.metadata.kid_name} — {note.metadata.detail_type || "info"}</div>
                )}
              </div>
              <button
                onClick={() => checkOff(note.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", padding: "var(--space-1)" }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRow({ action, filter, onUpdateStatus, onUpdateAction, expanded, onToggleExpand, loading }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editTitle, setEditTitle] = useState(action.title);
  const [editDesc, setEditDesc] = useState(action.description || "");
  const detailRef = useRef(null);
  const [detailHeight, setDetailHeight] = useState(0);

  useEffect(() => { setEditTitle(action.title); }, [action.title]);
  useEffect(() => { setEditDesc(action.description || ""); }, [action.description]);

  useEffect(() => {
    if (expanded && detailRef.current) {
      requestAnimationFrame(() => setDetailHeight(detailRef.current.scrollHeight));
    } else {
      setDetailHeight(0);
    }
  }, [expanded, editDesc]);

  const menuActions = [];
  if (filter !== "done") menuActions.push({ label: "Complete", status: "done", icon: Check, color: "var(--color-success)" });
  if (filter !== "deferred") menuActions.push({ label: "Defer", status: "deferred", icon: Clock, color: "var(--color-warning)" });
  if (filter !== "dismissed") menuActions.push({ label: "Dismiss", status: "dismissed", icon: X, color: "var(--color-text-muted)" });
  if (filter !== "active") menuActions.push({ label: "Reactivate", status: "active", icon: ArrowUp, color: "var(--color-accent)" });

  return (
    <div
      style={{
        background: "var(--color-bg-elevated)",
        border: expanded ? "1px solid var(--color-border)" : "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        position: "relative",
        transition: "border-color var(--duration-fast) var(--ease-default)",
      }}
    >
      {/* Summary row */}
      <div
        onClick={onToggleExpand}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-2-5) var(--space-4)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Quick complete checkbox (active only) */}
        {filter === "active" && (
          <div
            onClick={(e) => { e.stopPropagation(); if (!loading) onUpdateStatus(action.id, "done"); }}
            style={{
              width: 18,
              height: 18,
              borderRadius: "var(--radius-xs)",
              border: "1.5px solid var(--color-border)",
              flexShrink: 0,
              cursor: loading ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all var(--duration-fast) var(--ease-default)",
              opacity: loading ? 0.4 : 1,
              pointerEvents: loading ? "none" : "auto",
            }}
          />
        )}

        {/* Done checkmark */}
        {filter === "done" && (
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "var(--radius-xs)",
              background: "var(--color-success)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={10} strokeWidth={3} color="white" />
          </div>
        )}

        {/* Priority badge */}
        <PriorityBadge priority={action.priority} />

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              color: filter === "done" ? "var(--color-text-muted)" : "var(--color-text)",
              textDecoration: filter === "done" ? "line-through" : "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {action.title}
          </div>
          <div
            style={{
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              marginTop: 2,
              display: "flex",
              gap: "var(--space-2)",
            }}
          >
            {action.source && <span>{action.source}</span>}
            <span>{timeAgo(action.completed_at || action.created_at)}</span>
          </div>
        </div>

        {/* Rich copy */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(buildRichCopy(action));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: copied ? "var(--color-text-secondary)" : "var(--color-text-dim)",
            display: "flex",
            alignItems: "center",
            padding: "var(--space-1)",
            borderRadius: "var(--radius-sm)",
            opacity: copied ? 1 : 0.5,
            transition: "opacity var(--duration-fast) var(--ease-default)",
          }}
          title="Copy action details"
        >
          {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={2} />}
        </button>

        {/* Action menu */}
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-dim)",
            display: "flex",
            alignItems: "center",
            padding: "var(--space-1)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <MoreHorizontal size={14} strokeWidth={2} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
              style={{ position: "fixed", inset: 0, zIndex: 9 }}
            />
            <div
              style={{
                position: "absolute",
                right: "var(--space-4)",
                top: 44,
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                zIndex: 10,
                minWidth: 140,
                overflow: "hidden",
              }}
            >
              {menuActions.map((a) => (
                <button
                  key={a.status}
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(action.id, a.status);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    background: "none",
                    border: "none",
                    cursor: loading ? "default" : "pointer",
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-primary)",
                    color: a.color,
                    textAlign: "left",
                    opacity: loading ? 0.4 : 1,
                  }}
                >
                  <a.icon size={12} strokeWidth={2} />
                  {a.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Expandable detail panel */}
      <div
        ref={detailRef}
        style={{
          maxHeight: expanded ? detailHeight : 0,
          overflow: "hidden",
          transition: "max-height var(--duration-slow, 300ms) var(--ease-default, ease)",
        }}
      >
        <div
          style={{
            padding: "0 var(--space-4) var(--space-4)",
            borderTop: "1px solid var(--color-border-light)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            paddingTop: "var(--space-3)",
          }}
        >
          {/* Title edit */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                const trimmed = editTitle.trim();
                if (trimmed && trimmed !== action.title) {
                  onUpdateAction(action.id, { title: trimmed });
                } else {
                  setEditTitle(action.title);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.target.blur();
                if (e.key === "Escape") { setEditTitle(action.title); e.target.blur(); }
              }}
              onClick={(e) => e.stopPropagation()}
              style={fieldInputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onBlur={() => {
                const val = editDesc.trim() || null;
                if (val !== (action.description || null)) {
                  onUpdateAction(action.id, { description: val });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add notes..."
              rows={3}
              style={{
                ...fieldInputStyle,
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Priority selector */}
          <div>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border-light)" }}>
              {[
                { value: 1, label: "High", Icon: ArrowUp },
                { value: 2, label: "Normal", Icon: Minus },
                { value: 3, label: "Low", Icon: ArrowDown },
              ].map(({ value, label, Icon }, i) => {
                const active = action.priority === value;
                return (
                  <button
                    type="button"
                    key={value}
                    disabled={loading}
                    onClick={(e) => { e.stopPropagation(); onUpdateAction(action.id, { priority: active ? null : value }); }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-1)",
                      padding: "var(--space-1-5) var(--space-2)",
                      background: active ? "var(--color-accent)" : "transparent",
                      color: active ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                      border: "none",
                      borderRight: i < 2 ? "1px solid var(--color-border-light)" : "none",
                      fontSize: "var(--font-size-2xs)",
                      fontFamily: "var(--font-primary)",
                      fontWeight: "var(--font-weight-medium)",
                      cursor: loading ? "default" : "pointer",
                      opacity: loading ? 0.4 : 1,
                    }}
                  >
                    <Icon size={10} strokeWidth={2} style={{ pointerEvents: "none" }} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bucket selector */}
          <div>
            <label style={labelStyle}>Bucket</label>
            <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border-light)" }}>
              {[
                { value: "build", label: "Build", Icon: MessageSquareCode },
                { value: "life", label: "Life", Icon: Home },
                { value: null, label: "None", Icon: X },
              ].map(({ value, label, Icon }, i) => {
                const active = (action.bucket || null) === value;
                return (
                  <button
                    type="button"
                    key={label}
                    disabled={loading}
                    onClick={(e) => { e.stopPropagation(); onUpdateAction(action.id, { bucket: active ? null : value }); }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-1)",
                      padding: "var(--space-1-5) var(--space-2)",
                      background: active ? "var(--color-accent)" : "transparent",
                      color: active ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                      border: "none",
                      borderRight: i < 2 ? "1px solid var(--color-border-light)" : "none",
                      fontSize: "var(--font-size-2xs)",
                      fontFamily: "var(--font-primary)",
                      fontWeight: "var(--font-weight-medium)",
                      cursor: loading ? "default" : "pointer",
                      opacity: loading ? 0.4 : 1,
                    }}
                  >
                    <Icon size={10} strokeWidth={2} style={{ pointerEvents: "none" }} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metadata */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              paddingTop: "var(--space-1)",
            }}
          >
            {action.source && <span>Source: {action.source}</span>}
            <span>Created: {new Date(action.created_at).toLocaleDateString()}</span>
            {action.completed_at && <span>Completed: {new Date(action.completed_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
