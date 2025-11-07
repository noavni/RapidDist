import type { Database, Download, Job, Server } from "@prisma/client";

export interface JobDto {
  id: string;
  ticket: string;
  server: string;
  database: string;
  status: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  blobPath: string | null;
  etag: string | null;
  sha256: string | null;
  error: string | null;
  completedAt: string | null;
}

export interface DownloadDto {
  id: string;
  jobId: string;
  downloadedBy: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
}

export interface ServerDto {
  id: string;
  name: string;
  dns: string;
  isActive: boolean;
  createdAt: string;
}

export interface DatabaseDto {
  id: string;
  serverId: string;
  dbName: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServerWithDatabasesDto extends ServerDto {
  databases: DatabaseDto[];
  totalDatabases: number;
  activeDatabases: number;
}

const toIsoString = (date: Date | null | undefined): string | null =>
  date ? date.toISOString() : null;

export const toJobDto = (job: Job): JobDto => ({
  id: job.id,
  ticket: job.ticket,
  server: job.server,
  database: job.database,
  status: job.status,
  requestedBy: job.requestedBy,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  blobPath: job.blobPath ?? null,
  etag: job.etag ?? null,
  sha256: job.sha256 ?? null,
  error: job.error ?? null,
  completedAt: toIsoString(job.completedAt),
});

export const toDownloadDto = (download: Download): DownloadDto => ({
  id: download.id,
  jobId: download.jobId,
  downloadedBy: download.downloadedBy,
  ipAddress: download.ipAddress ?? null,
  userAgent: download.userAgent ?? null,
  success: download.success,
  createdAt: download.createdAt.toISOString(),
});

export const toServerDto = (server: Server): ServerDto => ({
  id: server.id,
  name: server.name,
  dns: server.dns,
  isActive: server.isActive,
  createdAt: server.createdAt.toISOString(),
});

export const toDatabaseDto = (database: Database): DatabaseDto => ({
  id: database.id,
  serverId: database.serverId,
  dbName: database.dbName,
  isActive: database.isActive,
  createdAt: database.createdAt.toISOString(),
});

export const toServerWithDatabasesDto = (
  server: Server & { databases: Database[] },
): ServerWithDatabasesDto => {
  const databases = server.databases.map(toDatabaseDto);
  const activeDatabases = databases.filter((db) => db.isActive).length;

  return {
    ...toServerDto(server),
    databases,
    totalDatabases: databases.length,
    activeDatabases,
  };
};

export const toJobDtoList = (jobs: Job[]): JobDto[] => jobs.map(toJobDto);

export const toDatabaseDtoList = (databases: Database[]): DatabaseDto[] => databases.map(toDatabaseDto);

export const toServerDtoList = (servers: Server[]): ServerDto[] => servers.map(toServerDto);
