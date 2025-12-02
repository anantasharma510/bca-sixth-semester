'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from './ui/alert-dialog';
import { 
  Play, 
  Square, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  Settings, 
  Users, 
  Eye,
  Calendar,
  Clock,
  Radio
} from 'lucide-react';
import { useLiveStreamApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface StreamManagementControlsProps {
  stream: any;
  isHost: boolean;
  onStreamUpdated?: (updatedStream: any) => void;
  onStreamDeleted?: () => void;
}

const StreamManagementControls: React.FC<StreamManagementControlsProps> = ({ 
  stream, 
  isHost, 
  onStreamUpdated, 
  onStreamDeleted 
}) => {
  const router = useRouter();
  const { endLiveStream, updateLiveStream, deleteLiveStream } = useLiveStreamApi();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEndingStream, setIsEndingStream] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit form state
  const [editTitle, setEditTitle] = useState(stream?.title || '');
  const [editDescription, setEditDescription] = useState(stream?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleGoLive = () => {
    // Navigate to the live stream page
    router.push(`/live/${stream._id}`);
  };

  const handleEndStream = async () => {
    try {
      setIsEndingStream(true);
      await endLiveStream(stream._id);
      
      toast({
        title: "Stream ended",
        description: "Your live stream has been ended successfully",
      });
      
      // Update the stream status locally
      if (onStreamUpdated) {
        onStreamUpdated({ ...stream, status: 'ended', endedAt: new Date() });
      }
      
      // Redirect to streams page
      router.push('/live');
    } catch (error: any) {
      console.error('Error ending stream:', error);
      toast({
        title: "Failed to end stream",
        description: error.message || "Could not end the live stream",
        variant: "destructive"
      });
    } finally {
      setIsEndingStream(false);
    }
  };

  const handleEditStream = async () => {
    if (!editTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your stream",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Call API to update stream
      const response = await updateLiveStream(stream._id, {
        title: editTitle.trim(),
        description: editDescription.trim()
      });

      const { liveStream } = response;
      
      toast({
        title: "Stream updated",
        description: "Your stream details have been updated successfully",
      });
      
      if (onStreamUpdated) {
        onStreamUpdated(liveStream);
      }
      
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating stream:', error);
      toast({
        title: "Failed to update stream",
        description: error.message || "Could not update the stream",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStream = async () => {
    try {
      setIsDeleting(true);
      
      // Call API to delete stream
      await deleteLiveStream(stream._id);
      
      toast({
        title: "Stream deleted",
        description: "Your stream has been deleted successfully",
      });
      
      if (onStreamDeleted) {
        onStreamDeleted();
      }
      
      setIsDeleteDialogOpen(false);
      router.push('/live');
    } catch (error: any) {
      console.error('Error deleting stream:', error);
      toast({
        title: "Failed to delete stream",
        description: error.message || "Could not delete the stream",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = () => {
    switch (stream?.status) {
      case 'live': return 'bg-red-500 animate-pulse';
      case 'scheduled': return 'bg-blue-500';
      case 'ended': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (stream?.status) {
      case 'live': return 'LIVE';
      case 'scheduled': return 'SCHEDULED';
      case 'ended': return 'ENDED';
      default: return 'UNKNOWN';
    }
  };

  if (!stream) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{stream.title}</CardTitle>
            <Badge className={`text-white ${getStatusColor()}`}>
              {getStatusText()}
            </Badge>
          </div>
          
          {isHost && (
            <div className="flex items-center gap-2">
              {/* Go Live / End Stream Button */}
              {stream.status === 'scheduled' && (
                <Button onClick={handleGoLive} className="bg-red-600 hover:bg-red-700">
                  <Radio className="w-4 h-4 mr-2" />
                  Go Live
                </Button>
              )}
              
              {stream.status === 'live' && (
                <Button 
                  onClick={handleEndStream} 
                  variant="destructive"
                  disabled={isEndingStream}
                >
                  <Square className="w-4 h-4 mr-2" />
                  {isEndingStream ? 'Ending...' : 'End Stream'}
                </Button>
              )}

              {/* More Options Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => router.push(`/live/${stream._id}`)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Stream
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Stream
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Stream Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span>{stream.viewerCount || 0} viewers</span>
            </div>
            
            {stream.scheduledAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{new Date(stream.scheduledAt).toLocaleDateString()}</span>
              </div>
            )}
            
            {stream.startedAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>Started {new Date(stream.startedAt).toLocaleTimeString()}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span>{stream.isPrivate ? 'Private' : 'Public'}</span>
            </div>
          </div>
          
          {/* Description */}
          {stream.description && (
            <div>
              <p className="text-gray-600 text-sm line-clamp-2">{stream.description}</p>
            </div>
          )}
          
          {/* Tags */}
          {stream.tags && stream.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {stream.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Stream Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stream Details</DialogTitle>
            <DialogDescription>
              Update your stream title and description
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter stream title"
                maxLength={200}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter stream description"
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditStream} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stream</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{stream.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStream} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Stream'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default StreamManagementControls;
