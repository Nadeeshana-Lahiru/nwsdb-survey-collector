"use client";

import { supabase } from "./supabase";

export type AuthUser = {
  id: string;
  f_name: string;
  email: string;
  role: "admin" | "collector";
  is_active: boolean;
};

const STORAGE_KEY = "dbtool-admin-user";

// ═══════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

// ═══════════════════════════════════════════════════════════
// LOGIN — calls the login_user RPC (bcrypt verify server-side)
// ═══════════════════════════════════════════════════════════

export async function login(
  username: string,
  password: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  if (!username.trim() || !password) {
    return { ok: false, error: "Enter a username and password." };
  }

  const { data, error } = await supabase.rpc("login_user", {
    p_username: username.trim(),
    p_password: password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Invalid username or password." };
  }

  // The RPC returns a jsonb object
  const row: any = data;

  if (row.is_active === false) {
    return { ok: false, error: "Your account has been disabled." };
  }

  const user: AuthUser = {
    id: row.id,
    f_name: row.f_name,
    email: row.email ?? "",
    role: row.is_admin ? "admin" : "collector",
    is_active: true,
  };
  setUser(user);
  return { ok: true, user };
}

// ═══════════════════════════════════════════════════════════
// REGISTER — calls the register_user RPC (bcrypt hash server-side)
// ═══════════════════════════════════════════════════════════

export async function register({
  fName,
  email,
  password,
  lName,
  phone,
}: {
  fName: string;
  email: string;
  password: string;
  lName?: string;
  phone?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!fName.trim() || !email.trim() || !password) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  try {
    const { data, error } = await supabase.rpc("register_user", {
      p_f_name: fName.trim(),
      p_email: email.trim().toLowerCase(),
      p_password: password,
      p_phone: phone?.trim() ?? "",
      p_l_name: lName?.trim() ?? "",
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const row: any = data;
    if (!row?.success) {
      return { ok: false, error: row?.error ?? "Registration failed." };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Registration failed." };
  }
}

// ═══════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════

export function logout() {
  clearUser();
  if (typeof window !== "undefined") {
    // Hard reload forces a fresh fetch of the login page — no cached state
    window.location.href = "/login";
  }
}