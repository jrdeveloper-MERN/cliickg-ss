'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import policyService from '../../services/policy.service';
import { Policy, PolicyType } from '../../types/policy/policy.types';
import sanitizeHtml from '../../utils/sanitizer.utils';
import {
  Clock,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface PolicyPageViewProps {
  policyType: PolicyType;
  defaultTitle: string;
  defaultSlug: string;
}

export const PolicyPageView: React.FC<PolicyPageViewProps> = ({
  policyType,
  defaultTitle,
  defaultSlug,
}) => {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicy();
  }, [policyType]);

  const fetchPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await policyService.getPolicy(policyType);
      if (data) {
        setPolicy(data);
      } else {
        setError('Policy content is not available yet.');
      }
    } catch (err: any) {
      console.error('Error loading policy:', err);
      setError('Unable to load policy content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[min(100%-2rem,1100px)] md:w-[min(100%-3rem,1100px)] mx-auto py-10 pb-20">
      {/* Breadcrumbs */}
      <div className="text-xs text-slate-500 mb-8 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="text-slate-500 hover:text-primary no-underline transition-colors">
          Home
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="text-slate-500">Legal & Policies</span>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="text-slate-900 font-bold">{policy?.title || defaultTitle}</span>
      </div>

      {/* Clean Centered Header */}
      <div className="mb-10 text-center flex flex-col items-center">
        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 m-0 tracking-tight">
          {policy?.title || defaultTitle}
        </h1>

        {policy?.updatedAt && (
          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-slate-500 mt-3 font-medium">
            <Clock size={15} className="text-primary shrink-0" />
            <span>
              Last updated:{' '}
              {new Date(policy.updatedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Main Policy Content Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 md:p-12 shadow-xs">
        {loading ? (
          <div className="space-y-4 py-8">
            <div className="h-6 bg-slate-100 rounded-md w-1/3 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded-md w-full animate-pulse" />
            <div className="h-4 bg-slate-100 rounded-md w-5/6 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded-md w-4/6 animate-pulse" />
            <div className="h-32 bg-slate-50 rounded-xl w-full animate-pulse mt-6" />
            <div className="h-4 bg-slate-100 rounded-md w-full animate-pulse mt-6" />
            <div className="h-4 bg-slate-100 rounded-md w-3/4 animate-pulse" />
          </div>
        ) : error && !policy ? (
          <div className="py-16 text-center">
            <AlertCircle size={40} className="text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">{error}</h3>
            <p className="text-xs text-slate-500 mb-6">
              The requested policy document is currently being updated.
            </p>
            <button
              type="button"
              onClick={fetchPolicy}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Retry Loading
            </button>
          </div>
        ) : (
          <div
            className="tiptap-content text-slate-700 leading-relaxed text-sm md:text-base space-y-4"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(policy?.contentHtml || `<p>${defaultTitle} details will be available shortly.</p>`),
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PolicyPageView;
