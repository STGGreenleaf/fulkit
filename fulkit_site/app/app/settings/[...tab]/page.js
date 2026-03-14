import Settings from "../page";

const VALID_TABS = ["account", "sources", "vault", "ai", "referrals", "billing", "privacy", "owner"];
const VALID_OWNER_TABS = ["dashboard", "questions", "design", "users", "socials", "og", "fabric", "playground"];

export default async function SettingsTabPage({ params }) {
  const { tab } = await params;
  const segments = Array.isArray(tab) ? tab : [tab];
  const mainTab = VALID_TABS.includes(segments[0]) ? segments[0] : "account";
  const ownerTab = mainTab === "owner" && segments[1] && VALID_OWNER_TABS.includes(segments[1])
    ? segments[1]
    : undefined;
  return <Settings initialTab={mainTab} initialOwnerTab={ownerTab} />;
}
