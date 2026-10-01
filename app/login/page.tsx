"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, register, getUser } from "@/lib/auth";

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/projects";

  const [tab, setTab] = useState<"login" | "signup">("login");

  // Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPwdVisible, setLoginPwdVisible] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup state
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupPwdVisible, setSignupPwdVisible] = useState(false);
  const [signupConfirmVisible, setSignupConfirmVisible] = useState(false);
  const [agree, setAgree] = useState(false);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  // ── If already logged in, skip the login page ─────────
  useEffect(() => {
    const u = getUser();
    if (u && u.id) {
      router.replace(redirect);
    }
  }, [router, redirect]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      const result = await login(loginUsername, loginPassword);
      if (result.ok) {
        router.push(redirect);
      } else {
        setLoginError(result.error);
        setLoginBusy(false);
      }
    } catch (e: any) {
      setLoginError(e.message ?? "Login failed");
      setLoginBusy(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccess(null);

    const full = fullName.trim();
    const email = signupEmail.trim().toLowerCase();
    const phone = signupPhone.trim();

    if (!full || !email || !signupPassword) {
      setSignupError("Please fill in all required fields.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError("Passwords do not match.");
      return;
    }
    if (!agree) {
      setSignupError("Please agree to the Terms and Privacy Policy.");
      return;
    }

    setSignupBusy(true);
    try {
      const result = await register({
        fName: full,
        email,
        password: signupPassword,
        phone,
      });

      if (result.ok) {
        setSignupSuccess("Account created! Please sign in.");
        setFullName("");
        setSignupEmail("");
        setSignupPhone("");
        setSignupPassword("");
        setSignupConfirm("");
        setAgree(false);
        setTimeout(() => {
          setTab("login");
          setLoginUsername(full);
        }, 1200);
      } else {
        setSignupError(result.error);
      }
    } catch (e: any) {
      setSignupError(e.message ?? "Registration failed.");
    } finally {
      setSignupBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#004C99] to-[#0a0a0a] px-4 py-8">
      <div className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-2xl">
        {/* Logo */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F0FE]">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#004C99]"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="4"
                stroke="currentColor"
                strokeWidth="2.2"
              />
              <path
                d="M8 12.5l3 3 5-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">DBtool</h1>
          <p className="mt-1 text-xs text-gray-500">
            National Water Supply &amp; Drainage Board
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === "login"
                ? "bg-white text-[#004C99] shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === "signup"
                ? "bg-white text-[#004C99] shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Create account
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </span>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                placeholder="Username"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-11 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-[#004C99] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004C99]/20"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type={loginPwdVisible ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-11 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:border-[#004C99] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004C99]/20"
              />
              <button
                type="button"
                onClick={() => setLoginPwdVisible(!loginPwdVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            {loginError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginBusy}
              className="mt-2 w-full rounded-lg bg-[#004C99] py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#003d7a] disabled:opacity-50"
            >
              {loginBusy ? "Logging in…" : "Login"}
            </button>
          </form>
        )}

        {/* SIGNUP FORM */}
        {tab === "signup" && (
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Full name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Email *
              </label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Phone (optional)
              </label>
              <input
                type="text"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
                placeholder="07X XXX XXXX"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Password *
              </label>
              <div className="relative">
                <input
                  type={signupPwdVisible ? "text" : "password"}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 pr-10 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSignupPwdVisible(!signupPwdVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Confirm password *
              </label>
              <div className="relative">
                <input
                  type={signupConfirmVisible ? "text" : "password"}
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 pr-10 text-sm focus:border-[#004C99] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSignupConfirmVisible(!signupConfirmVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>
            <label className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span className="text-xs text-gray-600">
                I agree to the Terms and Privacy Policy
              </span>
            </label>
            {signupError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {signupError}
              </div>
            )}
            {signupSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {signupSuccess}
              </div>
            )}
            <button
              type="submit"
              disabled={signupBusy}
              className="mt-2 w-full rounded-lg bg-[#004C99] py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#003d7a] disabled:opacity-50"
            >
              {signupBusy ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-gray-500">
          Loading…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}