import type { User } from '../types/api';

type DisplayNameSource = Partial<Pick<User, 'firstName' | 'lastName' | 'username'>> & {
  name?: string | null;
  handle?: string | null;
};

const normalize = (value?: string | null) => value?.trim() || '';

export const getDisplayName = (
  user?: DisplayNameSource | null,
  fallback: string = 'User'
): string => {
  if (!user) {
    return fallback;
  }

  const first = normalize(user.firstName);
  const last = normalize(user.lastName);

  if (first && last) {
    return `${first} ${last}`;
  }

  if (first) {
    return first;
  }

  if (last) {
    return last;
  }

  const name = normalize(user.name);
  if (name) {
    return name;
  }

  const username = normalize(user.username);
  if (username) {
    return username;
  }

  const handle = normalize(user.handle);
  if (handle) {
    return handle;
  }

  return fallback;
};

export const getUserInitials = (
  user?: DisplayNameSource | null,
  fallback: string = 'U'
): string => {
  const displayName = getDisplayName(user, '').trim();

  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  const username = normalize(user?.username);
  if (username) {
    return username.charAt(0).toUpperCase();
  }

  return fallback.toUpperCase();
};


