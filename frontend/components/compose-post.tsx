"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ImageIcon, Video, X, Crop, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePostApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useSmartToast } from "@/hooks/use-toast"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"
import { ImageCropper } from "@/components/ui/image-cropper"
import { validateImageFile, cleanupImagePreview } from "@/lib/image-utils"
import Link from "next/link"
import Image from "next/image"
import { useVideoManager } from "@/components/video-manager"
import { filterContent } from "@/lib/contentFilter"
import { validateImageForFrontend, getFrontendImageViolationMessage } from "@/lib/imageFilter"

interface ComposePostProps {
  // Real-time updates are now handled by Socket.IO
}

// Video validation function
const validateVideoFile = (file: File) => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const allowedTypes = [
    'video/mp4', 
    'video/webm', 
    'video/ogg', 
    'video/quicktime', 
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-matroska',
    'video/3gpp',
    'video/3gpp2',
    'video/x-flv',
    'video/x-f4v',
    'video/x-f4p',
    'video/x-f4a',
    'video/x-f4b'
  ];
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 100MB' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Only MP4, WebM, OGG, MOV, AVI, WMV, MKV, 3GP, and FLV video formats are supported' };
  }
  
  return { isValid: true };
};



export function ComposePost({}: ComposePostProps) {
  const { user } = useAuth()
  const { createPost } = usePostApi()
  const { toast } = useSmartToast()
  const { guardInteraction } = useInteractionGuard()

  // State management
  const [content, setContent] = useState("")
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedVideos, setSelectedVideos] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoPreviews, setVideoPreviews] = useState<string[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropIndex, setCropIndex] = useState<number | null>(null)
  const [croppedImage, setCroppedImage] = useState<File | null>(null)

  // Create video refs for all possible videos (max 4 total media)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const { registerVideo, unregisterVideo } = useVideoManager()

  // Initialize video refs array
  useEffect(() => {
    videoRefs.current = Array(4).fill(null)
  }, [])

  // Register/unregister videos when they change
  useEffect(() => {
    videoRefs.current.forEach((videoRef, index) => {
      if (videoRef) {
        registerVideo(videoRef, false) // No auto-play for compose previews
        return () => {
          unregisterVideo(videoRef)
        }
      }
    })
  }, [registerVideo, unregisterVideo])

  // Helper function to get video ref
  const getVideoRef = (index: number) => {
    if (!videoRefs.current[index]) {
      videoRefs.current[index] = null
    }
    return (el: HTMLVideoElement | null) => {
      videoRefs.current[index] = el
    }
  }

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup image previews
      imagePreviews.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [imagePreviews])

  // Auto-resize textarea based on content
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    setContent(textarea.value)
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    
    // Calculate new height (min 40px, max 200px)
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200)
    // setTextareaHeight(newHeight) // This state was removed, so this line is removed
    textarea.style.height = `${newHeight}px`
  }

  const handlePost = async () => {
    // Allow posting if there's content OR media (or both)
    if (!content.trim() && selectedImages.length === 0 && selectedVideos.length === 0) return

    // Guard the post creation interaction for non-authenticated users
    const canProceed = guardInteraction("create a post", () => {})
    if (!canProceed) return

    // Content filtering for Apple App Store compliance
    if (content.trim().length > 0) {
      try {
        const filterResult = await filterContent(content.trim());
        
        if (!filterResult.isClean) {
          toast({
            title: "Content Blocked",
            description: filterResult.message || 'Your content violates community guidelines',
            variant: "destructive"
          });
          return;
        }
      } catch (filterError) {
        console.error('Content filtering error:', filterError);
        toast({
          title: "Error",
          description: "Content verification failed. Please try again.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsPosting(true)
    try {
      await createPost({
        content: content.trim(),
        images: selectedImages.length > 0 ? selectedImages : undefined,
        videos: selectedVideos.length > 0 ? selectedVideos : undefined,
      })
      
      // Reset form
      setContent("")
      setSelectedImages([])
      setSelectedVideos([])
      setImagePreviews([])
      setVideoPreviews([])

      // Removed success toast - visual feedback is enough
      
      // No need to call onPostCreated since real-time updates are handled by Socket.IO
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      })
    } finally {
      setIsPosting(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    const totalMedia = selectedImages.length + selectedVideos.length + files.length
    if (totalMedia > 4) {
      toast({
        title: "Error",
        description: "You can only upload up to 4 media files total",
        variant: "destructive"
      })
      return
    }
    
    // Validate each file
    const validFiles: File[] = []
    const invalidFiles: string[] = []
    
    for (const file of files) {
      // Basic file validation
      const basicValidation = validateImageFile(file)
      if (!basicValidation.isValid) {
        invalidFiles.push(basicValidation.error || 'Invalid file')
        continue
      }
      
      // Content filtering validation
      try {
        const contentValidation = await validateImageForFrontend(file)
        if (!contentValidation.isClean) {
          const message = getFrontendImageViolationMessage(contentValidation.violations)
          invalidFiles.push(message)
          continue
        }
        
        // If all validations pass, add to valid files
        validFiles.push(file)
      } catch (error) {
        console.error('Image content validation error:', error)
        // Allow file if validation fails
        validFiles.push(file)
      }
    }

    // Show error for invalid files
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid Images",
        description: invalidFiles.join(', '),
        variant: "destructive"
      })
    }

    if (validFiles.length === 0) return
    
    // Process each valid file - upload directly without cropping
    validFiles.forEach((file) => {
      const imageUrl = URL.createObjectURL(file)
      
      // Add to selected images and previews directly
      setSelectedImages(prev => [...prev, file])
      setImagePreviews(prev => [...prev, imageUrl])
    })

    // Clear the input
    event.target.value = ''
  }

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    const totalMedia = selectedImages.length + selectedVideos.length + files.length
    if (totalMedia > 4) {
      toast({
        title: "Error",
        description: "You can only upload up to 4 media files total",
        variant: "destructive"
      })
      return
    }
    
    // Check video count limit
    if (selectedVideos.length + files.length > 2) {
      toast({
        title: "Error",
        description: "You can only upload up to 2 videos per post",
        variant: "destructive"
      })
      return
    }
    
    // Validate each file
    const validFiles: File[] = []
    const invalidFiles: string[] = []
    
    files.forEach(file => {
      const validation = validateVideoFile(file)
      if (validation.isValid) {
        validFiles.push(file)
      } else {
        invalidFiles.push(validation.error || 'Invalid file')
      }
    })

    // Show error for invalid files
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid Videos",
        description: invalidFiles.join(', '),
        variant: "destructive"
      })
    }

    if (validFiles.length === 0) return
    
    // Process each valid file
    validFiles.forEach((file) => {
      const videoUrl = URL.createObjectURL(file)
      
      // Add to selected videos and previews
      setSelectedVideos(prev => [...prev, file])
      setVideoPreviews(prev => [...prev, videoUrl])
    })

    // Clear the input
    event.target.value = ''
  }

  const handleCropComplete = (croppedImage: File) => {
    if (cropIndex === null) return

    // Cleanup the old preview URL
    const oldPreviewUrl = imagePreviews[cropIndex]
    cleanupImagePreview(oldPreviewUrl)

    // Create preview for cropped image
    const croppedImageUrl = URL.createObjectURL(croppedImage)
    
    // Update the image at the specific index
    setSelectedImages(prev => {
      const newImages = [...prev]
      newImages[cropIndex] = croppedImage
      return newImages
    })
    
    setImagePreviews(prev => {
      const newPreviews = [...prev]
      newPreviews[cropIndex] = croppedImageUrl
      return newPreviews
    })

    // Close cropper
    setShowCropModal(false)
    setCropIndex(null)
    setCroppedImage(null)
    
    // Removed crop success toast - visual feedback is enough
  }

  const handleCropCancel = () => {
    if (cropIndex === null) return

    // Cleanup the preview URL
    const previewUrl = imagePreviews[cropIndex]
    cleanupImagePreview(previewUrl)

    // Remove the image that was being cropped
    setSelectedImages(prev => prev.filter((_, i) => i !== cropIndex))
    setImagePreviews(prev => prev.filter((_, i) => i !== cropIndex))

    // Close cropper
    setShowCropModal(false)
    setCropIndex(null)
    setCroppedImage(null)
  }

  const removeImage = (index: number) => {
    // Cleanup the preview URL
    const previewUrl = imagePreviews[index]
    cleanupImagePreview(previewUrl)

    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    // Cleanup the preview URL
    const previewUrl = videoPreviews[index]
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedVideos(prev => prev.filter((_, i) => i !== index))
    setVideoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const openCropper = (index: number) => {
    setCroppedImage(null) // Clear previous cropped image
    setCropIndex(index)
    setShowCropModal(true)
  }

  const avatarUrl =
    (user as { imageUrl?: string | null } | null | undefined)?.imageUrl ??
    user?.image ??
    "/placeholder-user.jpg"
  const characterLimit = 1500
  const remainingChars = characterLimit - content.length
  const isOverLimit = remainingChars < 0
  const circleRadius = 12
  const circleCircumference = 2 * Math.PI * circleRadius
  const characterProgress = Math.min(Math.max(content.length / characterLimit, 0), 1)
  const strokeDashoffset = circleCircumference * (1 - characterProgress)
  const remainingTextColor = isOverLimit
    ? "text-red-500"
    : remainingChars <= 20
      ? "text-yellow-500"
      : "text-gray-400 dark:text-gray-500"
  const progressRingColor = isOverLimit
    ? "text-red-500"
    : remainingChars <= 20
      ? "text-yellow-500"
      : "text-blue-500"

  return (
    <>
      <div className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div className="p-3 xs:p-4 sm:p-6">
          <div className="flex space-x-2 xs:space-x-3 sm:space-x-4">
            <div className="flex-shrink-0">
              <Link
                href="/profile"
                aria-label="Go to profile"
                className="inline-flex"
              >
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="object-cover w-8 h-8 rounded-full xs:w-10 xs:h-10 sm:w-12 sm:h-12 ring-2 ring-gray-100 dark:ring-gray-700"
                />
              </Link>
            </div>

            <div className="flex-1 min-w-0">
              <div className="relative p-2 transition-colors border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 xs:p-3 dark:border-gray-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <textarea
                  value={content}
                  onChange={handleTextareaChange}
                  placeholder="What's happening?"
                  className="w-full text-base xs:text-lg sm:text-xl text-gray-900 dark:text-white bg-transparent border-none resize-none focus:outline-none focus:ring-0 placeholder:text-gray-500 dark:placeholder:text-gray-400 break-words leading-6 xs:leading-7 sm:leading-8 min-h-[40px] max-h-[200px] overflow-y-auto"
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    fontFamily: "inherit",
                  }}
                  rows={1}
                />

                <div className="absolute flex items-center space-x-1 bottom-1 xs:bottom-2 right-1 xs:right-2">
                  <div className={`text-xs font-medium ${remainingTextColor}`}>
                    {remainingChars}
                  </div>
                  <div className="w-3 h-3 xs:w-4 xs:h-4">
                    <svg
                      className="w-3 h-3 transform -rotate-90 xs:w-4 xs:h-4"
                      viewBox="0 0 32 32"
                    >
                      <circle
                        cx="16"
                        cy="16"
                        r={circleRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r={circleRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={strokeDashoffset}
                        className={progressRingColor}
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {(imagePreviews.length > 0 || videoPreviews.length > 0) && (
                <div className="mt-4">
                  {(() => {
                    const allMedia = [
                      ...imagePreviews.map((url, index) => ({
                        type: "image" as const,
                        url,
                        index,
                        originalIndex: index,
                      })),
                      ...videoPreviews.map((url, index) => ({
                        type: "video" as const,
                        url,
                        index,
                        originalIndex: index,
                      })),
                    ]

                    const mediaCount = allMedia.length

                    if (mediaCount === 1) {
                      const media = allMedia[0]
                      return (
                        <div className="relative group">
                          {media.type === "image" ? (
                            <Image
                              src={media.url}
                              alt="Selected"
                              className="w-full max-h-[300px] object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                              width={300}
                              height={300}
                              style={{ width: "100%", height: "auto" }}
                            />
                          ) : (
                            <div className="relative group">
                              <div className="relative w-full overflow-hidden bg-black rounded-lg">
                                <video
                                  ref={getVideoRef(media.originalIndex)}
                                  src={media.url}
                                  controls
                                  preload="metadata"
                                  className="w-full h-auto max-h-[300px] object-contain rounded-lg"
                                  playsInline
                                />
                              </div>
                              <button
                                onClick={() => removeVideo(media.originalIndex)}
                                className="absolute flex items-center justify-center w-8 h-8 text-white transition-all duration-200 rounded-full shadow-lg opacity-0 top-2 right-2 bg-black/70 hover:bg-red-500 hover:scale-110 group-hover:opacity-100"
                                title="Remove video"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    }

                    const getGridClass = () => {
                      switch (mediaCount) {
                        case 2:
                          return "grid-cols-2 gap-2"
                        case 3:
                          return "grid-cols-2 gap-2"
                        case 4:
                          return "grid-cols-2 gap-2"
                        default:
                          return "grid-cols-3 gap-2"
                      }
                    }

                    const getImageClass = (index: number) => {
                      if (mediaCount === 2) {
                        return "aspect-square object-cover h-24 xs:h-32"
                      }
                      if (mediaCount === 3) {
                        return index === 2
                          ? "col-span-2 aspect-[2/1] object-cover h-24 xs:h-32"
                          : "aspect-square object-cover h-24 xs:h-32"
                      }
                      if (mediaCount === 4) {
                        return "aspect-square object-cover h-20 xs:h-24 sm:h-32"
                      }
                      return "aspect-square object-cover h-20 xs:h-24"
                    }

                    const getVideoClass = (index: number) => {
                      if (mediaCount === 2) {
                        return "h-24 xs:h-32"
                      }
                      if (mediaCount === 3) {
                        return index === 2 ? "col-span-2 h-24 xs:h-32" : "h-24 xs:h-32"
                      }
                      if (mediaCount === 4) {
                        return "h-20 xs:h-24 sm:h-32"
                      }
                      return "h-20 xs:h-24"
                    }

                    return (
                      <div className={`grid ${getGridClass()}`}>
                        {allMedia.map((media, index) => (
                          <div
                            key={`${media.type}-${media.originalIndex}`}
                            className="relative group"
                          >
                            {media.type === "video" ? (
                              <div className="relative group">
                                <div className="relative w-full overflow-hidden bg-black rounded-lg">
                                  <video
                                    ref={getVideoRef(media.originalIndex)}
                                    src={media.url}
                                    controls
                                    preload="metadata"
                                    className={`w-full ${getVideoClass(index)} object-contain rounded-lg`}
                                    playsInline
                                  />
                                </div>
                                <button
                                  onClick={() => removeVideo(media.originalIndex)}
                                  className="absolute flex items-center justify-center w-6 h-6 text-white transition-all duration-200 rounded-full shadow-lg opacity-0 top-1 right-1 bg-black/70 hover:bg-red-500 hover:scale-110 group-hover:opacity-100"
                                  title="Remove video"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative group">
                                <Image
                                  src={media.url}
                                  alt="Preview"
                                  className={`w-full ${getImageClass(index)} object-cover rounded-lg`}
                                  width={300}
                                  height={300}
                                  style={{ width: "100%", height: "auto" }}
                                />
                                <div className="absolute inset-0 transition-all duration-200 bg-black bg-opacity-0 rounded-lg group-hover:bg-opacity-20" />
                                <div className="absolute flex space-x-1 transition-opacity duration-200 opacity-0 top-1 xs:top-2 right-1 xs:right-2 group-hover:opacity-100">
                                  <button
                                    onClick={() => openCropper(media.originalIndex)}
                                    className="flex items-center justify-center w-5 h-5 text-white transition-colors bg-blue-500 rounded-full shadow-lg xs:w-6 xs:h-6 hover:bg-blue-600"
                                    title="Crop to 16:9"
                                  >
                                    <Crop className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                                  </button>
                                  <button
                                    onClick={() => removeImage(media.originalIndex)}
                                    className="flex items-center justify-center w-5 h-5 text-white transition-colors bg-red-500 rounded-full shadow-lg xs:w-6 xs:h-6 hover:bg-red-600"
                                    title="Remove image"
                                  >
                                    <X className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Use @ to mention people, # for hashtags. Add images, videos, or GIFs.
                    Videos will play with native controls. Hover over media to see actions.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 xs:mt-4 xs:pt-4 dark:border-gray-800">
                <div className="flex items-center space-x-1 xs:space-x-1 sm:space-x-2">
                  <label className="flex items-center justify-center w-8 h-8 transition-colors rounded-full cursor-pointer xs:w-10 xs:h-10 sm:w-12 sm:h-12 hover:bg-blue-50 dark:hover:bg-blue-900/20 group">
                    <ImageIcon className="w-4 h-4 text-blue-500 transition-colors xs:w-5 xs:h-5 sm:w-6 sm:h-6 group-hover:text-blue-600" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center w-8 h-8 transition-colors rounded-full cursor-pointer xs:w-10 xs:h-10 sm:w-12 sm:h-12 hover:bg-green-50 dark:hover:bg-green-900/20 group">
                    <Video className="w-4 h-4 text-green-500 transition-colors xs:w-5 xs:h-5 sm:w-6 sm:h-6 group-hover:text-green-600" />
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center space-x-2 xs:space-x-3">
                  {isOverLimit && (
                    <div className="text-xs font-medium text-red-500">
                      {Math.abs(remainingChars)} over limit
                    </div>
                  )}

                  <Button
                    onClick={handlePost}
                    disabled={
                      (!content.trim() && selectedImages.length === 0 && selectedVideos.length === 0) ||
                      isOverLimit ||
                      isPosting
                    }
                    className="px-4 xs:px-6 py-2 xs:py-2.5 font-semibold text-white transition-all duration-200 bg-blue-500 rounded-full shadow-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transform hover:scale-105 disabled:transform-none text-sm xs:text-base"
                    size="sm"
                  >
                    {isPosting ? (
                      <div className="flex items-center space-x-1 xs:space-x-2">
                        <Loader2 className="w-3 h-3 xs:w-4 xs:h-4 animate-spin" />
                        <span className="text-xs xs:text-sm">Posting...</span>
                      </div>
                    ) : (
                      "Post"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showCropModal && (
        <ImageCropper
          imageUrl={imagePreviews[cropIndex || 0]} // Pass the image preview URL
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={16/9}
        />
      )}
    </>
  )
}
