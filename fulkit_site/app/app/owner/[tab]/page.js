import Owner from "../page";

const VALID_TABS = ["dashboard", "questions", "design", "users", "socials", "og", "fabric", "playground", "notes", "pitches", "developer"];

export default async function OwnerTabPage({ params }) {
  const { tab } = await params;
  const validTab = VALID_TABS.includes(tab) ? tab : undefined;
  return <Owner initialTab={validTab} />;
}
