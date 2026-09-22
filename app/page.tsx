import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import ProjectsTable from "@/components/projects/ProjectsTable";

export default function HomePage() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ProjectsTable />
      </div>
    </div>
  );
}