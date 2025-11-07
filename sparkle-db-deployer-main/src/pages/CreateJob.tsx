import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useApiClient, ApiError } from "@/hooks/useApiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database, Server } from "@/lib/types";

export default function CreateJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [serverId, setServerId] = useState<string>("");
  const [databaseId, setDatabaseId] = useState<string>("");
  const [customDatabaseName, setCustomDatabaseName] = useState<string>("");
  const [ticketNumber, setTicketNumber] = useState<string>("");

  const {
    data: serversData,
    isLoading: loadingServers,
    isError: serversError,
  } = useQuery<{ data: Server[] }, ApiError>({
    queryKey: ["servers"],
    queryFn: () => api.get<{ data: Server[] }>("/api/servers"),
  });

  const servers = serversData?.data ?? [];

  const {
    data: databasesData,
    isLoading: loadingDatabases,
    isError: databasesError,
  } = useQuery<{ data: Database[] }, ApiError>({
    queryKey: ["server-databases", serverId],
    queryFn: () => api.get<{ data: Database[] }>(`/api/servers/${serverId}/databases`),
    enabled: Boolean(serverId),
  });

  const databases = databasesData?.data ?? [];

  const createJob = useMutation(
    ({ serverId: payloadServerId, databaseName, ticket }: { serverId: string; databaseName: string; ticket: string }) =>
      api.post<{ data: { id: string } }>("/api/jobs", {
        serverId: payloadServerId,
        database: databaseName,
        ticket,
      }),
    {
      onSuccess: (response) => {
        void queryClient.invalidateQueries({ queryKey: ["jobs"] });
        toast({
          title: "Job created",
          description: "Your backup job has been queued successfully.",
        });
        const jobId = response?.data?.id;
        if (jobId) {
          navigate(`/jobs/${jobId}`);
        } else {
          navigate("/dashboard");
        }
      },
      onError: (error: ApiError | Error) => {
        toast({
          title: "Failed to create job",
          description:
            error instanceof ApiError
              ? error.message
              : "Please check your inputs and try again.",
          variant: "destructive",
        });
      },
    },
  );

  const availableDatabases = serverId ? databases : [];

  const selectedDatabaseName =
    availableDatabases.find((db) => db.id === databaseId)?.dbName ?? "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!serverId || !ticketNumber) {
      toast({
        title: "Validation error",
        description: "Server and ticket number are required.",
        variant: "destructive",
      });
      return;
    }

    const databaseName = customDatabaseName.trim() || selectedDatabaseName;

    if (!databaseName) {
      toast({
        title: "Validation error",
        description: "Select or enter a database name.",
        variant: "destructive",
      });
      return;
    }

    createJob.mutate({
      serverId,
      databaseName,
      ticket: ticketNumber,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Backup Job</h1>
          <p className="text-muted-foreground mt-1">
            Request a new database backup with ticket tracking
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>
            Select the server and database you want to back up
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ticket">Ticket Number *</Label>
              <Input
                id="ticket"
                placeholder="TICKET-1234"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="server">Server *</Label>
              <Select
                value={serverId}
                onValueChange={(value) => {
                  setServerId(value);
                  setDatabaseId("");
                  setCustomDatabaseName("");
                }}
                disabled={loadingServers}
              >
                <SelectTrigger id="server">
                  <SelectValue placeholder={loadingServers ? "Loading servers..." : "Select a server"} />
                </SelectTrigger>
                <SelectContent>
                  {servers
                    .filter((server) => server.isActive)
                    .map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        {server.name} - {server.dns}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {serversError && (
                <p className="text-sm text-destructive">
                  Failed to load servers: {serversError.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="database">Database *</Label>
              <Select
                value={databaseId}
                onValueChange={(value) => {
                  setDatabaseId(value);
                  const match = availableDatabases.find((db) => db.id === value);
                  setCustomDatabaseName(match?.dbName ?? "");
                }}
                disabled={!serverId || loadingDatabases || availableDatabases.length === 0}
              >
                <SelectTrigger id="database">
                  <SelectValue
                    placeholder={
                      !serverId
                        ? "Select a server first"
                        : loadingDatabases
                          ? "Loading databases..."
                          : availableDatabases.length === 0
                            ? "No databases registered"
                            : "Select a database"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableDatabases.map((db) => (
                    <SelectItem key={db.id} value={db.id}>
                      {db.dbName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {databasesError && (
                <p className="text-sm text-destructive">
                  Failed to load databases: {databasesError.message}
                </p>
              )}
              <div className="space-y-1">
                <Label htmlFor="customDatabase" className="text-sm text-muted-foreground">
                  Or enter a database name manually
                </Label>
                <Input
                  id="customDatabase"
                  placeholder="Enter database name"
                  value={customDatabaseName}
                  onChange={(e) => setCustomDatabaseName(e.target.value)}
                  disabled={!serverId}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createJob.isPending}>
                {createJob.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating…</span>
                  </>
                ) : (
                  "Create Job"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={createJob.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
