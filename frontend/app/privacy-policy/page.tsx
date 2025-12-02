import React from "react";

// app/privacy-policy/page.tsx
export default function PrivacyPolicy() {
    return (
      <main className="max-w-3xl px-6 py-12 mx-auto leading-relaxed text-gray-800 dark:text-gray-200">
        <h1 className="pb-3 text-3xl font-bold text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 dark:border-blue-400">
          Privacy Policy for AIRWIG
        </h1>
  
        <div className="p-4 my-6 border-l-4 border-blue-600 dark:border-blue-400 rounded bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Last updated:</strong> January 22, 2025
          </p>
        </div>
  
        <section className="space-y-4">
          <h2 className="mt-8 text-xl font-semibold text-gray-700 dark:text-gray-300">
            1. Information We Collect
          </h2>
          <p className="text-gray-600 dark:text-gray-400">We collect information you provide directly to us, such as:</p>
          <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
            <li>Account information (username, email address, profile information)</li>
            <li>Content you create (posts, comments, messages, photos, videos)</li>
            <li>Communications with other users</li>
            <li>Device information and usage data</li>
            <li>Location data (if you choose to share it)</li>
          </ul>
        </section>
  
        <section className="space-y-4">
          <h2 className="mt-8 text-xl font-semibold text-gray-700 dark:text-gray-300">
            2. How We Use Your Information
          </h2>
          <p className="text-gray-600 dark:text-gray-400">We use the information we collect to:</p>
          <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
            <li>Provide, maintain, and improve our services</li>
            <li>Enable social features like following, messaging, and content sharing</li>
            <li>Send you notifications and updates about our service</li>
            <li>Ensure the safety and security of our platform</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>
  
        <section className="space-y-4">
          <h2 className="mt-8 text-xl font-semibold text-gray-700 dark:text-gray-300">
            3. Information Sharing
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We do not sell, trade, or otherwise transfer your personal information to
            third parties without your consent, except:
          </p>
          <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
            <li>When required by law or to protect our rights</li>
            <li>With service providers who assist us in operating our platform</li>
            <li>When you choose to make your content public</li>
          </ul>
        </section>
  
        <section className="space-y-4">
          <h2 className="mt-8 text-xl font-semibold text-gray-700 dark:text-gray-300">4. Data Security</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We implement appropriate security measures to protect your personal
            information against unauthorized access, alteration, disclosure, or
            destruction.
          </p>
        </section>
  
        <section className="space-y-4">
          <h2 className="mt-8 text-xl font-semibold text-gray-700 dark:text-gray-300">5. Your Rights</h2>
          <p className="text-gray-600 dark:text-gray-400">You have the right to:</p>
          <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
            <li>Access, update, or delete your personal information</li>
            <li>Control your privacy settings</li>
            <li>Opt out of certain communications</li>
            <li>Request a copy of your data</li>
          </ul>
        </section>
  
        <section className="space-y-4">
          <h2 className="mt-8 text-xl font-semibold text-gray-700 dark:text-gray-300">
            6. Children&apos;s Privacy
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Our service is not intended for children under 13. We do not knowingly
            collect personal information from children under 13.
          </p>
        </section>
  
        <section className="space-y-4">
          <h2 className="mt-8 text-xl font-semibold text-gray-700 dark:text-gray-300">
            7. Changes to This Policy
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We may update this privacy policy from time to time. We will notify you
            of any changes by posting the new policy on this page.
          </p>
        </section>
  
        <section className="p-6 mt-10 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">8. Contact Us</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            If you have any questions about this Privacy Policy, please contact us
            at:
          </p>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            <strong>Email:</strong> support@airwig.ca <br />
            <strong>Website:</strong>{" "}
            <a
              href="https://airwig.ca"
              target="_blank"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              https://airwig.ca
            </a>
          </p>
        </section>
      </main>
    );
  }
  