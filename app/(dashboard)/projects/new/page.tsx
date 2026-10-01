"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { parseProjectXml } from "@/lib/xml-project";

type Mode = "choose" | "scratch" | "upload";

const SECTORS = [
  "Water Supply",
  "Sanitation",
  "Drainage",
  "Irrigation",
  "Infrastructure",
  "Other",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");

  // Scratch form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Scratch: create empty project ─────────────────────
  async function handleCreateScratch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !sector) {
      setError("Project name and sector are required.");
      return;
    }
    const me = getUser();
    if (!me) {
      setError("You're not logged in.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("projects")
        .insert({
          owner_id: me.id,
          name: name.trim(),
          description: description.trim(),
          sector,
          status: "draft",
          last_edited: now,
          date_modified: now,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      router.push(`/projects/${data.id}/edit`);
    } catch (e: any) {
      setError(e.message ?? "Failed to create project.");
      setBusy(false);
    }
  }

  // ── Upload XML: parse + clone ─────────────────────────
  async function handleUploadXml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);

    try {
      const me = getUser();
      if (!me) throw new Error("You're not logged in.");

      const text = await file.text();
      const { meta, questions } = parseProjectXml(text);

      const now = new Date().toISOString();

      const { data: project, error: pErr } = await supabase
        .from("projects")
        .insert({
          owner_id: me.id,
          name: meta.name || "Imported project",
          description: meta.description ?? "",
          sector: meta.sector ?? "Other",
          status: "draft",
          last_edited: now,
          date_modified: now,
        })
        .select()
        .single();

      if (pErr) throw new Error(pErr.message);

      for (const q of questions) {
        await supabase.from("questions").insert({
          project_id: project.id,
          type: q.type,
          label: q.label,
          choices: q.choices,
          media_url: q.mediaUrl ?? null,
          media_type: q.mediaType ?? null,
          answer: q.answer
            ? q.answerType === "datetime"
              ? { type: "datetime", value: q.answer, saved_at: now }
              : { value: q.answer, saved_at: now }
            : null,
        });
      }

      router.push(`/projects/${project.id}/edit`);
    } catch (e: any) {
      setError(e.message ?? "Import failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        ← Back to projects
      </Link>

      {mode === "choose" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-[#004C99] px-6 py-4">
            <h1 className="text-lg font-semibold text-white">Create project</h1>
          </div>
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-3 text-sm text-gray-600">
            Choose how you want to start:
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <button
              onClick={() => setMode("scratch")}
              className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-[#F8F9FA] p-8 text-center transition hover:border-[#004C99] hover:bg-blue-50"
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="text-[#2C3E50]"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <div className="font-medium text-[#2C3E50]">
                Build from scratch
              </div>
              <div className="text-xs text-gray-500">
                Create an empty project and add questions.
              </div>
            </button>

            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-gray-200 bg-[#F8F9FA] p-8 text-center transition hover:border-[#004C99] hover:bg-blue-50">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="text-[#2C3E50]"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="m17 8-5-5-5 5M12 3v12" />
              </svg>
              <div className="font-medium text-[#2C3E50]">Upload XML Form</div>
              <div className="text-xs text-gray-500">
                Import a project exported from DBtool.
              </div>
              <input
                type="file"
                accept=".xml,application/xml,text/xml"
                onChange={handleUploadXml}
                className="hidden"
              />
            </label>
          </div>
          {error && (
            <div className="mx-6 mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {busy && (
            <div className="pb-6 text-center text-sm text-gray-500">
              Processing…
            </div>
          )}
        </div>
      )}

      {mode === "scratch" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-[#004C99] px-6 py-4">
            <h1 className="text-lg font-semibold text-white">
              Create project: Project details
            </h1>
          </div>
          <form onSubmit={handleCreateScratch} className="space-y-5 px-6 py-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Project Name (required)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter title of project here"
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sector (required)
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
              >
                <option value="">Select…</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-[#004C99] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003d7a] disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}