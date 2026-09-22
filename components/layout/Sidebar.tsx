"use client";

import { useState } from "react";

export default function Sidebar() {
  const [active, setActive] = useState<"deployed" | "draft" | "archived">(
    "deployed"
  );

  const items = [
    { key: "deployed", label: "Deployed", count: 1 },
    { key: "draft", label: "Draft", count: 0 },
    { key: "archived", label: "Archived", count: 0 },
  ] as const;

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      {/* NEW Button */}
      <div className="p-4">
        <button className="w-full rounded-md bg-[#2094f3] py-2 text-sm font-medium text-white hover:bg-[#1a7fd1] transition">
          NEW
        </button>
      </div>

      {/* Filter List */}
      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <button
                onClick={() => setActive(item.key)}
                className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                  active === item.key
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs text-gray-500">{item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Help Icon */}
      <div className="p-4 flex items-center gap-4 text-gray-400">
        <button aria-label="Help" className="hover:text-gray-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7v.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </aside>
  );
}