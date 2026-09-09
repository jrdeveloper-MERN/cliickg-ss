'use client';

import React, { useState, useEffect } from 'react';
import cmsService from '../../../services/cms.service';
import { ScrollHeading } from '../../../types/cms/cms.types';
import sanitizeHtml from '../../../utils/sanitizer.utils';

export interface MarqueeBarProps {
  fullWidth?: boolean;
}

export const MarqueeBar: React.FC<MarqueeBarProps> = ({ fullWidth = false }) => {
  const [scrollHeadings, setScrollHeadings] = useState<ScrollHeading[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchScrollHeadings();
  }, []);

  const fetchScrollHeadings = async () => {
    try {
      const headings = await cmsService.getScrollHeadings();
      const activeHeadings = (Array.isArray(headings) ? headings : []).filter(
        (h) => h.status !== 'Inactive' && h.isActive !== false && Boolean((h.text || h.title || '').trim())
      );
      setScrollHeadings(activeHeadings);
    } catch {
      setScrollHeadings([]);
    } finally {
      setLoaded(true);
    }
  };

  if (!loaded || scrollHeadings.length === 0) {
    return null;
  }

  const mainHeading = scrollHeadings[0] || {};
  const barColor = mainHeading.color || '#ffffff';
  const speed = mainHeading.speed || 6;

  return (
    <div
      className={`bg-primary text-white py-1.5 overflow-hidden ${
        fullWidth ? 'm-0 rounded-none shadow-none' : 'my-4 rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.1)]'
      }`}
      style={{
        color: barColor,
      }}
    >
      <div className={fullWidth ? 'w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto' : ''}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            {/* @ts-ignore */}
            <marquee
              behavior="scroll"
              direction="left"
              scrollamount={String(speed)}
              style={{
                display: 'inline-block',
                fontSize: mainHeading.fontSize || '0.85rem',
                fontWeight: mainHeading.fontWeight || '700',
                fontFamily: mainHeading.fontFamily || 'inherit',
                fontStyle: mainHeading.fontStyle || 'normal',
                letterSpacing: mainHeading.letterSpacing || 'normal',
                verticalAlign: 'middle',
                width: '100%',
              }}
            >
              {scrollHeadings.map((h, i) => {
                const itemHtml = sanitizeHtml(h.text || h.title || '');
                const itemLink = h.link || h.linkUrl;
                const content = (
                  <span
                    className="tiptap-marquee-item"
                    style={{
                      color: h.color || 'inherit',
                      fontFamily: h.fontFamily || 'inherit',
                      fontSize: h.fontSize || 'inherit',
                      fontWeight: h.fontWeight || 'inherit',
                      fontStyle: h.fontStyle || 'inherit',
                      letterSpacing: h.letterSpacing || 'inherit',
                    }}
                    dangerouslySetInnerHTML={{ __html: itemHtml }}
                  />
                );

                return (
                  <span key={h.id || h._id || i} className="mr-16 inline-flex items-center">
                    {itemLink ? (
                      <a href={itemLink} className="text-inherit no-underline">
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </span>
                );
              })}
              {/* @ts-ignore */}
            </marquee>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarqueeBar;
