export enum Permission {
  SEND_MESSAGE = 1 << 0,
  DELETE_MESSAGE = 1 << 1,
  EDIT_MESSAGE = 1 << 2,
  INVITE_MEMBER = 1 << 3,
  REMOVE_MEMBER = 1 << 4,
  START_VOICE = 1 << 5,
  MUTE_MEMBER = 1 << 6,
  MANAGE_ROLES = 1 << 7
}

export const groupRolePermissions: Record<'owner' | 'admin' | 'member', number> = {
  owner:
    Permission.SEND_MESSAGE |
    Permission.DELETE_MESSAGE |
    Permission.EDIT_MESSAGE |
    Permission.INVITE_MEMBER |
    Permission.REMOVE_MEMBER |
    Permission.START_VOICE |
    Permission.MUTE_MEMBER |
    Permission.MANAGE_ROLES,
  admin:
    Permission.SEND_MESSAGE |
    Permission.DELETE_MESSAGE |
    Permission.EDIT_MESSAGE |
    Permission.INVITE_MEMBER |
    Permission.REMOVE_MEMBER |
    Permission.START_VOICE |
    Permission.MUTE_MEMBER,
  member: Permission.SEND_MESSAGE | Permission.EDIT_MESSAGE | Permission.START_VOICE
};

export const hasPermission = (mask: number, permission: Permission): boolean =>
  (mask & permission) === permission;
