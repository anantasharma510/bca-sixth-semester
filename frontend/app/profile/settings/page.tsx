"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Camera, X, Save, Upload, Shield, User, Globe, MapPin, FileText, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sidebar } from "@/components/sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Header } from "@/components/header"
import { useProtectedApi } from "@/lib/api"
import { useBlockApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { usePostApi } from "@/lib/api"
import { BlockedUsersList } from "@/components/blocked-users-list"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProfileFormData {
  bio: string
  website: string
  location: string
  profileImageUrl: string
  coverImageUrl: string
}

export default function ProfileSettingsPage() {
  const [formData, setFormData] = useState<ProfileFormData>({
    bio: "",
    website: "",
    location: "",
    profileImageUrl: "",
    coverImageUrl: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [showBlockedUsers, setShowBlockedUsers] = useState(false)
  const [blockCounts, setBlockCounts] = useState({ blockedUsers: 0, blockedBy: 0 })
  const { callProtectedApi } = useProtectedApi()
  const { updateProfile, uploadProfileImage } = usePostApi()
  const { getBlockCounts } = useBlockApi()

  // Fetch current user data
  const fetchUserData = async () => {
    try {
      setLoading(true)
      const response = await callProtectedApi("/api/protected")
      const user = response.user

      setFormData({
        bio: user.bio || "",
        website: user.website || "",
        location: user.location || "",
        profileImageUrl: user.profileImageUrl || "",
        coverImageUrl: user.coverImageUrl || "",
      })

      // Fetch block counts
      try {
        const blockCountsResponse = await getBlockCounts()
        setBlockCounts({
          blockedUsers: blockCountsResponse.blockedUsersCount,
          blockedBy: blockCountsResponse.blockedByCount,
        })
      } catch (error) {
        console.error("Error fetching block counts:", error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const uploadImage = async (file: File, type: "profile" | "cover") => {
    try {
      const response = await uploadProfileImage(file, type)

      if (type === "profile") {
        setFormData((prev) => ({ ...prev, profileImageUrl: response.imageUrl }))
      } else {
        setFormData((prev) => ({ ...prev, coverImageUrl: response.imageUrl }))
      }

      toast({
        title: "Success",
        description: `${type === "profile" ? "Profile" : "Cover"} image uploaded successfully!`,
      })

      return response.imageUrl
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to upload ${type} image`,
        variant: "destructive",
      })
      throw error
    }
  }

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setUploadingProfile(true)
    try {
      await uploadImage(file, "profile")
    } finally {
      setUploadingProfile(false)
    }
  }

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      toast({
        title: "Error",
        description: "Image size must be less than 10MB",
        variant: "destructive",
      })
      return
    }

    setUploadingCover(true)
    try {
      await uploadImage(file, "cover")
    } finally {
      setUploadingCover(false)
    }
  }

  const removeCoverImage = () => {
    setFormData((prev) => ({ ...prev, coverImageUrl: "" }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(formData)

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <MobileNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header Section */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <Link href="/profile">
                      <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </Link>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customize your profile and privacy settings
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Link href="/profile">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Cover Photo Section */}
              <Card className="overflow-hidden border-0 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Camera className="w-5 h-5 text-blue-600" />
                    <span>Cover Photo</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose a cover photo that represents you. Recommended size: 1500x500px
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative h-40 sm:h-48 lg:h-56 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 overflow-hidden">
                    {formData.coverImageUrl && (
                      <img
                        src={formData.coverImageUrl || "/placeholder.svg"}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Upload Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                      <div className="flex items-center space-x-3">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverImageUpload}
                            className="hidden"
                            disabled={uploadingCover}
                          />
                          <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-sm text-gray-900 px-4 py-2.5 rounded-lg shadow-lg hover:bg-white transition-all">
                            {uploadingCover ? (
                              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            <span className="font-medium text-sm">
                              {uploadingCover ? "Uploading..." : "Change Cover"}
                            </span>
                          </div>
                        </label>

                        {formData.coverImageUrl && (
                          <button
                            onClick={removeCoverImage}
                            className="flex items-center space-x-2 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-lg shadow-lg hover:bg-red-500 transition-all"
                          >
                            <X className="w-4 h-4" />
                            <span className="font-medium text-sm">Remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* File size info */}
                    <div className="absolute bottom-3 left-3">
                      <Badge variant="secondary" className="bg-black/50 text-white border-0 text-xs">
                        Max 10MB
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Information */}
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <User className="w-5 h-5 text-blue-600" />
                    <span>Profile Information</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tell people about yourself and what you're interested in
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bio Field */}
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span>Bio</span>
                    </label>
                    <div className="space-y-2">
                      <Textarea
                        value={formData.bio}
                        onChange={(e) => handleInputChange("bio", e.target.value)}
                        placeholder="Write a short bio about yourself..."
                        rows={4}
                        maxLength={160}
                        className="resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-400 bg-gray-50 dark:bg-gray-700/50"
                      />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Share what makes you unique</span>
                        <span
                          className={`font-medium ${formData.bio.length > 140 ? "text-orange-500" : "text-gray-500"}`}
                        >
                          {formData.bio.length}/160
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Website Field */}
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <span>Website</span>
                    </label>
                    <div className="space-y-2">
                      <Input
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        placeholder="https://yourwebsite.com"
                        type="url"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-400 bg-gray-50 dark:bg-gray-700/50"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Add a link to your personal website, portfolio, or blog
                      </p>
                    </div>
                  </div>

                  {/* Location Field */}
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>Location</span>
                    </label>
                    <div className="space-y-2">
                      <Input
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        placeholder="City, Country"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-400 bg-gray-50 dark:bg-gray-700/50"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Let people know where you're based</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Privacy & Security */}
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span>Privacy & Security</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage your privacy settings and blocked users
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Change Password Section */}
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-gray-900 dark:text-white">Change Password</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        We now use the secure OTP flow for password changes. You can start the process from the sign-in page.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Use “Forgot password” on the sign-in screen to receive a verification code and set a new password.
                      </div>
                      <Link href="/sign-in" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full sm:w-auto">
                          Go to Sign In
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Blocked Users Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="space-y-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">Blocked Users</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage users you have blocked. They won't be able to see your posts or interact with you.
                      </p>
                      {blockCounts.blockedUsers > 0 && (
                        <Badge variant="secondary" className="mt-2">
                          {blockCounts.blockedUsers} blocked user{blockCounts.blockedUsers !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => setShowBlockedUsers(true)}
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 shrink-0"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Manage Blocked Users
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Save Section - Mobile Sticky */}
              <div className="sticky bottom-0 sm:static bg-white dark:bg-gray-800 border-t sm:border-t-0 border-gray-200 dark:border-gray-700 p-4 sm:p-0 -mx-4 sm:mx-0">
                <Card className="border-0 shadow-sm bg-gray-50 dark:bg-gray-700/50 sm:bg-white sm:dark:bg-gray-800">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">Ready to save your changes?</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your profile will be updated immediately after saving
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Link href="/profile" className="flex-1 sm:flex-none">
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </Button>
                        </Link>
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-sm min-w-[120px]"
                        >
                          {saving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blocked Users Modal */}
      <Dialog open={showBlockedUsers} onOpenChange={setShowBlockedUsers}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Blocked Users</span>
            </DialogTitle>
          </DialogHeader>
          <BlockedUsersList onClose={() => setShowBlockedUsers(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
