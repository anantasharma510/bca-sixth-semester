import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExpoExtra = Record<string, any> | undefined | null;

const DEFAULT_BACKEND_PORT = process.env.EXPO_PUBLIC_BACKEND_PORT || '5000';
const DEFAULT_API_URL = 'https://chinese-airwig-production-0d2d.up.railway.app/api';

const getExpoExtra = (): ExpoExtra => {
  return (
    Constants.expoConfig?.extra ||
    (Constants.manifest2 as any)?.extra ||
    (Constants.manifest as any)?.extra ||
    null
  );
};

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

const ensureApiPath = (value: string): string => {
  if (!value) {
    return value;
  }
  const trimmed = stripTrailingSlashes(value);
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
};

const normalizeHostForEmulator = (host: string): string => {
  if (
    Platform.OS === 'android' &&
    (host === 'localhost' || host === '127.0.0.1')
  ) {
    return '10.0.2.2';
  }
  return host;
};

const deriveDevServerHost = (): string | null => {
  const debuggerHost = Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    if (host) {
      return normalizeHostForEmulator(host);
    }
  }

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants.manifest2 as any)?.extra?.expoGo?.developer?.host;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host) {
      return normalizeHostForEmulator(host);
    }
  }

  return null;
};

const deriveDevApiUrl = (): string | null => {
  const host = deriveDevServerHost();
  if (!host) {
    return null;
  }
  return `http://${host}:${DEFAULT_BACKEND_PORT}/api`;
};

export const resolveApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.length > 0) {
    return ensureApiPath(envUrl);
  }

  const extra = getExpoExtra();
  const extraUrl = extra?.apiUrl;
  if (typeof extraUrl === 'string' && extraUrl.length > 0) {
    return ensureApiPath(extraUrl);
  }

  const devUrl = deriveDevApiUrl();
  if (devUrl) {
    return ensureApiPath(devUrl);
  }

  return DEFAULT_API_URL;
};

export const resolveBackendBaseUrl = (): string => {
  const apiUrl = resolveApiBaseUrl();
  return apiUrl.replace(/\/api$/, '');
};

export const resolveAuthBaseUrl = resolveBackendBaseUrl;

export const resolveExpoScheme = (): string => {
  const scheme = Constants.expoConfig?.scheme;
  if (scheme && scheme.length > 0) {
    return scheme;
  }
  return '空中维格';
};

