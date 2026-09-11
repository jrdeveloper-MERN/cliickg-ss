'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Heart, ShoppingCart, User, Menu, X, ChevronDown, ChevronRight, ArrowRight, Home, Grid, Tag, Package, PhoneCall, LogOut } from 'lucide-react';
import { useCart } from '../../../contexts/CartContext';
import { useWishlist } from '../../../contexts/WishlistContext';
import { useAuth } from '../../../contexts/AuthContext';
import MarqueeBar from '../../home/MarqueeBar/MarqueeBar';
import categoryService from '../../../services/category.service';
import cmsService from '../../../services/cms.service';
import getImageUrl from '../../../utils/image.utils';
import { computeCmsTargetUrl } from '../../../utils/cms.utils';
import { MainCategory, Category, SubCategory } from '../../../types/categories/category.types';

const HeaderSearchForm: React.FC<{
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setShowSearchInput: (show: boolean) => void;
  router: ReturnType<typeof useRouter>;
}> = ({ searchQuery, setSearchQuery, setShowSearchInput, router }) => {
  const searchParams = useSearchParams();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
      params.set('q', query);
      router.push(`/shop?${params.toString()}`);
      setShowSearchInput(false);
    }
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="absolute right-0 top-10 bg-white shadow-[0_8px_25px_rgba(0,0,0,0.15)] rounded-full py-2 px-4 flex items-center w-[min(280px,calc(100vw-40px))] border border-primary z-[100]"
    >
      <Search size={16} className="text-primary mr-1.5 shrink-0" />
      <input
        type="text"
        placeholder="Search products..."
        aria-label="Search products input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="border-none outline-none text-sm w-full text-slate-800 bg-transparent"
        autoFocus
      />
    </form>
  );
};

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDealsActive, setIsDealsActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Shop Mega Menu States
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [megaData, setMegaData] = useState<{ mainCategories: MainCategory[]; categories: Category[]; subCategories: SubCategory[] }>({
    mainCategories: [],
    categories: [],
    subCategories: [],
  });
  const [megaLoading, setMegaLoading] = useState(false);
  const [activeMainCatId, setActiveMainCatId] = useState<string | null>(null);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [hoveredSubCat, setHoveredSubCat] = useState<SubCategory | null>(null);

  // Mobile Mega Menu Accordion States
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [mobileActiveMainCatId, setMobileActiveMainCatId] = useState<string | null>(null);
  const [mobileActiveCatId, setMobileActiveCatId] = useState<string | null>(null);

  const megaMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleShopMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setMegaMenuOpen(true);
  };

  const handleShopMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
    }, 200);
  };

  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, logout } = useAuth();

  const getMainCatId = useCallback((cat: Category) => {
    if (!cat || !cat.mainCategoryId) return null;
    return typeof cat.mainCategoryId === 'object' ? String((cat.mainCategoryId as any)._id || (cat.mainCategoryId as any).id) : String(cat.mainCategoryId);
  }, []);

  const getCatId = useCallback((sub: SubCategory) => {
    if (!sub || !sub.categoryId) return null;
    return typeof sub.categoryId === 'object' ? String((sub.categoryId as any)._id || (sub.categoryId as any).id) : String(sub.categoryId);
  }, []);

  const fetchMegaMenuData = useCallback(async () => {
    if (megaData.mainCategories.length > 0) return;
    try {
      setMegaLoading(true);
      const [mainCats, cats, subCats] = await Promise.all([
        categoryService.getMainCategories(),
        categoryService.getCategories(),
        categoryService.getSubCategories(),
      ]);

      setMegaData({ mainCategories: mainCats, categories: cats, subCategories: subCats });

      if (mainCats.length > 0) {
        const firstMainId = String(mainCats[0].id || mainCats[0]._id);
        setActiveMainCatId(firstMainId);
        const firstCats = cats.filter((c) => getMainCatId(c) === firstMainId);
        if (firstCats.length > 0) {
          setActiveCatId(String(firstCats[0].id || firstCats[0]._id));
        }
      }
    } catch (err) {
      console.error('Error fetching Mega Menu data:', err);
    } finally {
      setMegaLoading(false);
    }
  }, [megaData.mainCategories.length, getMainCatId]);

  useEffect(() => {
    fetchMegaMenuData();
  }, [fetchMegaMenuData]);

  useEffect(() => {
    const checkDealsStatus = async () => {
      try {
        const [deals, banners] = await Promise.all([
          cmsService.getTodayDeals().catch(() => []),
          cmsService.getTodayDealsBanners().catch(() => []),
        ]);
        const activeBanners = (banners || []).filter(
          (b: any) => b.status === 'Active' || (b.status !== 'Inactive' && b.status !== 'Disabled' && b.status !== 'Deactive' && b.isActive !== false)
        );
        const activeDeals = (deals || []).filter(
          (d: any) => d.status === 'Active' || (d.status !== 'Inactive' && d.status !== 'Disabled' && d.status !== 'Deactive' && d.isActive !== false)
        );
        setIsDealsActive(activeBanners.length > 0 || activeDeals.length > 0);
      } catch (err) {
        setIsDealsActive(false);
      }
    };
    checkDealsStatus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setMegaMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMegaMenuOpen(false);
      }
    };
    if (megaMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [megaMenuOpen]);

  useEffect(() => {
    setMegaMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleShopClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMegaMenuOpen((prev) => !prev);
  };

  const handleMainCategoryHover = (mainCatId: string) => {
    setActiveMainCatId(String(mainCatId));
    setHoveredSubCat(null);
    const relatedCats = megaData.categories.filter((c) => getMainCatId(c) === String(mainCatId));
    if (relatedCats.length > 0) {
      setActiveCatId(String(relatedCats[0].id || relatedCats[0]._id));
    } else {
      setActiveCatId(null);
    }
  };

  const handleCategoryHover = (catId: string) => {
    setActiveCatId(String(catId));
    setHoveredSubCat(null);
  };

  const activeMainCat = megaData.mainCategories.find((m) => String(m.id || m._id) === String(activeMainCatId));
  const activeCategoryList = megaData.categories.filter((c) => getMainCatId(c) === String(activeMainCatId));
  const activeCategory = megaData.categories.find((c) => String(c.id || c._id) === String(activeCatId));
  const activeSubCategoryList = megaData.subCategories.filter((s) => getCatId(s) === String(activeCatId));

  const previewImage = hoveredSubCat?.image || activeCategory?.image || activeMainCat?.image || '';
  const previewTitle = hoveredSubCat?.name || activeCategory?.name || activeMainCat?.name;

  return (
    <header ref={megaMenuRef} className="sticky top-0 z-[100] bg-white border-b border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative">
      <MarqueeBar fullWidth={true} />

      <div className="h-[64px] sm:h-[76px] lg:h-[88px] flex items-center justify-between px-3 sm:px-5 lg:px-6 xl:px-10 gap-1.5 sm:gap-4 lg:gap-6 relative max-w-[1280px] 2xl:max-w-[1600px] mx-auto">
        <Link
          href="/"
          className="flex items-center justify-center shrink-0 no-underline py-1"
        >
          <img
            src={getImageUrl('/logo.jpg')}
            alt="CLIICKG"
            width="240"
            height="80"
            className="h-14 sm:h-16 lg:h-20 w-auto max-w-[180px] sm:max-w-[220px] lg:max-w-[260px] object-contain transition-all duration-200"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-9 mx-auto">
          <Link
            href="/"
            className={`relative inline-flex items-center gap-1 py-1.5 font-sans text-[0.96rem] tracking-[0.01em] transition-colors duration-200 cursor-pointer bg-transparent border-none after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-secondary after:rounded-full after:transition-all after:duration-250 ${
              pathname === '/' ? 'after:w-full text-primary font-bold' : 'after:w-0 text-slate-700 hover:text-primary font-semibold'
            }`}
          >
            Home
          </Link>

          <div
            onMouseEnter={handleShopMouseEnter}
            onMouseLeave={handleShopMouseLeave}
            className="relative"
          >
            <button
              onClick={handleShopClick}
              aria-expanded={megaMenuOpen}
              aria-haspopup="true"
              aria-label="Shop menu"
              className={`relative inline-flex items-center gap-1 py-1.5 font-sans text-[0.96rem] tracking-[0.01em] transition-colors duration-200 cursor-pointer bg-transparent border-none after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-secondary after:rounded-full after:transition-all after:duration-250 ${
                megaMenuOpen || pathname.startsWith('/shop') ? 'after:w-full text-primary font-bold' : 'after:w-0 text-slate-700 hover:text-primary font-semibold'
              }`}
            >
              <span>Shop</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-inherit ${megaMenuOpen ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>
          </div>

          {isDealsActive && (
            <Link
              href="/today-deals"
              className={`relative inline-flex items-center gap-1 py-1.5 font-sans text-[0.96rem] tracking-[0.01em] transition-colors duration-200 cursor-pointer bg-transparent border-none after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-secondary after:rounded-full after:transition-all after:duration-250 ${
                pathname === '/today-deals' ? 'after:w-full text-primary font-bold' : 'after:w-0 text-slate-700 hover:text-primary font-semibold'
              }`}
            >
              Today's Deals
            </Link>
          )}

          <Link
            href="/contact"
            className={`relative inline-flex items-center gap-1 py-1.5 font-sans text-[0.96rem] tracking-[0.01em] transition-colors duration-200 cursor-pointer bg-transparent border-none after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-secondary after:rounded-full after:transition-all after:duration-250 ${
              pathname === '/contact' ? 'after:w-full text-primary font-bold' : 'after:w-0 text-slate-700 hover:text-primary font-semibold'
            }`}
          >
            Contact Us
          </Link>
        </nav>

        <div className="flex items-center gap-3 lg:gap-4 shrink-0">
          <div className="relative flex items-center">
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              aria-label="Search"
              aria-expanded={showSearchInput}
              className="bg-transparent border-none cursor-pointer flex items-center p-1 sm:p-1.5 text-slate-700 hover:bg-primary-light hover:text-primary rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title="Search"
            >
              <Search size={21} className="text-slate-700" />
            </button>

            {showSearchInput && (
              <Suspense
                fallback={
                  <form className="absolute right-0 top-10 bg-white shadow-[0_8px_25px_rgba(0,0,0,0.15)] rounded-full py-2 px-4 flex items-center w-[min(280px,calc(100vw-40px))] border border-primary z-[100]">
                    <Search size={16} className="text-primary mr-1.5 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      aria-label="Search products input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-none outline-none text-sm w-full text-slate-800 bg-transparent"
                      autoFocus
                    />
                  </form>
                }
              >
                <HeaderSearchForm
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  setShowSearchInput={setShowSearchInput}
                  router={router}
                />
              </Suspense>
            )}
          </div>

          <Link
            href="/wishlist"
            aria-label="Open wishlist"
            className="hidden lg:flex relative text-slate-700 hover:bg-primary-light hover:text-primary p-1.5 rounded-full transition-colors items-center justify-center no-underline cursor-pointer bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary"
            title="Open wishlist"
          >
            <div className="relative flex items-center">
              <Heart size={22} className="text-current" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[0.62rem] font-extrabold w-[17px] h-[17px] rounded-full flex items-center justify-center border-2 border-white">
                  {wishlistCount}
                </span>
              )}
            </div>
          </Link>

          <button
            onClick={() => router.push('/cart')}
            aria-label="Open cart"
            className="relative text-slate-700 hover:bg-primary-light hover:text-primary p-1 sm:p-1.5 rounded-full transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            title="Open cart"
          >
            <div className="relative flex items-center">
              <ShoppingCart size={22} className="text-current" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[0.62rem] font-extrabold w-[17px] h-[17px] rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </div>
          </button>

          {user ? (
            <div
              className="hidden lg:block relative"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              <button
                onClick={() => setShowDropdown((prev) => !prev)}
                aria-label="Open account menu"
                aria-haspopup="true"
                aria-expanded={showDropdown}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-transparent border-none cursor-pointer font-bold text-sm py-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                <User size={20} />
                <span>Hi, {user.fullName?.split(' ')[0] || user.name?.split(' ')[0] || 'User'}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 text-slate-500 ${showDropdown ? 'rotate-180' : 'rotate-0'}`}
                />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] rounded-lg border border-slate-100 py-1.5 min-w-[130px] z-[100] flex flex-col">
                  <Link
                    href="/orders"
                    onClick={() => setShowDropdown(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 text-xs font-semibold no-underline transition-colors"
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setShowDropdown(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 text-xs font-semibold no-underline transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setShowDropdown(false);
                      router.push('/');
                    }}
                    className="px-4 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold border-none bg-transparent text-left cursor-pointer w-full transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              aria-label="Login or register account"
              className="hidden lg:flex items-center text-slate-700 hover:text-primary no-underline p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
              title="Login / Register"
            >
              <User size={22} className="text-current" />
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden bg-transparent border-none p-1 sm:p-1.5 cursor-pointer text-slate-800 hover:bg-primary-light hover:text-primary rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={24} className="text-slate-800" /> : <Menu size={24} className="text-slate-800" />}
          </button>
        </div>
      </div>

      {/* Desktop Mega Menu Dropdown (Bounded Centered Card) */}
      {megaMenuOpen && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-[min(calc(100vw-3rem),1120px)] bg-white shadow-[0_20px_45px_-10px_rgba(15,23,42,0.18)] z-[1000] rounded-2xl hidden lg:block border border-slate-200/80 mt-1.5 overflow-hidden"
          onMouseEnter={handleShopMouseEnter}
          onMouseLeave={handleShopMouseLeave}
        >
          <div className="w-full">
            <div className="grid grid-cols-[210px_210px_1fr_250px] gap-5 py-6 px-6 min-h-[320px] max-h-[490px]">
              <div className="flex flex-col gap-1 overflow-y-auto pr-1.5 border-none">
                <div className="text-[0.72rem] font-extrabold uppercase tracking-wider text-slate-400 mb-2 pl-2">Main Categories</div>
                {megaLoading ? (
                  <div className="text-xs text-slate-400 p-2">Loading...</div>
                ) : megaData.mainCategories.length === 0 ? (
                  <div className="text-xs text-slate-400 p-2">No categories found</div>
                ) : (
                  megaData.mainCategories.map((mainCat) => {
                    const mId = String(mainCat.id || mainCat._id);
                    const isActive = mId === String(activeMainCatId);
                    return (
                      <button
                        key={mId}
                        onMouseEnter={() => handleMainCategoryHover(mId)}
                        onClick={() => {
                          setMegaMenuOpen(false);
                          router.push(computeCmsTargetUrl({ type: 'MainCategory', id: mainCat.id || mainCat._id }));
                        }}
                        className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-150 border-none w-full text-left cursor-pointer ${
                          isActive ? 'bg-primary text-white font-semibold' : 'text-slate-700 bg-transparent hover:bg-primary hover:text-white'
                        }`}
                      >
                        <span>{mainCat.name}</span>
                        <ChevronRight size={14} className={isActive ? 'text-secondary' : 'text-slate-300'} />
                      </button>
                    );
                  })
                )}

                <button
                  onClick={() => {
                    setMegaMenuOpen(false);
                    router.push('/shop');
                  }}
                  className="mt-auto py-2 px-3 text-primary font-bold text-xs border border-dashed border-rose-200 rounded-lg bg-rose-50 hover:bg-primary hover:text-white cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span>Explore All Shop</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-1 overflow-y-auto pr-1.5 border-none">
                <div className="text-[0.72rem] font-extrabold uppercase tracking-wider text-slate-400 mb-2 pl-2">
                  {activeMainCat ? `${activeMainCat.name} Categories` : 'Categories'}
                </div>
                {activeCategoryList.length === 0 ? (
                  <div className="text-xs text-slate-400 p-2">Select a main category</div>
                ) : (
                  activeCategoryList.map((cat) => {
                    const cId = String(cat.id || cat._id);
                    const isActive = cId === String(activeCatId);
                    return (
                      <button
                        key={cId}
                        onMouseEnter={() => handleCategoryHover(cId)}
                        onClick={() => {
                          setMegaMenuOpen(false);
                          router.push(computeCmsTargetUrl({ type: 'Category', id: cat.id || cat._id }));
                        }}
                        className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-150 border-none w-full text-left cursor-pointer ${
                          isActive ? 'bg-primary text-white font-semibold' : 'text-slate-700 bg-transparent hover:bg-primary hover:text-white'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <ChevronRight size={14} className={isActive ? 'text-secondary' : 'text-slate-300'} />
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex flex-col gap-1 overflow-y-auto pr-1.5 border-none">
                <div className="text-[0.72rem] font-extrabold uppercase tracking-wider text-slate-400 mb-2 pl-2">
                  {activeCategory ? `${activeCategory.name} Subcategories` : 'Subcategories'}
                </div>
                {activeSubCategoryList.length === 0 ? (
                  <div className="text-xs text-slate-400 p-2">No subcategories</div>
                ) : (
                  activeSubCategoryList.map((sub) => (
                    <button
                      key={sub.id || sub._id}
                      onMouseEnter={() => setHoveredSubCat(sub)}
                      onClick={() => {
                        setMegaMenuOpen(false);
                        router.push(computeCmsTargetUrl({ type: 'SubCategory', id: sub.id || sub._id }));
                      }}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-150 border-none bg-transparent text-slate-700 hover:bg-primary hover:text-white w-full text-left cursor-pointer"
                    >
                      <span>{sub.name}</span>
                      <ArrowRight size={12} className="text-slate-300" />
                    </button>
                  ))
                )}
              </div>

              <div className="bg-[#faf7f8] border border-slate-100 rounded-xl p-0 overflow-hidden flex flex-col items-center text-center h-full w-full group">
                <div className="w-full h-full rounded-xl overflow-hidden bg-white flex items-center justify-center border-none">
                  {previewImage ? (
                    <img
                      src={getImageUrl(previewImage)}
                      alt={previewTitle}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-slate-300 text-xs flex flex-col items-center gap-1.5">
                      <img src="/uploads/fallbackimg.png" alt="product Preview" className="w-20 opacity-50" />
                      <span>No image available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex justify-end animate-drawer-fade lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-full max-w-[310px] h-full bg-white shadow-2xl flex flex-col animate-drawer-slide overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
                <img src={getImageUrl('/logo.png')} alt="CLIICKG" className="h-14 sm:h-16 w-auto max-w-[180px] object-contain" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="bg-slate-100 border-none p-2 cursor-pointer rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Menu Links - Sleek Minimalist Format */}
            <div className="p-2 flex flex-col flex-1 divide-y divide-slate-100">
              {/* Home */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3.5 font-semibold text-[0.95rem] no-underline transition-colors ${
                  pathname === '/' ? 'text-primary font-bold' : 'text-slate-800 hover:text-primary'
                }`}
              >
                <Home size={18} className={pathname === '/' ? 'text-primary' : 'text-slate-400'} />
                <span>Home</span>
              </Link>

              {/* Shop Categories */}
              <div>
                <button
                  onClick={() => setMobileShopOpen(!mobileShopOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 bg-transparent border-none font-semibold text-[0.95rem] cursor-pointer transition-colors ${
                    mobileShopOpen ? 'text-primary font-bold' : 'text-slate-800 hover:text-primary'
                  }`}
                >
                  <span className="flex items-center gap-3.5">
                    <Grid size={18} className={mobileShopOpen ? 'text-primary' : 'text-slate-400'} />
                    <span>Shop Categories</span>
                  </span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${mobileShopOpen ? 'rotate-180 text-primary' : 'rotate-0 text-slate-400'}`} />
                </button>

                {mobileShopOpen && (
                  <div className="flex flex-col gap-1.5 px-3 py-2.5 my-1 bg-slate-50/80 rounded-xl border border-slate-100">
                    <Link
                      href="/shop"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 px-3 text-xs font-bold text-primary bg-emerald-50/80 rounded-lg no-underline hover:bg-emerald-100/80 transition-colors"
                    >
                      <ArrowRight size={14} className="text-primary" />
                      <span>All Products</span>
                    </Link>

                    {megaData.mainCategories.map((mainCat) => {
                      const mId = String(mainCat.id || mainCat._id);
                      const isMainOpen = mId === String(mobileActiveMainCatId);
                      const cats = megaData.categories.filter((c) => getMainCatId(c) === mId);

                      return (
                        <div key={mId} className="flex flex-col">
                          <button
                            onClick={() => setMobileActiveMainCatId(isMainOpen ? null : mId)}
                            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-semibold border-none text-left cursor-pointer transition-colors ${
                              isMainOpen ? 'bg-white text-primary shadow-xs' : 'bg-transparent text-slate-700 hover:bg-white/60 hover:text-primary'
                            }`}
                          >
                            <span>{mainCat.name}</span>
                            <ChevronRight size={14} className={`transition-transform duration-200 ${isMainOpen ? 'rotate-90 text-primary' : 'rotate-0 text-slate-400'}`} />
                          </button>

                          {isMainOpen && cats.length > 0 && (
                            <div className="flex flex-col gap-1 pl-3 pr-1 py-1 border-l-2 border-primary/20 ml-3 my-1">
                              {cats.map((cat) => {
                                const cId = String(cat.id || cat._id);
                                const isCatOpen = cId === String(mobileActiveCatId);
                                const subCats = megaData.subCategories.filter((s) => getCatId(s) === cId);

                                return (
                                  <div key={cId} className="flex flex-col">
                                    <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/80 transition-colors">
                                      <Link
                                        href={computeCmsTargetUrl({ type: 'Category', id: cat.id || cat._id })}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-xs text-slate-700 font-semibold no-underline hover:text-primary"
                                      >
                                        {cat.name}
                                      </Link>
                                      {subCats.length > 0 && (
                                        <button
                                          onClick={() => setMobileActiveCatId(isCatOpen ? null : cId)}
                                          className="bg-transparent border-none p-1 cursor-pointer flex items-center justify-center"
                                        >
                                          <ChevronDown size={13} className={`transition-transform duration-200 ${isCatOpen ? 'rotate-180 text-primary' : 'text-slate-400'}`} />
                                        </button>
                                      )}
                                    </div>

                                    {isCatOpen && subCats.length > 0 && (
                                      <div className="flex flex-col gap-1 pl-3.5 py-1 border-l border-slate-200 ml-2">
                                        {subCats.map((sub) => (
                                          <Link
                                            key={sub.id || sub._id}
                                            href={computeCmsTargetUrl({ type: 'SubCategory', id: sub.id || sub._id })}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="text-[0.78rem] text-slate-600 font-medium no-underline hover:text-primary py-0.5"
                                          >
                                            • {sub.name}
                                          </Link>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Today's Deals */}
              {isDealsActive && (
                <Link
                  href="/today-deals"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 font-semibold text-[0.95rem] no-underline transition-colors ${
                    pathname === '/today-deals' ? 'text-primary font-bold' : 'text-slate-800 hover:text-primary'
                  }`}
                >
                  <Tag size={18} className={pathname === '/today-deals' ? 'text-primary' : 'text-slate-400'} />
                  <span>Today's Deals</span>
                </Link>
              )}

              {/* Wishlist */}
              <Link
                href="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3.5 font-semibold text-[0.95rem] no-underline transition-colors ${
                  pathname === '/wishlist' ? 'text-primary font-bold' : 'text-slate-800 hover:text-primary'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <Heart size={18} className={pathname === '/wishlist' ? 'text-primary' : 'text-slate-400'} />
                  <span>Wishlist</span>
                </span>
                {wishlistCount > 0 && (
                  <span className="bg-primary text-white text-[0.7rem] py-0.5 px-2 rounded-full font-extrabold">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Auth / Account Links */}
              {user ? (
                <>
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 font-semibold text-[0.95rem] no-underline transition-colors ${
                      pathname === '/orders' ? 'text-primary font-bold' : 'text-slate-800 hover:text-primary'
                    }`}
                  >
                    <Package size={18} className={pathname === '/orders' ? 'text-primary' : 'text-slate-400'} />
                    <span>My Orders</span>
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 font-semibold text-[0.95rem] no-underline transition-colors ${
                      pathname === '/profile' ? 'text-primary font-bold' : 'text-slate-800 hover:text-primary'
                    }`}
                  >
                    <User size={18} className={pathname === '/profile' ? 'text-primary' : 'text-slate-400'} />
                    <span>Profile ({user.fullName?.split(' ')[0] || user.name?.split(' ')[0] || 'User'})</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); setMobileMenuOpen(false); router.push('/'); }}
                    className="flex items-center gap-3.5 w-full px-4 py-3.5 font-semibold text-[0.95rem] text-left bg-transparent border-none text-rose-600 hover:bg-rose-50/50 cursor-pointer transition-colors"
                  >
                    <LogOut size={18} className="text-rose-600" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 font-semibold text-[0.95rem] no-underline transition-colors ${
                    pathname === '/login' ? 'text-primary font-bold' : 'text-slate-800 hover:text-primary'
                  }`}
                >
                  <User size={18} className={pathname === '/login' ? 'text-primary' : 'text-slate-400'} />
                  <span>Login / Register</span>
                </Link>
              )}

              {/* Contact Us */}
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3.5 font-semibold text-[0.95rem] no-underline transition-colors ${
                  pathname === '/contact' ? 'text-primary font-bold' : 'text-slate-800 hover:text-primary'
                }`}
              >
                <PhoneCall size={18} className={pathname === '/contact' ? 'text-primary' : 'text-slate-400'} />
                <span>Contact Us</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
