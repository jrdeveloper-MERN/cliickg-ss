import type { Metadata } from 'next';
import './globals.css';
import AppProviders from '../providers/AppProviders';
import Header from '../components/layout/Header/Header';
import Footer from '../components/layout/Footer/Footer';
import ScrollToTop from '../components/layout/ScrollToTop/ScrollToTop';
import ServerHealthGuard from '../components/common/ServerHealthGuard';
import OfflineBanner from '../components/ui/OfflineBanner/OfflineBanner';

export const metadata: Metadata = {
  title: 'CLIICKG | Construction & Building Materials Marketplace',
  description: 'Shop construction and building materials, hardware, tools, plumbing, electrical, and supplies through CLIICKG.',
  keywords: ['CLIICKG', 'construction materials', 'building materials', 'building supplies', 'cement', 'TMT steel', 'hardware', 'plumbing', 'electrical', 'construction tools'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <OfflineBanner />
          <ServerHealthGuard>
            <ScrollToTop />
            <Header />
            <main className="min-h-[80vh]">{children}</main>
            <Footer />
          </ServerHealthGuard>
        </AppProviders>
      </body>
    </html>
  );
}
