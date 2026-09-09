import React from 'react';
import type { Metadata } from 'next';
import PolicyPageView from '../../components/policy/PolicyPageView';

export const metadata: Metadata = {
  title: 'About Us | CLIICKG',
  description: 'Learn about CLIICKG – our legacy of fine jewelry, authentic craftsmanship, transparent pricing, certified hallmarking, and customer commitment.',
  keywords: ['about CLIICKG', 'CLIICKG story', 'fine jewelry brand', 'certified jewelry', 'gold and diamond jewelry'],
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
