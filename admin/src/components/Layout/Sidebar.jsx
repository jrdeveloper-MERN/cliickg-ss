import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FolderTree,
  Sliders,
  Package,
  ShoppingCart,
  Users,
  Tag,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  User,
  Truck,
  Building
} from 'lucide-react';

const Sidebar = ({ mobileOpen, closeMobileSidebar }) => {
  const { user } = useAuth();
  const [openCategoryMenu, setOpenCategoryMenu] = useState(true);
  const [openAttributeMenu, setOpenAttributeMenu] = useState(false);
  const [openCMSMenu, setOpenCMSMenu] = useState(false);
  const [openSettingsMenu, setOpenSettingsMenu] = useState(false);
  const [openShippingMenu, setOpenShippingMenu] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen) {
        closeMobileSidebar?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, closeMobileSidebar]);

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      closeMobileSidebar?.();
    }
  };

  const getNavLinkClasses = (isActive) =>
    `flex items-center gap-3 py-2.5 px-3.5 rounded-md text-xs transition-all duration-150 justify-start ${
      isActive
        ? 'text-admin-accent bg-admin-accent-light border-l-[3px] border-admin-accent font-semibold'
        : 'text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary border-l-[3px] border-transparent font-normal'
    }`;

  const getSubLinkClasses = (isActive) =>
    `py-1.5 px-2.5 rounded text-xs transition-all duration-150 block no-underline ${
      isActive
        ? 'text-admin-accent bg-admin-accent-light font-semibold'
        : 'text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-hover font-normal'
    }`;

  return (
    <>
      {/* Off-canvas Backdrop for Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[95] lg:hidden transition-opacity duration-200"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={`bg-admin-card text-admin-text-primary border-r border-admin-border flex flex-col h-screen fixed top-0 left-0 z-[100] overflow-x-hidden overflow-y-auto transition-transform duration-200 w-60 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-admin-border min-h-[64px] p-4 px-5">
          <div className="w-9 h-9 rounded-lg bg-admin-accent-light flex items-center justify-center text-admin-accent shrink-0">
            <Building size={20} className="text-admin-accent" />
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <h2 className="text-sm font-bold text-admin-text-primary m-0 tracking-tight">
              CLIICKG
            </h2>
            <span className="text-[11px] text-admin-text-muted block">Admin Portal</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-0.5 flex-1 p-3 px-2.5">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={handleNavClick}
            className={({ isActive }) => getNavLinkClasses(isActive)}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          {/* Orders */}
          <NavLink
            to="/orders"
            onClick={handleNavClick}
            className={({ isActive }) => getNavLinkClasses(isActive)}
          >
            <ShoppingCart size={18} />
            <span>Orders</span>
          </NavLink>

          {/* Customers */}
          <NavLink
            to="/customers"
            onClick={handleNavClick}
            className={({ isActive }) => getNavLinkClasses(isActive)}
          >
            <Users size={18} />
            <span>Customers</span>
          </NavLink>

          {/* Sellers */}
          <NavLink
            to="/sellers"
            onClick={handleNavClick}
            className={({ isActive }) => getNavLinkClasses(isActive)}
          >
            <Building size={18} />
            <span>Sellers</span>
          </NavLink>

          {/* Category Accordion */}
          <div
            onClick={() => setOpenCategoryMenu(!openCategoryMenu)}
            className="flex items-center justify-between text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <FolderTree size={18} />
              <span>Category</span>
            </div>
            {openCategoryMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          {openCategoryMenu && (
            <div className="pl-7 flex flex-col gap-0.5 my-0.5">
              <NavLink to="/catalog/main-categories" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>
                Main Category
              </NavLink>
              <NavLink to="/catalog/categories" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>
                Category
              </NavLink>
              <NavLink to="/catalog/sub-categories" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>
                Sub Category
              </NavLink>
            </div>
          )}

          {/* Attribute Accordion */}
          <div
            onClick={() => setOpenAttributeMenu(!openAttributeMenu)}
            className="flex items-center justify-between text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <Sliders size={18} />
              <span>Attributes</span>
            </div>
            {openAttributeMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          {openAttributeMenu && (
            <div className="pl-7 flex flex-col gap-0.5 my-0.5">
              <NavLink to="/attributes/captions" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>
                Attribute Caption
              </NavLink>
              <NavLink to="/attributes/mappings" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>
                Attribute Mapping
              </NavLink>
            </div>
          )}

          {/* Products */}
          <NavLink
            to="/products"
            onClick={handleNavClick}
            className={({ isActive }) => getNavLinkClasses(isActive)}
          >
            <Package size={18} />
            <span>Products</span>
          </NavLink>

          {/* Promo Code */}
          <NavLink
            to="/promos"
            onClick={handleNavClick}
            className={({ isActive }) => getNavLinkClasses(isActive)}
          >
            <Tag size={18} />
            <span>Promo Code</span>
          </NavLink>

          {/* CMS Accordion */}
          <div
            onClick={() => setOpenCMSMenu(!openCMSMenu)}
            className="flex items-center justify-between text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} />
              <span>CMS Content</span>
            </div>
            {openCMSMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          {openCMSMenu && (
            <div className="pl-7 flex flex-col gap-0.5 my-0.5">
              <NavLink to="/cms/banners" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Banner</NavLink>
              <NavLink to="/cms/certificates" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Certificates</NavLink>
              <NavLink to="/cms/faqs" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>FAQs</NavLink>
              <NavLink to="/cms/featured" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Featured Section</NavLink>
              <NavLink to="/cms/todays-deals-banner" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Today's Deals Banner</NavLink>
              <NavLink to="/cms/todays-deals" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Today's Deals</NavLink>
              <NavLink to="/cms/scroll-heading" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Scroll Heading</NavLink>
              <NavLink to="/cms/contact" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Contact Us</NavLink>
            </div>
          )}

          {/* Logistics & Shipping Accordion */}
          <div
            onClick={() => setOpenShippingMenu(!openShippingMenu)}
            className="flex items-center justify-between text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <Truck size={18} />
              <span>Logistics &amp; Shipping</span>
            </div>
            {openShippingMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          {openShippingMenu && (
            <div className="pl-7 flex flex-col gap-0.5 my-0.5">
              <NavLink to="/shipping/dashboard" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Dashboard</NavLink>
              <NavLink to="/shipping/zones" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Delivery Zones</NavLink>
              <NavLink to="/shipping/charges" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Delivery Charges</NavLink>
              <NavLink to="/shipping/couriers" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Courier Master</NavLink>
            </div>
          )}

          {/* System Settings Accordion */}
          <div
            onClick={() => setOpenSettingsMenu(!openSettingsMenu)}
            className="flex items-center justify-between text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <Settings size={18} />
              <span>System Settings</span>
            </div>
            {openSettingsMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          {openSettingsMenu && (
            <div className="pl-7 flex flex-col gap-0.5 my-0.5">
              <NavLink to="/settings/store-promises" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Store Promises</NavLink>
              <NavLink to="/settings/about-us" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>About Us</NavLink>
              <NavLink to="/settings/delivery-policy" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Delivery Policy</NavLink>
              <NavLink to="/settings/privacy-policy" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Privacy Policy</NavLink>
              <NavLink to="/settings/terms-and-conditions" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Terms &amp; Conditions</NavLink>
              <NavLink to="/settings/return-and-refund-policy" onClick={handleNavClick} className={({ isActive }) => getSubLinkClasses(isActive)}>Return &amp; Refund Policy</NavLink>
            </div>
          )}
        </nav>

        {/* User Profile Card at Bottom */}
        <div className="border-t border-admin-border mt-auto flex items-center gap-2.5 p-3 px-3.5">
          <div className="w-8 h-8 rounded-full bg-admin-accent-light text-admin-accent flex items-center justify-center shrink-0">
            <User size={16} />
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <div className="text-xs font-semibold text-admin-text-primary">{user?.name || 'Admin User'}</div>
            <div className="text-[11px] text-admin-text-muted">{user?.role || 'Administrator'}</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
