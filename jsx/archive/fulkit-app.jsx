import { useState, useRef, useEffect } from "react";

const NOTES = [
  { id: 1, title: "Product launch checklist", content: "Final items before shipping v2. Confirm with design on onboarding flow. Update changelog. Coordinate with marketing for launch day comms. Set up monitoring dashboards.", source: "obsidian", time: "2m" },
  { id: 2, title: "Meeting notes — Q2 review", content: "Revenue up 23%, churn down to 4.1%. Action items: hire 2 engineers, revisit pricing model. CEO wants enterprise tier by Q3. Customer NPS at 62.", source: "gdrive", time: "1h" },
  { id: 3, title: "Book: Thinking Fast & Slow", content: "System 1 vs System 2 thinking. Anchoring bias examples. Heuristics shape everyday decisions. Loss aversion — losses feel 2x as painful as equivalent gains.", source: "dropbox", time: "3h" },
  { id: 4, title: "Marketing strategy brainstorm", content: "Three angles: content-led growth, community building, strategic partnerships. Test each for 30 days. Content: start a newsletter. Community: launch Discord. Partnerships: reach out to 10 complementary tools.", source: "obsidian", time: "5h" },
  { id: 5, title: "API architecture notes", content: "REST vs GraphQL tradeoffs. Start REST, migrate hot paths to GraphQL later. Consider tRPC for type safety. Auth: JWT with refresh tokens. Rate limiting: 100 req/min per user.", source: "gdrive", time: "1d" },
  { id: 6, title: "Weekly reflection — Feb 28", content: "Good week for focus. Shipped sync prototype. Need more exercise — only ran twice. Reading goal on track, finished 2 chapters. Next week: finalize AI integration, start user testing.", source: "obsidian", time: "2d" },
  { id: 7, title: "Competitor analysis draft", content: "Notion: broad but shallow. Obsidian: powerful but ugly UX. Roam: dying. Reflect: nice but no AI. Our edge: beautiful UI + AI that actually knows your stuff.", source: "dropbox", time: "3d" },
  { id: 8, title: "Hiring plan for Q3", content: "Need: 2 senior engineers (full-stack), 1 designer, 1 growth marketer. Budget: $450k total. Timeline: offers out by end of April. Use Ashby for ATS.", source: "gdrive", time: "4d" },
];

const FEATURES = [
  { name: "Graph view", desc: "Visual map of how your notes connect", priority: "high" },
  { name: "AI synthesis", desc: "Combine notes into summaries, briefs, action plans", priority: "high" },
  { name: "Quick capture", desc: "Global shortcut to jot a thought from anywhere", priority: "high" },
  { name: "Tags & filters", desc: "Organize and slice your notes your way", priority: "med" },
  { name: "Theme studio", desc: "Full color customization — your brain, your look", priority: "med" },
  { name: "Daily note", desc: "Auto-generated note for each day", priority: "med" },
  { name: "Backlinks", desc: "See every note that references the current one", priority: "high" },
  { name: "Web clipper", desc: "Save anything from the web into Fulkit", priority: "med" },
  { name: "Spaced repetition", desc: "Resurface notes before you forget them", priority: "low" },
  { name: "Publish to web", desc: "Turn any note into a public page", priority: "low" },
  { name: "Collaboration", desc: "Share a note or folder with someone", priority: "low" },
  { name: "Voice capture", desc: "Speak a note, AI transcribes and files it", priority: "med" },
  { name: "Templates", desc: "Reusable structures for meetings, journals, etc.", priority: "med" },
  { name: "Import/export", desc: "Markdown in, markdown out. No lock-in ever.", priority: "high" },
  { name: "Mobile app", desc: "Your brain in your pocket", priority: "high" },
  { name: "Offline mode", desc: "Works without internet, syncs when back", priority: "med" },
];

