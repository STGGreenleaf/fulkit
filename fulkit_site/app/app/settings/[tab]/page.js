import Settings from "../page";

const VALID_TABS = ["account", "sources", "vault", "ai", "referrals", "billing", "privacy"];

export default async function SettingsTabPage({ params }) {
  const { tab } = await params;
  const validTab = VALID_TABS.includes(tab) ? tab : "account";
  return <Settings initialTab={validTab} />;
}
