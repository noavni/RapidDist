import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/hooks/useApiClient";
import type { Database, Server } from "@/lib/types";

interface DatabaseWithServer extends Database {
  server: Server;
}

export default function AdminDatabases() {
  const api = useApiClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<{ servers: Server[]; databases: DatabaseWithServer[] }, ApiError>({
    queryKey: ["databases"],
    queryFn: async () => {
      const serversResponse = await api.get<{ data: Server[] }>("/api/servers");
      const servers = serversResponse.data;
      const databaseResponses = await Promise.all(
        servers.map((server) => api.get<{ data: Database[] }>(`/api/servers/${server.id}/databases`)),
      );
      const databases = databaseResponses.flatMap((response, index) =>
        response.data.map((database) => ({
          ...database,
          server: servers[index],
        })),
      );
      return { servers, databases };
    },
  });

  const databases = data?.databases ?? [];

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
                    <TableCell className="text-sm text-muted-foreground">
                      {database.isActive ? "Active" : "Inactive"}
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
        </CardContent>
      </Card>
    </div>
  );
}