const MODES = {
  1: {
    label: "General",
    desc: "Full assistant, no note awareness",
    system: "You are Fulkit's AI assistant. You are a helpful, general-purpose assistant. Be concise and direct. No filler."
  },
  2: {
    label: "Brain only",
    desc: "Only discusses notes",
    system: `You are Fulkit's AI assistant. You ONLY help users with their notes and knowledge base. If asked about anything unrelated to their notes, politely redirect them. Say something like "I'm here to help with your notes and knowledge — try asking me about something you've saved."

Here are the user's current notes:
${NOTES.map(n => `- "${n.title}": ${n.content}`).join("\n")}`
  },
  3: {
    label: "Brain-first",
    desc: "Can do anything, connects to notes",
    system: `You are Fulkit's AI assistant — the voice of the user's second brain. You can help with anything, but you always try to connect things back to what the user has saved. If a question relates to their notes, reference them naturally. If it doesn't, still help but look for opportunities to say things like "this reminds me of something in your notes about X."

Be concise, direct, and warm. No filler. Feel like a smart friend who's read everything they've saved.

Here are the user's current notes:
${NOTES.map(n => `- "${n.title}" (from ${n.source}): ${n.content}`).join("\n")}`
  },
};

const dot = (source) => {
  const c = source === "obsidian" ? "#7C3AED" : source === "gdrive" ? "#16A34A" : "#2563EB";
  return <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />;
};

const priorityStyle = (p) => ({
  padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600,
  background: p === "high" ? "#171717" : p === "med" ? "#E5E5E5" : "#F5F5F5",
  color: p === "high" ? "#fff" : p === "med" ? "#525252" : "#A3A3A3",
});

