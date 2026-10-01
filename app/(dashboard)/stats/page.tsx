"use client";

import { useEffect, useState } from "react";
import { getGlobalStats, GlobalStats } from "@/lib/api";
import { getUser } from "@/lib/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#004C99",
  "#26A69A",
  "#FFA726",
  "#AB47BC",
  "#EF5350",
  "#66BB6A",
  "#8D6E63",
];

export default function StatsPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const me = typeof window !== "undefined" ? getUser() : null;
  const isAdmin = me?.role === "admin";

  useEffect(() => {
    (async () => {
      try {
        setStats(await getGlobalStats());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading…
      </div>
    );

  if (error || !stats)
    return <div className="p-8 text-red-600">{error ?? "Failed to load"}</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-xl font-semibold">
        {isAdmin ? "Global Statistics" : "My Statistics"}
      </h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card label="Projects" value={stats.totalProjects} color="blue" />
        <Card label="Users" value={stats.totalUsers} color="purple" />
        <Card label="Deployed" value={stats.deployedProjects} color="green" />
        <Card label="Responses" value={stats.totalResponses} color="orange" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Projects by sector</h2>
          {stats.bySector.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bySector}>
                  <XAxis dataKey="sector" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#004C99" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Projects by status</h2>
          {stats.byStatus.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry: any) => `${entry.status} (${entry.count})`}
                  >
                    {stats.byStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-[#004C99]",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div
        className={`mt-2 inline-flex rounded-lg px-3 py-1 text-2xl font-bold ${
          colors[color]
        }`}
      >
        {value}
      </div>
    </div>
  );
}