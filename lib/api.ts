import { supabase } from "./supabase";
import { getUser, isAdmin } from "./auth";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  sector: string | null;
  country: string | null;
  status: "draft" | "deployed" | "archived";
  owner_id: string;
  last_edited: string | null;
  date_modified: string | null;
  date_deployed: string | null;
  copied_from: string | null;
};

export type OwnerInfo = {
  id: string;
  f_name: string;
  email: string;
};

export type ProjectWithOwner = Project & {
  owner: OwnerInfo | null;
  submissions: number;
  _permission: "owner" | "edit" | "fill";
};

export type Question = {
  id: string;
  project_id: string;
  type: string;
  label: string;
  choices: any;
  answer: any;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

export type ResponseRow = {
  id: string;
  project_id: string;
  submitted_by: string | null;
  submitted_at: string;
  answers: Record<string, any>;
  geo_lat: number | null;
  geo_lng: number | null;
  media: Record<string, any>;
  submitter_name?: string;
  submitter_email?: string;
};

// ── PROJECTS ────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectWithOwner[]> {
  const user = getUser();
  if (!user) return [];

  // 1. Owned projects
  const { data: ownedProjects, error: ownedErr } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("date_modified", { ascending: false });
  if (ownedErr) throw new Error(ownedErr.message);

  // 2. Shared projects
  const { data: shares, error: shareErr } = await supabase
    .from("project_shares")
    .select("project_id, permission")
    .eq("shared_with_user_id", user.id);
  if (shareErr) throw new Error(shareErr.message);

  const permMap = new Map<string, "edit" | "fill">();
  (shares ?? []).forEach((s: any) =>
    permMap.set(s.project_id, s.permission)
  );

  const sharedIds = Array.from(permMap.keys());
  let sharedProjects: any[] = [];
  if (sharedIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .in("id", sharedIds)
      .order("date_modified", { ascending: false });
    if (error) throw new Error(error.message);
    sharedProjects = data ?? [];
  }

  // 3. Owner info
  const allOwnerIds = Array.from(
    new Set(
      [...(ownedProjects ?? []), ...sharedProjects].map((p: any) => p.owner_id)
    )
  );
  const ownerMap = new Map<string, OwnerInfo>();
  if (allOwnerIds.length > 0) {
    const { data: owners } = await supabase
      .from("usersT")
      .select("id, f_name, email")
      .in("id", allOwnerIds);
    (owners ?? []).forEach((o: any) =>
      ownerMap.set(o.id, {
        id: o.id,
        f_name: o.f_name,
        email: o.email ?? "",
      })
    );
  }

  // 4. Response counts
  const allIds = [
    ...(ownedProjects ?? []).map((p: any) => p.id),
    ...sharedProjects.map((p: any) => p.id),
  ];
  let counts: { project_id: string }[] = [];
  if (allIds.length > 0) {
    const { data } = await supabase
      .from("responses")
      .select("project_id")
      .in("project_id", allIds);
    counts = data ?? [];
  }
  const countMap = new Map<string, number>();
  counts.forEach((c: any) =>
    countMap.set(c.project_id, (countMap.get(c.project_id) ?? 0) + 1)
  );

  const owned: ProjectWithOwner[] = (ownedProjects ?? []).map((p: any) => ({
    ...(p as Project),
    owner: ownerMap.get(p.owner_id) ?? null,
    submissions: countMap.get(p.id) ?? 0,
    _permission: "owner",
  }));

  const shared: ProjectWithOwner[] = sharedProjects.map((p: any) => ({
    ...(p as Project),
    owner: ownerMap.get(p.owner_id) ?? null,
    submissions: countMap.get(p.id) ?? 0,
    _permission: permMap.get(p.id) ?? "fill",
  }));

  // 5. Dedupe
  const seen = new Set<string>();
  const result: ProjectWithOwner[] = [];
  for (const p of [...owned, ...shared]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    result.push(p);
  }

  return result;
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Project) ?? null;
}

export async function getQuestions(projectId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Question[];
}

