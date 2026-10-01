import { supabase } from "./supabase";

function makeToken(length = 16): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  } else {
    for (let i = 0; i < length; i++)
      out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function createShareLink(
  projectId: string,
  createdByUserId: string,
  validityDays = 7
): Promise<string> {
  // Reuse an existing valid link
  const { data: existing } = await supabase
    .from("shared_links")
    .select("token, expires_at")
    .eq("project_id", projectId)
    .eq("created_by", createdByUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) {
    const exp = existing.expires_at;
    if (!exp || new Date(exp) > new Date()) return existing.token;
  }

  const token = makeToken();
  const expiresAt = new Date(
    Date.now() + validityDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from("shared_links").insert({
    token,
    project_id: projectId,
    created_by: createdByUserId,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
  return token;
}

export async function fetchShared(token: string): Promise<{
  project: any;
  questions: any[];
} | null> {
  const { data: row } = await supabase
    .from("shared_links")
    .select("project_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", row.project_id)
    .maybeSingle();
  if (!project) return null;

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("project_id", row.project_id)
    .order("created_at", { ascending: true });

  // Bump views (ignore errors)
  supabase
    .rpc("increment_shared_link_views", { p_token: token })
    .then(undefined, () => undefined);

  return { project, questions: questions ?? [] };
}

export async function importSharedProject(
  token: string,
  newOwnerUserId: string
): Promise<string> {
  const data = await fetchShared(token);
  if (!data) throw new Error("Share link is invalid or expired.");

  const { project: src, questions: srcQuestions } = data;
  const now = new Date().toISOString();

  const { data: newProject, error: pErr } = await supabase
    .from("projects")
    .insert({
      owner_id: newOwnerUserId,
      name: `${src.name ?? "Untitled"} (imported)`,
      description: src.description,
      sector: src.sector,
      country: src.country,
      status: "draft",
      last_edited: now,
      date_modified: now,
      copied_from: src.id,
      copied_at: now,
    })
    .select()
    .single();
  if (pErr) throw new Error(pErr.message);

  for (const q of srcQuestions) {
    await supabase.from("questions").insert({
      project_id: newProject.id,
      type: q.type,
      label: q.label,
      choices: q.choices,
      media_url: q.media_url,
      media_type: q.media_type,
      answer: q.answer,
      created_at: q.created_at,
    });
  }

  return newProject.id;
}