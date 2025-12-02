// Frontend image filtering utility for Apple App Store compliance
// Note: Full NSFW.js requires Node.js, so this provides basic client-side filtering
export interface ImageFilterResult {
  isClean: boolean;
  violations: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  confidence?: number;
}

/**
 * Basic image validation for frontend (client-side)
 * Full NSFW detection happens on the backend
 */
export async function validateImageForFrontend(file: File): Promise<ImageFilterResult> {
  try {
    const violations: string[] = [];
    
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      violations.push('Invalid file format');
    }
    
    // File size validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      violations.push('File too large');
    }
    
    // File name validation
    const fileName = file.name.toLowerCase();
    const suspiciousPatterns = [
      'nude', 'naked', 'sex', 'porn', 'adult', 'explicit',
      'xxx', 'nsfw', 'hentai', 'fetish', 'kink', 'slut',
      'whore', 'bitch', 'fuck', 'dick', 'pussy', 'ass',
      'cumshot', 'blowjob', 'handjob', 'orgy', 'gangbang'
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (fileName.includes(pattern)) {
        violations.push('Suspicious file name detected');
        break;
      }
    }
    
    // Basic image analysis using canvas (very basic)
    try {
      const imageAnalysis = await analyzeImageWithCanvas(file);
      if (!imageAnalysis.isClean) {
        violations.push(...imageAnalysis.violations);
      }
    } catch (canvasError) {
      console.warn('Canvas image analysis failed:', canvasError);
      // Continue without canvas analysis
    }
    
    return {
      isClean: violations.length === 0,
      violations,
      severity: violations.length > 0 ? 'low' : 'none'
    };
    
  } catch (error) {
    console.error('Frontend image validation error:', error);
    return {
      isClean: true, // Allow if validation fails
      violations: [],
      severity: 'none'
    };
  }
}

/**
 * Basic image analysis using HTML5 Canvas
 */
async function analyzeImageWithCanvas(file: File): Promise<ImageFilterResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      try {
        canvas.width = 100; // Resize for analysis
        canvas.height = 100;
        ctx?.drawImage(img, 0, 0, 100, 100);
        
        const imageData = ctx?.getImageData(0, 0, 100, 100);
        if (!imageData) {
          resolve({ isClean: true, violations: [], severity: 'none' });
          return;
        }
        
        const data = imageData.data;
        const violations: string[] = [];
        
        // Basic skin tone detection (very rudimentary)
        let skinTonePixels = 0;
        let totalPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a > 128) { // Only count non-transparent pixels
            totalPixels++;
            
            // Very basic skin tone detection
            if (r > 95 && g > 40 && b > 20 && 
                Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                Math.abs(r - g) > 15 && r > g && r > b) {
              skinTonePixels++;
            }
          }
        }
        
        if (totalPixels > 0) {
          const skinToneRatio = skinTonePixels / totalPixels;
          if (skinToneRatio > 0.8) {
            violations.push('Potential inappropriate content detected');
          }
        }
        
        resolve({
          isClean: violations.length === 0,
          violations,
          severity: violations.length > 0 ? 'low' : 'none'
        });
        
      } catch (error) {
        console.error('Canvas analysis error:', error);
        resolve({ isClean: true, violations: [], severity: 'none' });
      }
    };
    
    img.onerror = () => {
      resolve({ isClean: true, violations: [], severity: 'none' });
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get user-friendly violation message for frontend
 */
export function getFrontendImageViolationMessage(violations: string[]): string {
  if (violations.length === 0) {
    return '';
  }
  
  const messages = {
    'Invalid file format': 'Please select a valid image file (JPG, PNG, GIF, or WebP)',
    'File too large': 'Please select a smaller image file (max 10MB)',
    'Suspicious file name detected': 'Please rename your image file to something more appropriate',
    'Potential inappropriate content detected': 'Your image may contain inappropriate content. Please choose a different image.'
  };
  
  const firstViolation = violations[0];
  return messages[firstViolation as keyof typeof messages] || 'Please select a different image.';
}

/**
 * Enhanced image validation with detailed checks
 */
export async function validateImageEnhanced(file: File): Promise<ImageFilterResult> {
  try {
    const violations: string[] = [];
    
    // Basic file validation
    const basicValidation = await validateImageForFrontend(file);
    violations.push(...basicValidation.violations);
    
    // Additional checks for specific file types
    if (file.type === 'image/gif') {
      // GIFs might be animated - warn user
      violations.push('Animated images are not recommended');
    }
    
    // Check file extension against MIME type
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    const expectedExtensions: { [key: string]: string[] } = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp']
    };
    
    const expectedExts = expectedExtensions[file.type];
    if (expectedExts && !expectedExts.includes(fileExtension || '')) {
      violations.push('File extension does not match file type');
    }
    
    return {
      isClean: violations.length === 0,
      violations,
      severity: violations.length > 0 ? 'low' : 'none'
    };
    
  } catch (error) {
    console.error('Enhanced frontend image validation error:', error);
    return {
      isClean: true,
      violations: [],
      severity: 'none'
    };
  }
}
