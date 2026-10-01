"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { fetchShared, importSharedProject } from "@/lib/share-link";

function ImportPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<
    "loading" | "no-token" | "not-logged-in" | "ready" | "importing" | "done" | "error"
  >("loading");
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus("no-token");
        return;
      }

      const me = getUser();
      if (!me) {
        setStatus("not-logged-in");
        return;
      }

      try {
        const data = await fetchShared(token);
        if (!data) {
          setError("This share link is invalid or has expired.");
          setStatus("error");
          return;
        }
        setProjectName(data.project?.name ?? "Untitled");
        setStatus("ready");
      } catch (e: any) {
        setError(e.message ?? "Could not load shared project.");
        setStatus("error");
      }
    })();
  }, [token]);

  async function doImport() {
    const me = getUser();
    if (!me) return;
    setStatus("importing");
    try {
      const newId = await importSharedProject(token, me.id);
      setStatus("done");
      setTimeout(() => router.push(`/projects/${newId}`), 800);
    } catch (e: any) {
      setError(e.message ?? "Import failed.");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#004C99] to-[#0a0a0a] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F0FE]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-[#004C99]">
              <path
                d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Import project</h1>
          <p className="mt-1 text-xs text-gray-500">
            Someone shared a DBtool project with you
          </p>
        </div>

        {status === "loading" && (
          <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
        )}

        {status === "no-token" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            This link is missing a token. Ask the sender to share again.
          </div>
        )}

        {status === "not-logged-in" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              You need to sign in to import this project.
            </div>
            <Link
              href={`/login?redirect=/import?token=${token}`}
              className="block w-full rounded-lg bg-[#004C99] py-3 text-center text-sm font-bold uppercase tracking-wider text-white hover:bg-[#003d7a]"
            >
              Sign in and continue
            </Link>
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs uppercase tracking-wide text-blue-700">
                Project
              </div>
              <div className="mt-1 text-base font-semibold text-gray-900">
                {projectName}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              A copy of this project will be created in your account. You can
              edit, deploy, or delete it without affecting the original.
            </p>
            <button
              onClick={doImport}
              className="w-full rounded-lg bg-[#004C99] py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#003d7a]"
            >
              Import as copy
            </button>
          </div>
        )}

        {status === "importing" && (
          <div className="py-8 text-center text-sm text-gray-500">
            Importing…
          </div>
        )}

        {status === "done" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
            Imported! Redirecting…
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
            <Link
              href="/projects"
              className="block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to projects
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <ImportPageInner />
    </Suspense>
  );
}