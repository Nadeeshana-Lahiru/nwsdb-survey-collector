"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getProjects,
  archiveProject,
  deleteProject,
  updateProject,
  shareProjectAccess,
  ProjectWithOwner,
  getQuestions,
  getResponses,
  buildProjectXml,
} from "@/lib/api";
import { getUser } from "@/lib/auth";

type TabKey = "all" | "draft" | "deployed" | "archived";

export default function ProjectsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const me = typeof window !== "undefined" ? getUser() : null;
  const isAdmin = me?.role === "admin";

  const [projects, setProjects] = useState<ProjectWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareMenu, setShareMenu] = useState<ProjectWithOwner | null>(null);
  const [shareMode, setShareMode] = useState<"link" | "user" | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setProjects(await getProjects());
    } catch (e: any) {
      setError(e.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = projects;
    if (tab !== "all") list = list.filter((p) => p.status === tab);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          (p.sector ?? "").toLowerCase().includes(needle) ||
          (p.owner?.f_name ?? "").toLowerCase().includes(needle)
      );
    }
    return list;
  }, [projects, tab, q]);

  const counts = useMemo(
    () => ({
      all: projects.length,
      draft: projects.filter((p) => p.status === "draft").length,
      deployed: projects.filter((p) => p.status === "deployed").length,
      archived: projects.filter((p) => p.status === "archived").length,
    }),
    [projects]
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filtered.map((p) => p.id)) : new Set());
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleDeploy(p: ProjectWithOwner) {
    try {
      await updateProject(p.id, {
        status: "deployed",
        date_deployed: new Date().toISOString(),
      } as any);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleArchive(p: ProjectWithOwner) {
    if (!confirm(`Archive "${p.name}"?`)) return;
    try {
      await archiveProject(p.id);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleMoveToDraft(p: ProjectWithOwner) {
    try {
      await updateProject(p.id, { status: "draft" });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(p: ProjectWithOwner) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(p.id);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  // ── Download the project as XML (works for owner, edit, and fill) ──
  async function handleDownload(p: ProjectWithOwner) {
    try {
      const [qs, rs] = await Promise.all([
        getQuestions(p.id),
        getResponses(p.id),
      ]);
      const xml = buildProjectXml(p, qs, rs);
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${p.name}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message ?? "Download failed.");
    }
  }

  // ─── Share via link ────────────────────────────────────
  async function handleGenerateLink(p: ProjectWithOwner) {
    const me = getUser();
    if (!me) {
      alert("You're not logged in.");
      return;
    }
    try {
      const { createShareLink } = await import("@/lib/share-link");
      const token = await createShareLink(p.id, me.id);
      const link = `${window.location.origin}/import?token=${token}`;
      try {
        await navigator.clipboard.writeText(link);
        alert(`Share link copied to clipboard:\n\n${link}`);
      } catch {
        prompt("Copy this share link:", link);
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function bulkArchive() {
    if (selected.size === 0) return;
    if (!confirm(`Archive ${selected.size} project(s)?`)) return;
    setBusy(true);
    try {
      await Promise.all(Array.from(selected).map((id) => archiveProject(id)));
      setSelected(new Set());
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} project(s)? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await Promise.all(Array.from(selected).map((id) => deleteProject(id)));
      setSelected(new Set());
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "deployed", label: "Deployed" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="flex h-full flex-col bg-[#f4f6f8]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? "All Projects" : "My Projects"}
        </h1>

        <Link
          href="/stats"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 3a9 9 0 0 1 9 9h-9V3Z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          Projects by sector
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-gray-600">
                {selected.size} selected
              </span>
              <button
                onClick={bulkArchive}
                disabled={busy}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Archive
              </button>
              <button
                onClick={bulkDelete}
                disabled={busy}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={load}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
          <Link
            href="/projects/new"
            className="flex items-center gap-1 rounded-md bg-[#004C99] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#003d7a]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            NEW PROJECT
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 px-6 pt-4">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-[#004C99] text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label} ({counts[t.key]})
            </button>
          );
        })}
        {q && (
          <div className="ml-2 rounded-full bg-blue-50 px-3 py-1 text-xs text-[#004C99]">
            Search: "{q}"{" "}
            <Link href="/projects" className="ml-1 underline">
              clear
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-sm">
                {q
                  ? `No projects match "${q}".`
                  : "There are no projects to display."}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        selected.size > 0 && selected.size === filtered.length
                      }
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="py-3 pr-4">Project name</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Access</th>
                  <th className="py-3 pr-4">Sector</th>
                  <th className="py-3 pr-4">Last edited</th>
                  <th className="py-3 pr-4">Deployed</th>
                  <th className="py-3 pr-4">Submissions</th>
                  <th className="py-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    selected={selected.has(project.id)}
                    onToggle={() => toggleOne(project.id)}
                    onOpen={() => router.push(`/projects/${project.id}`)}
                    onDeploy={() => handleDeploy(project)}
                    onArchive={() => handleArchive(project)}
                    onDraft={() => handleMoveToDraft(project)}
                    onShare={() => setShareMenu(project)}
                    onEdit={() => router.push(`/projects/${project.id}/edit`)}
                    onDelete={() => handleDelete(project)}
                    onDownload={() => handleDownload(project)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Share menu — step 1: choose link or user */}
      {shareMenu && !shareMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShareMenu(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#004C99]"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.6 13.5 6.8 3.9M15.4 6.5 8.6 10.4" />
              </svg>
              <span className="text-base font-semibold">
                Share "{shareMenu.name}"
              </span>
            </div>

            <div className="p-5">
              <button
                onClick={() => {
                  handleGenerateLink(shareMenu);
                  setShareMenu(null);
                }}
                className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:border-[#004C99] hover:bg-blue-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#004C99]">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Copy share link
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Send a link — the recipient pastes it into{" "}
                    <strong>Create project → Import via URL</strong>.
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShareMode("user")}
                className="mt-3 flex w-full items-start gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:border-[#004C99] hover:bg-blue-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6M22 11h-6" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Share with a user
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Grant a specific user access with edit or fill permission.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button
                onClick={() => setShareMenu(null)}
                className="rounded-md px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share menu — step 2: user share with permission */}
      {shareMenu && shareMode === "user" && (
        <UserShareDialog
          project={shareMenu}
          onClose={() => {
            setShareMode(null);
            setShareMenu(null);
          }}
          onShared={() => {
            setShareMode(null);
            setShareMenu(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// USER SHARE DIALOG (with permission chooser)
// ═══════════════════════════════════════════════════════════
function UserShareDialog({
  project,
  onClose,
  onShared,
}: {
  project: ProjectWithOwner;
  onClose: () => void;
  onShared: () => void;
}) {
  const [input, setInput] = useState("");
  const [permission, setPermission] = useState<"edit" | "fill">("fill");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    if (!input.trim()) {
      setError("Enter a username or email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await shareProjectAccess({
        projectId: project.id,
        recipientInput: input.trim(),
        permission,
      });
      alert(
        `Shared "${project.name}" with ${res.recipientName} (${
          permission === "edit" ? "edit and fill" : "fill only"
        }).`
      );
      onShared();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-indigo-600"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          <span className="text-base font-semibold">
            Share "{project.name}"
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Recipient email or username
            </label>
            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="email or username"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none focus:ring-2 focus:ring-[#004C99]/20"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              Permission
            </div>

            <label
              className={`mb-2 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                permission === "fill"
                  ? "border-[#004C99] bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="perm"
                checked={permission === "fill"}
                onChange={() => setPermission("fill")}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Fill only</div>
                <div className="text-xs text-gray-500">
                  Recipient can submit responses. They cannot edit the form.
                </div>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                permission === "edit"
                  ? "border-[#004C99] bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="perm"
                checked={permission === "edit"}
                onChange={() => setPermission("edit")}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">
                  Edit and fill
                </div>
                <div className="text-xs text-gray-500">
                  Recipient can edit the form AND submit responses.
                </div>
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={share}
            disabled={busy}
            className="rounded-md bg-[#004C99] px-5 py-1.5 text-sm font-semibold text-white hover:bg-[#003d7a] disabled:opacity-50"
          >
            {busy ? "Sharing…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROJECT ROW
// ═══════════════════════════════════════════════════════════
function ProjectRow({
  project,
  selected,
  onToggle,
  onOpen,
  onDeploy,
  onArchive,
  onDraft,
  onShare,
  onEdit,
  onDelete,
  onDownload,
}: {
  project: ProjectWithOwner;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onDeploy: () => void;
  onArchive: () => void;
  onDraft: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const status = project.status;
  const isOwner = project._permission === "owner";
  const canEdit = isOwner || project._permission === "edit";

  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/40">
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 rounded border-gray-300"
        />
      </td>

      <td className="py-4 pr-4">
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 font-medium text-[#004C99] hover:underline"
        >
          {project.name}
          {!isOwner && (
            <span
              title={`Shared with you (${project._permission})`}
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                project._permission === "edit"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {project._permission}
            </span>
          )}
        </button>
      </td>

      <td className="py-4 pr-4">
        <StatusChip status={status} />
      </td>

      <td className="py-4 pr-4 text-gray-700">
        {isOwner ? "Owner" : "Shared with me"}
      </td>

      <td className="py-4 pr-4 text-gray-700">{project.sector ?? "—"}</td>

      <td className="py-4 pr-4 text-gray-700">
        {formatDate(project.last_edited)}
      </td>

      <td className="py-4 pr-4 text-gray-700">
        {project.date_deployed ? formatDate(project.date_deployed) : "—"}
      </td>

      <td className="py-4 pr-4">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-700">
          {project.submissions}
        </span>
      </td>

      <td className="py-4 pr-6">
        <div className="flex items-center justify-end gap-1">
          {/* Owner-only status controls */}
          {isOwner && status !== "deployed" && (
            <IconBtn
              title="Deploy"
              onClick={onDeploy}
              color="#22c55e"
              icon="cloud-upload"
            />
          )}
          {isOwner && status !== "archived" && (
            <IconBtn
              title="Archive"
              onClick={onArchive}
              color="#64748b"
              icon="archive"
            />
          )}
          {isOwner && status !== "draft" && (
            <IconBtn
              title="Move to draft"
              onClick={onDraft}
              color="#f59e0b"
              icon="edit-document"
            />
          )}

          {/* Owners and edit-shares get Edit */}
          {canEdit && (
            <IconBtn
              title="Edit"
              onClick={onEdit}
              color="#0ea5e9"
              icon="pencil"
            />
          )}

          {/* Owners can Share */}
          {isOwner && (
            <IconBtn
              title="Share"
              onClick={onShare}
              color="#6366f1"
              icon="share"
            />
          )}

          {/* Everyone with access can Download */}
          <IconBtn
            title="Download XML"
            onClick={onDownload}
            color="#64748b"
            icon="download"
          />

          {/* Owners can Delete */}
          {isOwner && (
            <IconBtn
              title="Delete"
              onClick={onDelete}
              color="#ef4444"
              icon="trash"
            />
          )}

          {/* Shared users get an Open (eye) icon */}
          {!isOwner && (
            <IconBtn
              title="Open project"
              onClick={onOpen}
              color="#64748b"
              icon="eye"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════
// ICON BUTTON
// ═══════════════════════════════════════════════════════════
function IconBtn({
  title,
  onClick,
  color,
  icon,
}: {
  title: string;
  onClick: () => void;
  color: string;
  icon: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-md p-1.5 transition hover:bg-gray-100"
      style={{ color }}
    >
      <RowIcon name={icon} />
    </button>
  );
}

function RowIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "cloud-upload":
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m17 8-5-5-5 5M12 3v12" />
        </svg>
      );
    case "archive":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="4" />
          <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
          <path d="M10 12h4" />
        </svg>
      );
    case "edit-document":
    case "pencil":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 3.9M15.4 6.5 8.6 10.4" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5M12 15V3" />
        </svg>
      );
    default:
      return null;
  }
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    deployed: "bg-green-100 text-green-700",
    archived: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(v: string | null): string {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return v.slice(0, 10);
  }
}