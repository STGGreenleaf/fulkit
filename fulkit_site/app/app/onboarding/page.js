"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Check, SkipForward } from "lucide-react";
import LogoMark from "../../components/LogoMark";
import { useAuth } from "../../lib/auth";
import { useTrack } from "../../lib/track";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Onboarding() {
  const { user, fetchProfile } = useAuth();
  const track = useTrack();
  const router = useRouter();
  const [phases, setPhases] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [textVal, setTextVal] = useState("");
  const [multiSelect, setMultiSelect] = useState([]);
  const [showPhaseDone, setShowPhaseDone] = useState(false);
  const [complete, setComplete] = useState(false);
  const inputRef = useRef(null);

  // Fetch phases + questions from DB
  useEffect(() => {
    async function load() {
      const [{ data: pData }, { data: qData }] = await Promise.all([
        supabase.from("question_phases").select("*").order("sort_order"),
        supabase.from("questions").select("*").order("sort_order"),
      ]);
      const built = (pData || []).map((p) => ({
        label: p.label,
        intro: p.intro || "",
        questions: (qData || [])
          .filter((q) => q.phase_id === p.id)
          .map((q) => ({
            id: q.question_id,
            text: q.text,
            why: q.why || "",
            type: q.type,
            multi: q.multi || false,
            skippable: q.skippable || false,
            placeholder: q.placeholder || "",
            options: q.type === "choice" && q.options
              ? q.options.map((o) => (typeof o === "string" ? o : o.label))
              : undefined,
          })),
      }));
      setPhases(built);
      setLoadingData(false);
    }
    load();
  }, []);

  // No user at all → go to landing
  useEffect(() => {
    if (!user) router.replace("/");
  }, [user, router]);

  if (!user) return null;
  if (loadingData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LogoMark size={28} style={{ opacity: 0.5 }} />
      </div>
    );
  }
  if (phases.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
        No onboarding questions configured.
      </div>
    );
  }

  const phase = phases[phaseIdx];
  const question = phase?.questions[questionIdx];

  const advance = (value) => {
    if (value !== undefined && value !== "" && question) {
      setAnswers((prev) => ({ ...prev, [question.id]: value }));
    }

    const nextQ = questionIdx + 1;
    if (nextQ < phase.questions.length) {
      setQuestionIdx(nextQ);
      setTextVal("");
      setMultiSelect([]);
    } else {
      // Phase complete
      setShowPhaseDone(true);
    }
  };

  const nextPhase = async () => {
    setShowPhaseDone(false);
    const nextP = phaseIdx + 1;
    if (nextP < phases.length) {
      setPhaseIdx(nextP);
      setQuestionIdx(0);
      setTextVal("");
      setMultiSelect([]);
    } else {
      // Mark profile as onboarded
      if (user?.id && !user.isNew) {
        const name = answers.name || user.name || "";
        await supabase
          .from("profiles")
          .update({ onboarded: true, name, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        // Save preferences from answers
        const prefKeys = ["tone", "frequency", "chronotype"];
        const prefs = prefKeys
          .filter((k) => answers[k])
          .map((k) => ({ user_id: user.id, key: k, value: typeof answers[k] === "string" ? answers[k] : JSON.stringify(answers[k]), learned: false }));
        if (prefs.length > 0) {
          await supabase.from("preferences").insert(prefs);
        }
        fetchProfile(user.id);
        track("onboarding_complete", { phases_completed: phaseIdx + 1 });
      }
      setComplete(true);
    }
  };

  const skip = () => advance(undefined);

  const submitText = () => {
    if (textVal.trim()) advance(textVal.trim());
  };

  const selectChoice = (opt) => {
    if (question.multi) {
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

  if (complete) {
    return (
      <>
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
            width: 56,
            height: 56,
            borderRadius: "var(--radius-full)",
            background: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--space-6)",
          }}
        >
          <Check size={24} strokeWidth={2.5} color="var(--color-text-inverse)" />
        </div>
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "var(--letter-spacing-tight)",
            marginBottom: "var(--space-3)",
          }}
        >
          Your brain is ready.
        </h1>
        <p
          style={{
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: 400,
            marginBottom: "var(--space-8)",
          }}
        >
          I know your name, your people, your priorities, and how you like to
          work. Let's get to it.
        </p>
        <a
          href="/"
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
      </>
    );
  }

  return (
    <>
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
      }}
    >
      {/* Progress */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "var(--color-border-light)",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "var(--color-accent)",
            width: `${((phaseIdx + (showPhaseDone ? 1 : questionIdx / phase.questions.length)) / phases.length) * 100}%`,
            transition: `width var(--duration-slow) var(--ease-default)`,
          }}
        />
      </div>

      {/* Phase label */}
      <div
        style={{
          position: "fixed",
          top: "var(--space-5)",
          left: "var(--space-6)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <LogoMark size={20} />
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
            color: "var(--color-text-muted)",
          }}
        >
          Phase {phaseIdx + 1}: {phase.label}
        </span>
      </div>

      {/* Skip onboarding */}
      <a
        href="/home"
        style={{
          position: "fixed",
          top: "var(--space-5)",
          right: "var(--space-6)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-dim)",
          textDecoration: "none",
          transition: "color 200ms",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}
      >
        I'll do this later
      </a>

      <div style={{ maxWidth: 480, width: "100%" }}>
        {showPhaseDone ? (
          /* Phase complete message */
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-full)",
                background: "var(--color-success-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto var(--space-5)",
              }}
            >
              <Check size={18} strokeWidth={2.5} color="var(--color-success)" />
            </div>
            <p
              style={{
                fontSize: "var(--font-size-md)",
                color: "var(--color-text-secondary)",
                lineHeight: "var(--line-height-relaxed)",
                marginBottom: "var(--space-8)",
              }}
            >
              Phase complete.
            </p>
            <button
              onClick={nextPhase}
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
              }}
            >
              {phaseIdx < phases.length - 1 ? "Continue" : "Finish"}
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          /* Question */
          <>
            {questionIdx === 0 && (
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  fontStyle: "italic",
                  lineHeight: "var(--line-height-relaxed)",
                  marginBottom: "var(--space-8)",
                  textAlign: "center",
                }}
              >
                "{phase.intro}"
              </p>
            )}

            <h2
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-bold)",
                lineHeight: "var(--line-height-snug)",
                letterSpacing: "var(--letter-spacing-tight)",
                marginBottom: "var(--space-2)",
              }}
            >
              {question.text}
            </h2>
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                lineHeight: "var(--line-height-relaxed)",
                marginBottom: "var(--space-6)",
              }}
            >
              {question.why}
            </p>

            {question.type === "text" ? (
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={textVal}
                  onChange={(e) => setTextVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitText();
                  }}
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
                <button
                  onClick={submitText}
                  disabled={!textVal.trim()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    background: textVal.trim()
                      ? "var(--color-accent)"
                      : "var(--color-border-light)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: textVal.trim() ? "pointer" : "default",
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight
                    size={16}
                    strokeWidth={2.5}
                    color="var(--color-text-inverse)"
                  />
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  {(question.options || []).map((opt) => {
                    const selected = question.multi
                      ? multiSelect.includes(opt)
                      : false;
                    return (
                      <button
                        key={opt}
                        onClick={() => selectChoice(opt)}
                        style={{
                          padding: "var(--space-2-5) var(--space-4)",
                          background: selected
                            ? "var(--color-accent)"
                            : "var(--color-bg-elevated)",
                          color: selected
                            ? "var(--color-text-inverse)"
                            : "var(--color-text)",
                          border: selected
                            ? "1px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          fontSize: "var(--font-size-base)",
                          fontFamily: "var(--font-primary)",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: `all var(--duration-fast) var(--ease-default)`,
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {question.multi && multiSelect.length > 0 && (
                  <button
                    onClick={submitMulti}
                    style={{
                      marginTop: "var(--space-4)",
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
                    }}
                  >
                    Continue
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </button>
                )}
              </>
            )}

            {/* Skip */}
            {(question.skippable || question.type === "text") && (
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
          </>
        )}
      </div>
    </div>
    </>
  );
}
