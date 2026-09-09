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

const Sidebar = ({ collapsed }) => {
  const { user } = useAuth();
  const [openCategoryMenu, setOpenCategoryMenu] = useState(true);
  const [openAttributeMenu, setOpenAttributeMenu] = useState(false);
  const [openCMSMenu, setOpenCMSMenu] = useState(false);
  const [openSettingsMenu, setOpenSettingsMenu] = useState(false);
  const [openShippingMenu, setOpenShippingMenu] = useState(false);

  const getNavLinkClasses = (isActive) =>
    `flex items-center gap-3 py-2.5 px-3.5 rounded-md text-xs transition-all duration-150 ${collapsed ? 'justify-center px-0' : 'justify-start'
    } ${isActive
      ? 'text-admin-accent bg-admin-accent-light border-l-[3px] border-admin-accent font-semibold'
      : 'text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary border-l-[3px] border-transparent font-normal'
    }`;

  const getSubLinkClasses = (isActive) =>
    `py-1.5 px-2.5 rounded text-xs transition-all duration-150 block no-underline ${isActive
      ? 'text-admin-accent bg-admin-accent-light font-semibold'
      : 'text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-hover font-normal'
    }`;

  return (
    <aside
      className={`bg-admin-card text-admin-text-primary border-r border-admin-border flex flex-col h-screen fixed top-0 left-0 z-[100] overflow-x-hidden overflow-y-auto transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-60'
        }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center gap-3 border-b border-admin-border min-h-[64px] ${collapsed ? 'p-4 px-3 justify-center' : 'p-4 px-5'
          }`}
      >
        <div className="w-9 h-9 rounded-lg bg-admin-accent-light flex items-center justify-center text-admin-accent shrink-0">
          <Building size={20} className="text-admin-accent" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h2 className="text-sm font-bold text-admin-text-primary m-0 tracking-tight">
              CLIICKG
            </h2>
            <span className="text-[11px] text-admin-text-muted block">Admin Portal</span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className={`flex flex-col gap-0.5 flex-1 ${collapsed ? 'p-3 px-1.5' : 'p-3 px-2.5'}`}>
        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          title={collapsed ? 'Dashboard' : ''}
          className={({ isActive }) => getNavLinkClasses(isActive)}
        >
          <LayoutDashboard size={18} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* Orders */}
        <NavLink
          to="/orders"
          title={collapsed ? 'Orders' : ''}
          className={({ isActive }) => getNavLinkClasses(isActive)}
        >
          <ShoppingCart size={18} />
          {!collapsed && <span>Orders</span>}
        </NavLink>


        {/* Customers */}
        <NavLink
          to="/customers"
          title={collapsed ? 'Customers' : ''}
          className={({ isActive }) => getNavLinkClasses(isActive)}
        >
          <Users size={18} />
          {!collapsed && <span>Customers</span>}
        </NavLink>

        {/* Sellers */}
        <NavLink
          to="/sellers"
          title={collapsed ? 'Sellers' : ''}
          className={({ isActive }) => getNavLinkClasses(isActive)}
        >
          <Building size={18} />
          {!collapsed && <span>Sellers</span>}
        </NavLink>

        {/* Category Accordion */}
        <div
          onClick={() => !collapsed && setOpenCategoryMenu(!openCategoryMenu)}
          title={collapsed ? 'Category' : ''}
          className={`flex items-center text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150 ${collapsed ? 'justify-center px-0' : 'justify-between'
            }`}
        >
          <div className="flex items-center gap-3">
            <FolderTree size={18} />
            {!collapsed && <span>Category</span>}
          </div>
          {!collapsed && (openCategoryMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </div>
        {!collapsed && openCategoryMenu && (
          <div className="pl-7 flex flex-col gap-0.5 my-0.5">
            <NavLink to="/catalog/main-categories" className={({ isActive }) => getSubLinkClasses(isActive)}>
              Main Category
            </NavLink>
            <NavLink to="/catalog/categories" className={({ isActive }) => getSubLinkClasses(isActive)}>
              Category
            </NavLink>
            <NavLink to="/catalog/sub-categories" className={({ isActive }) => getSubLinkClasses(isActive)}>
              Sub Category
            </NavLink>
          </div>
        )}

        {/* Attribute Accordion */}
        <div
          onClick={() => !collapsed && setOpenAttributeMenu(!openAttributeMenu)}
          title={collapsed ? 'Product Attributes' : ''}
          className={`flex items-center text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150 ${collapsed ? 'justify-center px-0' : 'justify-between'
            }`}
        >
          <div className="flex items-center gap-3">
            <Sliders size={18} />
            {!collapsed && <span>Attributes</span>}
          </div>
          {!collapsed && (openAttributeMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </div>
        {!collapsed && openAttributeMenu && (
          <div className="pl-7 flex flex-col gap-0.5 my-0.5">
            <NavLink to="/attributes/captions" className={({ isActive }) => getSubLinkClasses(isActive)}>
              Attribute Caption
            </NavLink>
            <NavLink to="/attributes/mappings" className={({ isActive }) => getSubLinkClasses(isActive)}>
              Attribute Mapping
            </NavLink>
          </div>
        )}

        {/* Products */}
        <NavLink
          to="/products"
          title={collapsed ? 'Products' : ''}
          className={({ isActive }) => getNavLinkClasses(isActive)}
        >
          <Package size={18} />
          {!collapsed && <span>Products</span>}
        </NavLink>

        {/* Promo Code */}
        <NavLink
          to="/promos"
          title={collapsed ? 'Promo Codes' : ''}
          className={({ isActive }) => getNavLinkClasses(isActive)}
        >
          <Tag size={18} />
          {!collapsed && <span>Promo Code</span>}
        </NavLink>

        {/* CMS Accordion */}
        <div
          onClick={() => !collapsed && setOpenCMSMenu(!openCMSMenu)}
          title={collapsed ? 'CMS Management' : ''}
          className={`flex items-center text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150 ${collapsed ? 'justify-center px-0' : 'justify-between'
            }`}
        >
          <div className="flex items-center gap-3">
            <FileText size={18} />
            {!collapsed && <span>CMS Content</span>}
          </div>
          {!collapsed && (openCMSMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </div>
        {!collapsed && openCMSMenu && (
          <div className="pl-7 flex flex-col gap-0.5 my-0.5">
            <NavLink to="/cms/banners" className={({ isActive }) => getSubLinkClasses(isActive)}>Banner</NavLink>
            <NavLink to="/cms/certificates" className={({ isActive }) => getSubLinkClasses(isActive)}>Certificates</NavLink>
            <NavLink to="/cms/faqs" className={({ isActive }) => getSubLinkClasses(isActive)}>FAQs</NavLink>
            <NavLink to="/cms/featured" className={({ isActive }) => getSubLinkClasses(isActive)}>Featured Section</NavLink>
            <NavLink to="/cms/todays-deals-banner" className={({ isActive }) => getSubLinkClasses(isActive)}>Today's Deals Banner</NavLink>
            <NavLink to="/cms/todays-deals" className={({ isActive }) => getSubLinkClasses(isActive)}>Today's Deals</NavLink>
            <NavLink to="/cms/scroll-heading" className={({ isActive }) => getSubLinkClasses(isActive)}>Scroll Heading</NavLink>
            <NavLink to="/cms/contact" className={({ isActive }) => getSubLinkClasses(isActive)}>Contact Us</NavLink>
          </div>
        )}

        {/* Logistics & Shipping Accordion */}
        <div
          onClick={() => !collapsed && setOpenShippingMenu(!openShippingMenu)}
          title={collapsed ? 'Logistics & Shipping' : ''}
          className={`flex items-center text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150 ${collapsed ? 'justify-center px-0' : 'justify-between'
            }`}
        >
          <div className="flex items-center gap-3">
            <Truck size={18} />
            {!collapsed && <span>Logistics & Shipping</span>}
          </div>
          {!collapsed && (openShippingMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </div>
        {!collapsed && openShippingMenu && (
          <div className="pl-7 flex flex-col gap-0.5 my-0.5">
            <NavLink to="/shipping/dashboard" className={({ isActive }) => getSubLinkClasses(isActive)}>Dashboard</NavLink>
            <NavLink to="/shipping/zones" className={({ isActive }) => getSubLinkClasses(isActive)}>Delivery Zones</NavLink>
            <NavLink to="/shipping/charges" className={({ isActive }) => getSubLinkClasses(isActive)}>Delivery Charges</NavLink>
            <NavLink to="/shipping/couriers" className={({ isActive }) => getSubLinkClasses(isActive)}>Courier Master</NavLink>
          </div>
        )}

        {/* System Settings Accordion */}
        <div
          onClick={() => !collapsed && setOpenSettingsMenu(!openSettingsMenu)}
          title={collapsed ? 'System Settings' : ''}
          className={`flex items-center text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary cursor-pointer rounded-md text-xs font-normal py-2.5 px-3.5 transition-all duration-150 ${collapsed ? 'justify-center px-0' : 'justify-between'
            }`}
        >
          <div className="flex items-center gap-3">
            <Settings size={18} />
            {!collapsed && <span>System Settings</span>}
          </div>
          {!collapsed && (openSettingsMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </div>
        {!collapsed && openSettingsMenu && (
          <div className="pl-7 flex flex-col gap-0.5 my-0.5">
            <NavLink to="/settings/store-promises" className={({ isActive }) => getSubLinkClasses(isActive)}>Store Promises</NavLink>
            <NavLink to="/settings/about-us" className={({ isActive }) => getSubLinkClasses(isActive)}>About Us</NavLink>
            <NavLink to="/settings/delivery-policy" className={({ isActive }) => getSubLinkClasses(isActive)}>Delivery Policy</NavLink>
            <NavLink to="/settings/privacy-policy" className={({ isActive }) => getSubLinkClasses(isActive)}>Privacy Policy</NavLink>
            <NavLink to="/settings/terms-and-conditions" className={({ isActive }) => getSubLinkClasses(isActive)}>Terms & Conditions</NavLink>
            <NavLink to="/settings/return-and-refund-policy" className={({ isActive }) => getSubLinkClasses(isActive)}>Return & Refund Policy</NavLink>
          </div>
        )}
      </nav>

      {/* User Profile Card at Bottom */}
      <div
        className={`border-t border-admin-border mt-auto flex items-center gap-2.5 ${collapsed ? 'p-3 px-1.5 justify-center' : 'p-3 px-3.5'
          }`}
      >
        <div className="w-8 h-8 rounded-full bg-admin-accent-light text-admin-accent flex items-center justify-center shrink-0">
          <User size={16} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <div className="text-xs font-semibold text-admin-text-primary">{user?.name || 'Admin User'}</div>
            <div className="text-[11px] text-admin-text-muted">{user?.role || 'Administrator'}</div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
