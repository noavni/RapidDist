export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Job {
  id: string;
  ticket: string;
  server: string;
  database: string;
  status: JobStatus;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  blobPath?: string | null;
  etag?: string | null;
  sha256?: string | null;
  error?: string | null;
  completedAt?: string | null;
}

export interface Server {
  id: string;
  name: string;
  dns: string;
  isActive: boolean;
  createdAt: string;
}

export interface Database {
  id: string;
  serverId: string;
  dbName: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiListResponse<T> {
  data: T;
}
