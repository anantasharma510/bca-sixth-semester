"use client"

import { useState, useEffect } from "react"
import { X, ImageIcon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { usePostApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface EditPostModalProps {
  post: {
    _id: string
    content: string
    media?: Array<{
      type: 'image' | 'video'
      url: string
      thumbnailUrl?: string
    }>
  }
  isOpen: boolean
  onClose: () => void
  onPostUpdated: () => void
}

export function EditPostModal({ post, isOpen, onClose, onPostUpdated }: EditPostModalProps) {
  const [content, setContent] = useState(post.content)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [removedImageIndices, setRemovedImageIndices] = useState<number[]>([])
  const { updatePost } = usePostApi()

  useEffect(() => {
    if (isOpen) {
      setContent(post.content)
      setSelectedImages([])
      setImagePreviews([])
      setRemovedImageIndices([])
    }
  }, [isOpen, post.content])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    const currentImageCount = (post.media?.length || 0) - removedImageIndices.length + selectedImages.length
    if (currentImageCount + files.length > 4) {
      toast({
        title: "Error",
        description: "You can only upload up to 4 images total",
        variant: "destructive"
      })
      return
    }

    const newImages = [...selectedImages, ...files]
    setSelectedImages(newImages)

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setImagePreviews(prev => [...prev, ...newPreviews])
  }

  const removeExistingImage = (originalIndex: number) => {
    console.log('Frontend: Removing image at original index:', originalIndex);
    console.log('Frontend: Current removedImageIndices before:', removedImageIndices);
    setRemovedImageIndices(prev => {
      const newIndices = [...prev, originalIndex];
      console.log('Frontend: New removedImageIndices:', newIndices);
      return newIndices;
    });
  }

  const removeNewImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index)
      return newPreviews
    })
  }

  const handleUpdate = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Post content cannot be empty",
        variant: "destructive"
      })
      return
    }

    if (content.length > 1500) {
      toast({
        title: "Error",
        description: "Post content cannot exceed 1500 characters",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('content', content.trim())
      
      console.log('Frontend: removedImageIndices:', removedImageIndices);
      
      if (removedImageIndices.length > 0) {
        const removeImagesJson = JSON.stringify(removedImageIndices);
        console.log('Frontend: Sending removeImages:', removeImagesJson);
        formData.append('removeImages', removeImagesJson)
      }
      
      if (selectedImages.length > 0) {
        selectedImages.forEach((image) => {
          formData.append('images', image)
        })
      }

      console.log('Frontend: FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log('Frontend:', key, '=', value);
      }

      await updatePost(post._id, formData)

      toast({
        title: "Success",
        description: "Post updated successfully!"
      })

      onPostUpdated()
      onClose()
    } catch (error) {
      console.error('Frontend: Error updating post:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const characterLimit = 1500
  const remainingChars = characterLimit - content.length
  const isOverLimit = remainingChars < 0

  if (!isOpen) return null

  // Get current images (existing - removed + new)
  const currentImages = post.media?.filter((_, index) => !removedImageIndices.includes(index)) || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Post</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            className="min-h-[120px] resize-none text-lg border-gray-200 dark:border-gray-700 focus:ring-blue-500 break-words"
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
            maxLength={1500}
          />

          {/* Existing Images */}
          {currentImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {currentImages.map((media, displayIndex) => {
                // Get the original index by finding this media item in the original post.media array
                const originalIndex = post.media?.findIndex(item => item.url === media.url) ?? 0;
                console.log('Frontend: Display index:', displayIndex, 'Media URL:', media.url, 'Original index:', originalIndex);
                
                return (
                  <div key={`existing-${originalIndex}`} className="relative">
                    <img
                      src={media.url}
                      alt="Post media"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeExistingImage(originalIndex)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-60 text-white rounded-full flex items-center justify-center hover:bg-opacity-80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* New Images */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={`new-${index}`} className="relative">
                  <img
                    src={preview}
                    alt="New image"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeNewImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-60 text-white rounded-full flex items-center justify-center hover:bg-opacity-80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-500">
              <label className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
                <Plus className="w-5 h-5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div
                  className={`text-sm ${isOverLimit ? "text-red-500" : remainingChars <= 20 ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {remainingChars}
                </div>
                <div className="w-6 h-6">
                  <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${2 * Math.PI * 10 * (1 - Math.min(content.length / characterLimit, 1))}`}
                      className={
                        isOverLimit ? "text-red-500" : remainingChars <= 20 ? "text-yellow-500" : "text-blue-500"
                      }
                    />
                  </svg>
                </div>
              </div>

              <Button
                onClick={handleUpdate}
                disabled={!content.trim() || isOverLimit || isUpdating}
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}