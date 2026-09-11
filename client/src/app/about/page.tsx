import React from 'react';
import type { Metadata } from 'next';
import PolicyPageView from '../../components/policy/PolicyPageView';

export const metadata: Metadata = {
  title: 'About Us | CLIICKG',
  description: 'Learn about CLIICKG – your trusted B2C marketplace for construction materials, tools, hardware, building supplies, and multi-seller products.',
  keywords: ['about CLIICKG', 'CLIICKG story', 'construction materials marketplace', 'building tools and hardware', 'CLIICKG B2C marketplace'],
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <PolicyPageView
      policyType="ABOUT"
      defaultTitle="About Us"
      defaultSlug="about-us"
    />
  );
}
