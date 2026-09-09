'use client';

import React, { useEffect, useState } from 'react';
import cmsService from '../../services/cms.service';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FAQ } from '../../types/cms/cms.types';
import { FaqSkeleton } from '../../components/ui/Skeleton/Skeleton';

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const data = await cmsService.getFaqs();
      setFaqs(data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[min(100%-2rem,800px)] mx-auto py-12 pb-20">
      <div className="text-center mb-12">
        <h1 className="font-serif text-3xl md:text-4xl font-light text-slate-900 m-0">
          Frequently Asked Questions
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1.5 mb-0">
          Find answers to common questions about products, delivery, bulk orders, payments, and returns.
        </p>
        <div className="w-15 h-1 bg-primary mx-auto mt-3 rounded-full" />
      </div>

      {loading ? (
        <FaqSkeleton />
      ) : faqs.length === 0 ? (
        <p className="text-center text-slate-500 text-sm">No FAQs available at the moment.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {faqs.map((faq) => {
            const fId = faq.id || faq._id || '';
            const isOpen = openId === fId;
            return (
              <div key={fId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : fId)}
                  className="w-full p-5 flex items-center justify-between bg-transparent border-none cursor-pointer text-left transition-colors hover:bg-slate-50/50"
                >
                  <span className="text-sm md:text-base font-bold text-slate-800 pr-4">{faq.question}</span>
                  {isOpen ? <ChevronUp size={18} className="text-primary shrink-0" /> : <ChevronDown size={18} className="text-slate-500 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs md:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
