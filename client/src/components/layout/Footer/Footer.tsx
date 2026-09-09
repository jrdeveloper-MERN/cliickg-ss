'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, Twitter, Linkedin } from 'lucide-react';
import categoryService from '../../../services/category.service';
import { useCMS } from '../../../contexts/CMSContext';
import getImageUrl from '../../../utils/image.utils';
import { Category } from '../../../types/categories/category.types';
import { SkeletonText } from '../../ui/Skeleton/Skeleton';

const stripHtmlText = (html: string = '') => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const Footer: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const { contactData } = useCMS();

  const activeBranch = contactData && Array.isArray((contactData as any).branches)
    ? (contactData as any).branches.find((b: any) => b.status === 'Active')
    : null;

  useEffect(() => {
    fetchFooterCategories();
  }, []);

  const fetchFooterCategories = async () => {
    try {
      setLoadingCategories(true);
      let cats = await categoryService.getCategories();
      if (!cats || cats.length === 0) {
        const mainCats = await categoryService.getMainCategories();
        cats = (mainCats || []) as any;
      }
      setCategories((cats || []).slice(0, 6));
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  return (
    <footer className="bg-white text-slate-600 border-t-2 border-primary mt-16">
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 py-12">
        {/* Brand Info */}
        <div>
          <div className="h-[60px] w-[180px] overflow-hidden flex items-center justify-center mb-4">
            <img
              src={getImageUrl((contactData as any)?.logo || '/logo.png')}
              alt="Logo"
              width="180"
              height="60"
              className="w-[180px] h-[60px] object-contain"
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Quality products, great value, and a seamless shopping experience. Discover products you'll love, delivered right to your doorstep.
          </p>
          {(contactData?.socialLinks || contactData) && (
            <div className="flex gap-3 mt-2 mb-4 flex-wrap">
              {contactData?.socialLinks?.facebook && (
                <a href={contactData.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors" title="Facebook" aria-label="Facebook">
                  <Facebook size={18} />
                </a>
              )}
              {contactData?.socialLinks?.instagram && (
                <a href={contactData.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors" title="Instagram" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
              )}
              {contactData?.socialLinks?.youtube && (
                <a href={contactData.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors" title="YouTube" aria-label="YouTube">
                  <Youtube size={18} />
                </a>
              )}
              {contactData?.socialLinks?.twitter && (
                <a href={contactData.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors" title="Twitter" aria-label="Twitter">
                  <Twitter size={18} />
                </a>
              )}
              {contactData?.socialLinks?.linkedin && (
                <a href={contactData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors" title="LinkedIn" aria-label="LinkedIn">
                  <Linkedin size={18} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-slate-800 font-extrabold text-sm mb-4 uppercase tracking-wider">
            Quick Links
          </h4>
          <ul className="list-none flex flex-col gap-2 text-xs p-0 m-0">
            <li><Link href="/terms-and-conditions" className="text-slate-500 hover:text-primary no-underline transition-colors">Terms & Conditions</Link></li>
            <li><Link href="/privacy-policy" className="text-slate-500 hover:text-primary no-underline transition-colors">Privacy Policy</Link></li>
            <li><Link href="/delivery-policy" className="text-slate-500 hover:text-primary no-underline transition-colors">Shipping & Delivery Policy</Link></li>
            <li><Link href="/return-and-refund-policy" className="text-slate-500 hover:text-primary no-underline transition-colors">Return & Refund Policy</Link></li>
            <li><Link href="/about" className="text-slate-500 hover:text-primary no-underline transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="text-slate-500 hover:text-primary no-underline transition-colors">Contact Us</Link></li>
          </ul>
        </div>

        {/* Popular Categories */}
        <div>
          <h4 className="text-slate-800 font-extrabold text-sm mb-4 uppercase tracking-wider">
            Popular Categories
          </h4>
          <ul className="list-none flex flex-col gap-2 text-xs p-0 m-0">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <li key={cat.id || cat._id}>
                  <Link href={`/category/${cat.id || cat._id}`} className="text-slate-500 hover:text-primary no-underline transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))
            ) : loadingCategories ? (
              <div className="py-1 w-28">
                <SkeletonText lines={4} height="12px" gap="10px" />
              </div>
            ) : (
              <li className="text-slate-400 text-xs">No categories found</li>
            )}
          </ul>
        </div>

        {/* Contact & Support */}
        <div>
          <h4 className="text-slate-800 font-extrabold text-sm mb-4 uppercase tracking-wider">
            Contact & Support
          </h4>
          <div className="flex flex-col gap-2.5 text-xs text-slate-500">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
              <span>{stripHtmlText(activeBranch?.address || contactData?.address || '')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-primary shrink-0" />
              <span>{activeBranch?.phone || contactData?.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-primary shrink-0" />
              <span>{activeBranch?.email || contactData?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 py-5 border-t border-slate-200 text-xs text-center text-slate-400">
        <div className="w-[min(100%-2rem,1360px)] mx-auto flex items-center justify-center">
          <span>CLIICKG © 2026. All Rights Reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
