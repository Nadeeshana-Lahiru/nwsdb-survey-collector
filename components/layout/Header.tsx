"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout, AuthUser } from "@/lib/auth";
import SettingsDialog, {
  getStoredAvatar,
  AVATAR_EVENT,
} from "@/components/SettingsDialog";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    setAvatar(getStoredAvatar());

    const onAvatarChange = () => setAvatar(getStoredAvatar());
    window.addEventListener(AVATAR_EVENT, onAvatarChange);
    return () => window.removeEventListener(AVATAR_EVENT, onAvatarChange);
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/projects?q=${encodeURIComponent(search.trim())}`);
  }

  function handleSignOut() {
    if (confirm("Sign out of DBtool?")) {
      logout();
    }
  }

  const initial = (user?.f_name?.[0] ?? "?").toUpperCase();

  return (
    <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
      {/* Logo */}
      <Link
        href="/projects"
        className="flex shrink-0 items-center gap-1"
        onClick={() => setMenuOpen(false)}
      >
        <span className="text-2xl font-bold text-[#004C99]">DB</span>
        <span className="text-2xl font-semibold text-gray-700">tool</span>
      </Link>

      {/* Search */}
      <form onSubmit={onSearch} className="max-w-3xl flex-1">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full rounded-md bg-gray-100 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#004C99]"
          />
        </div>
      </form>

      {/* Right side */}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Link
          href="/users"
          className="hidden text-sm text-gray-600 hover:text-gray-900 md:inline"
        >
          Users
        </Link>

        {user?.role === "admin" && (
          <span className="hidden rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 sm:inline">
            ADMIN
          </span>
        )}

        {/* Account menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 transition hover:border-gray-300 hover:bg-gray-50"
            aria-label="Account menu"
          >
            {/* Avatar circle */}
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#004C99] text-xs font-semibold text-white">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </div>

            {/* User name */}
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-gray-800 sm:inline">
              {user?.f_name ?? "Account"}
            </span>

            {/* Chevron */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-gray-500 transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />

              <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                {/* User info block */}
                <div className="border-b border-gray-100 px-4 py-3">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {user?.f_name ?? "Unknown"}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {user?.email || "no email"}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    {user?.role ?? "—"}
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/projects"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
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
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                    </svg>
                    My projects
                  </Link>

                  <Link
                    href="/stats"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
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
                      <path d="M3 3v18h18" />
                      <path d="M7 15l3-3 4 4 5-7" />
                    </svg>
                    Statistics
                  </Link>

                  {user?.role === "admin" && (
                    <Link
                      href="/users"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
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
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Users
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
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
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                    Settings
                  </button>
                </div>

                <div className="border-t border-gray-100">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
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
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="m16 17 5-5-5-5M21 12H9" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings dialog */}
      {settingsOpen && user && (
        <SettingsDialog user={user} onClose={() => setSettingsOpen(false)} />
      )}
    </header>
  );
}