import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/hooks/useApiClient";
import type { Server } from "@/lib/types";

export default function AdminServers() {
  const api = useApiClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<{ data: Server[] }, ApiError>({
    queryKey: ["servers"],
    queryFn: () => api.get<{ data: Server[] }>("/api/servers"),
  });

  const servers = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Server Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage registered SQL servers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            Add Server
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Servers</CardTitle>
          <CardDescription>
            Configure servers that can be used for backup jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading servers...</div>
          ) : isError ? (
            <div className="py-10 text-center text-destructive">
              <p className="font-medium">Failed to load servers</p>
              <p className="text-sm text-destructive/80">
                {(error instanceof ApiError && error.message) || "Unexpected error"}
              </p>
            </div>
          ) : servers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No servers registered yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>DNS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {server.dns}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={server.isActive ? "default" : "secondary"}
                        className={server.isActive ? "bg-success text-success-foreground" : ""}
                      >
                        {server.isActive ? "Active" : "Inactive"}
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
        </CardContent>
      </Card>
    </div>
  );
}
