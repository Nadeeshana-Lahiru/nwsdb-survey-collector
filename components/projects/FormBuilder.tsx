"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Question = {
  id: string;
  project_id: string;
  type: string;
  label: string;
  choices: any;
  created_at: string;
};

type QuestionType = {
  key: string;
  label: string;
  icon: string;
};

const QUESTION_TYPES: QuestionType[] = [
  { key: "Select One", label: "Select One", icon: "radio" },
  { key: "Select Many", label: "Select Many", icon: "checkbox" },
  { key: "Text", label: "Text", icon: "text" },
  { key: "Number", label: "Number", icon: "hash" },
  { key: "Decimal", label: "Decimal", icon: "decimal" },
  { key: "Date", label: "Date", icon: "calendar" },
  { key: "Time", label: "Time", icon: "clock" },
  { key: "Date & time", label: "Date & time", icon: "calendar-clock" },
  { key: "Point", label: "Point", icon: "map-pin" },
  { key: "Photo", label: "Photo", icon: "photo" },
  { key: "Audio", label: "Audio", icon: "music" },
  { key: "Video", label: "Video", icon: "video" },
  { key: "File", label: "File", icon: "file" },
  { key: "Range", label: "Range", icon: "range" },
  { key: "Ranking", label: "Ranking", icon: "list" },
  { key: "External XML", label: "External XML", icon: "code" },
];

