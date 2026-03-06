import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const QUESTIONS = [
  { phase: "11111111-0001-0001-0001-000000000001", qid: "name", text: "What should I call you?", why: "Everything starts with a name.", type: "text", sort: 0 },
  { phase: "11111111-0001-0001-0001-000000000001", qid: "location", text: "Where are you based?", why: "Helps me with time zones, local recommendations, and context.", type: "text", sort: 1 },
  { phase: "11111111-0001-0001-0001-000000000001", qid: "work", text: "What do you do?", why: "Shapes whether I think in terms of bosses, clients, customers, or professors.", type: "choice", options: ["Employee", "Self-employed", "Student", "Between things", "Retired"], sort: 2 },
  { phase: "11111111-0001-0001-0001-000000000001", qid: "dayToDay", text: "What's your day-to-day like?", why: "This determines when and how I check in with you.", type: "choice", options: ["Desk job / computer all day", "On my feet / physical work", "Mix of both", "It changes constantly"], sort: 3 },
  { phase: "11111111-0001-0001-0001-000000000001", qid: "scope", text: "Are you here to organize your life, your work, or both?", why: "Decides whether I build you a personal brain, a work brain, or the full thing.", type: "choice", options: ["Personal life", "Work / career", "Both — it's all connected", "I don't know yet"], sort: 4 },
  { phase: "11111111-0001-0001-0001-000000000002", qid: "people", text: "Who are the 2-3 most important people in your life?", why: "I'll remember them, their names, their role in your life.", type: "text", placeholder: "e.g. Sarah (partner), Mike (business partner), Mom", sort: 0 },
  { phase: "11111111-0001-0001-0001-000000000002", qid: "workPeople", text: "Anyone I should know about at work?", why: "Helps me give advice that accounts for real dynamics.", type: "choice", options: ["Boss / manager", "Business partner", "Team members", "Clients", "Nobody — I work alone"], sort: 1 },
  { phase: "11111111-0001-0001-0001-000000000003", qid: "priority", text: "What's the #1 thing you're trying to get done right now?", why: "This becomes your first action item. I'll check in on it.", type: "text", sort: 0 },
  { phase: "11111111-0001-0001-0001-000000000003", qid: "drops", text: "What keeps falling through the cracks?", why: "This tells me where to focus my whispers.", type: "choice", options: ["Emails / follow-ups", "Health stuff", "Money / bills", "Personal errands", "Projects I start and don't finish"], sort: 1 },
  { phase: "11111111-0001-0001-0001-000000000003", qid: "organization", text: "How do you feel about your current level of organization?", why: "Tells me how much structure to impose.", type: "choice", options: ["Total chaos", "I have a system but it's messy", "Pretty organized", "Obsessively organized", "I don't think about it"], sort: 2 },
  { phase: "11111111-0001-0001-0001-000000000004", qid: "tone", text: "How do you want me to communicate?", why: "Directly sets my tone. This is the most important UX question.", type: "choice", options: ["Short and direct", "Warm and conversational", "Challenge me — push back", "Just be helpful, I'll figure out the vibe"], sort: 0 },
  { phase: "11111111-0001-0001-0001-000000000004", qid: "frequency", text: "How often should I check in with suggestions?", why: "Sets your whisper frequency from day one.", type: "choice", options: ["A couple times a day", "Once a day max", "Only when I ask", "Surprise me"], sort: 1 },
  { phase: "11111111-0001-0001-0001-000000000004", qid: "topics", text: "What topics should I help with?", why: "Scopes what I pay attention to.", type: "choice", multi: true, options: ["Work / productivity", "Health / fitness", "Food / meal planning", "Finance / budgeting", "Personal growth", "All of it"], sort: 2 },
  { phase: "11111111-0001-0001-0001-000000000004", qid: "capture", text: "How do you capture ideas right now?", why: "Tells me whether to push voice mode, quick capture, or meet you where you are.", type: "choice", options: ["Notes app on my phone", "I don't — they just disappear", "Paper / journal", "Voice memos", "A specific app"], sort: 3 },
  { phase: "11111111-0001-0001-0001-000000000005", qid: "chronotype", text: "Morning person or night owl?", why: "Determines when whispers arrive.", type: "choice", options: ["Early bird", "Night owl", "Depends on the day"], sort: 0 },
  { phase: "11111111-0001-0001-0001-000000000005", qid: "briefing", text: "Do you want daily sport scores, news, weather?", why: "Tells me if I should be a morning briefing or stay focused on your brain.", type: "choice", options: ["Sports", "News", "Weather is useful", "None of that — just my stuff", "All of it"], sort: 1 },
  { phase: "11111111-0001-0001-0001-000000000005", qid: "wish", text: "One thing you wish an app could do for you that none of them do?", why: "This tells me what magic moment to create for YOU specifically.", type: "text", sort: 2 },
  { phase: "11111111-0001-0001-0001-000000000006", qid: "goal", text: "What's one goal you have that you haven't told many people?", why: "I'll quietly track this and check in when the time is right.", type: "text", skippable: true, sort: 0 },
  { phase: "11111111-0001-0001-0001-000000000006", qid: "stress", text: "What stresses you out most right now?", why: "I'll be careful around these topics.", type: "choice", skippable: true, options: ["Money", "Health", "Relationships", "Work", "Time", "Everything", "Nothing major"], sort: 1 },
  { phase: "11111111-0001-0001-0001-000000000006", qid: "goodDay", text: "What does a really good day look like for you?", why: "This is my north star for how to help.", type: "text", skippable: true, sort: 2 },
];

export async function POST() {
  const rows = QUESTIONS.map((q) => ({
    phase_id: q.phase,
    question_id: q.qid,
    text: q.text,
    why: q.why,
    type: q.type,
    multi: q.multi || false,
    options: q.options || null,
    placeholder: q.placeholder || null,
    skippable: q.skippable || false,
    sort_order: q.sort,
  }));

  const { data, error } = await supabaseAdmin
    .from("questions")
    .insert(rows);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, count: rows.length });
}
