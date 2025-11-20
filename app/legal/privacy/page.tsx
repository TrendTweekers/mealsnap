export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-invert">
          <p className="text-gray-400 mb-6">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              1. Information We Collect
            </h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Photos:</strong> Processed immediately for ingredient detection, not permanently stored</li>
              <li><strong>Usage Data:</strong> Recipes generated, ingredients scanned, favorites saved</li>
              <li><strong>Email Addresses:</strong> Only if you voluntarily provide them</li>
              <li><strong>Analytics:</strong> Anonymous usage data via Plausible Analytics (GDPR compliant)</li>
              <li><strong>Local Storage:</strong> Preferences, pantry items, favorites stored in your browser</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              2. How We Use Information
            </h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Generate personalized recipe recommendations</li>
              <li>Improve AI accuracy and recipe quality</li>
              <li>Send updates if you opt in</li>
              <li>Analyze usage patterns (anonymously)</li>
              <li>Provide customer support</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              3. Data Storage and Retention
            </h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Photos:</strong> Processed in real-time, deleted immediately after analysis</li>
              <li><strong>Recipes:</strong> Cached temporarily (7 days) for performance</li>
              <li><strong>User Preferences:</strong> Stored in your browser's localStorage</li>
              <li><strong>Analytics:</strong> Anonymous data retained for 12 months</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              4. Third-Party Services
            </h2>
            <p className="text-gray-300 mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>OpenAI:</strong> Processes images and generates recipes (data not retained by OpenAI)</li>
              <li><strong>Vercel:</strong> Hosts the application and database</li>
              <li><strong>Instacart:</strong> Affiliate shopping links (no data sharing)</li>
              <li><strong>Plausible Analytics:</strong> Privacy-focused, GDPR-compliant analytics</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              5. Your Rights (GDPR)
            </h2>
            <p className="text-gray-300 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Access your personal data</li>
              <li>Delete your data (clear browser localStorage)</li>
              <li>Opt out of analytics (browser settings)</li>
              <li>Export your favorites and pantry items</li>
              <li>Request data correction</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              6. Children's Privacy
            </h2>
            <p className="text-gray-300">
              ChefAI is not intended for children under 13. We do not knowingly collect data from children.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              7. Data Security
            </h2>
            <p className="text-gray-300">
              We implement industry-standard security measures including HTTPS encryption, secure cloud storage, and regular security audits.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              8. Changes to Privacy Policy
            </h2>
            <p className="text-gray-300">
              We will notify you of significant changes to this policy via the app or email (if provided).
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              9. Contact Us
            </h2>
            <p className="text-gray-300">
              For privacy questions or data requests: privacy@chefai.app
            </p>
          </section>
        </div>
        
        <div className="mt-12">
          <a 
            href="/"
            className="text-emerald-400 hover:text-emerald-300"
          >
            ← Back to ChefAI
          </a>
        </div>
      </div>
    </div>
  )
}

