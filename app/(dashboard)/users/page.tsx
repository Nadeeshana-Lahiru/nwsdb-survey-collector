"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsers, updateUser, deleteUser, UserRow } from "@/lib/api";
import { getUser } from "@/lib/auth";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const me = typeof window !== "undefined" ? getUser() : null;

  useEffect(() => {
    if (me && me.role !== "admin") {
      router.replace("/projects");
    }
  }, [me, router]);

  async function load() {
    setLoading(true);
    try {
      setUsers(await getUsers());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(id: string, role: "admin" | "collector") {
    try {
      await updateUser(id, { role });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      await updateUser(id, { is_active: !current });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(u: UserRow) {
    if (u.id === me?.id) {
      alert("You can't delete your own account.");
      return;
    }
    if (!confirm(`Delete user "${u.f_name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(u.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-4 border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <button
          onClick={load}
          className="ml-auto rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No users yet.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {u.f_name} {u.l_name ?? ""}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3 text-gray-700">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as any)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                    >
                      <option value="admin">admin</option>
                      <option value="collector">collector</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.is_active ? "active" : "disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.created_at?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(u)}
                      disabled={u.id === me?.id}
                      className="text-xs text-red-600 hover:underline disabled:opacity-30"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}