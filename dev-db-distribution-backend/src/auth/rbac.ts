import { env } from "../env.js";
import type { AuthenticatedUser } from "./types.js";

export type Role = "admin" | "auditor" | "dev";

const intersects = (userGroups: string[], allowedGroups: string[]) =>
  allowedGroups.length > 0 &&
  userGroups.some((group) => allowedGroups.includes(group));

export const isAdmin = (user: AuthenticatedUser) =>
  intersects(user.groups, env.adminGroupIds);

export const isAuditor = (user: AuthenticatedUser) =>
  intersects(user.groups, env.auditorGroupIds);

export const resolveRole = (user: AuthenticatedUser): Role => {
  if (isAdmin(user)) {
    return "admin";
  }
  if (isAuditor(user)) {
    return "auditor";
  }
  return "dev";
};
