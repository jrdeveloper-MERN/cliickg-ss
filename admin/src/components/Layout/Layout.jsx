import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-admin-bg transition-colors duration-200">
      <Sidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
      <Header collapsed={collapsed} toggleSidebar={toggleSidebar} />
      <main
        className={`p-6 md:p-8 max-w-[1440px] min-h-[calc(100vh-64px)] transition-[margin-left] duration-200 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
