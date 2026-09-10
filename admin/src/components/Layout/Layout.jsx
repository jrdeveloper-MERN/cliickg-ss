import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-admin-bg transition-colors duration-200 w-full relative">
      <Sidebar
        mobileOpen={mobileOpen}
        closeMobileSidebar={closeMobileSidebar}
      />
      <Header
        toggleMobileSidebar={toggleMobileSidebar}
      />
      <main className="pt-20 px-3 sm:px-4 md:px-6 xl:px-8 pb-6 sm:pb-8 lg:ml-60 lg:w-[calc(100%-15rem)] w-full ml-0 min-w-0 min-h-[calc(100vh-64px)] transition-[margin-left,width] duration-200">
        <div className="w-full max-w-[1920px] mx-auto min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
