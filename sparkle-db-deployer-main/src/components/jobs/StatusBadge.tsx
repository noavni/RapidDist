import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: JobStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<JobStatus, string> = {
    PENDING: "bg-muted text-muted-foreground",
    RUNNING: "bg-warning text-warning-foreground",
    COMPLETED: "bg-success text-success-foreground",
    FAILED: "bg-destructive text-destructive-foreground",
  };

  return (
    <Badge className={cn("font-medium", variants[status])}>
      {status}
    </Badge>
  );
}
