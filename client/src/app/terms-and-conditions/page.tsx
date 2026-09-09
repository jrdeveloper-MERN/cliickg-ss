import React from 'react';
import type { Metadata } from 'next';
import PolicyPageView from '../../components/policy/PolicyPageView';

export const metadata: Metadata = {
  title: 'Terms & Conditions | CLIICKG',
  description: 'Review the Terms & Conditions governing the use of the CLIICKG website, product purchases, account management, and marketplace transactions.',
  keywords: ['terms and conditions', 'terms of service', 'CLIICKG terms', 'buyer agreement', 'legal policy'],
  robots: { index: true, follow: true },
};

export default function TermsAndConditionsPage() {
  return (
    <PolicyPageView
      policyType="TERMS"
      defaultTitle="Terms & Conditions"
      defaultSlug="terms-and-conditions"
    />
  );
}
