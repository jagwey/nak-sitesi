// SUPER_ADMIN can only be assigned during a privileged server operation.
export const ASSIGNABLE_ROLES = ["ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "MODERATOR"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
export const ADMIN_CODES: string[] = ["SUPER_ADMIN", ...ASSIGNABLE_ROLES];
export const ADMIN_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Süper Yönetici",
  ADMIN: "Yönetici",
  PRODUCT_MANAGER: "Ürün Yöneticisi",
  ORDER_MANAGER: "Sipariş Yöneticisi",
  MODERATOR: "Moderatör",
};

const ADMIN_PERMISSION_PREFIXES = ["product:", "order:", "customer:", "customorder:", "coupon:", "settings:", "user:", "audit:", "file:"];

export const hasAnyAdminPermission = (user: { permissions: string[] }) =>
  user.permissions.some((permission) => ADMIN_PERMISSION_PREFIXES.some((prefix) => permission.startsWith(prefix)));
