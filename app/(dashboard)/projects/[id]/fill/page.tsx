"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { getMyPermission } from "@/lib/api";

type Question = {
  id: string;
  type: string;
  label: string;
  choices: any;
};

export default function FillFormPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [projectName, setProjectName] = useState("");
  const [projectStatus, setProjectStatus] = useState<string>("draft");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const me = getUser();
        if (!me) {
          setError("You're not logged in.");
          return;
        }

        // Permission check — must be owner, edit, or fill
        const perm = await getMyPermission(id);
        if (!perm) {
          setError("You don't have access to this project.");
          return;
        }

        // Load project (name + status)
        const { data: project } = await supabase
          .from("projects")
          .select("name, status")
          .eq("id", id)
          .maybeSingle();
        if (project) {
          setProjectName(project.name ?? "");
          setProjectStatus(project.status ?? "draft");
        }

        // Load questions
        const { data: qs, error: qErr } = await supabase
          .from("questions")
          .select("id, type, label, choices")
          .eq("project_id", id)
          .order("created_at", { ascending: true });
        if (qErr) throw qErr;
        setQuestions((qs ?? []) as Question[]);

        // Count existing attempts by this user
        const { count } = await supabase
          .from("responses")
          .select("id", { count: "exact", head: true })
          .eq("project_id", id)
          .eq("submitted_by", me.id);
        setAttemptCount(count ?? 0);
      } catch (e: any) {
        setError(e.message ?? "Failed to load form.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function setAnswer(qid: string, value: any) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function submit() {
    // Safety check — block if project isn't deployed
    if (projectStatus !== "deployed") {
      setError(
        projectStatus === "archived"
          ? "This project is archived — responses are not accepted."
          : "This project is still a draft — ask the owner to deploy it first."
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const me = getUser();
      if (!me) throw new Error("You're not logged in.");

      // Extract geo coordinates from any Point answers
      let geoLat: number | null = null;
      let geoLng: number | null = null;
      for (const q of questions) {
        if (q.type === "Point") {
          const v = answers[q.id]?.toString() ?? "";
          const m = v.match(/Lat:\s*([-\d.]+).*Lng:\s*([-\d.]+)/i);
          if (m) {
            geoLat = parseFloat(m[1]);
            geoLng = parseFloat(m[2]);
          }
        }
      }

      const { error: insertErr } = await supabase.from("responses").insert({
        project_id: id,
        submitted_by: me.id,
        answers,
        geo_lat: geoLat,
        geo_lng: geoLng,
        media: {},
      });
      if (insertErr) throw insertErr;

      setAttemptCount((n) => n + 1);
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading form…
      </div>
    );

  if (error && !done && questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-12 text-center">
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
  }

  if (done)
    return (
      <div className="mx-auto max-w-2xl p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-600"
          >
            <path d="m5 12 5 5L20 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Response submitted!
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Thanks. This is your {attemptCount}
          {attemptCount === 1 ? "st" : attemptCount === 2 ? "nd" : attemptCount === 3 ? "rd" : "th"}{" "}
          submission for this project.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              setAnswers({});
              setDone(false);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Submit another
          </button>
          <Link
            href={`/projects/${id}`}
            className="rounded-lg bg-[#004C99] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d7a]"
          >
            Back to project
          </Link>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        ← Back to project
      </Link>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-[#004C99] px-6 py-4">
          <h1 className="text-lg font-semibold text-white">{projectName}</h1>
          <p className="mt-1 text-xs text-blue-100">
            Fill in the answers and submit. You can submit multiple times.
            {attemptCount > 0 && (
              <span className="ml-1">
                ({attemptCount} previous{" "}
                {attemptCount === 1 ? "attempt" : "attempts"})
              </span>
            )}
          </p>
        </div>

        <div className="space-y-5 px-6 py-6">
          {/* Deployed-only banner */}
          {projectStatus !== "deployed" && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                projectStatus === "archived"
                  ? "border-orange-200 bg-orange-50 text-orange-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {projectStatus === "archived"
                ? "This project has been archived. Responses are no longer accepted."
                : "This project is still a draft. The owner has not deployed it yet — you can fill in answers but they won't be saved until deployed."}
            </div>
          )}

          {questions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              This form has no questions yet.
            </div>
          ) : (
            questions.map((q, i) => (
              <div key={q.id}>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {i + 1}. {q.label}
                </label>
                <QuestionInput
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              </div>
            ))
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {questions.length > 0 && (
            <div className="flex items-end justify-end gap-2 pt-2">
              <Link
                href={`/projects/${id}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              {projectStatus === "deployed" ? (
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-lg bg-[#004C99] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003d7a] disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  <button
                    disabled
                    className="cursor-not-allowed rounded-lg bg-gray-300 px-5 py-2 text-sm font-semibold text-white"
                  >
                    Submit
                  </button>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {projectStatus === "archived"
                      ? "Archived — submissions closed."
                      : "Waiting for the owner to deploy."}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: any;
  onChange: (v: any) => void;
}) {
  const type = question.type;
  const choices: string[] = Array.isArray(question.choices)
    ? question.choices.map(String)
    : [];

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none";

  if (type === "Text") {
    return (
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    );
  }

  if (type === "Number" || type === "Decimal") {
    return (
      <input
        type="number"
        step={type === "Decimal" ? "any" : "1"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    );
  }

  if (type === "Date") {
    return (
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    );
  }

  if (type === "Time") {
    return (
      <input
        type="time"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    );
  }

  if (type === "Date & time") {
    return (
      <input
        type="datetime-local"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    );
  }

  if (type === "Select One") {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">Select…</option>
        {choices.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    );
  }

  if (type === "Select Many") {
    const selected: string[] = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-1.5">
        {choices.map((c) => (
          <label key={c} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(c)}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, c]);
                else onChange(selected.filter((x) => x !== c));
              }}
            />
            {c}
          </label>
        ))}
      </div>
    );
  }

  if (type === "Range") {
    const min = parseInt(choices[0] ?? "0");
    const max = parseInt(choices[1] ?? "10");
    const current = Number(value) || min;
    return (
      <div>
        <input
          type="range"
          min={min}
          max={max}
          value={current}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="mt-1 text-center text-sm font-semibold text-[#004C99]">
          {current}
        </div>
      </div>
    );
  }

  if (type === "Ranking") {
    const items: string[] = Array.isArray(value) ? value : choices;
    return (
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <span>
              {idx + 1}. {item}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => {
                  const next = [...items];
                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                  onChange(next);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={idx === items.length - 1}
                onClick={() => {
                  const next = [...items];
                  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                  onChange(next);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "Point") {
    return (
      <input
        type="text"
        placeholder="Lat: 6.9271, Lng: 79.8612"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    );
  }

  return (
    <input
      type="text"
      placeholder={`${type} — enter URL or upload in mobile app`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}