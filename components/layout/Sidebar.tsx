"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({ role }: { role: "admin" | "collector" }) {
  const pathname = usePathname();

  const items = [
    { href: "/projects", label: "Projects", icon: "folder", adminOnly: false },
    { href: "/users", label: "Users", icon: "users", adminOnly: true },
    { href: "/stats", label: "Statistics", icon: "chart", adminOnly: false },
  ].filter((item) => !item.adminOnly || role === "admin");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-blue-50 font-medium text-[#004C99]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <SidebarIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function SidebarIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "folder":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 15l3-3 4 4 5-7" />
        </svg>
      );
    default:
      return null;
  }
}