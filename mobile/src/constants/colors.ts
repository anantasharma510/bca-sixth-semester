export const Colors = {
  // Primary Colors
  primary: {
    50: '#fff3e6',
    100: '#ffe0bf',
    200: '#ffc68c',
    300: '#ffad59',
    400: '#ff9433',
    500: '#ff7300', // Main brand color
    600: '#e56600',
    700: '#cc5a00',
    800: '#b34d00',
    900: '#993f00',
  },

  // Neutral Colors
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Success Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Error Colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Warning Colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Background Colors - Updated to match frontend
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    dark: '#232020', // Frontend dark mode background
  },

  // Text Colors - Updated to match frontend
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    disabled: '#d1d5db',
  },

  // Border Colors
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },

  // Shadow Colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },
} as const;

export type ColorKey = keyof typeof Colors;

export const getColors = (theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    return {
      ...Colors,
      background: {
        ...Colors.background,
        primary: Colors.background.dark, // #111827 - matches frontend
        secondary: Colors.neutral[800], // #1f2937 - matches frontend card background
        tertiary: Colors.neutral[700], // #374151
      },
      text: {
        ...Colors.text,
        primary: Colors.text.inverse, // #ffffff - matches frontend
        secondary: Colors.neutral[400], // #9ca3af - matches frontend
        tertiary: Colors.neutral[500], // #6b7280
        inverse: Colors.text.primary,
        disabled: Colors.neutral[600], // #4b5563
      },
      border: {
        ...Colors.border,
        light: Colors.neutral[800], // #1f2937 - matches frontend
        medium: Colors.neutral[700], // #374151
        dark: Colors.neutral[600], // #4b5563
      },
    };
  }
  return Colors;
}; 