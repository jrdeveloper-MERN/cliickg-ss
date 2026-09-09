'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import cmsService from '../../services/cms.service';
import { ContactCMS, StoreBranch } from '../../types/cms/cms.types';
import sanitizeHtml from '../../utils/sanitizer.utils';

const unescapeHtml = (str: string = '') => {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
};

const getEmbedUrl = (url: string = '') => {
  let cleanUrl = unescapeHtml((url || '').trim());

  if (cleanUrl.includes('src=')) {
    const srcMatch = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      cleanUrl = srcMatch[1];
    }
  }

  cleanUrl = cleanUrl.replace(/&amp;/g, '&');

  if (cleanUrl) {
    if (cleanUrl.includes('/maps/embed') || cleanUrl.includes('output=embed') || cleanUrl.includes('pb=')) {
      return cleanUrl;
    }

    if (cleanUrl.includes('/maps/place/')) {
      try {
        const parts = cleanUrl.split('/maps/place/');
        if (parts[1]) {
          const rawPlace = parts[1].split('/')[0].split('?')[0];
          const placeName = decodeURIComponent(rawPlace).replace(/\+/g, ' ').trim();
          if (placeName) {
            return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`;
          }
        }
      } catch (e) {}
    }

    if (!cleanUrl.startsWith('http')) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(cleanUrl)}&output=embed`;
    }
  }

  return '';
};

export default function ContactPage() {
  const [contactData, setContactData] = useState<ContactCMS | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranchIdx, setSelectedBranchIdx] = useState(0);

  useEffect(() => {
    fetchContactData();
  }, []);

  const fetchContactData = async () => {
    setLoading(true);
    try {
      const data = await cmsService.getContact();
      setContactData(data);
    } catch (err) {
      console.error('Failed to load contact info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contactData) {
      if (contactData.seoTitle) {
        document.title = contactData.seoTitle;
      }
      if (contactData.seoDescription) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', contactData.seoDescription);
        }
      }
      if (contactData.seoKeywords) {
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) {
          metaKeywords.setAttribute('content', contactData.seoKeywords);
        }
      }
    }
  }, [contactData]);

  if (loading) {
    return (
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-16 text-center">
        <p className="text-slate-500 text-sm">Loading contact information...</p>
      </div>
    );
  }

  const branches: StoreBranch[] = contactData && Array.isArray(contactData.branches)
    ? contactData.branches.filter((b) => b.status !== 'Inactive')
    : [];

  const activeBranch: StoreBranch | ContactCMS | null =
    branches.length > 0
      ? branches[selectedBranchIdx] || branches[0]
      : contactData
      ? {
          name: contactData.name || 'Main Branch',
          storeName: contactData.storeName || contactData.name || '',
          phone: contactData.phone,
          secondaryPhone: contactData.secondaryPhone,
          email: contactData.email,
          secondaryEmail: contactData.secondaryEmail,
          address: contactData.address,
          businessHours: contactData.businessHours || contactData.storeHours,
          googleMapEmbed: contactData.googleMapEmbed || contactData.googleMapUrl,
          locationCardTitle: contactData.locationCardTitle,
          phoneCardTitle: contactData.phoneCardTitle,
          emailCardTitle: contactData.emailCardTitle,
        }
      : null;

  const rawMapUrl =
    activeBranch?.googleMapEmbed ||
    (activeBranch as any)?.googleMapUrl ||
    (activeBranch as any)?.mapUrl ||
    '';
  let mapSrc = getEmbedUrl(rawMapUrl);

  // Fallback: If mapUrl is empty or not embeddable, construct a Google Maps embed URL from valid store address
  if (!mapSrc && activeBranch?.address) {
    const cleanAddress = activeBranch.address.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    if (cleanAddress.length >= 3) {
      mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(cleanAddress)}&output=embed`;
    }
  }

  const pageTitle = contactData?.pageTitle || 'Contact Us';
  const heading = contactData?.heading || 'Get In Touch';
  const description = contactData?.description || '';

  return (
    <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-10 pb-20">
      {/* 1. Page Header */}
      {pageTitle && (
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl md:text-4xl font-normal text-black border-b border-slate-200 pb-6 mb-8">
            {pageTitle}
          </h1>
        </div>
      )}

      {/* 2. Contact Details & Maps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left Column: Get In Touch Info & Contact Cards */}
        <div className="flex flex-col gap-6">
          {(heading || description) && (
            <div>
              {heading && (
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-black mb-3">
                  {heading}
                </h2>
              )}
              {description && (
                <div
                  className="tiptap-content text-slate-500 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                />
              )}
            </div>
          )}

          {/* Branch Selector Tabs */}
          {branches.length > 1 && (
            <div className="flex gap-2.5 flex-wrap my-2">
              {branches.map((b, idx) => (
                <button
                  key={b.id || b._id || idx}
                  type="button"
                  onClick={() => setSelectedBranchIdx(idx)}
                  className={`py-2 px-5 rounded-full text-xs font-semibold cursor-pointer transition-colors border ${
                    selectedBranchIdx === idx
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-primary border-primary hover:bg-rose-50'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {activeBranch ? (
            <div className="flex flex-col gap-5">
              {/* Card 1: Store Location */}
              {activeBranch.address && (
                <div className="bg-white rounded-2xl p-6 flex items-start gap-5 border border-slate-200 shadow-sm">
                  <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <MapPin size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-normal text-black mb-1.5 mt-1">
                      {activeBranch.locationCardTitle || 'Our Store Location'}
                    </h3>
                    <div
                      className="tiptap-content text-slate-500 text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeBranch.address) }}
                    />
                  </div>
                </div>
              )}

              {/* Card 2: Phone Support */}
              {(activeBranch.phone || activeBranch.secondaryPhone) && (
                <div className="bg-white rounded-2xl p-6 flex items-start gap-5 border border-slate-200 shadow-sm">
                  <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <Phone size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-normal text-black mb-1.5 mt-1">
                      {activeBranch.phoneCardTitle || 'Call Us'}
                    </h3>
                    <div className="text-slate-500 text-xs leading-relaxed">
                      {activeBranch.phone && <span>{activeBranch.phone}</span>}
                      {activeBranch.secondaryPhone && (
                        <span className="block mt-0.5">{activeBranch.secondaryPhone}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3: Email Care */}
              {(activeBranch.email || activeBranch.secondaryEmail) && (
                <div className="bg-white rounded-2xl p-6 flex items-start gap-5 border border-slate-200 shadow-sm">
                  <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <Mail size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-normal text-black mb-1.5 mt-1">
                      {activeBranch.emailCardTitle || 'Email Address'}
                    </h3>
                    <div className="text-slate-500 text-xs leading-relaxed">
                      {activeBranch.email && <span>{activeBranch.email}</span>}
                      {activeBranch.secondaryEmail && (
                        <span className="block mt-0.5">{activeBranch.secondaryEmail}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Card 4: Business Hours */}
              {activeBranch.businessHours && (
                <div className="bg-white rounded-2xl p-6 flex items-start gap-5 border border-slate-200 shadow-sm">
                  <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <Clock size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-normal text-black mb-1.5 mt-1">
                      Business Hours
                    </h3>
                    <div
                      className="tiptap-content text-slate-500 text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeBranch.businessHours) }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="italic text-slate-400 text-sm">No contact details configured.</p>
          )}
        </div>

        {/* Right Column: Google Maps Embed Card */}
        {mapSrc ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <iframe
              title={`${activeBranch?.storeName || activeBranch?.name || 'Store'} Google Map`}
              src={mapSrc}
              className="w-full h-[460px] rounded-xl border-none"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center h-[460px] bg-slate-100 text-slate-400">
            <span className="text-sm">No Map Location Configured</span>
          </div>
        )}
      </div>
    </div>
  );
}
