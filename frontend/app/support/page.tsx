"use client";

import { useState } from "react";
import { pacifico } from "@/lib/fonts";
import { useProtectedApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function SupportPage() {
  const { isSignedIn } = useAuth();
  const { callProtectedApi } = useProtectedApi();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "other" as "bug" | "feature" | "account" | "other",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // Create support ticket via API
      const ticketData = {
        subject: formData.subject,
        message: `${formData.message}\n\n---\nContact Info:\nName: ${formData.name}\nEmail: ${formData.email}`,
        category: formData.category,
        priority: "medium"
      };

      await callProtectedApi("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticketData),
      });
      
      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        category: "other",
      });
    } catch (error) {
      console.error("Failed to submit support ticket:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2">
              <Image
                src="/new-logo.png"
                alt="AIRWIG Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <h1 className={`${pacifico.className} text-2xl text-neutral-900 dark:text-white`}>
                AIRWIG
              </h1>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Contact Support
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            We're here to help! Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>

        {/* Login Required Notice */}
        {!isSignedIn && (
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100 mb-2">
                Sign in to submit a support ticket
              </h3>
              <p className="text-primary-700 dark:text-primary-300 mb-4">
                You need to be signed in to create a support ticket so we can track your request.
              </p>
              <Link href="/sign-in">
                <Button className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Email</h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">support@airwig.ca</p>
          </div>

          <div className="bg-success-50 dark:bg-success-900/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-success-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Response Time</h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">We typically respond within 24 hours</p>
          </div>
        </div>

        {/* Support Form */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                id="name"
                required
                disabled={!isSignedIn}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                required
                disabled={!isSignedIn}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="john@example.com"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Category *
              </label>
              <select
                id="category"
                required
                disabled={!isSignedIn}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="bug">🐛 Bug Report</option>
                <option value="feature">✨ Feature Request</option>
                <option value="account">👤 Account Issue</option>
                <option value="other">💬 Other</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                required
                disabled={!isSignedIn}
                maxLength={200}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Brief description of your issue"
              />
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {formData.subject.length}/200 characters
              </p>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Message *
              </label>
              <textarea
                id="message"
                required
                disabled={!isSignedIn}
                maxLength={5000}
                rows={8}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Please provide as much detail as possible..."
              />
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {formData.message.length}/5000 characters
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isSignedIn}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Message
                </>
              )}
            </button>

            {/* Status Messages */}
            {submitStatus === "success" && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200 text-center">
                  ✅ Message sent successfully! We'll get back to you soon.
                </p>
              </div>
            )}

            {submitStatus === "error" && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 text-center">
                  ❌ Failed to send message. Please try again or email us directly.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <details className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
              <summary className="font-semibold text-neutral-900 dark:text-white cursor-pointer">
                How do I delete my account?
              </summary>
              <p className="mt-3 text-neutral-600 dark:text-neutral-400">
                You can delete your account from the Settings page in the app. Go to Settings → Account → Delete Account.
              </p>
            </details>

            {/* <details className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
              <summary className="font-semibold text-neutral-900 dark:text-white cursor-pointer">
                How do I report inappropriate content?
              </summary>
              <p className="mt-3 text-neutral-600 dark:text-neutral-400">
                Tap the three dots on any post and select "Report". We review all reports within 24 hours.
              </p>
            </details> */}

            <details className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
              <summary className="font-semibold text-neutral-900 dark:text-white cursor-pointer">
                How do I block a user?
              </summary>
              <p className="mt-3 text-neutral-600 dark:text-neutral-400">
                Go to the user's profile, tap the three dots, and select "Block User". You can manage blocked users in Settings.
              </p>
            </details>

            <details className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
              <summary className="font-semibold text-neutral-900 dark:text-white cursor-pointer">
                What is your privacy policy?
              </summary>
              <p className="mt-3 text-neutral-600 dark:text-neutral-400">
                You can view our full privacy policy at{" "}
                <a href="https://airwig.ca/privacy-policy" className="text-blue-500 hover:underline">
                  airwig.ca/privacy-policy
                </a>
              </p>
            </details>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-neutral-600 dark:text-neutral-400">
            <p>&copy; 2025 AIRWIG. All rights reserved.</p>
            <div className="mt-4 flex justify-center gap-6">
              <a href="https://airwig.ca/privacy-policy" className="hover:text-blue-500">
                Privacy Policy
              </a>
              <a href="https://airwig.ca/terms" className="hover:text-blue-500">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