export async function getResponses(projectId: string): Promise<ResponseRow[]> {
  const { data, error } = await supabase
    .from("responses")
    .select("*")
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("[getResponses]", error.message, error.code);
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ResponseRow[];

  // Enrich with submitter name/email from usersT (best-effort)
  const submitterIds = Array.from(
    new Set(rows.map((r) => r.submitted_by).filter(Boolean))
  ) as string[];

  if (submitterIds.length > 0) {
    const { data: users } = await supabase
      .from("usersT")
      .select("id, f_name, email")
      .in("id", submitterIds);
    const map = new Map<string, any>();
    (users ?? []).forEach((u: any) => map.set(u.id, u));

    rows.forEach((r) => {
      if (r.submitted_by) {
        const u = map.get(r.submitted_by);
        if (u) {
          r.submitter_name = u.f_name;
          r.submitter_email = u.email ?? "";
        } else {
          r.submitter_name = "App user";
          r.submitter_email = "";
        }
      } else {
        r.submitter_name = "Anonymous";
        r.submitter_email = "";
      }
    });
  } else {
    rows.forEach((r) => {
      r.submitter_name = r.submitter_name ?? "Anonymous";
      r.submitter_email = r.submitter_email ?? "";
    });
  }

  return rows;
}

export async function updateProject(
  id: string,
  patch: Partial<Project>
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ ...patch, date_modified: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProject(id: string): Promise<void> {
  await supabase.from("responses").delete().eq("project_id", id);
  await supabase.from("questions").delete().eq("project_id", id);
  await supabase.from("project_shares").delete().eq("project_id", id);
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function archiveProject(id: string): Promise<void> {
  await updateProject(id, { status: "archived" });
}

// ── RESPONSES ──────────────────────────────────────────────

export async function deleteResponse(responseId: string): Promise<void> {
  const { error } = await supabase
    .from("responses")
    .delete()
    .eq("id", responseId);
  if (error) throw new Error(error.message);
}

// ── SHARING ────────────────────────────────────────────────

export async function shareProjectAccess({
  projectId,
  recipientInput,
  permission,
}: {
  projectId: string;
  recipientInput: string;
  permission: "edit" | "fill";
}): Promise<{ recipientName: string }> {
  const me = getUser();
  if (!me) throw new Error("Not logged in.");

  const needle = recipientInput.trim().toLowerCase();
  if (!needle) throw new Error("Enter a username or email.");

  const { data: recipient, error: findError } = await supabase
    .from("usersT")
    .select("id, f_name, email")
    .or(`f_name.eq.${needle},email.eq.${needle}`)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!recipient)
    throw new Error("No user found with that username or email.");
  if (recipient.id === me.id)
    throw new Error("You can't share a project with yourself.");

  const { data: proj } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!proj) throw new Error("Project not found.");
  if (proj.owner_id !== me.id)
    throw new Error("Only the owner can share this project.");

  const { error: shareErr } = await supabase.from("project_shares").upsert(
    {
      project_id: projectId,
      shared_with_user_id: recipient.id,
      shared_by_user_id: me.id,
      permission,
    },
    { onConflict: "project_id,shared_with_user_id" }
  );

  if (shareErr) throw new Error(shareErr.message);

  return { recipientName: recipient.f_name };
}

export async function unshareProjectAccess(
  projectId: string,
  recipientId: string
): Promise<void> {
  const { error } = await supabase
    .from("project_shares")
    .delete()
    .eq("project_id", projectId)
    .eq("shared_with_user_id", recipientId);
  if (error) throw new Error(error.message);
}

export async function getProjectAccess(
  projectId: string
): Promise<
  { user_id: string; f_name: string; email: string; permission: string }[]
