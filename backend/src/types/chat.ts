export type TargetType = 'dm' | 'group';

export const normalizeDmRoom = (a: string, b: string): string => {
  const [first, second] = [a, b].sort();
  return `dm:${first}:${second}`;
};

export const isParticipantInDmRoom = (roomId: string, userId: string): boolean => {
  if (!roomId.startsWith('dm:')) return false;
  const [, left, right] = roomId.split(':');
  return left === userId || right === userId;
};
