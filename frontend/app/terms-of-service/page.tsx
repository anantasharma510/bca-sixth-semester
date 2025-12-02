import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - AIRWIG',
  description: 'AIRWIG Terms of Service and User Agreement',
  robots: 'index, follow',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AIRWIG Terms of Service
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Last updated: October 13, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              By accessing and using AIRWIG ("the App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. User-Generated Content Policy
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              <strong className="text-red-600 dark:text-red-400">AIRWIG has ZERO TOLERANCE for objectionable content or abusive users.</strong> By using this app, you agree to the following content policies:
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              2.1 Prohibited Content
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              You may not post, share, or distribute content that:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-6">
              <li>Contains hate speech, harassment, or bullying</li>
              <li>Promotes violence, illegal activities, or harmful behavior</li>
              <li>Contains explicit sexual content or nudity</li>
              <li>Violates copyright or intellectual property rights</li>
              <li>Constitutes spam, fake accounts, or impersonation</li>
              <li>Contains personal information of others without consent</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              2.2 User Behavior
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-6">
              <li>Be respectful to other users</li>
              <li>Report inappropriate content when you encounter it</li>
              <li>Not abuse the platform or its features</li>
              <li>Not engage in harassment or cyberbullying</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Content Moderation
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              AIRWIG actively moderates content and user behavior. We reserve the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-6">
              <li>Remove any content that violates these terms</li>
              <li>Suspend or permanently ban users who violate these terms</li>
              <li><strong className="text-blue-600 dark:text-blue-400">Respond to reports within 24 hours</strong></li>
              <li>Use automated and manual content filtering</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Reporting and Blocking
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Users can report inappropriate content or block abusive users. All reports are reviewed within 24 hours, and appropriate action is taken including content removal and user suspension when necessary.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Privacy and Data Collection
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              We collect only the data necessary to provide our service. We do not collect interaction data for advertising purposes without your explicit consent. You can delete your account and data at any time through the app settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Account Termination
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              We reserve the right to terminate accounts that violate these terms. Users may also delete their own accounts through the app settings. Account deletion is permanent and removes all associated data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Changes to Terms
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Contact Information
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              For questions about these terms or to report violations, contact us through the app's support system or visit{' '}
              <a 
                href="/support" 
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                https://airwig.ca/support
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © 2025 AIRWIG. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a 
                href="/privacy-policy" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Privacy Policy
              </a>
              <a 
                href="/support" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
