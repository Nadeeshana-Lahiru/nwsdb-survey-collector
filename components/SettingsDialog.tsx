"use client";

import { useEffect, useRef, useState } from "react";
import { AuthUser, setUser } from "@/lib/auth";
import { changeOwnPassword } from "@/lib/api";

const AVATAR_KEY = "dbtool-avatar";

// ── Avatar helpers (localStorage only) ──────────────────────
export function getStoredAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AVATAR_KEY);
}

export function setStoredAvatar(dataUrl: string | null) {
  if (typeof window === "undefined") return;
  if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
  else localStorage.removeItem(AVATAR_KEY);
}

// Broadcast a change so the Header can update live
export const AVATAR_EVENT = "dbtool-avatar-changed";
function emitAvatarChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AVATAR_EVENT));
  }
}

export default function SettingsDialog({
  user,
  onClose,
}: {
  user: AuthUser;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"profile" | "password">("profile");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Account settings
          </h2>
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

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 bg-white px-5">
          {(
            [
              ["profile", "Profile picture"],
              ["password", "Change password"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative py-3 text-sm font-medium transition ${
                tab === key
                  ? "text-[#004C99]"
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

        <div className="p-5">
          {tab === "profile" && <ProfilePanel user={user} />}
          {tab === "password" && <PasswordPanel user={user} />}
        </div>

        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROFILE PICTURE PANEL
// ═══════════════════════════════════════════════════════════
function ProfilePanel({ user }: { user: AuthUser }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvatar(getStoredAvatar());
  }, []);

  function pickFile() {
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) {
      setError("Please choose a PNG, JPG, GIF, or WEBP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setAvatar(dataUrl);
      setStoredAvatar(dataUrl);
      emitAvatarChanged();
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatar(null);
    setStoredAvatar(null);
    emitAvatarChanged();
  }

  const initial = (user.f_name?.[0] ?? "?").toUpperCase();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt="Profile"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#004C99] text-3xl font-bold text-white">
            {initial}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={pickFile}
            className="rounded-lg bg-[#004C99] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d7a]"
          >
            Upload image
          </button>
          {avatar && (
            <button
              onClick={removeAvatar}
              className="ml-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Remove
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={onFile}
            className="hidden"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <div className="text-sm font-medium text-gray-900">
          {user.f_name}
        </div>
        <div className="text-xs text-gray-500">{user.email}</div>
        <div className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
          {user.role}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHANGE PASSWORD PANEL
// ═══════════════════════════════════════════════════════════
function PasswordPanel({ user }: { user: AuthUser }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!current || !next || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (next.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (next === current) {
      setError("New password must be different from the current one.");
      return;
    }

    setBusy(true);
    try {
      await changeOwnPassword(user.id, current, next);
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e: any) {
      setError(e.message ?? "Failed to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Current password
        </label>
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 pr-16 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500"
          >
            {showCurrent ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          New password
        </label>
        <div className="relative">
          <input
            type={showNext ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 pr-16 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowNext((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500"
          >
            {showNext ? "Hide" : "Show"}
          </button>
        </div>
        <div className="mt-1 text-[11px] text-gray-500">
          At least 6 characters. Use a mix of letters, numbers, and symbols.
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Confirm new password
        </label>
        <input
          type={showNext ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Password updated successfully.
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#004C99] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003d7a] disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}