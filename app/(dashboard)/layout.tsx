"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, AuthUser } from "@/lib/auth";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUserState(u);
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f4f6f8]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user?.role ?? "collector"} />
        <main className="flex-1 overflow-auto bg-[#f4f6f8]">{children}</main>
      </div>
    </div>
  );
}