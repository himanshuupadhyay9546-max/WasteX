export type UserRole =
  | "principal_admin"
  | "municipal_admin"
  | "zone_supervisor"
  | "truck_driver"
  | "citizen";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  zoneId?: string;
  truckId?: string;
}

export type Permission =
  | "view_city_analytics"
  | "manage_zones"
  | "manage_trucks"
  | "optimize_routes"
  | "review_illegal_dumps"
  | "dispatch_driver"
  | "collect_bins"
  | "report_dumping"
  | "view_rewards";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  principal_admin: [
    "view_city_analytics",
    "manage_zones",
    "manage_trucks",
    "optimize_routes",
    "review_illegal_dumps",
    "dispatch_driver",
    "collect_bins",
    "report_dumping",
    "view_rewards"
  ],
  municipal_admin: [
    "view_city_analytics",
    "manage_zones",
    "manage_trucks",
    "optimize_routes",
    "review_illegal_dumps",
    "dispatch_driver"
  ],
  zone_supervisor: [
    "review_illegal_dumps",
    "dispatch_driver",
    "optimize_routes"
  ],
  truck_driver: [
    "collect_bins",
    "report_dumping"
  ],
  citizen: [
    "report_dumping",
    "view_rewards"
  ]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessPortal(role: UserRole, portal: "dashboard" | "driver" | "citizen"): boolean {
  if (portal === "dashboard") {
    return ["principal_admin", "municipal_admin", "zone_supervisor"].includes(role);
  }
  if (portal === "driver") {
    return ["truck_driver", "zone_supervisor", "principal_admin"].includes(role);
  }
  if (portal === "citizen") {
    return true; // Any authenticated citizen or public user
  }
  return false;
}
