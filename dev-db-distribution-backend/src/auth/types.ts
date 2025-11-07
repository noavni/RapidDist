export interface AuthenticatedUser {
  oid: string;
  username: string;
  name?: string;
  email?: string;
  groups: string[];
  tenantId?: string;
}
