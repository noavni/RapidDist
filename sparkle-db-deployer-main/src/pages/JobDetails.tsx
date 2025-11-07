import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { ArrowLeft, Download, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApiClient, ApiError } from "@/hooks/useApiClient";
import type { Job } from "@/lib/types";

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const api = useApiClient();

  const jobId = id ?? "";

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ data: Job }, ApiError>({
    queryKey: ["job", jobId],
    queryFn: () => api.get<{ data: Job }>(`/api/jobs/${jobId}`),
    enabled: Boolean(jobId),
  });

  const job = data?.data;

  const requestSas = useMutation(
    () => api.post<{ data: { sasUrl: string } }>(`/api/jobs/${jobId}/sas`, {}),
    {
      onSuccess: (response) => {
        const sasUrl = response.data?.sasUrl;
        if (sasUrl) {
          toast({
            title: "Download ready",
            description: "Opening SAS link in a new window.",
          });
          window.open(sasUrl, "_blank", "noopener");
        } else {
          toast({
            title: "No download URL",
            description: "The API did not return a SAS link.",
            variant: "destructive",
          });
        }
      },
      onError: (sasError: ApiError | Error) => {
        toast({
          title: "Unable to generate link",
          description:
            sasError instanceof ApiError
              ? sasError.message
              : "Unexpected error requesting SAS URL.",
          variant: "destructive",
        });
      },
    },
  );

  const copyChecksum = async (checksum?: string | null) => {
    if (!checksum) {
      return;
    }
    try {
      await navigator.clipboard.writeText(checksum);
      toast({
        title: "Copied",
        description: "Checksum copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  if (!jobId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Job not found</h2>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
        Loading job details...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-destructive">Unable to load job</h2>
        <p className="text-muted-foreground mt-2">
          {(error instanceof ApiError && error.message) || "Unexpected error occurred."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Job not found</h2>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Details</h1>
          <p className="text-muted-foreground mt-1">{job.ticket}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
            <CardDescription>Basic details about this backup job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Number</span>
              <span className="font-medium">{job.ticket}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Server</span>
              <span className="font-medium">{job.server}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium">{job.database}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested By</span>
              <span className="font-medium">{job.requestedBy}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Job execution timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium text-sm">{formatDate(job.createdAt)}</span>
            </div>
            {job.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-sm">{formatDate(job.completedAt)}</span>
              </div>
            )}
            {job.error && (
              <div className="pt-2">
                <div className="text-destructive text-sm font-medium mb-2">Error Details</div>
                <div className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded-md">
                  {job.error}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {job.status === "COMPLETED" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <CardTitle>Backup Ready</CardTitle>
            </div>
            <CardDescription>Your database backup is ready for download</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.sha256 && (
              <LabelBlock title="Checksum (SHA-256)">
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                    {job.sha256}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyChecksum(job.sha256)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </LabelBlock>
            )}
            <Button
              onClick={() => requestSas.mutate()}
              className="w-full gap-2"
              disabled={requestSas.isPending}
            >
              {requestSas.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {requestSas.isPending ? "Requesting link..." : "Get Download Link"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const LabelBlock = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <div className="text-sm font-medium text-muted-foreground">{title}</div>
    {children}
  </div>
);

export default JobDetails;
