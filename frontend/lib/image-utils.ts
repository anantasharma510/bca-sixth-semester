/**
 * Image utility functions for the social media app
 */

export interface ImageDimensions {
  width: number
  height: number
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Get image dimensions from a file
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Calculate optimal crop area for a given aspect ratio
 * This ensures the crop area is centered and shows the most important part of the image
 */
export const calculateOptimalCropArea = (
  imageWidth: number,
  imageHeight: number,
  targetAspectRatio: number
): CropArea => {
  const imageAspectRatio = imageWidth / imageHeight

  let cropWidth: number
  let cropHeight: number
  let cropX: number
  let cropY: number

  if (imageAspectRatio > targetAspectRatio) {
    // Image is wider than target ratio, crop from sides
    cropHeight = imageHeight
    cropWidth = imageHeight * targetAspectRatio
    cropX = (imageWidth - cropWidth) / 2
    cropY = 0
  } else {
    // Image is taller than target ratio, crop from top/bottom
    cropWidth = imageWidth
    cropHeight = imageWidth / targetAspectRatio
    cropX = 0
    cropY = (imageHeight - cropHeight) / 2
  }

  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight)
  }
}

/**
 * Crop an image using canvas
 */
export const cropImage = (
  image: HTMLImageElement,
  cropArea: CropArea,
  quality: number = 0.9
): Promise<File> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Set canvas size to crop dimensions
      canvas.width = cropArea.width
      canvas.height = cropArea.height

      // Draw the cropped portion
      ctx.drawImage(
        image,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      )

      // Convert to blob and then to File
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'cropped-image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(croppedFile)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      }, 'image/jpeg', quality)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Resize an image while maintaining aspect ratio
 */
export const resizeImage = (
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.9
): Promise<File> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Calculate new dimensions
      const { width: newWidth, height: newHeight } = calculateResizeDimensions(
        image.naturalWidth,
        image.naturalHeight,
        maxWidth,
        maxHeight
      )

      canvas.width = newWidth
      canvas.height = newHeight

      // Draw resized image
      ctx.drawImage(image, 0, 0, newWidth, newHeight)

      // Convert to blob and then to File
      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], 'resized-image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(resizedFile)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      }, 'image/jpeg', quality)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Calculate resize dimensions while maintaining aspect ratio
 */
export const calculateResizeDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): ImageDimensions => {
  const aspectRatio = originalWidth / originalHeight

  let newWidth = originalWidth
  let newHeight = originalHeight

  if (newWidth > maxWidth) {
    newWidth = maxWidth
    newHeight = newWidth / aspectRatio
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = newHeight * aspectRatio
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  }
}

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' }
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image size must be less than 10MB' }
  }

  return { isValid: true }
}

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Create a preview URL for an image file
 */
export const createImagePreview = (file: File): string => {
  return URL.createObjectURL(file)
}

/**
 * Clean up preview URLs to prevent memory leaks
 */
export const cleanupImagePreview = (previewUrl: string): void => {
  URL.revokeObjectURL(previewUrl)
} 