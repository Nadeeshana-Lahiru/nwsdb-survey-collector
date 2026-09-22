export interface Project {
  id: string;
  name: string;
  status: "deployed" | "draft" | "archived";
  owner: string;
  lastEditedBy: string;
  dateModified: string;
  dateDeployed: string | null;
  submissions: number;
}