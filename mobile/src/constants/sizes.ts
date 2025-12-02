import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const Sizes = {
  // Screen dimensions
  screen: {
    width,
    height,
  },

  // Spacing scale (8px base)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  // Border radius
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 50,
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Component sizes
  component: {
    button: {
      height: {
        sm: 36,
        md: 44,
        lg: 52,
      },
      padding: {
        sm: 12,
        md: 16,
        lg: 20,
      },
    },
    input: {
      height: 44,
      padding: 12,
    },
    avatar: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 64,
      xxl: 80,
    },
    icon: {
      sm: 16,
      md: 20,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
  },

  // Layout
  layout: {
    header: {
      height: 56,
    },
    tabBar: {
      height: 83, // iOS safe area
    },
    bottomSheet: {
      handleHeight: 4,
      handleWidth: 40,
    },
  },
} as const;

export type SizeKey = keyof typeof Sizes; 