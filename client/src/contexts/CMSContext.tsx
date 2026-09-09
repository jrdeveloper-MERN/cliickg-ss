'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import cmsService from '../services/cms.service';
import { ContactCMS } from '../types/cms/cms.types';

interface CMSContextType {
  contactData: ContactCMS | null;
  loadingContact: boolean;
  fetchContactData: () => Promise<void>;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contactData, setContactData] = useState<ContactCMS | null>(null);
  const [loadingContact, setLoadingContact] = useState(true);

  const fetchContactData = async () => {
    try {
      setLoadingContact(true);
      const data = await cmsService.getContact();
      setContactData(data || {});
    } catch (err) {
      console.error('Failed to fetch contact CMS data:', err);
      setContactData({});
    } finally {
      setLoadingContact(false);
    }
  };

  useEffect(() => {
    fetchContactData();
  }, []);

  return (
    <CMSContext.Provider
      value={{
        contactData,
        loadingContact,
        fetchContactData,
      }}
    >
      {children}
    </CMSContext.Provider>
  );
};

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (!context) {
    throw new Error('useCMS must be used within a CMSProvider');
  }
  return context;
};

export default CMSContext;
