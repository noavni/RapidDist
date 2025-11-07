import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { Plus, Eye, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/hooks/useApiClient";
import type { Job } from "@/lib/types";

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const Dashboard = () => {
  const navigate = useNavigate();
  const api = useApiClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<{ data: Job[] }, ApiError>({
    queryKey: ["jobs"],
    queryFn: () => api.get<{ data: Job[] }>("/api/jobs"),
  });

  const jobs = data?.data ?? [];

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((job) => job.status === "COMPLETED").length;
    const running = jobs.filter((job) => job.status === "RUNNING").length;
    const failed = jobs.filter((job) => job.status === "FAILED").length;
    return { total, completed, running, failed };
  }, [jobs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage database backup jobs and monitor progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => navigate("/jobs/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-success">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Running</CardDescription>
            <CardTitle className="text-3xl text-warning">{stats.running}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-destructive">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>View and manage your database backup jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading jobs…</div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive">
              <p className="font-medium">Failed to load jobs</p>
              <p className="text-sm text-destructive/80">
                {(error instanceof ApiError && error.message) || "Unexpected error"}
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No jobs found. Create your first backup job to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>Database</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.ticket}</TableCell>
                    <TableCell>{job.server}</TableCell>
                    <TableCell>{job.database}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
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
};

export default Dashboard;

