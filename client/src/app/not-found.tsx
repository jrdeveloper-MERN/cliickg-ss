'use client';

import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 min-h-[70vh] w-full mx-auto max-w-[560px]">
      <img
        src="/assets/images/error-404.svg"
        alt="Page Not Found"
        className="w-[300px] h-[300px] max-w-full object-contain mb-6"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />

      <h1 className="font-serif text-3xl font-semibold text-slate-800 mb-2 tracking-tight">
        Page Not Found
      </h1>

      <p className="text-sm text-slate-500 max-w-[460px] mb-8 leading-relaxed">
        The page you are looking for doesn't exist or may have been moved. Please verify the web address or return to our homepage.
      </p>

      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white border-none py-3 px-7 rounded-md text-sm font-semibold no-underline shadow-sm transition-colors"
        >
          <Home size={16} />
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
