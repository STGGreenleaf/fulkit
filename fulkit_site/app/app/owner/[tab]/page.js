import Owner from "../page";

const VALID_TABS = ["dashboard", "questions", "design", "users", "socials", "og"];

export default async function OwnerTabPage({ params }) {
  const { tab } = await params;
  const validTab = VALID_TABS.includes(tab) ? tab : "dashboard";
  return <Owner initialTab={validTab} />;
}
