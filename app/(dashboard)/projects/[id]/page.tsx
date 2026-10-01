"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getProject,
  getQuestions,
  getResponses,
  getProjectSummary,
  getMyPermission,
  updateProject,
  deleteProject,
  deleteResponse,
  archiveProject,
  buildProjectXml,
  Project,
  Question,
  ResponseRow,
  SummaryItem,
} from "@/lib/api";
import FormBuilder from "@/components/projects/FormBuilder";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Tab = "summary" | "form" | "data" | "settings";
type DataSubTab = "table" | "gallery" | "downloads";

const PIE_COLORS = [
  "#1E88E5",
  "#26A69A",
  "#FFA726",
  "#AB47BC",
  "#EF5350",
  "#66BB6A",
  "#8D6E63",
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tab, setTab] = useState<Tab>("summary");
  const [project, setProject] = useState<Project | null>(null);
  const [permission, setPermission] = useState<
    "owner" | "edit" | "fill" | null
  >(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [perm, p, qs, rs, sm] = await Promise.all([
        getMyPermission(id),
        getProject(id),
        getQuestions(id),
        getResponses(id),
        getProjectSummary(id),
      ]);
      setPermission(perm);
      setProject(p);
      setQuestions(qs);
      setResponses(rs);
      setSummary(sm);
    } catch (e: any) {
      setError(e.message ?? "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading project…
      </div>
    );

  if (error || !project) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error ?? "Project not found"}
        </div>
        <Link
          href="/projects"
          className="mt-4 inline-block text-sm text-[#004C99] hover:underline"
        >
          ← Back to projects
        </Link>
      </div>
    );
  }

  const canEdit = permission === "owner" || permission === "edit";
  const canFill = permission !== null;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-[#1e2937] px-6 py-4 text-white">
        <Link
          href="/projects"
          className="text-xs text-gray-300 hover:text-white"
        >
          ← Back to projects
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{project.name}</h1>
            {permission !== "owner" && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  permission === "edit"
                    ? "bg-blue-500/20 text-blue-200"
                    : "bg-amber-500/20 text-amber-200"
                }`}
              >
                {permission === "edit" ? "Shared · edit" : "Shared · fill"}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              Refresh
            </button>
            {canEdit && (
              <Link
                href={`/projects/${id}/edit`}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
              >
                Edit details
              </Link>
            )}
            {canFill && project.status === "deployed" && (
  <Link
    href={`/projects/${id}/fill`}
    className="rounded-md bg-[#004C99] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003d7a]"
  >
    Fill form
  </Link>
)}
{canFill && project.status !== "deployed" && (
  <span
    title={
      project.status === "archived"
        ? "Archived projects don't accept responses"
        : "Deploy the project to accept responses"
    }
    className="cursor-not-allowed rounded-md bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-400"
  >
    {project.status === "archived" ? "Archived" : "Not deployed"}
  </span>
)}
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      <div className="flex gap-6 border-b border-gray-200 bg-white px-6">
        {(
          [
            ["summary", "SUMMARY"],
            ["form", "FORM"],
            ["data", "DATA"],
            ...(permission === "owner"
              ? ([["settings", "SETTINGS"]] as [Tab, string][])
              : []),
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative py-3 text-xs font-semibold tracking-wide transition ${
              tab === key
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#004C99]" />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-[#f4f6f8]">
        {tab === "summary" && (
          <SummaryTab
            project={project}
            summary={summary}
            responses={responses}
            questionCount={questions.length}
          />
        )}

        {tab === "form" && (
          <div className="mx-auto max-w-4xl p-6">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="bg-[#1e2937] px-6 py-4">
                <h2 className="text-base font-semibold text-white">
                  Form builder
                </h2>
                <p className="mt-1 text-xs text-gray-300">
                  {canEdit
                    ? "Add, reorder, and delete questions. Changes save automatically."
                    : "Read-only view. You don't have permission to edit."}
                </p>
              </div>
              <div className="px-6 py-6">
                {canEdit ? (
                  <FormBuilder projectId={id} onChanged={loadAll} />
                ) : (
                  <ReadOnlyFormView questions={questions} />
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "data" && (
          <DataTab
            project={project}
            questions={questions}
            responses={responses}
            canEdit={canEdit}
            onChanged={loadAll}
          />
        )}

        {tab === "settings" && permission === "owner" && (
          <SettingsTab
            project={project}
            onSaved={loadAll}
            onDeleted={() => router.push("/projects")}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// READ-ONLY FORM VIEW (for fill-only users)
// ═══════════════════════════════════════════════════════════
function ReadOnlyFormView({ questions }: { questions: Question[] }) {
  if (questions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        This form is empty.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const choices: string[] = Array.isArray(q.choices)
          ? q.choices.map(String)
          : [];
        return (
          <div
            key={q.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium text-gray-900">
                {i + 1}. {q.label}
              </div>
              <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#004C99]">
                {q.type}
              </span>
            </div>
            {choices.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {choices.map((c, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUMMARY TAB
// ═══════════════════════════════════════════════════════════
function SummaryTab({
  project,
  summary,
  responses,
  questionCount,
}: {
  project: Project;
  summary: SummaryItem[];
  responses: ResponseRow[];
  questionCount: number;
}) {
  const totalResponses = responses.length;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Questions" value={questionCount} color="blue" />
        <StatCard label="Responses" value={totalResponses} color="green" />
        <StatCard
          label="Sector"
          value={project.sector ?? "—"}
          color="purple"
        />
        <StatCard
          label="Status"
          value={project.status}
          color={project.status === "deployed" ? "green" : "gray"}
        />
      </div>

      {questionCount === 0 ? (
        <EmptyState
          title="No questions yet"
          description="Add questions in the FORM tab, then collect responses."
        />
      ) : totalResponses === 0 ? (
        <EmptyState
          title="No responses yet"
          description="Click 'Fill form' at the top to add a response."
        />
      ) : (
        <div className="space-y-4">
          {summary.map((item) => (
            <SummaryCard key={item.questionId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: any;
  color: "blue" | "green" | "purple" | "gray";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-[#004C99]",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div
        className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-lg font-semibold ${
          colors[color] ?? colors.gray
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryCard({ item }: { item: SummaryItem }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-900">{item.label}</div>
          <div className="text-xs text-gray-500">
            {item.type} · {item.total}{" "}
            {item.total === 1 ? "response" : "responses"}
          </div>
        </div>
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#004C99]">
          {item.type}
        </span>
      </div>

      {item.options && item.options.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            {item.options.map((opt) => {
              const pct =
                item.total > 0 ? (opt.count / item.total) * 100 : 0;
              return (
                <div key={opt.value}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="truncate text-gray-700">
                      {opt.value}
                    </span>
                    <span className="text-gray-500">
                      {opt.count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#004C99] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={item.options}
                  dataKey="count"
                  nameKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={(entry: any) => entry.value}
                >
                  {item.options.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {item.average !== undefined && (
        <div className="rounded-lg bg-blue-50 px-3 py-3 text-sm text-[#004C99]">
          Average: <strong>{item.average.toFixed(2)}</strong>
        </div>
      )}

      {item.samples && item.samples.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500">
            Latest responses:
          </div>
          {item.samples.map((s, i) => (
            <div
              key={i}
              className="truncate rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              {s || <span className="italic text-gray-400">(empty)</span>}
            </div>
          ))}
        </div>
      )}

      {!item.options && !item.samples && item.average === undefined && (
        <div className="rounded-lg bg-gray-50 px-3 py-3 text-xs text-gray-500">
          No chart available for this question type.
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white p-12 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-gray-400"
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6M9 13h6M9 17h3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-base font-semibold text-gray-800">{title}</div>
      <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DATA TAB (with search + filters)
// ═══════════════════════════════════════════════════════════
function DataTab({
  project,
  questions,
  responses,
  canEdit,
  onChanged,
}: {
  project: Project;
  questions: Question[];
  responses: ResponseRow[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [subTab, setSubTab] = useState<DataSubTab>("table");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [submitterFilter, setSubmitterFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // ── Apply filters to responses ──────────────────────────
  const filteredResponses = responses.filter((r) => {
    // 1. Submitter
    if (submitterFilter !== "all") {
      const name = r.submitter_name ?? "Unknown";
      if (name !== submitterFilter) return false;
    }

    // 2. Date range
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00").getTime();
      if (new Date(r.submitted_at).getTime() < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59").getTime();
      if (new Date(r.submitted_at).getTime() > to) return false;
    }

    // 3. Free-text search
    if (search.trim()) {
      const needle = search.toLowerCase();
      const haystack = [
        r.submitter_name ?? "",
        r.submitter_email ?? "",
        ...Object.values(r.answers ?? {}).map((v) =>
          Array.isArray(v) ? v.join(" ") : String(v ?? "")
        ),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });

  const hasActiveFilters =
    search.trim() !== "" ||
    submitterFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearFilters() {
    setSearch("");
    setSubmitterFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  // Unique submitters for the dropdown
  const allSubmitters = Array.from(
    new Set(responses.map((r) => r.submitter_name ?? "Unknown"))
  ).sort();

  const attemptsByUser = new Map<string, number>();
  responses.forEach((r) => {
    const key = r.submitter_name ?? "Unknown";
    attemptsByUser.set(key, (attemptsByUser.get(key) ?? 0) + 1);
  });

  async function handleDelete(r: ResponseRow) {
    if (
      !confirm(
        `Delete this response from ${r.submitter_name ?? "Unknown"} ` +
          `(${new Date(r.submitted_at).toLocaleString()})?\n` +
          `This cannot be undone.`
      )
    )
      return;
    setDeletingId(r.id);
    try {
      await deleteResponse(r.id);
      onChanged();
    } catch (e: any) {
      alert(e.message ?? "Failed to delete response.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-6 border-b border-gray-200 bg-white px-6">
        {(
          [
            ["table", "Table"],
            ["gallery", "Gallery"],
            ["downloads", "Downloads"],
          ] as [DataSubTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`relative py-3 text-sm font-medium transition ${
              subTab === key
                ? "text-[#004C99]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
            {subTab === key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#004C99]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-white">
        {responses.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No responses yet.
          </div>
        ) : subTab === "table" ? (
          <>
            {/* ── Search + Filter bar ─────────────────────── */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex flex-wrap items-end gap-3">
                {/* Search */}
                <div className="min-w-[220px] flex-1">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Search
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search answers, names, emails…"
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submitter dropdown */}
                <div className="min-w-[160px]">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Submitted by
                  </label>
                  <select
                    value={submitterFilter}
                    onChange={(e) => setSubmitterFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
                  >
                    <option value="all">All users</option>
                    {allSubmitters.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date from */}
                <div className="min-w-[150px]">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
                  />
                </div>

                {/* Date to */}
                <div className="min-w-[150px]">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
                  />
                </div>

                {/* Clear */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Result count */}
              <div className="mt-3 text-xs text-gray-500">
                Showing <strong>{filteredResponses.length}</strong> of{" "}
                <strong>{responses.length}</strong> response
                {responses.length === 1 ? "" : "s"}
                {hasActiveFilters && (
                  <span className="ml-2 text-[#004C99]">(filtered)</span>
                )}
              </div>
            </div>

            {/* ── Attempts-per-user summary bar ───────────── */}
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-3 text-xs text-gray-600">
              <strong>Attempts:</strong>{" "}
              {Array.from(attemptsByUser.entries())
                .map(([name, count]) => `${name} (${count})`)
                .join(" · ")}
              <span className="ml-2 text-gray-400">
                — {responses.length} total
              </span>
            </div>

            {/* ── Table ───────────────────────────────────── */}
            {filteredResponses.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                No responses match your filters.{" "}
                <button
                  onClick={clearFilters}
                  className="text-[#004C99] underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase text-gray-500">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Submitted by</th>
                    <th className="px-4 py-3">Submitted at</th>
                    {questions.map((q) => (
                      <th key={q.id} className="px-4 py-3">
                        {q.label}
                      </th>
                    ))}
                    {canEdit && (
                      <th className="px-4 py-3 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredResponses.map((r, i) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {r.submitter_name ?? "Unknown"}
                        </div>
                        {r.submitter_email && (
                          <div className="text-xs text-gray-500">
                            {r.submitter_email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(r.submitted_at).toLocaleString()}
                      </td>
                      {questions.map((q) => (
                        <td key={q.id} className="px-4 py-3 text-gray-700">
                          {renderAnswerCell(r.answers?.[q.id])}
                        </td>
                      ))}
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(r)}
                            disabled={deletingId === r.id}
                            title="Delete response"
                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-40"
                          >
                            {deletingId === r.id ? (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="animate-spin"
                              >
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              </svg>
                            ) : (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                              </svg>
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : subTab === "gallery" ? (
          <GalleryTab
            questions={questions}
            responses={responses}
            projectName={project.name}
          />
        ) : (
          <div className="mx-auto max-w-3xl p-6">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">
                Download responses
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Export {responses.length} submission
                {responses.length === 1 ? "" : "s"}.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const rows = responses.map((r) => r.answers);
                    const headers = new Set<string>();
                    rows.forEach((r) =>
                      Object.keys(r ?? {}).forEach((k) => headers.add(k))
                    );
                    const h = Array.from(headers);
                    const csv = [
                      h.join(","),
                      ...rows.map((r) =>
                        h
                          .map((k) => {
                            const v = r?.[k];
                            const s = Array.isArray(v)
                              ? v.join(";")
                              : v ?? "";
                            return `"${String(s).replace(/"/g, '""')}"`;
                          })
                          .join(",")
                      ),
                    ].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${project.name}-responses.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-lg bg-[#004C99] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d7a]"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    const xml = buildProjectXml(
                      project,
                      questions,
                      responses
                    );
                    const blob = new Blob([xml], {
                      type: "application/xml",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${project.name}-export.xml`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download XML
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify(responses, null, 2)],
                      { type: "application/json" }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${project.name}-responses.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper — render an answer cell, converting URLs to friendly chips
function renderAnswerCell(v: any): React.ReactNode {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");

  const s = String(v);
  const isMediaUrl =
    s.startsWith("http") &&
    /\.(jpe?g|png|gif|webp|bmp|svg|mp4|mov|webm|mkv|avi|mp3|wav|m4a|ogg|aac|pdf|docx?|xlsx?|pptx?|xml|zip|txt|csv)(\?|$)/i.test(
      s
    );
  if (!isMediaUrl) return s;

  let kind = "File";
  let icon = "📎";
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(s)) {
    kind = "Photo";
    icon = "🖼";
  } else if (/\.(mp4|mov|webm|mkv|avi)(\?|$)/i.test(s)) {
    kind = "Video";
    icon = "🎬";
  } else if (/\.(mp3|wav|m4a|ogg|aac)(\?|$)/i.test(s)) {
    kind = "Audio";
    icon = "🎵";
  }

  return (
    <a
      href={s}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#004C99] hover:bg-blue-100"
    >
      <span>{icon}</span>
      <span>{kind}</span>
    </a>
  );
}

// ═══════════════════════════════════════════════════════════
// GALLERY TAB
// ═══════════════════════════════════════════════════════════
type MediaItem = {
  responseId: string;
  submitter: string;
  submittedAt: string;
  questionId: string;
  questionLabel: string;
  type: "Photo" | "Video" | "Audio" | "File";
  url: string;
  isUrl: boolean;
};

function detectMediaType(
  questionType: string,
  answer: any
): "Photo" | "Video" | "Audio" | "File" | null {
  if (answer == null || answer === "") return null;
  const s = String(answer);

  if (questionType === "Photo") return "Photo";
  if (questionType === "Video") return "Video";
  if (questionType === "Audio") return "Audio";
  if (questionType === "File" || questionType === "External XML")
    return "File";

  if (!s.startsWith("http")) return null;
  const clean = s.split("?")[0].toLowerCase();
  if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(clean)) return "Photo";
  if (/\.(mp4|mov|webm|mkv|avi)$/.test(clean)) return "Video";
  if (/\.(mp3|wav|m4a|ogg|aac)$/.test(clean)) return "Audio";
  if (/\.(pdf|docx?|xlsx?|pptx?|xml|zip|txt|csv)$/.test(clean))
    return "File";
  return null;
}

function GalleryTab({
  questions,
  responses,
  projectName,
}: {
  questions: Question[];
  responses: ResponseRow[];
  projectName: string;
}) {
  const [filter, setFilter] = useState<
    "all" | "Photo" | "Video" | "Audio" | "File"
  >("all");

  const items: MediaItem[] = [];
  for (const r of responses) {
    for (const q of questions) {
      const raw = r.answers?.[q.id];
      if (!raw) continue;

      const values = Array.isArray(raw) ? raw : [raw];
      for (const v of values) {
        const mediaType = detectMediaType(q.type, v);
        if (!mediaType) continue;
        items.push({
          responseId: r.id,
          submitter: r.submitter_name ?? "Unknown",
          submittedAt: r.submitted_at,
          questionId: q.id,
          questionLabel: q.label,
          type: mediaType,
          url: String(v),
          isUrl: String(v).startsWith("http"),
        });
      }
    }
  }

  const filtered =
    filter === "all" ? items : items.filter((i) => i.type === filter);

  if (items.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">
        No media yet. Photos, videos, audio, and files uploaded from the app
        or the web will appear here.
      </div>
    );
  }

  const counts = {
    all: items.length,
    Photo: items.filter((i) => i.type === "Photo").length,
    Video: items.filter((i) => i.type === "Video").length,
    Audio: items.filter((i) => i.type === "Audio").length,
    File: items.filter((i) => i.type === "File").length,
  };

  return (
    <div className="p-6">
      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["Photo", "Photos"],
            ["Video", "Videos"],
            ["Audio", "Audio"],
            ["File", "Files"],
          ] as [typeof filter, string][]
        ).map(([key, label]) => {
          const count = counts[key as keyof typeof counts] ?? 0;
          if (key !== "all" && count === 0) return null;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-[#004C99] text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <MediaCard
            key={item.responseId + item.questionId + item.url}
            item={item}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(filtered, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectName}-media.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export media list (JSON)
        </button>
      </div>
    </div>
  );
}

function MediaCard({ item }: { item: MediaItem }) {
  const fileName = item.isUrl
    ? decodeURIComponent(item.url.split("?")[0].split("/").pop() ?? "file")
    : item.url.split("/").pop() ?? "file";

  const date = new Date(item.submittedAt).toLocaleString();

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex h-48 items-center justify-center bg-gray-50">
        {item.type === "Photo" && item.isUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.questionLabel}
            className="h-full w-full object-cover"
          />
        )}

        {item.type === "Video" && item.isUrl && (
          <video
            src={item.url}
            controls
            className="h-full w-full bg-black object-contain"
          />
        )}

        {item.type === "Audio" && item.isUrl && (
          <div className="w-full p-4">
            <audio src={item.url} controls className="w-full" />
            <div className="mt-2 truncate text-center text-xs text-gray-500">
              {fileName}
            </div>
          </div>
        )}

        {item.type === "File" && (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#004C99]"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <div className="line-clamp-2 break-all text-xs text-gray-700">
              {fileName}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1 border-t border-gray-100 p-3">
        <div className="truncate text-xs font-semibold text-gray-800">
          {item.questionLabel}
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span className="truncate">{item.submitter}</span>
          <span>{date}</span>
        </div>
        <div className="flex gap-2 pt-1">
          {item.isUrl && (
            <>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-md bg-[#004C99] px-2 py-1 text-center text-[11px] font-medium text-white hover:bg-[#003d7a]"
              >
                Open
              </a>
              <a
                href={item.url}
                download={fileName}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-center text-[11px] font-medium text-gray-700 hover:bg-gray-50"
              >
                Download
              </a>
            </>
          )}
          {!item.isUrl && (
            <span className="truncate rounded-md bg-gray-100 px-2 py-1 text-[11px] text-gray-600">
              {item.url}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════
function SettingsTab({
  project,
  onSaved,
  onDeleted,
}: {
  project: Project;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [sector, setSector] = useState(project.sector ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sectors = [
    "Water Supply",
    "Sanitation",
    "Drainage",
    "Irrigation",
    "Infrastructure",
    "Other",
  ];

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await updateProject(project.id, { name, description, sector });
      setMsg("Changes saved.");
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!confirm("Archive this project?")) return;
    await archiveProject(project.id);
    onSaved();
  }
  async function remove() {
    if (!confirm("Delete this project and all its data?")) return;
    await deleteProject(project.id);
    onDeleted();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Project settings</h2>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[#004C99] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d7a] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
        {msg && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {msg}
          </div>
        )}
        {err && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Sector *
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
            >
              <option value="">Select…</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold">Danger zone</h3>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <div className="text-sm font-medium">Archive Project</div>
            <div className="text-xs text-gray-500">
              Stop accepting submissions
            </div>
          </div>
          <button
            onClick={archive}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-[#004C99] hover:bg-blue-100"
          >
            Archive
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <div className="text-sm font-medium">Delete Project</div>
            <div className="text-xs text-gray-500">Permanently remove</div>
          </div>
          <button
            onClick={remove}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}