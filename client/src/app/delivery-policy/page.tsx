import React from 'react';
import type { Metadata } from 'next';
import PolicyPageView from '../../components/policy/PolicyPageView';

export const metadata: Metadata = {
  title: 'Delivery Policy | CLIICKG',
  description: 'Read the official Delivery and Shipping Policy for CLIICKG. Learn about order dispatch timelines, logistics partners, transit times, and delivery standards.',
  keywords: ['delivery policy', 'shipping policy', 'CLIICKG delivery', 'building materials delivery', 'shipping timelines'],
  robots: { index: true, follow: true },
};

export default function DeliveryPolicyPage() {
  return (
    <PolicyPageView
      policyType="DELIVERY"
      defaultTitle="Delivery Policy"
      defaultSlug="delivery-policy"
    />
  );
}
