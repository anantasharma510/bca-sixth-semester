// Mobile image filtering utility for Apple App Store compliance
// Note: Full NSFW.js requires Node.js, so this provides basic client-side filtering
export interface ImageFilterResult {
  isClean: boolean;
  violations: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  confidence?: number;
}

/**
 * Basic image validation for mobile (client-side)
 * Full NSFW detection happens on the backend
 */
export async function validateImageForMobile(imageUri: string): Promise<ImageFilterResult> {
  try {
    // Basic file validation
    const violations: string[] = [];
    
    // Check file extension
    const extension = imageUri.toLowerCase().split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      violations.push('Invalid file format');
    }
    
    // Basic file size check (this is approximate)
    // Note: Exact file size checking would require FileSystem.getInfoAsync()
    
    // Check for suspicious file names
    const fileName = imageUri.toLowerCase();
    const suspiciousPatterns = [
      'nude', 'naked', 'sex', 'porn', 'adult', 'explicit',
      'xxx', 'nsfw', 'hentai', 'fetish', 'kink'
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (fileName.includes(pattern)) {
        violations.push('Suspicious file name detected');
        break;
      }
    }
    
    return {
      isClean: violations.length === 0,
      violations,
      severity: violations.length > 0 ? 'low' : 'none'
    };
    
  } catch (error) {
    console.error('Mobile image validation error:', error);
    return {
      isClean: true, // Allow if validation fails
      violations: [],
      severity: 'none'
    };
  }
}

/**
 * Get user-friendly violation message for mobile
 */
export function getMobileImageViolationMessage(violations: string[]): string {
  if (violations.length === 0) {
    return '';
  }
  
  const messages = {
    'Invalid file format': 'Please select a valid image file (JPG, PNG, GIF, or WebP)',
    'Suspicious file name detected': 'Please rename your image file to something more appropriate',
    'File too large': 'Please select a smaller image file',
    'Inappropriate content detected': 'Your image may contain inappropriate content. Please choose a different image.'
  };
  
  const firstViolation = violations[0];
  return messages[firstViolation as keyof typeof messages] || 'Please select a different image.';
}

/**
 * Enhanced image validation with file system info
 */
export async function validateImageWithFileInfo(
  imageUri: string, 
  fileSize?: number, 
  fileName?: string
): Promise<ImageFilterResult> {
  try {
    const violations: string[] = [];
    
    // File size validation
    if (fileSize) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        violations.push('File too large');
      }
    }
    
    // File name validation
    if (fileName) {
      const lowerFileName = fileName.toLowerCase();
      const suspiciousPatterns = [
        'nude', 'naked', 'sex', 'porn', 'adult', 'explicit',
        'xxx', 'nsfw', 'hentai', 'fetish', 'kink', 'slut',
        'whore', 'bitch', 'fuck', 'dick', 'pussy', 'ass'
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (lowerFileName.includes(pattern)) {
          violations.push('Suspicious file name detected');
          break;
        }
      }
    }
    
    // Extension validation
    const extension = imageUri.toLowerCase().split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      violations.push('Invalid file format');
    }
    
    return {
      isClean: violations.length === 0,
      violations,
      severity: violations.length > 0 ? 'low' : 'none'
    };
    
  } catch (error) {
    console.error('Enhanced mobile image validation error:', error);
    return {
      isClean: true,
      violations: [],
      severity: 'none'
    };
  }
}