> {
  const { data: shares, error } = await supabase
    .from("project_shares")
    .select("shared_with_user_id, permission")
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  if (!shares || shares.length === 0) return [];

  const ids = shares.map((s: any) => s.shared_with_user_id);
  const { data: users } = await supabase
    .from("usersT")
    .select("id, f_name, email")
    .in("id", ids);

  const userMap = new Map<string, any>();
  (users ?? []).forEach((u: any) => userMap.set(u.id, u));

  return shares.map((s: any) => ({
    user_id: s.shared_with_user_id,
    f_name: userMap.get(s.shared_with_user_id)?.f_name ?? "Unknown",
    email: userMap.get(s.shared_with_user_id)?.email ?? "",
    permission: s.permission,
  }));
}

export async function getMyPermission(
  projectId: string
): Promise<"owner" | "edit" | "fill" | null> {
  const me = getUser();
  if (!me) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (project?.owner_id === me.id) return "owner";

  const { data: share } = await supabase
    .from("project_shares")
    .select("permission")
    .eq("project_id", projectId)
    .eq("shared_with_user_id", me.id)
    .maybeSingle();

  return (share?.permission as any) ?? null;
}

// ── USERS ──────────────────────────────────────────────────

export type UserRow = {
  id: string;
  f_name: string;
  l_name: string | null;
  email: string;
  phone: string | null;
  role: "admin" | "collector";
  is_active: boolean;
  created_at: string;
};

