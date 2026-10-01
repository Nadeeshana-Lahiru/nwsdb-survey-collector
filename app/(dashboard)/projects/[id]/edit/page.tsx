"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { getMyPermission } from "@/lib/api";
import FormBuilder from "@/components/projects/FormBuilder";

type Project = {
  id: string;
  name: string;
  description: string | null;
  sector: string | null;
  status: string;
  owner_id: string;
};

const SECTORS = [
  "Water Supply",
  "Sanitation",
  "Drainage",
  "Irrigation",
  "Infrastructure",
  "Other",
];

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [permission, setPermission] = useState<
    "owner" | "edit" | "fill" | null
  >(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = getUser();
        if (!me) {
          setError("You're not logged in.");
          return;
        }

        const perm = await getMyPermission(id);
        setPermission(perm);

        if (!perm) {
          setError("You don't have access to this project.");
          return;
        }

        const { data, error } = await supabase
          .from("projects")
          .select("id, name, description, sector, status, owner_id")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setError("Project not found.");
          return;
        }
        setProject(data as Project);
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setSector(data.sector ?? "");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function saveDetails() {
    if (!name.trim() || !sector) {
      setError("Name and sector are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          name: name.trim(),
          description: description.trim(),
          sector,
          last_edited: now,
          date_modified: now,
        })
        .eq("id", id);
      if (error) throw error;
      setSavedAt(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading…
      </div>
    );

  // Block fill-only users
  if (permission === "fill") {
    return (
      <div className="mx-auto max-w-xl p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600"
          >
            <path d="M12 9v4M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Read-only access</h1>
        <p className="mt-2 text-sm text-gray-500">
          You have <strong>fill only</strong> permission. You can submit
          responses but cannot edit the form.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href={`/projects/${id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to project
          </Link>
          <Link
            href={`/projects/${id}/fill`}
            className="rounded-lg bg-[#004C99] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d7a]"
          >
            Fill form
          </Link>
        </div>
      </div>
    );
  }

  if (error && !project)
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
        <Link
          href="/projects"
          className="mt-4 inline-block text-sm text-[#004C99] hover:underline"
        >
          ← Back to projects
        </Link>
      </div>
    );

  const canEditDetails = permission === "owner" || permission === "edit";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        ← Back to project
      </Link>

      {/* Project details */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-[#004C99] px-6 py-4">
          <h1 className="text-lg font-semibold text-white">
            {permission === "owner"
              ? "Edit project details"
              : "Project details"}
          </h1>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEditDetails}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none disabled:bg-gray-50"
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
              disabled={!canEditDetails}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Sector *
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              disabled={!canEditDetails}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none disabled:bg-gray-50"
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
          {savedAt && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Changes saved at {savedAt.toLocaleTimeString()}.
            </div>
          )}

          {canEditDetails && (
            <div className="flex justify-end gap-2 pt-2">
              <Link
                href={`/projects/${id}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                onClick={saveDetails}
                disabled={saving}
                className="rounded-lg bg-[#004C99] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003d7a] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form builder — only for edit/owner */}
      {canEditDetails && (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-[#1e2937] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
              Form builder
            </h2>
            <p className="mt-1 text-xs text-gray-300">
              Add, reorder, and delete questions. Changes save automatically.
            </p>
          </div>
          <div className="px-6 py-6">
            <FormBuilder projectId={id} />
          </div>
        </div>
      )}
    </div>
  );
}