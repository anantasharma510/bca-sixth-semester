import { Dimensions } from 'react-native';
import { Sizes } from '../constants/sizes';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints based on common mobile screen sizes
export const ResponsiveBreakpoints = {
  xs: 320,  // Very small phones
  sm: 375,  // Small phones (iPhone SE)
  md: 414,  // Medium phones (iPhone 12)
  lg: 428,  // Large phones (iPhone 12 Pro Max)
  tablet: 768,  // Tablets
} as const;

// Get current screen size category
export const getScreenSize = () => {
  if (width >= ResponsiveBreakpoints.tablet) return 'tablet';
  if (width >= ResponsiveBreakpoints.lg) return 'lg';
  if (width >= ResponsiveBreakpoints.md) return 'md';
  if (width >= ResponsiveBreakpoints.sm) return 'sm';
  return 'xs';
};

// Responsive scaling functions
export const scale = (size: number) => {
  const screenSize = getScreenSize();
  const scaleFactors = {
    xs: 0.85,
    sm: 0.9,
    md: 1,
    lg: 1.1,
    tablet: 1.2,
  };
  return Math.round(size * scaleFactors[screenSize]);
};

export const verticalScale = (size: number) => {
  const heightRatio = height / 812; // Base height (iPhone 12)
  return Math.round(size * heightRatio);
};

export const moderateScale = (size: number, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

// Responsive spacing
export const getResponsiveSpacing = () => {
  const screenSize = getScreenSize();
  
  switch (screenSize) {
    case 'xs':
      return {
        xs: 2,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        xxl: 24,
      };
    case 'sm':
      return {
        xs: 3,
        sm: 6,
        md: 12,
        lg: 18,
        xl: 24,
        xxl: 32,
      };
    case 'md':
    default:
      return Sizes.spacing;
    case 'lg':
      return {
        xs: 6,
        sm: 12,
        md: 20,
        lg: 28,
        xl: 36,
        xxl: 52,
      };
    case 'tablet':
      return {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 48,
        xxl: 64,
      };
  }
};

// Responsive font sizes
export const getResponsiveFontSize = () => {
  const screenSize = getScreenSize();
  
  switch (screenSize) {
    case 'xs':
      return {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 18,
        xxl: 20,
        xxxl: 24,
        display: 32,
      };
    case 'sm':
      return {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 19,
        xxl: 22,
        xxxl: 28,
        display: 36,
      };
    case 'md':
    default:
      return Sizes.fontSize;
    case 'lg':
      return {
        xs: 13,
        sm: 15,
        md: 17,
        lg: 19,
        xl: 22,
        xxl: 26,
        xxxl: 36,
        display: 52,
      };
    case 'tablet':
      return {
        xs: 14,
        sm: 16,
        md: 18,
        lg: 20,
        xl: 24,
        xxl: 28,
        xxxl: 40,
        display: 64,
      };
  }
};

// Responsive component sizes
export const getResponsiveComponentSizes = () => {
  const spacing = getResponsiveSpacing();
  const screenSize = getScreenSize();
  
  return {
    avatar: {
      sm: screenSize === 'xs' ? 28 : screenSize === 'sm' ? 32 : screenSize === 'tablet' ? 48 : 40,
      md: screenSize === 'xs' ? 36 : screenSize === 'sm' ? 40 : screenSize === 'tablet' ? 56 : 48,
      lg: screenSize === 'xs' ? 48 : screenSize === 'sm' ? 56 : screenSize === 'tablet' ? 72 : 64,
      xl: screenSize === 'xs' ? 64 : screenSize === 'sm' ? 72 : screenSize === 'tablet' ? 96 : 80,
      xxl: screenSize === 'xs' ? 80 : screenSize === 'sm' ? 88 : screenSize === 'tablet' ? 120 : 100,
    },
    coverHeight: screenSize === 'xs' ? 160 : screenSize === 'sm' ? 180 : screenSize === 'tablet' ? 240 : 200,
    padding: {
      container: spacing.lg,
      section: spacing.md,
      item: spacing.sm,
    },
  };
};

// Check if device is tablet-sized
export const isTablet = () => getScreenSize() === 'tablet';

// Check if device is small phone
export const isSmallDevice = () => ['xs', 'sm'].includes(getScreenSize());

// Get responsive dimensions
export const getResponsiveDimensions = () => ({
  width,
  height,
  screenSize: getScreenSize(),
  isTablet: isTablet(),
  isSmallDevice: isSmallDevice(),
});

export default {
  scale,
  verticalScale,
  moderateScale,
  getScreenSize,
  getResponsiveSpacing,
  getResponsiveFontSize,
  getResponsiveComponentSizes,
  getResponsiveDimensions,
  isTablet,
  isSmallDevice,
}; 