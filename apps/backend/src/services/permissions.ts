export const ADMINISTRATOR = 0x8n;

export function hasAdministratorPermission(permissionValue: string | number | bigint | undefined | null, owner = false) {
  if (owner) return true;
  if (permissionValue === undefined || permissionValue === null) return false;
  return (BigInt(permissionValue) & ADMINISTRATOR) === ADMINISTRATOR;
}
