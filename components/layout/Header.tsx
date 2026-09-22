export default function Header() {
  return (
    <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
      {/* Logo */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-2xl font-bold text-[#2094f3]">Kobo</span>
        <span className="text-2xl font-semibold text-gray-700">Toolbox</span>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-3xl">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-md bg-gray-100 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2094f3]"
          />
        </div>
      </div>

      {/* Avatar */}
      <div className="ml-auto shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white">
          N
        </div>
      </div>
    </header>
  );
}