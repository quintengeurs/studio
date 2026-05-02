import { AccessPermissions, Organisation, User } from "./types";
import { getDefaultPermissionsForUser as getDefaultAccessPermissions } from "./permissions";
import { Roles, Modules } from "./roles";

export { Roles, Modules };
export type Role = typeof Roles[keyof typeof Roles];
export type Module = typeof Modules[keyof typeof Modules];

export function getUserRoles(user: User | null | undefined): string[] {
  const roles = new Set<string>();
  if (user?.role) roles.add(user.role);
  if (user?.roles) user.roles.forEach((role) => roles.add(role));
  if (user?.assignedRoles) user.assignedRoles.forEach((assigned) => roles.add(assigned.role));
  return Array.from(roles);
}

export function hasRole(user: User | null | undefined, role: string): boolean {
  return getUserRoles(user).includes(role);
}

export function hasAnyRole(user: User | null | undefined, roles: string[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

export function isAdmin(user: User | null | undefined): boolean {
  return hasRole(user, Roles.ADMIN) || user?.email?.toLowerCase() === "quinten.geurs@gmail.com";
}

export function isVolunteer(user: User | null | undefined): boolean {
  const roles = getUserRoles(user);
  return roles.includes(Roles.VOLUNTEER) && roles.length === 1 && !isAdmin(user);
}

export function getUserModules(
  user: User | null | undefined,
  organisation: Organisation | null | undefined
): string[] {
  const modules = new Set<string>([
    ...(user?.licenseModules || []),
    ...(organisation?.enabledModules || []),
    ...(organisation?.licenseModules || []),
  ]);
  return Array.from(modules);
}

export function hasModule(
  user: User | null | undefined,
  organisation: Organisation | null | undefined,
  module: string
): boolean {
  if (isAdmin(user)) return true;
  return getUserModules(user, organisation).includes(module);
}

export function hasPermission(
  user: User | null | undefined,
  permission: string
): boolean {
  if (isAdmin(user)) return true;
  if (!user) return false;

  if (user.permissions && permission in user.permissions) {
    return Boolean(user.permissions[permission as keyof AccessPermissions]);
  }

  return Boolean(user.permissionKeys?.includes(permission));
}

export function getDefaultPermissionsForUser(
  user: User | null | undefined,
  fallbackEmail?: string | null
): AccessPermissions {
  return getDefaultAccessPermissions(user, fallbackEmail);
}

export function canAccessPark(user: User | null | undefined, parkId?: string): boolean {
  if (isAdmin(user)) return true;
  if (!parkId || !user) return false;
  return Boolean(user.parkIds?.includes(parkId));
}

export function canAccessDepot(user: User | null | undefined, depotId?: string): boolean {
  if (isAdmin(user)) return true;
  if (!depotId || !user) return false;
  return Boolean(
    user.depotIds?.includes(depotId) ||
    user.depots?.includes(depotId) ||
    user.depot === depotId
  );
}
