import React from 'react';
import type { Metadata } from 'next';
import PolicyPageView from '../../components/policy/PolicyPageView';

export const metadata: Metadata = {
  title: 'Return & Refund Policy | CLIICKG',
  description: 'Read the official Return & Refund Policy for CLIICKG. Find details on eligible return windows, replacement criteria, damaged goods inspection, and refund processing.',
  keywords: ['return policy', 'refund policy', 'cancellation policy', 'CLIICKG returns', 'refund process'],
  robots: { index: true, follow: true },
};

export default function ReturnAndRefundPolicyPage() {
  return (
    <PolicyPageView
      policyType="RETURN_REFUND"
      defaultTitle="Return & Refund Policy"
      defaultSlug="return-and-refund-policy"
    />
  );
}