export async function getUsers(): Promise<UserRow[]> {
  const user = getUser();
  if (!isAdmin(user)) throw new Error("Admin access required.");
  const { data, error } = await supabase
    .from("usersT")
    .select("id, f_name, l_name, email, phone, role, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserRow[];
}

export async function updateUser(
  id: string,
  patch: Partial<UserRow>
): Promise<void> {
  const user = getUser();
  if (!isAdmin(user)) throw new Error("Admin access required.");
  const { error } = await supabase.from("usersT").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteUser(id: string): Promise<void> {
  const user = getUser();
  if (!isAdmin(user)) throw new Error("Admin access required.");
  const { error } = await supabase.from("usersT").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── STATS ──────────────────────────────────────────────────

export type GlobalStats = {
  totalProjects: number;
  totalUsers: number;
  totalResponses: number;
  deployedProjects: number;
  bySector: { sector: string; count: number }[];
  byStatus: { status: string; count: number }[];
};

export async function getGlobalStats(): Promise<GlobalStats> {
  const user = getUser();
  if (!user) {
    return {
      totalProjects: 0,
      totalUsers: 0,
      totalResponses: 0,
      deployedProjects: 0,
      bySector: [],
      byStatus: [],
    };
  }

  let projectQuery = supabase.from("projects").select("id, sector, status");
  if (!isAdmin(user)) projectQuery = projectQuery.eq("owner_id", user.id);

  const [projectsRes, usersRes] = await Promise.all([
    projectQuery,
    isAdmin(user)
      ? supabase.from("usersT").select("id")
      : Promise.resolve({ data: [{ id: user.id }], error: null }),
  ]);

  const p = projectsRes.data ?? [];
  let responseCount = 0;
  if (p.length > 0) {
    const ids = p.map((row: any) => row.id);
    try {
      const r = await supabase
        .from("responses")
        .select("id")
        .in("project_id", ids);
      responseCount = (r.data ?? []).length;
    } catch {
      responseCount = 0;
    }
  }

  const sectorMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  p.forEach((row: any) => {
    const s = row.sector ?? "Unspecified";
    sectorMap.set(s, (sectorMap.get(s) ?? 0) + 1);
    const st = row.status ?? "draft";
    statusMap.set(st, (statusMap.get(st) ?? 0) + 1);
  });

  return {
    totalProjects: p.length,
    totalUsers: (usersRes.data ?? []).length,
    totalResponses: responseCount,
    deployedProjects: p.filter((r: any) => r.status === "deployed").length,
    bySector: Array.from(sectorMap.entries())
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count),
    byStatus: Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ── SUMMARY ────────────────────────────────────────────────

export type SummaryItem = {
  questionId: string;
  label: string;
  type: string;
  total: number;
  options?: { value: string; count: number }[];
  average?: number;
  samples?: string[];
};

export async function getProjectSummary(
  projectId: string
): Promise<SummaryItem[]> {
  const [questions, responses] = await Promise.all([
    getQuestions(projectId),
    getResponses(projectId),
  ]);

  return questions.map((q) => {
    const answers = responses
      .map((r) => r.answers?.[q.id])
      .filter((v) => v !== undefined && v !== null && v !== "");

    const base: SummaryItem = {
      questionId: q.id,
      label: q.label,
      type: q.type,
      total: answers.length,
    };

    if (
      q.type === "Select One" ||
      q.type === "Select Many" ||
      q.type === "Ranking"
    ) {
      const counts = new Map<string, number>();
      answers.forEach((a) => {
        if (Array.isArray(a)) {
          a.forEach((v) =>
            counts.set(String(v), (counts.get(String(v)) ?? 0) + 1)
          );
        } else {
          counts.set(String(a), (counts.get(String(a)) ?? 0) + 1);
        }
      });
      base.options = Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    }

    if (q.type === "Number" || q.type === "Decimal" || q.type === "Range") {
      const nums = answers.map((a) => Number(a)).filter((n) => !isNaN(n));
      base.average =
        nums.length > 0
          ? nums.reduce((a, b) => a + b, 0) / nums.length
          : undefined;
    }

    if (q.type === "Text") {
      base.samples = answers.slice(0, 5).map((a) => String(a));
    }

    return base;
  });
}

// ── XML EXPORT ─────────────────────────────────────────────

export function buildProjectXml(
  project: Project,
  questions: Question[],
  responses: ResponseRow[]
): string {
  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<project version="1.0">');
  lines.push("  <meta>");
  lines.push(`    <name>${esc(project.name)}</name>`);
  lines.push(
    `    <description>${esc(project.description ?? "")}</description>`
  );
  lines.push(`    <sector>${esc(project.sector ?? "")}</sector>`);
  lines.push(`    <country>${esc(project.country ?? "")}</country>`);
  lines.push(`    <status>${esc(project.status ?? "draft")}</status>`);
  lines.push(`    <exported_at>${new Date().toISOString()}</exported_at>`);
  lines.push("  </meta>");

  lines.push("  <questions>");
  for (const q of questions) {
    const choices: string[] = Array.isArray(q.choices)
      ? q.choices.map(String)
      : [];
    lines.push(`    <question type="${esc(q.type)}">`);
    lines.push(`      <label>${esc(q.label)}</label>`);
    if (choices.length) {
      lines.push("      <choices>");
      for (const c of choices) {
        lines.push(`        <choice>${esc(c)}</choice>`);
      }
      lines.push("      </choices>");
    }
    if (q.media_url) {
      lines.push(`      <media_url>${esc(q.media_url)}</media_url>`);
      if (q.media_type) {
        lines.push(`      <media_type>${esc(q.media_type)}</media_type>`);
      }
    }
    lines.push("    </question>");
  }
  lines.push("  </questions>");

  lines.push("  <responses>");
  for (const r of responses) {
    lines.push(
      `    <response submitted_by="${esc(
        r.submitter_name ?? ""
      )}" submitted_at="${esc(r.submitted_at)}">`
    );
    for (const q of questions) {
      const v = r.answers?.[q.id];
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        lines.push(
          `      <answer question="${esc(q.label)}" type="list">${esc(
            JSON.stringify(v)
          )}</answer>`
        );
      } else {
        lines.push(
          `      <answer question="${esc(q.label)}">${esc(v)}</answer>`
        );
      }
    }
    lines.push("    </response>");
  }
  lines.push("  </responses>");

  lines.push("</project>");
  return lines.join("\n");
}

// ── ACCOUNT ────────────────────────────────────────────────

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data, error } = await supabase.rpc("change_own_password", {
    p_user_id: userId,
    p_current_password: currentPassword,
    p_new_password: newPassword,
  });

  if (error) throw new Error(error.message);

  const row: any = data;
  if (!row?.success) {
    throw new Error(row?.error ?? "Password change failed.");
  }
}