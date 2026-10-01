export type ProjectStatus = "deployed" | "draft" | "archived";

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: string;
  lastEditedBy: string;
  dateModified: string;
  dateDeployed: string | null;
  submissions: number;
}