"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useProtectedApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Flag, AlertTriangle, Shield, MessageSquare, Zap, Copyright, HelpCircle } from "lucide-react"

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportedUserId?: string
  reportedPostId?: string
  reportedCommentId?: string
  reporterUsername?: string
  reportedContent?: string
}

const REPORT_REASONS = [
  {
    value: "spam",
    label: "Spam",
    description: "Repetitive, unwanted, or promotional content",
    icon: Flag,
    color: "text-orange-500"
  },
  {
    value: "harassment",
    label: "Harassment",
    description: "Bullying, threats, or targeted abuse",
    icon: AlertTriangle,
    color: "text-red-500"
  },
  {
    value: "hate_speech",
    label: "Hate Speech",
    description: "Content that attacks or incites hatred",
    icon: Shield,
    color: "text-red-600"
  },
  {
    value: "violence",
    label: "Violence",
    description: "Content that promotes or depicts violence",
    icon: AlertTriangle,
    color: "text-red-700"
  },
  {
    value: "inappropriate_content",
    label: "Inappropriate Content",
    description: "Sexual, graphic, or disturbing content",
    icon: Shield,
    color: "text-purple-500"
  },
  {
    value: "fake_news",
    label: "Misinformation",
    description: "False or misleading information",
    icon: MessageSquare,
    color: "text-yellow-500"
  },
  {
    value: "copyright",
    label: "Copyright",
    description: "Unauthorized use of copyrighted material",
    icon: Copyright,
    color: "text-blue-500"
  },
  {
    value: "other",
    label: "Other",
    description: "Something else that violates our guidelines",
    icon: HelpCircle,
    color: "text-gray-500"
  }
]

export function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedPostId,
  reportedCommentId,
  reporterUsername,
  reportedContent
}: ReportModalProps) {
  const { callProtectedApi } = useProtectedApi()
  const [selectedReason, setSelectedReason] = useState<string>("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        title: "Error",
        description: "Please select a reason for reporting",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Determine entity type and ID
      let reportedEntityType: 'Post' | 'User' | 'Comment' = 'Post';
      let reportedEntityId = reportedPostId;
      
      if (reportedUserId) {
        reportedEntityType = 'User';
        reportedEntityId = reportedUserId;
      } else if (reportedCommentId) {
        reportedEntityType = 'Comment';
        reportedEntityId = reportedCommentId;
      }

      await callProtectedApi("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedEntityType,
          reportedEntityId,
          reason: selectedReason,
          description: description.trim() || undefined
        })
      })

      toast({
        title: "Report Submitted",
        description: "Thank you for reporting this content. Our team will review it within 24 hours.",
      })

      // Reset form and close modal
      setSelectedReason("")
      setDescription("")
      onClose()
    } catch (error: any) {
      console.error("Failed to submit report:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to submit report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedReason("")
    setDescription("")
    onClose()
  }

  const getReportTarget = () => {
    if (reportedUserId) return `user @${reporterUsername}`
    if (reportedPostId) return "this post"
    if (reportedCommentId) return "this comment"
    return "this content"
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report {getReportTarget()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report target info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are reporting {getReportTarget()} for violating our community guidelines.
            </p>
            {reportedContent && (
              <div className="mt-2 p-2 bg-white dark:bg-gray-700 rounded border">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  "{reportedContent}"
                </p>
              </div>
            )}
          </div>

          {/* Reason selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">What's the issue?</Label>
            <div className="grid gap-2">
              {REPORT_REASONS.map((reason) => {
                const Icon = reason.icon
                return (
                  <button
                    key={reason.value}
                    onClick={() => setSelectedReason(reason.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedReason === reason.value
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${reason.color}`} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {reason.label}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {reason.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Additional details */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Additional details (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context that might help our review team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description.length}/1000 characters
            </p>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Reports are reviewed by our moderation team within 24 hours. 
            False reports may result in account restrictions.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
