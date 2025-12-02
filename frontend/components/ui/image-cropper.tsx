"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from './button'
import { X, RotateCcw, Check, AlertCircle, Move, Maximize2 } from 'lucide-react'
import { calculateOptimalCropArea, cropImage, validateImageFile, type CropArea } from '@/lib/image-utils'

interface ImageCropperProps {
  imageUrl: string
  onCrop: (croppedImage: File) => void
  onCancel: () => void
  aspectRatio?: number // 16/9 = 1.777...
}

interface CropHandle {
  x: number
  y: number
  width: number
  height: number
}

export function ImageCropper({ 
  imageUrl, 
  onCrop, 
  onCancel, 
  aspectRatio = 16/9 
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [displayScale, setDisplayScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [cropMode, setCropMode] = useState<'auto' | 'manual'>('auto')

  // Load and prepare the image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setOriginalImage(img)
      setImageLoaded(true)
      setIsLoading(false)
      setError(null)
    }
    img.onerror = () => {
      setIsLoading(false)
      setError('Failed to load image')
    }
    img.src = imageUrl
  }, [imageUrl])

  // Calculate optimal crop area for 16:9 aspect ratio
  const calculateCropArea = useCallback((img: HTMLImageElement) => {
    return calculateOptimalCropArea(img.naturalWidth, img.naturalHeight, aspectRatio)
  }, [aspectRatio])

  // Convert display coordinates to original image coordinates
  const displayToOriginal = useCallback((displayX: number, displayY: number) => {
    return {
      x: displayX / displayScale,
      y: displayY / displayScale
    }
  }, [displayScale])

  // Convert original image coordinates to display coordinates
  const originalToDisplay = useCallback((originalX: number, originalY: number) => {
    return {
      x: originalX * displayScale,
      y: originalY * displayScale
    }
  }, [displayScale])

  // Handle mouse/touch events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (cropMode !== 'manual') return

    // Prevent zoom on mobile
    if ('touches' in e) {
      e.preventDefault()
    }

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const x = clientX - rect.left
    const y = clientY - rect.top

    // Check if clicking on crop area
    const displayCrop = {
      x: cropArea.x * displayScale,
      y: cropArea.y * displayScale,
      width: cropArea.width * displayScale,
      height: cropArea.height * displayScale
    }

    const isMobile = window.innerWidth <= 768
    const handleSize = isMobile ? 12 : 8
    const tolerance = isMobile ? 20 : 12 // Larger touch area on mobile

    // Check corner handles first
    const corners = [
      { x: displayCrop.x, y: displayCrop.y, handle: 'top-left' },
      { x: displayCrop.x + displayCrop.width, y: displayCrop.y, handle: 'top-right' },
      { x: displayCrop.x, y: displayCrop.y + displayCrop.height, handle: 'bottom-left' },
      { x: displayCrop.x + displayCrop.width, y: displayCrop.y + displayCrop.height, handle: 'bottom-right' }
    ]

    for (const corner of corners) {
      if (Math.abs(x - corner.x) <= tolerance && Math.abs(y - corner.y) <= tolerance) {
        setIsResizing(true)
        setResizeHandle(corner.handle)
        setDragStart({ x, y })
        return
      }
    }

    // Check edge handles (only on desktop)
    if (!isMobile) {
      const edges = [
        { x: displayCrop.x + displayCrop.width/2, y: displayCrop.y, handle: 'top' },
        { x: displayCrop.x + displayCrop.width/2, y: displayCrop.y + displayCrop.height, handle: 'bottom' },
        { x: displayCrop.x, y: displayCrop.y + displayCrop.height/2, handle: 'left' },
        { x: displayCrop.x + displayCrop.width, y: displayCrop.y + displayCrop.height/2, handle: 'right' }
      ]

      for (const edge of edges) {
        if (Math.abs(x - edge.x) <= tolerance && Math.abs(y - edge.y) <= tolerance) {
          setIsResizing(true)
          setResizeHandle(edge.handle)
          setDragStart({ x, y })
          return
        }
      }
    }

    // Check if clicking inside crop area for dragging
    if (x >= displayCrop.x && x <= displayCrop.x + displayCrop.width &&
        y >= displayCrop.y && y <= displayCrop.y + displayCrop.height) {
      setIsDragging(true)
      setDragStart({ x: x - displayCrop.x, y: y - displayCrop.y })
    }
  }, [cropMode, cropArea, displayScale])

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if ((!isDragging && !isResizing) || cropMode !== 'manual') return

    // Prevent zoom on mobile
    if ('touches' in e) {
      e.preventDefault()
    }

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const x = clientX - rect.left
    const y = clientY - rect.top

    if (isDragging) {
      const newDisplayX = x - dragStart.x
      const newDisplayY = y - dragStart.y

      // Convert back to original coordinates
      const newOriginalX = newDisplayX / displayScale
      const newOriginalY = newDisplayY / displayScale

      // Constrain to image bounds
      const maxX = (originalImage?.naturalWidth || 0) - cropArea.width
      const maxY = (originalImage?.naturalHeight || 0) - cropArea.height

      setCropArea((prev: CropArea) => ({
        ...prev,
        x: Math.max(0, Math.min(maxX, newOriginalX)),
        y: Math.max(0, Math.min(maxY, newOriginalY))
      }))
    } else if (isResizing && resizeHandle) {
      const deltaX = (x - dragStart.x) / displayScale
      const deltaY = (y - dragStart.y) / displayScale

      let newCropArea: CropArea = { ...cropArea }

      switch (resizeHandle) {
        case 'top-left':
          newCropArea = {
            x: Math.max(0, cropArea.x + deltaX),
            y: Math.max(0, cropArea.y + deltaY),
            width: Math.max(100, cropArea.width - deltaX),
            height: Math.max(100, cropArea.height - deltaY)
          }
          break
        case 'top-right':
          newCropArea = {
            x: cropArea.x,
            y: Math.max(0, cropArea.y + deltaY),
            width: Math.max(100, cropArea.width + deltaX),
            height: Math.max(100, cropArea.height - deltaY)
          }
          break
        case 'bottom-left':
          newCropArea = {
            x: Math.max(0, cropArea.x + deltaX),
            y: cropArea.y,
            width: Math.max(100, cropArea.width - deltaX),
            height: Math.max(100, cropArea.height + deltaY)
          }
          break
        case 'bottom-right':
          newCropArea = {
            x: cropArea.x,
            y: cropArea.y,
            width: Math.max(100, cropArea.width + deltaX),
            height: Math.max(100, cropArea.height + deltaY)
          }
          break
        case 'top':
          newCropArea = {
            x: cropArea.x,
            y: Math.max(0, cropArea.y + deltaY),
            width: cropArea.width,
            height: Math.max(100, cropArea.height - deltaY)
          }
          break
        case 'bottom':
          newCropArea = {
            x: cropArea.x,
            y: cropArea.y,
            width: cropArea.width,
            height: Math.max(100, cropArea.height + deltaY)
          }
          break
        case 'left':
          newCropArea = {
            x: Math.max(0, cropArea.x + deltaX),
            y: cropArea.y,
            width: Math.max(100, cropArea.width - deltaX),
            height: cropArea.height
          }
          break
        case 'right':
          newCropArea = {
            x: cropArea.x,
            y: cropArea.y,
            width: Math.max(100, cropArea.width + deltaX),
            height: cropArea.height
          }
          break
      }

      // Maintain aspect ratio for corner handles
      if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(resizeHandle)) {
        const newAspectRatio = newCropArea.width / newCropArea.height
        if (Math.abs(newAspectRatio - aspectRatio) > 0.1) {
          // Adjust to maintain aspect ratio
          const centerX = newCropArea.x + newCropArea.width / 2
          const centerY = newCropArea.y + newCropArea.height / 2
          
          if (newAspectRatio > aspectRatio) {
            // Too wide, adjust height
            newCropArea.height = newCropArea.width / aspectRatio
            newCropArea.y = centerY - newCropArea.height / 2
          } else {
            // Too tall, adjust width
            newCropArea.width = newCropArea.height * aspectRatio
            newCropArea.x = centerX - newCropArea.width / 2
          }
        }
      }

      // Constrain to image bounds
      const maxX = (originalImage?.naturalWidth || 0) - newCropArea.width
      const maxY = (originalImage?.naturalHeight || 0) - newCropArea.height

      newCropArea.x = Math.max(0, Math.min(maxX, newCropArea.x))
      newCropArea.y = Math.max(0, Math.min(maxY, newCropArea.y))

      setCropArea(newCropArea)
      setDragStart({ x, y })
    }
  }, [isDragging, isResizing, cropMode, dragStart, displayScale, cropArea, resizeHandle, aspectRatio, originalImage])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // Handle mouse hover for cursor changes (desktop only)
  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    if (cropMode !== 'manual' || window.innerWidth <= 768) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const displayCrop = {
      x: cropArea.x * displayScale,
      y: cropArea.y * displayScale,
      width: cropArea.width * displayScale,
      height: cropArea.height * displayScale
    }

    const tolerance = 12

    // Check corner handles
    const corners = [
      { x: displayCrop.x, y: displayCrop.y, cursor: 'nw-resize' },
      { x: displayCrop.x + displayCrop.width, y: displayCrop.y, cursor: 'ne-resize' },
      { x: displayCrop.x, y: displayCrop.y + displayCrop.height, cursor: 'sw-resize' },
      { x: displayCrop.x + displayCrop.width, y: displayCrop.y + displayCrop.height, cursor: 'se-resize' }
    ]

    for (const corner of corners) {
      if (Math.abs(x - corner.x) <= tolerance && Math.abs(y - corner.y) <= tolerance) {
        if (canvasRef.current) {
          canvasRef.current.style.cursor = corner.cursor
        }
        return
      }
    }

    // Check edge handles
    const edges = [
      { x: displayCrop.x + displayCrop.width/2, y: displayCrop.y, cursor: 'n-resize' },
      { x: displayCrop.x + displayCrop.width/2, y: displayCrop.y + displayCrop.height, cursor: 's-resize' },
      { x: displayCrop.x, y: displayCrop.y + displayCrop.height/2, cursor: 'w-resize' },
      { x: displayCrop.x + displayCrop.width, y: displayCrop.y + displayCrop.height/2, cursor: 'e-resize' }
    ]

    for (const edge of edges) {
      if (Math.abs(x - edge.x) <= tolerance && Math.abs(y - edge.y) <= tolerance) {
        if (canvasRef.current) {
          canvasRef.current.style.cursor = edge.cursor
        }
        return
      }
    }

    // Check if inside crop area
    if (x >= displayCrop.x && x <= displayCrop.x + displayCrop.width &&
        y >= displayCrop.y && y <= displayCrop.y + displayCrop.height) {
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'move'
      }
    } else {
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair'
      }
    }
  }, [cropMode, cropArea, displayScale])

  // Add global event listeners
  useEffect(() => {
    if (cropMode === 'manual') {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleMouseMove)
      document.addEventListener('touchend', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleMouseMove)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [cropMode, handleMouseMove, handleMouseUp])

  // Draw the image and crop overlay
  useEffect(() => {
    if (!imageLoaded || !originalImage || !canvasRef.current) return

    const drawCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Responsive canvas sizing for mobile
      const isMobile = window.innerWidth <= 768
      const maxDisplayWidth = isMobile ? window.innerWidth - 32 : 600 // Full width minus padding on mobile
      const maxDisplayHeight = isMobile ? window.innerHeight * 0.6 : 600 // Limit height on mobile to 60% of viewport
      
      // Calculate scale based on width and height constraints
      const scaleX = maxDisplayWidth / originalImage.naturalWidth
      const scaleY = maxDisplayHeight / originalImage.naturalHeight
      const scale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond original size
      
      const displayWidth = originalImage.naturalWidth * scale
      const displayHeight = originalImage.naturalHeight * scale

      setDisplayScale(scale)
      canvas.width = displayWidth
      canvas.height = displayHeight

      // Calculate initial crop area if not set
      if (cropArea.width === 0) {
        const crop = calculateCropArea(originalImage)
        setCropArea(crop)
        return // Exit early, will be redrawn on next effect
      }

      // Draw the full image
      ctx.drawImage(originalImage, 0, 0, displayWidth, displayHeight)

      // Draw crop overlay
      const cropDisplayX = cropArea.x * scale
      const cropDisplayY = cropArea.y * scale
      const cropDisplayWidth = cropArea.width * scale
      const cropDisplayHeight = cropArea.height * scale

      // Darken areas outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, displayWidth, displayHeight)

      // Clear crop area
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillRect(cropDisplayX, cropDisplayY, cropDisplayWidth, cropDisplayHeight)

      // Draw crop border
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(cropDisplayX, cropDisplayY, cropDisplayWidth, cropDisplayHeight)

      // Draw corner handles for manual mode
      if (cropMode === 'manual') {
        const handleSize = isMobile ? 12 : 8 // Larger handles on mobile
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1

        // Corner handles
        const corners = [
          { x: cropDisplayX, y: cropDisplayY }, // top-left
          { x: cropDisplayX + cropDisplayWidth, y: cropDisplayY }, // top-right
          { x: cropDisplayX, y: cropDisplayY + cropDisplayHeight }, // bottom-left
          { x: cropDisplayX + cropDisplayWidth, y: cropDisplayY + cropDisplayHeight } // bottom-right
        ]

        corners.forEach(corner => {
          ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize)
          ctx.strokeRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize)
        })

        // Edge handles (only on desktop for better mobile UX)
        if (!isMobile) {
          const edges = [
            { x: cropDisplayX + cropDisplayWidth/2, y: cropDisplayY }, // top
            { x: cropDisplayX + cropDisplayWidth/2, y: cropDisplayY + cropDisplayHeight }, // bottom
            { x: cropDisplayX, y: cropDisplayY + cropDisplayHeight/2 }, // left
            { x: cropDisplayX + cropDisplayWidth, y: cropDisplayY + cropDisplayHeight/2 } // right
          ]

          edges.forEach(edge => {
            ctx.fillRect(edge.x - handleSize/2, edge.y - handleSize/2, handleSize, handleSize)
            ctx.strokeRect(edge.x - handleSize/2, edge.y - handleSize/2, handleSize, handleSize)
          })
        }
      } else {
        // Auto mode - just corner indicators
        const cornerSize = isMobile ? 24 : 20 // Larger indicators on mobile
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3

        // Top-left corner
        ctx.beginPath()
        ctx.moveTo(cropDisplayX, cropDisplayY + cornerSize)
        ctx.lineTo(cropDisplayX, cropDisplayY)
        ctx.lineTo(cropDisplayX + cornerSize, cropDisplayY)
        ctx.stroke()

        // Top-right corner
        ctx.beginPath()
        ctx.moveTo(cropDisplayX + cropDisplayWidth - cornerSize, cropDisplayY)
        ctx.lineTo(cropDisplayX + cropDisplayWidth, cropDisplayY)
        ctx.lineTo(cropDisplayX + cropDisplayWidth, cropDisplayY + cornerSize)
        ctx.stroke()

        // Bottom-left corner
        ctx.beginPath()
        ctx.moveTo(cropDisplayX, cropDisplayY + cropDisplayHeight - cornerSize)
        ctx.lineTo(cropDisplayX, cropDisplayY + cropDisplayHeight)
        ctx.lineTo(cropDisplayX + cornerSize, cropDisplayY + cropDisplayHeight)
        ctx.stroke()

        // Bottom-right corner
        ctx.beginPath()
        ctx.moveTo(cropDisplayX + cropDisplayWidth - cornerSize, cropDisplayY + cropDisplayHeight)
        ctx.lineTo(cropDisplayX + cropDisplayWidth, cropDisplayY + cropDisplayHeight)
        ctx.lineTo(cropDisplayX + cropDisplayWidth, cropDisplayY + cropDisplayHeight - cornerSize)
        ctx.stroke()
      }
    }

    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(drawCanvas)

  }, [imageLoaded, originalImage, calculateCropArea, cropArea, cropMode])

  const handleCrop = async () => {
    if (!originalImage) return

    setIsProcessing(true)
    try {
      const croppedImage = await cropImage(originalImage, cropArea, 0.9)
      onCrop(croppedImage)
    } catch (error) {
      console.error('Error cropping image:', error)
      setError('Failed to crop image. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetToAutoCrop = () => {
    if (originalImage) {
      const autoCrop = calculateCropArea(originalImage)
      setCropArea(autoCrop)
      setCropMode('auto')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg dark:bg-gray-800">
          <div className="w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Processing image...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg dark:bg-gray-800 max-w-md">
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Error</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{error}</p>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className={`relative ${window.innerWidth <= 768 ? 'w-full h-full flex flex-col' : 'max-w-4xl max-h-[90vh]'} p-2 sm:p-4 md:p-6 bg-white rounded-lg dark:bg-gray-800 overflow-hidden`}>
        {/* Header - Always visible */}
        <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Crop Image to 16:9
          </h3>
          <button
            onClick={onCancel}
            className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Mode Toggle - Always visible */}
        <div className="flex items-center justify-center mb-2 sm:mb-4 space-x-2 sm:space-x-4 flex-shrink-0">
          <Button
            variant={cropMode === 'auto' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCropMode('auto')}
            className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Auto</span>
          </Button>
          <Button
            variant={cropMode === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCropMode('manual')}
            className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Move className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Manual</span>
          </Button>
        </div>

        {/* Scrollable Content Area */}
        <div className={`${window.innerWidth <= 768 ? 'flex-1 overflow-y-auto' : ''} mb-2 sm:mb-4`}>
          {/* Image Preview */}
          <div className="flex justify-center mb-2 sm:mb-4">
            <div 
              ref={containerRef}
              className="relative"
              style={{ cursor: cropMode === 'manual' && window.innerWidth > 768 ? 'crosshair' : 'default' }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
                style={{ touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onMouseMove={handleMouseOver}
              />
              {cropMode === 'manual' && (
                <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {window.innerWidth <= 768 ? 'Drag to move • Pinch corners to resize' : 'Drag to move • Drag corners to resize'}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="mb-2 sm:mb-4 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
              {cropMode === 'auto' 
                ? "The image will be automatically cropped to 16:9 aspect ratio. The crop area is optimized to show the most important part of your image."
                : window.innerWidth <= 768 
                  ? "Drag the crop area to adjust position. Pinch corner handles to resize while maintaining 16:9 aspect ratio."
                  : "Drag the crop area to adjust the position. Drag the corner handles to resize while maintaining 16:9 aspect ratio."
              }
            </p>
            {originalImage && (
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Original: {originalImage.naturalWidth} × {originalImage.naturalHeight} → 
                Cropped: {cropArea.width} × {cropArea.height}
              </p>
            )}
          </div>
        </div>

        {/* Actions - Sticky on mobile, always visible */}
        <div className="flex justify-between items-center flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pt-2 sm:pt-3">
          <div className="flex space-x-2">
            {cropMode === 'manual' && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToAutoCrop}
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Reset to Auto</span>
                <span className="sm:hidden">Reset</span>
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2 sm:space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCrop}
              disabled={isProcessing}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 text-sm"
            >
              {isProcessing ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white rounded-full border-t-transparent animate-spin mr-1.5 sm:mr-2"></div>
                  <span className="hidden sm:inline">Processing...</span>
                  <span className="sm:hidden">Processing</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Apply Crop</span>
                  <span className="sm:hidden">Apply</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 