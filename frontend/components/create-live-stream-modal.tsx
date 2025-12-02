"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Camera, X, Plus, Users, Calendar, Upload } from "lucide-react";
import { useLiveStreamApi } from "@/lib/api";
import { useSmartToast } from "@/hooks/use-toast";

interface CreateLiveStreamModalProps {
  trigger?: React.ReactNode;
  onStreamCreated?: (stream: any) => void;
}

interface FormData {
  title: string;
  description: string;
  category: string;
  isPrivate?: boolean;
  maxViewers?: number;
  scheduledAt?: string;
}

export function CreateLiveStreamModal({ trigger, onStreamCreated }: CreateLiveStreamModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [allowedViewers, setAllowedViewers] = useState<string[]>([]);
  const [newViewer, setNewViewer] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createLiveStream } = useLiveStreamApi();
  const { toast } = useSmartToast();

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    defaultValues: {
      maxViewers: 1000,
      isPrivate: false
    }
  });

  const isPrivate = watch("isPrivate");

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖼️ File input triggered:', e.target.files);
    const file = e.target.files?.[0];
    if (file) {
      console.log('✅ File selected:', file.name, file.size, 'bytes');
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Thumbnail must be less than 5MB",
          variant: "destructive"
        });
        return;
      }

      setThumbnail(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      console.log('❌ No file selected');
    }
  };

  const triggerFileInput = () => {
    console.log('🎯 triggerFileInput called');
    console.log('📁 File input ref:', fileInputRef.current);
    if (fileInputRef.current) {
      console.log('✅ About to trigger click...');
      try {
        fileInputRef.current.click();
        console.log('✅ Click triggered successfully');
      } catch (error) {
        console.error('❌ Error triggering click:', error);
      }
    } else {
      console.log('❌ File input ref is null!');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addViewer = () => {
    if (newViewer.trim() && !allowedViewers.includes(newViewer.trim())) {
      setAllowedViewers([...allowedViewers, newViewer.trim()]);
      setNewViewer("");
    }
  };

  const removeViewer = (viewerToRemove: string) => {
    setAllowedViewers(allowedViewers.filter(viewer => viewer !== viewerToRemove));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      const streamData = {
        title: data.title,
        description: data.description,
        category: data.category,
        isPrivate: false, // Default to public stream
        maxViewers: 1000, // Default maximum viewers
        scheduledAt: undefined, // Always start immediately
        tags: tags.length > 0 ? tags : undefined,
        allowedViewers: undefined, // No restricted viewers
        thumbnail: thumbnail || undefined,
      };

      const response = await createLiveStream(streamData);

      toast({
        title: "Stream created!",
        description: "Your stream is now live!",
      });

      onStreamCreated?.(response.liveStream);
      setIsOpen(false);
      reset();
      setThumbnail(null);
      setThumbnailPreview("");
      setTags([]);
      setAllowedViewers([]);

    } catch (error: any) {
      console.error('Error creating stream:', error);
      toast({
        title: "Failed to create stream",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Camera className="w-4 h-4 mr-2" />
            Go Live
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Live Stream</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Stream Title *</Label>
            <Input
              id="title"
              {...register("title", { 
                required: "Title is required",
                maxLength: { value: 200, message: "Title cannot exceed 200 characters" }
              })}
              placeholder="Enter your stream title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description", {
                maxLength: { value: 1000, message: "Description cannot exceed 1000 characters" }
              })}
              placeholder="Describe what your stream is about"
              rows={3}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              {...register("category")}
              placeholder="e.g., Gaming, Music, Talk Show"
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (up to 5)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                disabled={tags.length >= 5}
              />
              <Button 
                type="button" 
                onClick={addTag}
                disabled={!newTag.trim() || tags.length >= 5}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    #{tag} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Settings - COMMENTED OUT 
          <div className="flex items-center justify-between">
            <div>
              <Label>Private Stream</Label>
              <p className="text-sm text-gray-600">Only allowed viewers can join</p>
            </div>
            <Switch
              {...register("isPrivate")}
              checked={isPrivate}
            />
          </div>

          Allowed Viewers (if private)
          {isPrivate && (
            <div>
              <Label>Allowed Viewers</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newViewer}
                  onChange={(e) => setNewViewer(e.target.value)}
                  placeholder="Username"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addViewer())}
                />
                <Button 
                  type="button" 
                  onClick={addViewer}
                  disabled={!newViewer.trim()}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {allowedViewers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {allowedViewers.map((viewer, index) => (
                    <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeViewer(viewer)}>
                      <Users className="w-3 h-3 mr-1" />
                      {viewer} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )} 
          */}

          {/* Max Viewers - COMMENTED OUT (Default: 1000) 
          <div>
            <Label htmlFor="maxViewers">Maximum Viewers</Label>
            <Input
              id="maxViewers"
              type="number"
              {...register("maxViewers", { 
                min: { value: 1, message: "Must be at least 1" },
                max: { value: 10000, message: "Cannot exceed 10,000" }
              })}
              min="1"
              max="10000"
            />
            {errors.maxViewers && (
              <p className="mt-1 text-sm text-red-500">{errors.maxViewers.message}</p>
            )}
          </div>
          */}

          {/* Thumbnail Upload */}
          <div>
            <Label htmlFor="thumbnail">Thumbnail</Label>
            <div className="space-y-3">
              {thumbnailPreview ? (
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="object-cover w-full h-32 border rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setThumbnail(null);
                      setThumbnailPreview("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="p-6 text-center transition-colors border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400"
                  onClick={triggerFileInput}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-600">Upload a thumbnail for your stream</p>
                  <p className="text-xs text-gray-500">Click here or use the button below</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerFileInput}
                  className="w-full"
                >
                  Choose Image
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Recommended: 1920x1080px, JPG or PNG, max 5MB
              </p>
            </div>
          </div>

          {/* Schedule - COMMENTED OUT 
          <div>
            <Label htmlFor="scheduledAt">Schedule for Later (Optional)</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              {...register("scheduledAt")}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="mt-1 text-xs text-gray-600">
              Leave empty to start streaming immediately
            </p>
          </div>
          */}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                "Creating..."
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Go Live Now
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
