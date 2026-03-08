import { authenticateUser, spotifyFetch } from "../../../../lib/spotify-server";

const KEY_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");
  if (!ids) return Response.json({ error: "ids required" }, { status: 400 });

  const res = await spotifyFetch(userId, `/audio-features?ids=${ids}`);
  if (res.error) return Response.json({ error: res.error }, { status: res.status || 500 });
  if (!res.ok) return Response.json({ features: {} });

  const data = await res.json();
  const features = {};

  for (const f of data.audio_features || []) {
    if (!f) continue;
    features[f.id] = {
      bpm: Math.round(f.tempo),
      key: KEY_NAMES[f.key] + (f.mode === 0 ? "m" : ""),
      energy: Math.round(f.energy * 100),
      danceability: Math.round(f.danceability * 100),
      valence: Math.round(f.valence * 100),
    };
  }

  return Response.json({ features });
}
