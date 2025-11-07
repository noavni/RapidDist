import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/hooks/useApiClient";
import type { ApiPaginatedResponse, ServerWithDatabases } from "@/lib/types";

export default function AdminDatabases() {
  const api = useApiClient();
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ApiPaginatedResponse<ServerWithDatabases>, ApiError>({
    queryKey: ["admin-databases", page, pageSize],
    queryFn: () => api.get<ApiPaginatedResponse<ServerWithDatabases>>(`/api/admin/servers?page=${page}&pageSize=${pageSize}`),
    keepPreviousData: true,
  });

  const servers = data?.data.items ?? [];
  const totalServers = data?.data.total ?? 0;
  const totalPages = data?.data.totalPages ?? 0;
  const isRefetching = isFetching && !isLoading;

  const databases = useMemo(() =>
    servers.flatMap((server) =>
      server.databases.map((database) => ({
        ...database,
        server,
      })),
    ),
  [servers]);

  const canGoPrev = page > 1;
  const canGoNext = totalPages === 0 ? false : page < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage databases available for backup
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            Add Database
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Databases</CardTitle>
          <CardDescription>
            Configure databases that can be backed up
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading databases...</div>
          ) : isError ? (
            <div className="py-10 text-center text-destructive">
              <p className="font-medium">Failed to load databases</p>
              <p className="text-sm text-destructive/80">
                {(error instanceof ApiError && error.message) || "Unexpected error"}
              </p>
            </div>
          ) : databases.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No databases registered yet.</div>
          ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database Name</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databases.map((database) => (
                    <TableRow key={database.id}>
                      <TableCell className="font-medium">{database.dbName}</TableCell>
                      <TableCell className="text-muted-foreground">{database.server.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={database.isActive ? "default" : "secondary"}
                          className={database.isActive ? "bg-success text-success-foreground" : ""}
                        >
                          {database.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-2" disabled>
                          <Pencil className="h-4 w-4" />
                          Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Displaying {databases.length} databases across {servers.length} servers (page {totalPages === 0 ? 0 : page} of {totalPages}) — total registered servers: {totalServers}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canGoPrev || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                Page {totalPages === 0 ? 0 : page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => (canGoNext ? p + 1 : p))}
                disabled={!canGoNext || isFetching}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
