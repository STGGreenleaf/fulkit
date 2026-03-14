import ThreadsPage from "../page";

const VALID_FOLDERS = ["all", "work", "personal", "ideas", "reference"];
const VALID_VIEWS = ["board", "list", "calendar", "table"];

export default async function ThreadsTabPage({ params }) {
  const { tab } = await params;
  const segments = Array.isArray(tab) ? tab : [tab];
  // First segment = folder, second = view (optional)
  const folder = VALID_FOLDERS.includes(segments[0]) ? segments[0] : segments[0];
  const view = segments[1] && VALID_VIEWS.includes(segments[1]) ? segments[1] : undefined;
  return <ThreadsPage initialFolder={folder} initialView={view} />;
}
