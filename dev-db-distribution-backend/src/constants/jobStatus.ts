export const JOB_STATUS = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;

export type JobStatus = (typeof JOB_STATUS)[number];
