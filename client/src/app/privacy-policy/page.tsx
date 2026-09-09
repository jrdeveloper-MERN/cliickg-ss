import React from 'react';
import type { Metadata } from 'next';
import PolicyPageView from '../../components/policy/PolicyPageView';

export const metadata: Metadata = {
  title: 'Privacy Policy | CLIICKG',
  description: 'Read the official Privacy Policy for CLIICKG. Understand how we collect, safeguard, process, and respect your personal information and transaction data.',
  keywords: ['privacy policy', 'CLIICKG privacy', 'data protection', 'user privacy', 'secure shopping'],
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPageView
      policyType="PRIVACY"
      defaultTitle="Privacy Policy"
      defaultSlug="privacy-policy"
    />
  );
}