export default function FormBuilder({
  projectId,
  onChanged,
}: {
  projectId: string;
  onChanged?: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{
    question: Question;
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select()
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setQuestions((data ?? []) as Question[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function deleteQuestion(id: string) {
    if (!confirm("Delete this question?")) return;
    try {
      await supabase.from("questions").delete().eq("id", id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      onChanged?.();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    await reorder(index, index - 1);
  }

  async function moveDown(index: number) {
    if (index === questions.length - 1) return;
    await reorder(index, index + 1);
  }

  async function reorder(from: number, to: number) {
    const next = [...questions];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setQuestions(next);

    try {
      for (let i = 0; i < next.length; i++) {
        await supabase
          .from("questions")
          .update({
            created_at: new Date(Date.now() + i).toISOString(),
          })
          .eq("id", next[i].id);
      }
      onChanged?.();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function addQuestion(
    type: string,
    label: string,
    choices: string[] = []
  ) {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("questions")
        .insert({
          project_id: projectId,
          type,
          label,
          choices,
          created_at: now,
        })
        .select()
        .single();
      if (error) throw error;
      setQuestions((prev) => [...prev, data as Question]);
      onChanged?.();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(q: Question, newLabel: string, newChoices: string[]) {
    const trimmed = newLabel.trim();
    if (!trimmed) {
      alert("Label cannot be empty.");
      return;
    }
    try {
      await supabase
        .from("questions")
        .update({
          label: trimmed,
          choices: newChoices,
        })
        .eq("id", q.id);
      setQuestions((prev) =>
        prev.map((x) =>
          x.id === q.id ? { ...x, label: trimmed, choices: newChoices } : x
        )
      );
      onChanged?.();
      setEditing(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div>
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
      ) : questions.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          This form is empty. Click <strong>Add question</strong> to start.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onDelete={() => deleteQuestion(q.id)}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
              onEdit={() => setEditing({ question: q })}
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-[#004C99] bg-white px-6 py-3 text-sm font-semibold text-[#004C99] hover:bg-blue-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add question
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {showPicker && (
        <QuestionTypePicker
          onClose={() => setShowPicker(false)}
          onAdd={async (type, label, choices) => {
            await addQuestion(type, label, choices);
            setShowPicker(false);
          }}
          busy={busy}
        />
      )}

      {editing && (
        <EditQuestionDialog
          question={editing.question}
          onClose={() => setEditing(null)}
          onSave={(label, choices) =>
            saveEdit(editing.question, label, choices)
          }
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EDIT QUESTION DIALOG
// Matches the "Define choices" picker's style exactly.
// ═══════════════════════════════════════════════════════════
function EditQuestionDialog({
  question,
  onClose,
  onSave,
}: {
  question: Question;
  onClose: () => void;
  onSave: (label: string, choices: string[]) => void;
}) {
  const initialChoices = Array.isArray(question.choices)
    ? question.choices.map(String)
    : [];

  const [label, setLabel] = useState(question.label);
  const [choices, setChoices] = useState<string[]>(
    initialChoices.length > 0 ? initialChoices : []
  );

  const supportsChoices =
    question.type === "Select One" ||
    question.type === "Select Many" ||
    question.type === "Ranking";

  function updateChoice(i: number, value: string) {
    const next = [...choices];
    next[i] = value;
    setChoices(next);
  }

  function addChoice() {
    setChoices([...choices, ""]);
  }

  function removeChoice(i: number) {
    setChoices(choices.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!label.trim()) {
      alert("Question label is required.");
      return;
    }
    let cleanChoices: string[] = [];
    if (supportsChoices) {
      cleanChoices = choices.map((c) => c.trim()).filter(Boolean);
      if (cleanChoices.length < 2) {
        alert("At least 2 choices required.");
        return;
      }
    }
    onSave(label, cleanChoices);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — identical to picker style */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit question
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-auto p-6">
          {/* Type badge */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Type
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#004C99]">
              {question.type}
            </span>
          </div>

          {/* Label */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Question label
            </label>
            <textarea
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              rows={2}
              placeholder="e.g. What is your name?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none focus:ring-2 focus:ring-[#004C99]/20"
            />
          </div>

          {/* Choices (only for choice-based types) */}
          {supportsChoices && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Choices
              </label>
              {choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => updateChoice(i, e.target.value)}
                    placeholder={`Choice ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none focus:ring-2 focus:ring-[#004C99]/20"
                  />
                  {choices.length > 2 && (
                    <button
                      onClick={() => removeChoice(i)}
                      className="rounded p-2 text-red-500 hover:bg-red-50"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={addChoice}
                className="flex items-center gap-1 text-sm font-medium text-[#004C99] hover:underline"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add another choice
              </button>
            </div>
          )}

          {!supportsChoices && (
            <div className="rounded-lg bg-gray-50 px-3 py-3 text-xs text-gray-500">
              This question type has no editable choices.
            </div>
          )}
        </div>

        {/* Footer — same as picker */}
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-[#004C99] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003d7a]"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUESTION CARD
// ═══════════════════════════════════════════════════════════
function QuestionCard({
  question,
  index,
  total,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEdit,
}: {
  question: Question;
  index: number;
  total: number;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
}) {
  const choices: string[] = Array.isArray(question.choices)
    ? question.choices.map(String)
    : [];

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[#004C99]">
      <div className="flex items-start gap-3">
        {/* Reorder arrows */}
        <div className="flex flex-col gap-0.5 pt-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            title="Move up"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            title="Move down"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={onEdit}
              className="flex-1 text-left font-medium text-gray-900 hover:text-[#004C99]"
              title="Click to edit"
            >
              {index + 1}. {question.label}
            </button>
            <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#004C99]">
              {question.type}
            </span>
          </div>

          {choices.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {choices.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  {c}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2">
            <button
              onClick={onEdit}
              className="text-xs font-medium text-[#004C99] hover:underline"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="rounded p-1 text-red-500 hover:bg-red-50"
          title="Delete"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUESTION TYPE PICKER (unchanged)
// ═══════════════════════════════════════════════════════════
function QuestionTypePicker({
  onClose,
  onAdd,
  busy,
}: {
  onClose: () => void;
  onAdd: (type: string, label: string, choices?: string[]) => void;
  busy: boolean;
}) {
  const [step, setStep] = useState<
    "type" | "label" | "choices" | "range" | "ranking"
  >("type");
  const [selectedType, setSelectedType] = useState("");
  const [label, setLabel] = useState("");
  const [choices, setChoices] = useState<string[]>(["", ""]);
  const [rangeMin, setRangeMin] = useState("0");
  const [rangeMax, setRangeMax] = useState("10");
  const [rankItems, setRankItems] = useState<string[]>(["", "", ""]);

  function handleTypeSelect(type: string) {
    setSelectedType(type);
    setStep("label");
  }

  function handleLabelNext() {
    if (!label.trim()) {
      alert("Please enter a question label.");
      return;
    }
    if (selectedType === "Select One" || selectedType === "Select Many") {
      setStep("choices");
    } else if (selectedType === "Range") {
      setStep("range");
    } else if (selectedType === "Ranking") {
      setStep("ranking");
    } else {
      onAdd(selectedType, label.trim());
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {step === "type" && "Select a question type"}
            {step === "label" && `Add a ${selectedType} question`}
            {step === "choices" && `Define choices for "${label}"`}
            {step === "range" && `Configure Range: "${label}"`}
            {step === "ranking" && `Ranking: "${label}"`}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-6">
          {step === "type" && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTypeSelect(t.key)}
                  className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-3 text-left transition hover:border-[#004C99] hover:bg-blue-50"
                >
                  <QuestionIcon name={t.icon} />
                  <span className="text-sm font-medium text-[#2C3E50]">
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === "label" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Question Label *
              </label>
              <textarea
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                rows={2}
                placeholder="e.g., What is your name?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
              />
            </div>
          )}

          {step === "choices" && (
            <div className="space-y-2">
              {choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const next = [...choices];
                      next[i] = e.target.value;
                      setChoices(next);
                    }}
                    placeholder={`Choice ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
                  />
                  {choices.length > 2 && (
                    <button
                      onClick={() =>
                        setChoices(choices.filter((_, idx) => idx !== i))
                      }
                      className="rounded p-2 text-red-500 hover:bg-red-50"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setChoices([...choices, ""])}
                className="flex items-center gap-1 text-sm font-medium text-[#004C99] hover:underline"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add another choice
              </button>
            </div>
          )}

          {step === "range" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Minimum value
                </label>
                <input
                  type="number"
                  value={rangeMin}
                  onChange={(e) => setRangeMin(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Maximum value
                </label>
                <input
                  type="number"
                  value={rangeMax}
                  onChange={(e) => setRangeMax(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
                />
              </div>
            </div>
          )}

          {step === "ranking" && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Items to rank:</p>
              {rankItems.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const next = [...rankItems];
                      next[i] = e.target.value;
                      setRankItems(next);
                    }}
                    placeholder={`Item ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004C99] focus:outline-none"
                  />
                  {rankItems.length > 2 && (
                    <button
                      onClick={() =>
                        setRankItems(rankItems.filter((_, idx) => idx !== i))
                      }
                      className="rounded p-2 text-red-500 hover:bg-red-50"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setRankItems([...rankItems, ""])}
                className="flex items-center gap-1 text-sm font-medium text-[#004C99] hover:underline"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Item
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          {step !== "type" && (
            <button
              onClick={() => {
                if (step === "label") handleLabelNext();
                else if (step === "choices") {
                  const clean = choices.map((c) => c.trim()).filter(Boolean);
                  if (clean.length < 2) {
                    alert("At least 2 choices required.");
                    return;
                  }
                  onAdd(selectedType, label.trim(), clean);
                } else if (step === "range") {
                  const min = parseInt(rangeMin || "0");
                  const max = parseInt(rangeMax || "10");
                  if (max <= min) {
                    alert("Max must be greater than Min.");
                    return;
                  }
                  onAdd(selectedType, label.trim(), [String(min), String(max)]);
                } else if (step === "ranking") {
                  const clean = rankItems
                    .map((c) => c.trim())
                    .filter(Boolean);
                  if (clean.length < 2) {
                    alert("At least 2 items required.");
                    return;
                  }
                  onAdd(selectedType, label.trim(), clean);
                }
              }}
              disabled={busy}
              className="rounded-lg bg-[#004C99] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003d7a] disabled:opacity-50"
            >
              {busy
                ? "Adding…"
                : step === "label"
                ? "Next"
                : "Add Question"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════
function QuestionIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-[#2C3E50] shrink-0",
  };
  switch (name) {
    case "radio":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case "checkbox":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "text":
      return (
        <svg {...common}>
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
      );
    case "hash":
      return (
        <svg {...common}>
          <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
        </svg>
      );
    case "decimal":
      return (
        <svg {...common}>
          <circle cx="6" cy="18" r="2" />
          <path d="M14 4h-4v8h4a4 4 0 0 1 0 8h-4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "calendar-clock":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "map-pin":
      return (
        <svg {...common}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "photo":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      );
    case "music":
      return (
        <svg {...common}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          <path d="m22 8-6 4 6 4V8Z" />
          <rect x="2" y="6" width="14" height="12" rx="2" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "range":
      return (
        <svg {...common}>
          <path d="M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      );
    default:
      return null;
  }
}