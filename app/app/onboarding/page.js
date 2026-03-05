"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Check, SkipForward } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";

const PHASES = [
  {
    label: "The Basics",
    intro: "Let me get the fundamentals so I can talk to you like a human, not a robot.",
    questions: [
      {
        id: "name",
        text: "What should I call you?",
        why: "Everything starts with a name.",
        type: "text",
      },
      {
        id: "location",
        text: "Where are you based?",
        why: "Helps me with time zones, local recommendations, and context.",
        type: "text",
      },
      {
        id: "work",
        text: "What do you do?",
        why: "Shapes whether I think in terms of bosses, clients, customers, or professors.",
        type: "choice",
        options: ["Employee", "Self-employed", "Student", "Between things", "Retired"],
      },
      {
        id: "dayToDay",
        text: "What's your day-to-day like?",
        why: "This determines when and how I check in with you.",
        type: "choice",
        options: [
          "Desk job / computer all day",
          "On my feet / physical work",
          "Mix of both",
          "It changes constantly",
        ],
      },
      {
        id: "scope",
        text: "Are you here to organize your life, your work, or both?",
        why: "Decides whether I build you a personal brain, a work brain, or the full thing.",
        type: "choice",
        options: ["Personal life", "Work / career", "Both — it's all connected", "I don't know yet"],
      },
    ],
  },
  {
    label: "Your People",
    intro: "I want to know who matters to you so I never ask you to spell their name twice.",
    questions: [
      {
        id: "people",
        text: "Who are the 2-3 most important people in your life?",
        why: "I'll remember them, their names, their role in your life.",
        type: "text",
        placeholder: "e.g. Sarah (partner), Mike (business partner), Mom",
      },
      {
        id: "workPeople",
        text: "Anyone I should know about at work?",
        why: "Helps me give advice that accounts for real dynamics.",
        type: "choice",
        options: ["Boss / manager", "Business partner", "Team members", "Clients", "Nobody — I work alone"],
      },
    ],
  },
  {
    label: "What's on Your Plate",
    intro: "I can't help if I don't know what you're carrying. This is where it gets useful.",
    questions: [
      {
        id: "priority",
        text: "What's the #1 thing you're trying to get done right now?",
        why: "This becomes your first action item. I'll check in on it.",
        type: "text",
      },
      {
        id: "drops",
        text: "What keeps falling through the cracks?",
        why: "This tells me where to focus my whispers.",
        type: "choice",
        options: [
          "Emails / follow-ups",
          "Health stuff",
          "Money / bills",
          "Personal errands",
          "Projects I start and don't finish",
        ],
      },
      {
        id: "organization",
        text: "How do you feel about your current level of organization?",
        why: "Tells me how much structure to impose.",
        type: "choice",
        options: [
          "Total chaos",
          "I have a system but it's messy",
          "Pretty organized",
          "Obsessively organized",
          "I don't think about it",
        ],
      },
    ],
  },
  {
    label: "How You Want Help",
    intro: "This calibrates how I talk to you and how often I check in.",
    questions: [
      {
        id: "tone",
        text: "How do you want me to communicate?",
        why: "Directly sets my tone. This is the most important UX question.",
        type: "choice",
        options: [
          "Short and direct",
          "Warm and conversational",
          "Challenge me — push back",
          "Just be helpful, I'll figure out the vibe",
        ],
      },
      {
        id: "frequency",
        text: "How often should I check in with suggestions?",
        why: "Sets your whisper frequency from day one.",
        type: "choice",
        options: [
          "A couple times a day",
          "Once a day max",
          "Only when I ask",
          "Surprise me",
        ],
      },
      {
        id: "topics",
        text: "What topics should I help with?",
        why: "Scopes what I pay attention to.",
        type: "choice",
        multi: true,
        options: [
          "Work / productivity",
          "Health / fitness",
          "Food / meal planning",
          "Finance / budgeting",
          "Personal growth",
          "All of it",
        ],
      },
      {
        id: "capture",
        text: "How do you capture ideas right now?",
        why: "Tells me whether to push voice mode, quick capture, or meet you where you are.",
        type: "choice",
        options: [
          "Notes app on my phone",
          "I don't — they just disappear",
          "Paper / journal",
          "Voice memos",
          "A specific app",
        ],
      },
    ],
  },
  {
    label: "Quick Hits",
    intro: "Rapid fire. These shape your experience behind the scenes.",
    questions: [
      {
        id: "chronotype",
        text: "Morning person or night owl?",
        why: "Determines when whispers arrive.",
        type: "choice",
        options: ["Early bird", "Night owl", "Depends on the day"],
      },
      {
        id: "briefing",
        text: "Do you want daily sport scores, news, weather?",
        why: "Tells me if I should be a morning briefing or stay focused on your brain.",
        type: "choice",
        options: [
          "Sports",
          "News",
          "Weather is useful",
          "None of that — just my stuff",
          "All of it",
        ],
      },
      {
        id: "wish",
        text: "One thing you wish an app could do for you that none of them do?",
        why: "This tells me what magic moment to create for YOU specifically.",
        type: "text",
      },
    ],
  },
  {
    label: "The Deep Stuff",
    intro: "Only if you want to go here. Skip any or all.",
    questions: [
      {
        id: "goal",
        text: "What's one goal you have that you haven't told many people?",
        why: "I'll quietly track this and check in when the time is right.",
        type: "text",
        skippable: true,
      },
      {
        id: "stress",
        text: "What stresses you out most right now?",
        why: "I'll be careful around these topics.",
        type: "choice",
        skippable: true,
        options: ["Money", "Health", "Relationships", "Work", "Time", "Everything", "Nothing major"],
      },
      {
        id: "goodDay",
        text: "What does a really good day look like for you?",
        why: "This is my north star for how to help.",
        type: "text",
        skippable: true,
      },
    ],
  },
];

const PHASE_DONE_MSGS = [
  "Got it — I created your profile and know when to check in.",
  "Your people are saved. I'll remember them.",
  "I set up your first action item and I know where to focus.",
  "Your Fülkit is calibrated. I know how to talk to you.",
  "Preferences set. Whispers are ready.",
  "I know you a little deeper now. I'll be thoughtful with it.",
];

export default function Onboarding() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [textVal, setTextVal] = useState("");
  const [multiSelect, setMultiSelect] = useState([]);
  const [showPhaseDone, setShowPhaseDone] = useState(false);
  const [complete, setComplete] = useState(false);
  const inputRef = useRef(null);

  const phase = PHASES[phaseIdx];
  const question = phase?.questions[questionIdx];

  useEffect(() => {
    if (question?.type === "text") {
      inputRef.current?.focus();
    }
  }, [phaseIdx, questionIdx, question?.type]);

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

  const nextPhase = () => {
    setShowPhaseDone(false);
    const nextP = phaseIdx + 1;
    if (nextP < PHASES.length) {
      setPhaseIdx(nextP);
      setQuestionIdx(0);
      setTextVal("");
      setMultiSelect([]);
    } else {
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
      <AuthGuard>
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
          href="/home"
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
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
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
            width: `${((phaseIdx + (showPhaseDone ? 1 : questionIdx / phase.questions.length)) / PHASES.length) * 100}%`,
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
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "var(--radius-xs)",
            background: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-inverse)",
            fontSize: "8px",
            fontWeight: "var(--font-weight-black)",
          }}
        >
          F
        </div>
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
              {PHASE_DONE_MSGS[phaseIdx]}
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
              {phaseIdx < PHASES.length - 1 ? "Continue" : "Finish"}
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
                  {question.options.map((opt) => {
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
    </AuthGuard>
  );
}