export default function Fulkit() {
  const [view, setView] = useState("notes");
  const [selected, setSelected] = useState(null);
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(3);
  const [devOpen, setDevOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = aiInput.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setAiInput("");
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250514",
          max_tokens: 1000,
          system: MODES[aiMode].system,
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      const aiText = data.content
        ?.filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n") || "Something went wrong.";

      setMessages(prev => [...prev, { role: "ai", content: aiText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", content: "Connection error. Try again." }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      display: "flex", width: "100%", height: "100vh", overflow: "hidden",
      background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#171717",
    }}>
      <style>{`
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: #A3A3A3; }
        textarea { resize: none; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{
        width: 200, minWidth: 200, borderRight: "1px solid #E5E5E5",
        display: "flex", flexDirection: "column", padding: "16px 10px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0 10px", marginBottom: 24,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, background: "#171717",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 11, fontWeight: 800,
          }}>F</div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Fulkit</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { id: "notes", label: "Notes" },
            { id: "ai", label: "AI" },
            { id: "sources", label: "Sources" },
            { id: "roadmap", label: "Roadmap" },
          ].map(item => (
            <div key={item.id} onClick={() => setView(item.id)} style={{
              padding: "8px 10px", borderRadius: 6, cursor: "pointer",
              background: view === item.id ? "#F5F5F5" : "transparent",
              color: view === item.id ? "#171717" : "#737373",
              fontWeight: view === item.id ? 600 : 400, fontSize: 14,
            }}>{item.label}</div>
          ))}
        </nav>

        {/* DEV TOOLS */}
        <div style={{ borderTop: "1px solid #E5E5E5", paddingTop: 8 }}>
          <div onClick={() => setDevOpen(!devOpen)} style={{
            padding: "8px 10px", borderRadius: 6, cursor: "pointer",
            background: devOpen ? "#F5F5F5" : "transparent",
            color: "#A3A3A3", fontSize: 12, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>⚙</span> Dev tools
          </div>

          {devOpen && (
            <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
                AI Mode
              </div>
              {[1, 2, 3].map(m => (
                <div key={m} onClick={() => { setAiMode(m); setMessages([]); }} style={{
                  padding: "6px 8px", borderRadius: 5, cursor: "pointer",
                  background: aiMode === m ? "#171717" : "transparent",
                  color: aiMode === m ? "#fff" : "#737373",
                  fontSize: 12, fontWeight: aiMode === m ? 600 : 400,
                  transition: "all 0.1s",
                }}>
                  <div>{MODES[m].label}</div>
                  <div style={{
                    fontSize: 10, marginTop: 1,
                    color: aiMode === m ? "#A3A3A3" : "#A3A3A3",
                    opacity: aiMode === m ? 0.7 : 0.5,
                  }}>{MODES[m].desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {view === "notes" && (
          <>
            <div style={{
              padding: "16px 24px", borderBottom: "1px solid #E5E5E5",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <input placeholder="Search notes..." style={{
                border: "none", outline: "none", fontSize: 14, color: "#171717",
                background: "transparent", width: 300,
              }} />
              <span style={{ fontSize: 12, color: "#A3A3A3" }}>{NOTES.length} notes</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {NOTES.map(note => (
                <div key={note.id} onClick={() => setSelected(note.id)}
                  style={{
                    padding: "12px 24px", borderBottom: "1px solid #F5F5F5",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    background: selected === note.id ? "#FAFAFA" : "transparent",
                  }}
                  onMouseEnter={e => { if (selected !== note.id) e.currentTarget.style.background = "#FAFAFA"; }}
                  onMouseLeave={e => { if (selected !== note.id) e.currentTarget.style.background = "transparent"; }}
                >
                  {dot(note.source)}
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{note.title}</span>
                  <span style={{ fontSize: 12, color: "#A3A3A3" }}>{note.time}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {view === "sources" && (
          <div style={{ padding: "24px", flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>Sources</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: "Obsidian Vault", notes: 847, color: "#7C3AED", connected: true },
                { name: "Google Drive", notes: 234, color: "#16A34A", connected: true },
                { name: "Dropbox", notes: 166, color: "#2563EB", connected: true },
                { name: "iCloud Drive", notes: 0, color: "#A3A3A3", connected: false },
              ].map((src, i) => (
                <div key={i} style={{
                  padding: "12px 16px", borderRadius: 8, border: "1px solid #E5E5E5",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: src.color }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{src.name}</span>
                  {src.connected ? (
                    <span style={{ fontSize: 12, color: "#737373" }}>{src.notes} notes</span>
                  ) : (
                    <span style={{
                      fontSize: 12, color: "#171717", fontWeight: 600,
                      padding: "4px 10px", borderRadius: 5, border: "1px solid #E5E5E5", cursor: "pointer",
                    }}>Connect</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "roadmap" && (
          <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Roadmap</h2>
            <p style={{ fontSize: 13, color: "#737373", margin: "0 0 20px" }}>Features planned for Fulkit. This isn't everyone else's second brain.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{
                  padding: "10px 14px", borderRadius: 8, border: "1px solid #F0F0F0",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#171717" }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: "#A3A3A3", marginTop: 2 }}>{f.desc}</div>
                  </div>
                  <span style={priorityStyle(f.priority)}>{f.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "ai" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Mode indicator */}
            <div style={{
              padding: "10px 24px", borderBottom: "1px solid #F5F5F5",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>AI</span>
              <span style={{
                fontSize: 11, color: "#A3A3A3", padding: "2px 7px",
                borderRadius: 4, background: "#F5F5F5",
              }}>{MODES[aiMode].label} mode</span>
              {messages.length > 0 && (
                <span
                  onClick={() => setMessages([])}
                  style={{
                    marginLeft: "auto", fontSize: 11, color: "#A3A3A3",
                    cursor: "pointer",
                  }}
                >Clear</span>
              )}
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "20px 24px",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              {messages.length === 0 && !loading && (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <p style={{ fontSize: 13, color: "#A3A3A3", textAlign: "center", lineHeight: 1.6 }}>
                    Ask anything about your notes.<br />AI reads across all your sources.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex", flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "100%",
                }}>
                  <div style={{
                    maxWidth: 600,
                    padding: "10px 14px",
                    borderRadius: 12,
                    borderTopRightRadius: msg.role === "user" ? 4 : 12,
                    borderTopLeftRadius: msg.role === "ai" ? 4 : 12,
                    background: msg.role === "user" ? "#171717" : "#F5F5F5",
                    color: msg.role === "user" ? "#fff" : "#171717",
                    fontSize: 14, lineHeight: 1.6,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{
                  display: "flex", gap: 4, padding: "10px 14px",
                  background: "#F5F5F5", borderRadius: 12, borderTopLeftRadius: 4,
                  alignSelf: "flex-start",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#A3A3A3",
                      animation: `pulse 1s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 24px 20px", maxWidth: 640, width: "100%", margin: "0 auto" }}>
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 6,
                border: "1px solid #E5E5E5", borderRadius: 10,
                padding: "4px 4px 4px 14px",
              }}>
                <textarea
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your brain..."
                  rows={1}
                  style={{
                    flex: 1, border: "none", outline: "none", background: "transparent",
                    color: "#171717", fontSize: 14, fontFamily: "inherit",
                    padding: "6px 0", lineHeight: 1.4, maxHeight: 120, overflowY: "auto",
                  }}
                />
                <div
                  onClick={sendMessage}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: aiInput.trim() ? "#171717" : "#E5E5E5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: aiInput.trim() ? "pointer" : "default",
                    transition: "background 0.15s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
