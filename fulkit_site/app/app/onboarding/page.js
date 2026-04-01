"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, ArrowLeft, Check, SkipForward, Mic, MicOff, FolderDown, FolderOpen, Cloud, Folder } from "lucide-react";
import LogoMark from "../../components/LogoMark";
import { useAuth } from "../../lib/auth";
import { useTrack } from "../../lib/track";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Onboarding() {
  const { user, fetchProfile } = useAuth();
  const track = useTrack();
  const router = useRouter();

  const [tiers, setTiers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Navigation state
  const [tierIdx, setTierIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [showTierIntro, setShowTierIntro] = useState(true);
  const [showCopyAfter, setShowCopyAfter] = useState(null);
  const [showAssignment, setShowAssignment] = useState(false);
  const [complete, setComplete] = useState(false);

  // Answer state
  const [answers, setAnswers] = useState({});
  const [textVal, setTextVal] = useState("");
  const [multiSelect, setMultiSelect] = useState([]);
  const inputRef = useRef(null);

  // Voice state
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Resume state
  const [progressMap, setProgressMap] = useState({}); // tier_num → progress row

  // ─── Load tiers + questions + progress ───
  useEffect(() => {
    async function load() {
      const queries = [
        supabase.from("onboarding_tiers").select("*").order("sort_order"),
        supabase.from("questions").select("*").order("sort_order"),
      ];
      if (user?.id && !user.isNew) {
        queries.push(supabase.from("onboarding_progress").select("*").eq("user_id", user.id).order("tier_num"));
      }

      const results = await Promise.all(queries);
      let tierData = results[0].data || [];
      const questionData = results[1].data || [];
      const progressData = results[2]?.data || [];

      // Gate Go Deep tiers (6+) for non-paid users
      const isPaid = user?.seatType === "pro" || user?.seatType === "standard" || user?.role === "owner";
      if (!isPaid) {
        tierData = tierData.filter((t) => t.tier_num <= 5);
      }

      setTiers(tierData);
      setQuestions(questionData);

      // Build progress map
      const pMap = {};
      progressData.forEach((p) => { pMap[p.tier_num] = p; });
      setProgressMap(pMap);

      // Find resume point
      if (progressData.length > 0) {
        let resumeTierIdx = 0;
        let resumeQIdx = 0;
        let foundIncomplete = false;

        for (let ti = 0; ti < tierData.length; ti++) {
          const t = tierData[ti];
          const p = pMap[t.tier_num];
          if (!p || !p.completed_at) {
            resumeTierIdx = ti;
            // Find first unanswered question in this tier
            const tierQs = questionData.filter((q) => q.tier_id === t.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            const done = p?.questions_done || [];
            const doneIds = done.map((d) => d.id);
            resumeQIdx = tierQs.findIndex((q) => !doneIds.includes(q.question_id));
            if (resumeQIdx < 0) resumeQIdx = tierQs.length > 0 ? tierQs.length - 1 : 0;

            // Restore answers from progress
            done.forEach((d) => {
              setAnswers((prev) => ({ ...prev, [d.id]: d.answer }));
            });

            // If all questions done but assignment not, show assignment
            if (p && doneIds.length >= tierQs.length && !p.assignment_done) {
              setShowAssignment(true);
              setShowTierIntro(false);
              resumeQIdx = 0;
            } else if (resumeQIdx > 0) {
              setShowTierIntro(false);
            }

            foundIncomplete = true;
            break;
          }
        }

        if (!foundIncomplete) {
          // All tiers complete
          setComplete(true);
        }

        setTierIdx(resumeTierIdx);
        setQuestionIdx(resumeQIdx);
      }

      // Set trial_started_at if not set
      if (user?.id && !user.isNew) {
        supabase
          .from("profiles")
          .select("trial_started_at")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data && !data.trial_started_at) {
              supabase.from("profiles").update({ trial_started_at: new Date().toISOString() }).eq("id", user.id).then(() => {}).catch(() => {});
            }
          });
      }

      setLoadingData(false);
    }
    if (user) load();
  }, [user]);

  // No user → go to landing
  useEffect(() => {
    if (!user) router.replace("/");
  }, [user, router]);

  // Focus input on question change
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [questionIdx, tierIdx]);

  // ─── Helpers ───
  const tier = tiers[tierIdx];
  const tierQs = tier
    ? questions.filter((q) => q.tier_id === tier.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : [];
  const question = tierQs[questionIdx];
  const qType = question?.type === "text" ? "text_input" : question?.type === "choice" ? (question.multi ? "multi_select" : "single_select") : question?.type;

  const totalProgress = tiers.length > 0
    ? ((tierIdx + (showAssignment ? 1 : questionIdx / Math.max(tierQs.length, 1))) / tiers.length) * 100
    : 0;

  // ─── Save progress to DB ───
  const saveProgress = useCallback(async (tierNum, questionId, answer) => {
    if (!user?.id || user.isNew) return;

    const existing = progressMap[tierNum];
    const done = existing?.questions_done || [];
    const updated = [...done.filter((d) => d.id !== questionId)];
    if (questionId && answer !== undefined) {
      updated.push({ id: questionId, answer });
    }

    if (existing) {
      await supabase
        .from("onboarding_progress")
        .update({ questions_done: updated })
        .eq("id", existing.id);
      setProgressMap((prev) => ({ ...prev, [tierNum]: { ...existing, questions_done: updated } }));
    } else {
      const { data } = await supabase
        .from("onboarding_progress")
        .insert({ user_id: user.id, tier_num: tierNum, questions_done: updated })
        .select()
        .single();
      if (data) setProgressMap((prev) => ({ ...prev, [tierNum]: data }));
    }
  }, [user, progressMap]);

  // ─── Execute fulkit_action side effects ───
  const executeAction = (action, value) => {
    if (!action || !user?.id || user.isNew) return;
    const uid = user.id;
    const savePref = (key, val) => {
      supabase.from("preferences").upsert({
        user_id: uid, key, value: typeof val === "string" ? val : JSON.stringify(val), learned: false,
      }, { onConflict: "user_id,key" }).then(() => {}).catch(() => {});
    };

    switch (action) {
      case "create_identity_file":
        if (typeof value === "string" && value.trim()) {
          supabase.from("profiles").update({ name: value.trim() }).eq("id", uid).then(() => {}).catch(() => {});
        }
        break;
      case "setup_vault":
        if (value === "fulkit_managed") {
          savePref("storage_preference", "fulkit");
        } else {
          savePref("storage_preference", "local");
        }
        break;
      case "set_location":
        savePref("location", value);
        break;
      case "set_work_context":
        savePref("work_context", value);
        break;
      case "set_business_context":
        savePref("business_context", value);
        break;
      case "create_first_notes":
        if (typeof value === "string" && value.trim()) {
          const items = value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
          items.forEach((item) => {
            supabase.from("notes").insert({
              user_id: uid, title: item, content: "", status: "inbox", folder: "all",
            }).then(() => {}).catch(() => {});
          });
        }
        break;
      case "connect_integration":
        // OAuth is triggered by the integration_picker UI, not here
        break;
      case "set_search_preference":
        savePref("search_preference", value);
        break;
      case "set_whisper_focus":
        savePref("whisper_focus", value);
        break;
      case "show_threads":
      case "show_context_control":
      case "show_briefing_preview":
      case "show_integration_preview":
      case "show_manual_import":
      case "show_referral":
      case "show_connected_commands":
      case "show_workspace_setup":
      case "show_data_export":
        // Display-only walkthroughs — no DB write
        break;
      case "create_personal_thread":
        if (typeof value === "string" && value.trim()) {
          supabase.from("notes").insert({
            user_id: uid, title: value.trim(), content: "", status: "active", folder: "personal",
          }).then(() => {}).catch(() => {});
        }
        break;
      case "create_goal_note":
        if (typeof value === "string" && value.trim()) {
          const checkIn = new Date();
          checkIn.setDate(checkIn.getDate() + 30);
          supabase.from("notes").insert({
            user_id: uid, title: value.trim(), content: "Goal check-in", status: "active",
            folder: "ideas", due_date: checkIn.toISOString().split("T")[0],
          }).then(() => {}).catch(() => {});
        }
        break;
      case "seed_people_context":
        if (typeof value === "string" && value.trim()) {
          const names = value.split(",").map((n) => n.trim()).filter(Boolean);
          savePref("known_people", names);
        }
        break;
      case "set_whisper_frequency":
        savePref("whisper_frequency", value);
        break;
      case "set_capture_preference":
        savePref("capture_preference", value);
        break;
      case "set_capture_app":
        savePref("capture_app", value);
        break;
      case "set_chronotype":
        savePref("chronotype", value);
        break;
      case "set_briefing_config":
        savePref("briefing_config", value);
        break;
      case "save_magic_wish":
        savePref("magic_wish", value);
        break;
      case "create_first_step":
        if (typeof value === "string" && value.trim()) {
          supabase.from("actions").insert({
            user_id: uid, title: "First step: " + value.trim(), priority: "high",
            status: "active", source: "onboarding",
          }).then(() => {}).catch(() => {});
        }
        break;
      case "set_stress_awareness":
        savePref("stress_areas", value);
        break;
      case "create_good_day_note":
        savePref("good_day_vision", value);
        break;
      case "create_automation_suggestion":
        savePref("automation_wish", value);
        if (typeof value === "string" && value.trim()) {
          supabase.from("actions").insert({
            user_id: uid, title: "Set up automation: " + value.trim(), priority: "normal",
            status: "active", source: "onboarding",
          }).then(() => {}).catch(() => {});
        }
        break;
      case "save_motivation":
        savePref("motivation", value);
        break;
      case "set_interaction_style":
        savePref("interaction_style", value);
        break;
      case "set_trust_comfort":
        savePref("trust_comfort_level", value);
        break;
      case "set_storage_preference":
        savePref("storage_preference", value);
        break;
      case "set_boundaries":
        savePref("boundaries", value);
        break;
      case "calibrate_onboarding":
        savePref("onboarding_calibration", value);
        break;
      case "set_compact_mode":
        if (typeof window !== "undefined") {
          const compact = typeof value === "string" && value.toLowerCase().includes("compact");
          localStorage.setItem("fulkit-compact-mode", JSON.stringify(compact));
        }
        break;
      case "show_byok_info":
        savePref("byok_interest", value);
        break;
      case "connect_advanced_integration":
        // OAuth triggered by integration_picker UI
        break;
      default:
        // Unknown action — save as preference
        if (value !== undefined) savePref(action, value);
        break;
    }
  };

  // ─── Advance to next question ───
  const advance = async (value) => {
    if (value !== undefined && value !== "" && question) {
      setAnswers((prev) => ({ ...prev, [question.question_id]: value }));
      await saveProgress(tier.tier_num, question.question_id, value);

      // Execute fulkit_action side effects
      if (question.fulkit_action) {
        executeAction(question.fulkit_action, value);
      }
    }

    // Show copy_after_answer if present
    if (question?.copy_after_answer && !showCopyAfter) {
      setShowCopyAfter(question.copy_after_answer);
      return;
    }

    goNext();
  };

  const goNext = () => {
    setShowCopyAfter(null);
    setTextVal("");
    setMultiSelect([]);
    stopListening();

    const nextQ = questionIdx + 1;
    if (nextQ < tierQs.length) {
      setQuestionIdx(nextQ);
    } else {
      // All questions in tier done — show assignment
      setShowAssignment(true);
    }
  };

  const nextTier = async () => {
    setShowAssignment(false);
    setShowTierIntro(true);
    setQuestionIdx(0);
    setTextVal("");
    setMultiSelect([]);

    const nextT = tierIdx + 1;
    if (nextT < tiers.length) {
      setTierIdx(nextT);
    } else {
      // All tiers complete
      if (user?.id && !user.isNew) {
        const finalTier = tiers[tiers.length - 1]?.tier_num || 1;
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            onboarded: true,
            current_tier: finalTier,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        if (profileErr) {
          console.error("[onboarding] profile update failed:", profileErr.message);
          // Retry once — this is critical
          await supabase.from("profiles").update({ onboarded: true, current_tier: finalTier, updated_at: new Date().toISOString() }).eq("id", user.id);
        }
        fetchProfile(user.id);
        track("onboarding_complete", { tiers_completed: tiers.length });

        // Seed fallback actions for features the user didn't cover during onboarding
        const FALLBACK_ACTIONS = [
          { day: 0, feature_tag: "notes", title: "Save your first note", description: "Your vault is where Fülkit gets smart. Drop in a thought, a link, a plan — anything. The more it knows, the better it thinks with you." },
          { day: 3, feature_tag: "chat", title: "Have your first conversation", description: "Ask Fülkit anything. It already knows what you've saved. Try 'what's on my plate?' or just say hi." },
          { day: 6, feature_tag: "vault", title: "Choose your storage mode", description: "Your data, your rules. Pick how your notes are stored — local, encrypted, or Fülkit-managed. You can change this anytime in Settings." },
          { day: 9, feature_tag: "actions", title: "Add something to your action list", description: "Actions are your to-do layer. Add a task, a reminder, a next step. Fülkit tracks them and nudges you when things pile up." },
          { day: 12, feature_tag: "integrations", title: "Connect a tool you already use", description: "Spotify, GitHub, Square, Stripe — connect one and Fülkit pulls it into your world. Head to Settings > Sources." },
        ];

        try {
          // Guard against duplicate seeding
          const { count: existingCount } = await supabase
            .from("actions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("source", "onboarding");
          if (existingCount > 0) throw new Error("skip — already seeded");

          // Check which features the user already engaged with
          const [notesRes, actionsRes, integrationsRes] = await Promise.all([
            supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("actions").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("source", "onboarding"),
            supabase.from("integrations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          ]);

          const covered = new Set();
          if (notesRes.count > 0) covered.add("notes");
          if (actionsRes.count > 0) covered.add("actions");
          if (integrationsRes.count > 0) covered.add("integrations");

          const now = new Date();
          const toInsert = FALLBACK_ACTIONS
            .filter((a) => !covered.has(a.feature_tag))
            .map((a) => ({
              user_id: user.id,
              title: a.title,
              description: a.description,
              priority: "normal",
              status: "active",
              source: "onboarding",
              feature_tag: a.feature_tag,
              scheduled_for: new Date(now.getTime() + a.day * 24 * 60 * 60 * 1000).toISOString(),
            }));

          if (toInsert.length > 0) {
            await supabase.from("actions").insert(toInsert);
          }
        } catch (e) {
          console.error("[onboarding] fallback action seeding failed:", e.message);
        }
      }
      setComplete(true);
    }
  };

  const skip = () => advance(undefined);

  const submitText = () => {
    if (textVal.trim()) advance(textVal.trim());
  };

  const selectChoice = (opt) => {
    if (qType === "multi_select") {
      setMultiSelect((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      );
    } else {
      advance(opt);
    }
  };

  const submitMulti = () => {
    if (multiSelect.length > 0) advance(multiSelect);
  };

  // ─── Voice input ───
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    // Stop any existing recognition first to prevent listener accumulation
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
      setTextVal(transcript);
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
  };

  // ─── Renders ───
  if (!user) return null;

  if (loadingData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LogoMark size={28} style={{ opacity: 0.5 }} />
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
        No onboarding questions configured.
      </div>
    );
  }

  // ─── Complete screen ───
  if (complete) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: "var(--radius-full)",
            background: "var(--color-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "var(--space-6)",
          }}
        >
          <Check size={24} strokeWidth={2.5} color="var(--color-text-inverse)" />
        </div>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)", letterSpacing: "var(--letter-spacing-tight)", marginBottom: "var(--space-3)" }}>
          Your brain is ready.
        </h1>
        <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", maxWidth: 400, marginBottom: "var(--space-8)" }}>
          I know your name, how you work, and what you need. Let's talk.
        </p>
        <a
          href="/chat"
          style={{
            padding: "var(--space-2-5) var(--space-6)",
            background: "var(--color-accent)",
            color: "var(--color-text-inverse)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          Let's go
          <ArrowRight size={14} strokeWidth={2.5} />
        </a>
      </div>
    );
  }

  // ─── Copy after answer screen ───
  if (showCopyAfter) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
        <ProgressBar pct={totalProgress} />
        <SkipLink />
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: "var(--space-4)" }}>
            Tier {tier.tier_num}
          </div>
          <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", fontStyle: "italic", marginBottom: "var(--space-8)" }}>
            "{showCopyAfter}"
          </p>
          <button
            onClick={goNext}
            style={{
              padding: "var(--space-2-5) var(--space-5)",
              background: "var(--color-accent)", color: "var(--color-text-inverse)",
              border: "none", borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
            }}
          >
            Continue <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Feature assignment screen ───
  if (showAssignment) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
        <ProgressBar pct={totalProgress} />
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: "var(--space-4)" }}>
            Tier {tier.tier_num}
          </div>
          <div style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", background: "var(--color-success-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-5)" }}>
            <Check size={18} strokeWidth={2.5} color="var(--color-success)" />
          </div>
          {tier.assignment_copy && (
            <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", fontStyle: "italic", marginBottom: "var(--space-6)" }}>
              "{tier.assignment_copy}"
            </p>
          )}
          {tier.primary_destination && (
            <a
              href={tier.primary_destination}
              style={{
                display: "block", width: "100%", textAlign: "center",
                padding: "var(--space-2-5) var(--space-4)",
                background: "var(--color-accent)", color: "var(--color-text-inverse)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)",
                textDecoration: "none", marginBottom: "var(--space-3)",
              }}
            >
              Go to {tier.primary_destination.replace("/", "").replace(/^\w/, (c) => c.toUpperCase()) || "Home"}
            </a>
          )}
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
            {tier.secondary_destination && (
              <a
                href={tier.secondary_destination}
                style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textDecoration: "none" }}
              >
                Also check out {tier.secondary_destination}
              </a>
            )}
            <button
              onClick={nextTier}
              style={{
                fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-primary)", textDecoration: "underline",
              }}
            >
              {tierIdx < tiers.length - 1 ? "I'll check it out later — next tier" : "Finish onboarding"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tier intro screen ───
  if (showTierIntro && tier.trust_line) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-6)", paddingBottom: "15vh", position: "relative" }}>
        <ProgressBar pct={totalProgress} />
        <SkipLink />
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: "var(--space-4)" }}>
            Tier {tier.tier_num}
          </div>
          {tier.intro && (
            <h2 style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-black)", lineHeight: "var(--line-height-snug)", letterSpacing: "var(--letter-spacing-tight)", marginBottom: "var(--space-5)" }}>
              {tier.label}
            </h2>
          )}
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)", fontStyle: "italic", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-8)" }}>
            {tier.trust_line}
          </p>
          <button
            onClick={() => setShowTierIntro(false)}
            style={{
              padding: "var(--space-2-5) var(--space-5)",
              background: "var(--color-accent)", color: "var(--color-text-inverse)",
              border: "none", borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
            }}
          >
            Let's go <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Question screen ───
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
      <ProgressBar pct={totalProgress} />
      <SkipLink />

      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: "var(--space-4)", textAlign: "center" }}>
          Tier {tier.tier_num}
        </div>
        {/* Trust line for this question */}
        {question?.trust_line && (
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontStyle: "italic", lineHeight: "var(--line-height-relaxed)", borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", marginBottom: "var(--space-6)" }}>
            {question.trust_line}
          </p>
        )}

        {/* Question text */}
        <h2 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", lineHeight: "var(--line-height-snug)", letterSpacing: "var(--letter-spacing-tight)", marginBottom: "var(--space-2)" }}>
          {question?.text}
        </h2>
        {question?.why && (
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-6)" }}>
            {question.why}
          </p>
        )}

        {/* ─── Text input ─── */}
        {qType === "text_input" && (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              ref={inputRef}
              type="text"
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitText(); }}
              placeholder={question.placeholder || "Type here..."}
              style={{
                flex: 1,
                padding: "var(--space-2-5) var(--space-4)",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-base)",
                fontFamily: "var(--font-primary)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            {question.allow_voice && ("webkitSpeechRecognition" in (typeof window !== "undefined" ? window : {}) || "SpeechRecognition" in (typeof window !== "undefined" ? window : {})) && (
              <button
                onClick={listening ? stopListening : startListening}
                style={{
                  width: 40, height: 40, borderRadius: "var(--radius-md)",
                  background: listening ? "var(--color-error, #e53e3e)" : "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                {listening ? <MicOff size={16} color="white" /> : <Mic size={16} color="var(--color-text-muted)" />}
              </button>
            )}
            <button
              onClick={submitText}
              disabled={!textVal.trim()}
              style={{
                width: 40, height: 40, borderRadius: "var(--radius-md)",
                background: textVal.trim() ? "var(--color-accent)" : "var(--color-border-light)",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: textVal.trim() ? "pointer" : "default",
                flexShrink: 0,
              }}
            >
              <ArrowRight size={16} strokeWidth={2.5} color="var(--color-text-inverse)" />
            </button>
          </div>
        )}

        {/* ─── Single select ─── */}
        {qType === "single_select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {(question.options || []).map((opt) => {
              const label = typeof opt === "string" ? opt : opt.label;
              return (
                <button
                  key={label}
                  onClick={() => selectChoice(label)}
                  style={{
                    padding: "var(--space-2-5) var(--space-4)",
                    background: "var(--color-bg-elevated)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-base)",
                    fontFamily: "var(--font-primary)",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all var(--duration-fast) var(--ease-default)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Multi select ─── */}
        {qType === "multi_select" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {(question.options || []).map((opt) => {
                const label = typeof opt === "string" ? opt : opt.label;
                const selected = multiSelect.includes(label);
                return (
                  <button
                    key={label}
                    onClick={() => selectChoice(label)}
                    style={{
                      padding: "var(--space-2-5) var(--space-4)",
                      background: selected ? "#D4D1CC" : "var(--color-bg-elevated)",
                      color: "var(--color-text)",
                      border: selected ? "1px solid #D4D1CC" : "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--font-size-base)",
                      fontFamily: "var(--font-primary)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all var(--duration-fast) var(--ease-default)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-4)" }}>
              <div>
                {(questionIdx > 0 || tierIdx > 0) && (
                  <button
                    onClick={() => {
                      if (questionIdx > 0) { setQuestionIdx(questionIdx - 1); setMultiSelect([]); setTextVal(""); }
                      else if (tierIdx > 0) { setTierIdx(tierIdx - 1); setShowTierIntro(true); }
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-primary)" }}
                  >
                    <ArrowLeft size={12} strokeWidth={2} />
                    Back
                  </button>
                )}
              </div>
              <button
                onClick={submitMulti}
                disabled={multiSelect.length === 0}
                style={{
                  padding: "var(--space-2-5) var(--space-5)",
                  background: multiSelect.length > 0 ? "var(--color-accent)" : "transparent",
                  color: multiSelect.length > 0 ? "var(--color-text-inverse)" : "transparent",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  fontFamily: "var(--font-primary)",
                  cursor: multiSelect.length > 0 ? "pointer" : "default",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  transition: "all var(--duration-normal) var(--ease-default)",
                }}
              >
                Continue
                <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </>
        )}

        {/* ─── Integration picker ─── */}
        {qType === "integration_picker" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {(question.options || [{ label: "Spotify" }, { label: "I'll do this later" }]).map((opt) => {
              const label = typeof opt === "string" ? opt : opt.label;
              const isSkip = label.toLowerCase().includes("later") || label.toLowerCase().includes("skip");
              return (
                <button
                  key={label}
                  onClick={() => {
                    if (isSkip) {
                      advance("skipped");
                    } else {
                      // For now, record the selection and advance
                      // Actual OAuth flow would be triggered here
                      advance(label);
                    }
                  }}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: isSkip ? "transparent" : "var(--color-bg-elevated)",
                    color: isSkip ? "var(--color-text-dim)" : "var(--color-text)",
                    border: isSkip ? "none" : "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: isSkip ? "var(--font-size-xs)" : "var(--font-size-base)",
                    fontFamily: "var(--font-primary)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Vault setup ─── */}
        {qType === "vault_setup" && (
          <VaultSetupStep onAdvance={advance} />
        )}

        {/* ─── Feature walkthrough ─── */}
        {qType === "feature_walkthrough" && (
          <div>
            {/* Briefing preview — assembles from captured answers */}
            {question.fulkit_action === "show_briefing_preview" && (
              <BriefingPreview answers={answers} />
            )}
            {/* Integration showcase — 3 expandable cards */}
            {question.fulkit_action === "show_integration_preview" && (
              <IntegrationShowcase />
            )}
            <button
              onClick={() => advance("acknowledged")}
              style={{
                padding: "var(--space-2-5) var(--space-5)",
                background: "var(--color-accent)",
                color: "var(--color-text-inverse)",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
                fontFamily: "var(--font-primary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginTop: (question.fulkit_action === "show_briefing_preview" || question.fulkit_action === "show_integration_preview") ? "var(--space-6)" : 0,
              }}
            >
              Got it
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* ─── Skip ─── */}
        {(question?.skippable || qType === "text_input") && qType !== "feature_walkthrough" && (
          <button
            onClick={skip}
            style={{
              marginTop: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-dim)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-primary)",
            }}
          >
            <SkipForward size={12} strokeWidth={2} />
            Skip
          </button>
        )}

        {/* Back button — for non-multi-select question types */}
        {qType !== "multi_select" && (questionIdx > 0 || tierIdx > 0) && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <button
              onClick={() => {
                if (questionIdx > 0) { setQuestionIdx(questionIdx - 1); setMultiSelect([]); setTextVal(""); }
                else if (tierIdx > 0) { setTierIdx(tierIdx - 1); setShowTierIntro(true); }
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-primary)" }}
            >
              <ArrowLeft size={12} strokeWidth={2} />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared sub-components ───

function ProgressBar({ pct }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "var(--color-border-light)" }}>
      <div style={{ height: "100%", background: "var(--color-accent)", width: `${pct}%`, transition: "width var(--duration-slow) var(--ease-default)" }} />
    </div>
  );
}


function SkipLink() {
  return (
    <a
      href="/home"
      style={{
        position: "fixed", top: "var(--space-5)", right: "var(--space-6)",
        fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)",
        textDecoration: "none", transition: "color 200ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-dim)")}
    >
      I'll do this later
    </a>
  );
}

const VAULT_TREE = [
  { name: "_FULKIT/", desc: "your brain (always loaded)", icon: Folder },
  { name: "00-INBOX/", desc: "unsorted, we file it for you", icon: Folder },
  { name: "01-PERSONAL/", desc: null, icon: Folder },
  { name: "02-BUSINESS/", desc: null, icon: Folder },
  { name: "03-PROJECTS/", desc: null, icon: Folder },
  { name: "04-DEV/", desc: null, icon: Folder },
  { name: "05-IDEAS/", desc: null, icon: Folder },
  { name: "06-LEARNING/", desc: null, icon: Folder },
  { name: "07-ARCHIVE/", desc: null, icon: Folder },
];

function VaultSetupStep({ onAdvance }) {
  const [downloadState, setDownloadState] = useState(null); // null | "downloaded"
  const downloadRef = useRef(null);

  const handleDownload = () => {
    if (downloadRef.current) downloadRef.current.click();
    setDownloadState("downloaded");
  };

  return (
    <div>
      {/* File tree preview */}
      <div style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        marginBottom: "var(--space-4)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-size-xs)",
        lineHeight: 1.8,
      }}>
        <div style={{ color: "var(--color-text)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
          fulkit-vault/
        </div>
        {VAULT_TREE.map((item) => (
          <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", paddingLeft: "var(--space-4)" }}>
            <Folder size={12} strokeWidth={1.5} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
            <span style={{ color: "var(--color-text)" }}>{item.name}</span>
            {item.desc && (
              <span style={{ color: "var(--color-text-dim)", fontSize: "var(--font-size-2xs)" }}>
                {"\u2190"} {item.desc}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <p style={{
        fontSize: "var(--font-size-xs)",
        color: "var(--color-text-muted)",
        lineHeight: "var(--line-height-relaxed)",
        marginBottom: "var(--space-4)",
      }}>
        We recommend our structure — it&apos;s clean and F{"\u00FC"}lkit knows how to use it. Have your own folders? We&apos;ll help you migrate.
      </p>

      {/* Hidden download link */}
      <a ref={downloadRef} href="/fulkit-vault.zip" download="fulkit-vault.zip" style={{ display: "none" }} />

      {downloadState === "downloaded" ? (
        /* Post-download confirmation */
        <div>
          <p style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-4)",
          }}>
            Unzip it on your Desktop — easiest to find, easiest to use. When you&apos;re ready:
          </p>
          <button
            onClick={() => onAdvance("download")}
            style={{
              width: "100%",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-accent)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-base)",
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
            }}
          >
            Done, let&apos;s go
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        /* Three options */
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <button
            onClick={handleDownload}
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-bg-elevated)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-base)",
              fontFamily: "var(--font-primary)",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <FolderDown size={18} strokeWidth={1.5} color="var(--color-text-dim)" />
            Download F{"\u00FC"}lkit vault
          </button>
          <button
            onClick={() => onAdvance("existing")}
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-bg-elevated)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-base)",
              fontFamily: "var(--font-primary)",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <FolderOpen size={18} strokeWidth={1.5} color="var(--color-text-dim)" />
            I have my own folder
          </button>
          <button
            onClick={() => onAdvance("fulkit_managed")}
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "transparent",
              color: "var(--color-text-dim)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-xs)",
              fontFamily: "var(--font-primary)",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <Cloud size={16} strokeWidth={1.5} />
            I&apos;ll use F{"\u00FC"}lkit storage
          </button>
        </div>
      )}
    </div>
  );
}

function BriefingPreview({ answers }) {
  const name = answers.q1 || "friend";
  const location = answers.q2 || "";
  const tasks = answers.q4 || "";
  const goal = answers.q11 || "";
  const chronotype = answers.q15 || "";
  const briefingPicks = answers.q16 || [];
  const picks = Array.isArray(briefingPicks) ? briefingPicks : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const vibe = chronotype === "Night owl"
    ? "Take it easy today. You've got time."
    : chronotype === "Early bird"
    ? "Let's make today count."
    : "Whatever today brings, you're ready.";

  const taskList = typeof tasks === "string"
    ? tasks.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  const cardStyle = {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-4)",
    marginBottom: "var(--space-4)",
  };

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
        {greeting}, {name}. It's {dayName}{location ? ` in ${location}` : ""}.
      </p>
      {taskList.length > 0 && (
        <div style={{ marginBottom: "var(--space-3)" }}>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: "var(--space-1)" }}>
            On your plate
          </p>
          {taskList.map((t, i) => (
            <p key={i} style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", paddingLeft: "var(--space-2)" }}>
              • {t}
            </p>
          ))}
        </div>
      )}
      {goal && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
          Goal check-in: {goal}
        </p>
      )}
      {picks.includes("Weather") && location && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          Weather in {location} loading...
        </p>
      )}
      {picks.includes("Sports scores") && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          Scores: check back tonight.
        </p>
      )}
      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic", marginTop: "var(--space-3)" }}>
        {vibe}
      </p>
    </div>
  );
}

