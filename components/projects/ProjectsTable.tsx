import { projects } from "@/data/projects";

export default function ProjectsTable() {
  return (
    <div className="flex-1 overflow-auto bg-white px-6 py-4">
      {/* Top Bar */}
      <div className="mb-4 flex items-center">
        <h1 className="text-xl font-semibold text-gray-900">My Projects</h1>

        <div className="ml-6 flex items-center gap-4 text-sm text-gray-600">
          <button className="flex items-center gap-1 hover:text-gray-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 5h18M6 12h12M10 19h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            filter
          </button>
          <button className="flex items-center gap-1 hover:text-gray-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" />
              <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" />
            </svg>
            fields
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="ml-auto flex items-center gap-4 text-gray-500">
          <button aria-label="Archive" className="hover:text-gray-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="4" stroke="currentColor" strokeWidth="2" />
              <path
                d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
          <button aria-label="Share" className="hover:text-gray-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M3 20a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="2" />
              <path
                d="M17 8v6M14 11h6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button aria-label="Delete" className="text-red-500 hover:text-red-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-700">
            <th className="w-10 py-3">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
            </th>
            <th className="py-3 font-medium">▾ Project name</th>
            <th className="py-3 font-medium">▾ Status</th>
            <th className="py-3 font-medium">▾ Owner</th>
            <th className="py-3 font-medium">▾ Last edited</th>
            <th className="py-3 font-medium">▾ Date modified</th>
            <th className="py-3 font-medium">▾ Date deployed</th>
            <th className="py-3 font-medium">▾ Submissions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-4">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
              </td>
              <td className="py-4 font-medium text-[#2094f3] hover:underline cursor-pointer">
                {project.name}
              </td>
              <td className="py-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="4"
                      width="16"
                      height="16"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M8 12l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {project.status}
                </span>
              </td>
              <td className="py-4 text-gray-700">{project.owner}</td>
              <td className="py-4 text-gray-700">{project.lastEditedBy}</td>
              <td className="py-4 text-gray-700">{project.dateModified}</td>
              <td className="py-4 text-gray-700">{project.dateDeployed ?? "-"}</td>
              <td className="py-4">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                  {project.submissions}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}