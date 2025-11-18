'use client';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-4">
          🔧 Admin Panel
        </h1>
        <p className="text-gray-400 mb-4">
          Under maintenance. Check back soon!
        </p>
        <a 
          href="/"
          className="block text-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
