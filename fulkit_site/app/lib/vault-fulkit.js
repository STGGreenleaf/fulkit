// Model C: Fulkit-managed storage via Supabase
// Plaintext notes, encrypted at rest by Supabase

export async function readFulkitNotes(supabase) {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, pinned, context_mode, source, folder, updated_at")
    .eq("encrypted", false)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[vault-fulkit] Read error:", error.message);
    return [];
  }
  return data || [];
}

export async function readEncryptedNotes(supabase) {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, iv, pinned, context_mode, source, folder, updated_at")
    .eq("encrypted", true)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[vault-fulkit] Read encrypted error:", error.message);
    return [];
  }
  return data || [];
}

export async function importNote({ title, content, source, folder, pinned }, supabase, userId) {
  const isPinned = pinned || false;
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title,
      content,
      source: source || "upload",
      folder: folder || "00-INBOX",
      pinned: isPinned,
      context_mode: isPinned ? "always" : "available",
      encrypted: false,
    })
    .select("id, title")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function importEncryptedNote({ title, ciphertext, iv, source, folder, pinned }, supabase, userId) {
  const isPinned = pinned || false;
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title,
      content: ciphertext,
      iv,
      source: source || "upload",
      folder: folder || "00-INBOX",
      pinned: isPinned,
      context_mode: isPinned ? "always" : "available",
      encrypted: true,
    })
    .select("id, title")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteNote(id, supabase) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getNoteCount(supabase) {
  const { count, error } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true });
  if (error) return 0;
  return count || 0;
}

export async function updateContextMode(id, mode, supabase) {
  const { error } = await supabase
    .from("notes")
    .update({
      context_mode: mode,
      pinned: mode === "always",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function searchNotes(query, supabase) {
  const q = query.toLowerCase();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, context_mode, source, folder")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[vault-fulkit] searchNotes error:", error.message);
    return [];
  }

  return (data || []).filter((n) => {
    const haystack = `${n.title} ${n.folder}`.toLowerCase();
    return haystack.includes(q);
  }).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    context_mode: n.context_mode,
    folder: n.folder,
    tokenEstimate: n.content ? Math.ceil(n.content.length / 4) : 0,
  }));
}

export async function listNotes(supabase) {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, context_mode, source, folder, updated_at, content")
    .order("context_mode", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[vault-fulkit] listNotes error:", error.message);
    return [];
  }

  return (data || []).map((n) => ({
    id: n.id,
    title: n.title,
    context_mode: n.context_mode,
    source: n.source,
    folder: n.folder,
    updated_at: n.updated_at,
    tokenEstimate: n.content ? Math.ceil(n.content.length / 4) : 0,
  }));
}