const SHOWCASE_INTEGRATIONS = [
  {
    name: "Square",
    desc: "POS & sales data",
    commands: ['"How did we do today?"', '"What\'s our inventory?"', '"Show me this week\'s orders"'],
  },
  {
    name: "TrueGauge",
    desc: "Customer metrics",
    commands: ['"What\'s my customer satisfaction?"', '"Show me this month\'s trends"'],
  },
  {
    name: "Numbrly",
    desc: "Cost management",
    commands: ['"What did that project cost?"', '"Break down vendor expenses"'],
  },
];

function IntegrationShowcase() {
  const [expanded, setExpanded] = useState(null);
  const cardStyle = {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    marginBottom: "var(--space-2)",
    overflow: "hidden",
    cursor: "pointer",
  };

  return (
    <div style={{ marginBottom: "var(--space-2)" }}>
      {SHOWCASE_INTEGRATIONS.map((integ) => (
        <div key={integ.name} style={cardStyle} onClick={() => setExpanded(expanded === integ.name ? null : integ.name)}>
          <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>{integ.name}</span>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginLeft: "var(--space-2)" }}>{integ.desc}</span>
            </div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
              {expanded === integ.name ? "−" : "+"}
            </span>
          </div>
          {expanded === integ.name && (
            <div style={{ padding: "0 var(--space-4) var(--space-3)", borderTop: "1px solid var(--color-border-light)" }}>
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)", marginTop: "var(--space-2)" }}>
                Try asking:
              </p>
              {integ.commands.map((cmd, i) => (
                <p key={i} style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontStyle: "italic", paddingLeft: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                  {cmd}
                </p>
              ))}
              <a
                href="/settings"
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textDecoration: "underline", display: "inline-block", marginTop: "var(--space-2)" }}
              >
                Connect in Settings →
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
