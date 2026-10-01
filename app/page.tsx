"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const u = getUser();
      if (u && u.id) {
        router.replace("/projects");
      } else {
        router.replace("/login");
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center text-gray-500">
      Loading…
    </div>
  );
}