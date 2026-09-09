import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Common/Modal';
import {
  Plus, Edit2, Trash2, Tag, Search, BarChart2, CheckCircle, XCircle,
  Users, ShoppingBag, IndianRupee, Sparkles, Filter, Calendar, ShieldAlert,
  Percent, ArrowRight, Layers, Eye, Smartphone, Globe, CreditCard, RefreshCw, Loader2
} from 'lucide-react';

const DISCOUNT_COMPONENTS = [
  { id: 'Product Base Price', label: 'Product Base Price (Per Product Line Cap)' },
  { id: 'Cart Subtotal', label: 'Cart Subtotal (Entire Cart Level Cap)' }
];

const CUSTOMER_ELIGIBILITY_OPTIONS = [
  { id: 'All Customers', label: 'All Customers', desc: 'Available to any registered or guest user' },
  { id: 'New Customer', label: 'New Customer', desc: 'Registered within last 30 days or no past orders' },
  { id: 'Returning Customer', label: 'Returning Customer', desc: 'Customers with at least 1 completed order' },
  { id: 'First Purchase', label: 'First Purchase (completedOrders == 0)', desc: 'Valid strictly on customer first order' },
  { id: 'Second Purchase', label: 'Second Purchase (completedOrders == 1)', desc: 'Valid strictly on customer second order' },
  { id: 'Third Purchase', label: 'Third Purchase (completedOrders == 2)', desc: 'Valid strictly on customer third order' },
  { id: 'Nth Purchase', label: 'Nth Purchase (completedOrders == N-1)', desc: 'Configure specific purchase sequence number' },
  { id: 'VIP Customer', label: 'VIP Customer', desc: '3+ orders or lifetime spend >= ₹50,000' },
  { id: 'Specific Customer', label: 'Specific Customer', desc: 'Target individual customer by Email, Mobile, or Name' }
];


const PromoList = () => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'analytics'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive' | 'Expired'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalTab, setModalTab] = useState('general'); // 'general','customer','product','conditions','display','analytics'

  // Analytics Overview Data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Form State - General
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [message, setMessage] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [badgeColor, setBadgeColor] = useState('#D97706');
  const [backgroundColor, setBackgroundColor] = useState('#FEF3C7');
  const [priority, setPriority] = useState(0);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Active');

  const [discountType, setDiscountType] = useState('Percentage');
  const [applyDiscountOn, setApplyDiscountOn] = useState(['Product Base Price']);
  const [discountValue, setDiscountValue] = useState(10);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(2000);
  const [minOrderAmount, setMinOrderAmount] = useState(1000);
  const [maxOrderAmount, setMaxOrderAmount] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [maxQuantity, setMaxQuantity] = useState(0);

  const [noOfUsers, setNoOfUsers] = useState(500);
  const [repeatUsage, setRepeatUsage] = useState(1);
  const [unlimitedUsage, setUnlimitedUsage] = useState(false);

  // Form State - Customer Type
  const [customerEligibility, setCustomerEligibility] = useState('All Customers');
  const [nthPurchaseCount, setNthPurchaseCount] = useState(4);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const customerSearchTimeoutRef = useRef(null);

  const toggleCustomerSelection = (customer) => {
    const cId = String(customer.id || customer._id || customer.email || customer.phone || customer.mobile || customer.mobileNumber);
    setSelectedCustomers(prev => {
      const exists = prev.some(item => String(item.id || item._id || item.email || item.phone || item.mobile || item.mobileNumber) === cId);
      if (exists) {
        return prev.filter(item => String(item.id || item._id || item.email || item.phone || item.mobile || item.mobileNumber) !== cId);
      } else {
        return [...prev, customer];
      }
    });
  };

  const removeCustomerFromSelection = (customer) => {
    const cId = String(customer.id || customer._id || customer.email || customer.phone || customer.mobile || customer.mobileNumber);
    setSelectedCustomers(prev => prev.filter(item => String(item.id || item._id || item.email || item.phone || item.mobile || item.mobileNumber) !== cId));
  };
  const [applyToEntireStore, setApplyToEntireStore] = useState(true);
  const [applyToMainCategories, setApplyToMainCategories] = useState(false);
  const [applyToCategories, setApplyToCategories] = useState(false);
  const [applyToSubCategories, setApplyToSubCategories] = useState(false);
  const [applyToProducts, setApplyToProducts] = useState(false);

  const [mainCats, setMainCats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  const [selectedMainCategoryIds, setSelectedMainCategoryIds] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedOccasions, setSelectedOccasions] = useState([]);
  const [productLimit, setProductLimit] = useState(5);

  // Search Products State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Form State - Conditions
  const [pincodesInput, setPincodesInput] = useState('');
  const [registeredWithinDays, setRegisteredWithinDays] = useState(0);

  const { showToast } = useToast();

  useEffect(() => {
    fetchPromos();
    fetchScopesCatalog();
    fetchAnalytics();
  }, []);

  const fetchPromos = async (statusParam = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.get('/promos', { params: { status: statusParam } });
      const promoArray = Array.isArray(res.data)
        ? res.data
        : (res.data?.data || res.data?.promos || []);

      setItems(promoArray.map(item => ({
        ...item,
        _id: item.id || item._id,
        name: item.name || item.title || item.code || '',
        minOrderAmount: Number(item.minOrderAmount || item.minOrderValue || 0),
        maxDiscountAmount: Number(item.maxDiscountAmount || item.maxCap || 0),
        discountValue: Number(item.discountValue || item.discount || 0),
      })));
    } catch (err) {
      console.error('Failed to load promos:', err);
      showToast('Failed to load Promo Codes', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchScopesCatalog = async () => {
    try {
      const [mRes, cRes, sRes] = await Promise.all([
        api.get('/main-categories').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/sub-categories').catch(() => ({ data: [] }))
      ]);
      setMainCats(Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data || []));
      setCategories(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.data || []));
      setSubCategories(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.data || []));
    } catch (err) {
      console.error('Catalog fetch error:', err);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await api.get('/promos/analytics');
      setAnalyticsData(res.data || null);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setAnalyticsData(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleSearchCustomers = (q = '') => {
    setCustomerSearchQuery(q);
    setSearchingCustomers(true);

    if (customerSearchTimeoutRef.current) {
      clearTimeout(customerSearchTimeoutRef.current);
    }

    customerSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/promos/customer-search?query=${encodeURIComponent(q || '')}`);
        setCustomerSearchResults(res.data || []);
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);
  };

  const handleSearchProducts = async (q) => {
    setProductSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setSearchedProducts([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const res = await api.get('/products', { params: { search: q, limit: 10 } });
      setSearchedProducts(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Product search error:', err);
    } finally {
      setSearchingProducts(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setShortDescription('');
    setLongDescription('');
    setMessage('');
    setIconUrl('');
    setBannerUrl('');
    setBadgeColor('');
    setBackgroundColor('#FEF3C7');
    setPriority(0);
    setDisplayOrder(0);

    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(nextMonth);
    setStatus('Active');

    setDiscountType('Percentage');
    setApplyDiscountOn(['Product Base Price']);
    setDiscountValue(10);
    setMaxDiscountAmount(2000);
    setMinOrderAmount(1000);
    setMaxOrderAmount(0);
    setMinQuantity(0);
    setMaxQuantity(0);

    setNoOfUsers(500);
    setRepeatUsage(1);
    setUnlimitedUsage(false);

    setCustomerEligibility('All Customers');
    setNthPurchaseCount(4);
    setSelectedCustomers([]);
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);

    setApplyToEntireStore(true);
    setApplyToMainCategories(false);
    setApplyToCategories(false);
    setApplyToSubCategories(false);
    setApplyToProducts(false);

    setSelectedMainCategoryIds([]);
    setSelectedCategoryIds([]);
    setSelectedSubCategoryIds([]);
    setSelectedProductIds([]);
    setSelectedGenders([]);
    setSelectedOccasions([]);
    setProductLimit(5);

    setPincodesInput('');
    setRegisteredWithinDays(0);

    setEditingId(null);
    setModalTab('general');
  };

  const handleOpenModal = (promo = null) => {
    if (!promo) {
      resetForm();
      setIsModalOpen(true);
      return;
    }

    setEditingId(promo._id);
    setName(promo.name || promo.code || '');
    setCode(promo.code || '');
    setShortDescription(promo.shortDescription || promo.message || '');
    setLongDescription(promo.longDescription || '');
    setMessage(promo.message || promo.shortDescription || '');
    setIconUrl(promo.iconUrl || '');
    setBannerUrl(promo.bannerUrl || '');
    setBadgeColor(promo.badgeColor);
    setBackgroundColor(promo.backgroundColor);
    setPriority(promo.priority || 0);
    setDisplayOrder(promo.displayOrder || 0);

    setStartDate(promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '');
    setEndDate(promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '');
    setStatus(promo.status || 'Active');

    const rawDT = promo.discountType || 'Percentage';
    setDiscountType(rawDT === 'Flat Amount' || rawDT === 'Flat' ? 'Flat' : 'Percentage');

    const rawTarget = promo.targetComponent || (Array.isArray(promo.applyDiscountOn) ? promo.applyDiscountOn[0] : 'Product Base Price');
    let normTarget = 'Product Base Price';
    if (String(rawTarget).toLowerCase().includes('subtotal')) {
      normTarget = 'Cart Subtotal';
    }
    setApplyDiscountOn([normTarget]);

    setDiscountValue(promo.discountValue || promo.discount || 0);
    setMaxDiscountAmount(promo.maxDiscountAmount || 0);
    setMinOrderAmount(promo.minOrderAmount || 0);
    setMaxOrderAmount(promo.maxOrderAmount || 0);
    setMinQuantity(promo.minQuantity || 0);
    setMaxQuantity(promo.maxQuantity || 0);

    setNoOfUsers(promo.noOfUsers || 100);
    setRepeatUsage(promo.repeatUsage || 1);
    setUnlimitedUsage(Boolean(promo.unlimitedUsage));

    const cElig = promo ? (promo.customerEligibility || promo.userType) : 'All Customers';
    setCustomerEligibility(cElig);
    setNthPurchaseCount(promo ? promo.nthPurchaseCount : 4);

    if (promo && Array.isArray(promo.specificCustomers) && promo.specificCustomers.length > 0) {
      setSelectedCustomers(promo.specificCustomers);
    } else if (promo && Array.isArray(promo.specificCustomerIds) && promo.specificCustomerIds.length > 0) {
      const idList = promo.specificCustomerIds;
      const parsed = [];
      idList.forEach(val => {
        if (!val) return;
        const str = String(val).trim();
        if (str.includes('@')) {
          if (!parsed.some(p => p.email === str)) {
            parsed.push({ id: str, email: str, name: str.split('@')[0], phone: '', mobile: '', mobileNumber: '' });
          }
        } else {
          if (!parsed.some(p => p.phone === str || p.mobile === str || p.id === str)) {
            parsed.push({ id: str, phone: str, mobile: str, mobileNumber: str, name: str, email: '' });
          }
        }
      });
      setSelectedCustomers(parsed);
    } else if (promo && (promo.specificCustomerEmail || promo.specificCustomerPhone)) {
      setSelectedCustomers([{
        id: promo.specificCustomerId || promo.specificCustomerEmail || promo.specificCustomerPhone,
        name: promo.specificCustomerName || 'Selected Customer',
        email: promo.specificCustomerEmail || '',
        phone: promo.specificCustomerPhone || ''
      }]);
    } else {
      setSelectedCustomers([]);
    }

    if (cElig === 'Specific Customer') {
      handleSearchCustomers('');
    }

    setApplyToEntireStore(Boolean(promo.applyToEntireStore));
    setApplyToMainCategories(Boolean(promo.applyToMainCategories));
    setApplyToCategories(Boolean(promo.applyToCategories));
    setApplyToSubCategories(Boolean(promo.applyToSubCategories));
    setApplyToProducts(Boolean(promo.applyToProducts));

    setSelectedMainCategoryIds(promo.mainCategoryIds || []);
    setSelectedCategoryIds(promo.categoryIds || []);
    setSelectedSubCategoryIds(promo.subCategoryIds || []);
    setSelectedProductIds(promo.productIds || []);
    setSelectedGenders(promo.genders || []);
    setSelectedOccasions(promo.occasions || []);
    setProductLimit(promo.productLimit || 5);

    setPincodesInput((promo.allowedPincodes || []).join(', '));
    setRegisteredWithinDays(promo.registeredWithinDays || 0);

    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!code) {
      showToast('Promo Code is required', 'error');
      return;
    }

    const payload = {
      title: name || code,
      name: name || code,
      code: code.trim().toUpperCase(),
      message: shortDescription || message || `Get ${discountValue}% OFF`,
      shortDescription,
      longDescription,
      iconUrl,
      bannerUrl,
      badgeColor,
      backgroundColor,
      priority: Number(priority || 0),
      displayOrder: Number(displayOrder || 0),

      startDate: startDate ? new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`).toISOString() : null,
      endDate: endDate ? new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`).toISOString() : null,
      status,

      discountType,
      targetComponent: Array.isArray(applyDiscountOn) ? (applyDiscountOn[0] || 'Product Base Price') : 'Product Base Price',
      applyDiscountOn,
      discount: Number(discountValue),
      discountValue: Number(discountValue),
      maxDiscountAmount: Number(maxDiscountAmount || 0),
      minOrderAmount: Number(minOrderAmount || 0),
      maxOrderAmount: Number(maxOrderAmount || 0),
      minQuantity: Number(minQuantity || 0),
      maxQuantity: Number(maxQuantity || 0),

      usageLimit: Number(noOfUsers || 0),
      noOfUsers: Number(noOfUsers || 0),
      perUserLimit: Number(repeatUsage || 1),
      repeatUsage: Number(repeatUsage || 1),
      unlimitedUsage,

      userType: customerEligibility,
      customerEligibility,
      nthPurchaseCount: Number(nthPurchaseCount || 0),
      specificCustomers: selectedCustomers,
      specificCustomerIds: Array.from(new Set(selectedCustomers.map(c => {
        const isHexId = (str) => /^[0-9a-fA-F]{20,32}$/.test(String(str || ''));
        const phone = String(c.phone || c.mobile || c.mobileNumber || '').trim();
        if (phone && !isHexId(phone)) return phone;
        const email = String(c.email || '').trim().toLowerCase();
        if (email) return email;
        return String(c.id || c._id || '').trim();
      }).filter(Boolean))),
      specificCustomerEmails: selectedCustomers.map(c => c.email).filter(Boolean),
      specificCustomerPhones: selectedCustomers.map(c => c.phone || c.mobile || c.mobileNumber).filter(Boolean),
      specificCustomerNames: selectedCustomers.map(c => c.name || c.fullName).filter(Boolean),

      specificCustomerEmail: selectedCustomers[0]?.email || '',
      specificCustomerPhone: selectedCustomers[0]?.phone || selectedCustomers[0]?.mobile || selectedCustomers[0]?.mobileNumber || '',
      specificCustomerName: selectedCustomers[0]?.name || selectedCustomers[0]?.fullName || '',

      applyToEntireStore,
      applyToMainCategories,
      applyToCategories,
      applyToSubCategories,
      applyToProducts,

      mainCategoryIds: selectedMainCategoryIds,
      categoryIds: selectedCategoryIds,
      subCategoryIds: selectedSubCategoryIds,
      productIds: selectedProductIds,
      genders: selectedGenders,
      occasions: selectedOccasions,
      productLimit: Number(productLimit || 5),

      allowedPincodes: pincodesInput ? pincodesInput.split(',').map(p => p.trim()).filter(Boolean) : [],
      registeredWithinDays: Number(registeredWithinDays || 0)
    };

    try {
      if (editingId) {
        await api.put(`/promos/${editingId}`, payload);
        showToast('Promo Code updated successfully', 'success');
      } else {
        await api.post('/promos', payload);
        showToast('Promo Code created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchPromos();
      fetchAnalytics();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save Promo Code', 'error');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/promos/${id}/status`);
      showToast('Status updated successfully', 'success');
      fetchPromos();
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Promo Code?')) return;
    try {
      await api.delete(`/promos/${id}`);
      showToast('Promo Code deleted', 'success');
      fetchPromos();
      fetchAnalytics();
    } catch (err) {
      showToast('Failed to delete Promo Code', 'error');
    }
  };

  const toggleComponentTarget = (compId) => {
    if (applyDiscountOn.includes(compId)) {
      setApplyDiscountOn(applyDiscountOn.filter(c => c !== compId));
    } else {
      setApplyDiscountOn([...applyDiscountOn, compId]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="card-minimal p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1 flex items-center gap-2">
            <Tag size={22} className="text-admin-accent" />
            Promotions &amp; Coupons
          </h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab(activeTab === 'list' ? 'analytics' : 'list')}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <BarChart2 size={16} />
            {activeTab === 'list' ? 'Analytics View' : 'Promotions List'}
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <Plus size={16} />
            Create Promo Code
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-minimal p-5">
            <div className="text-xs text-admin-text-muted font-medium uppercase tracking-wider">Total Usage Count</div>
            <div className="text-2xl font-bold text-admin-text-primary mt-1">{analyticsData.totalUsage || 0} orders</div>
            <div className="text-xs text-emerald-600 mt-1 font-semibold">✓ {analyticsData.successfulUsage || 0} Successful</div>
          </div>

          <div className="card-minimal p-5">
            <div className="text-xs text-admin-text-muted font-medium uppercase tracking-wider">Total Discount Given</div>
            <div className="text-2xl font-bold text-admin-text-primary mt-1">₹{(analyticsData.totalDiscountGiven || 0).toLocaleString('en-IN')}</div>
            <div className="text-xs text-admin-text-muted mt-1">Across all customer redemptions</div>
          </div>

          <div className="card-minimal p-5">
            <div className="text-xs text-admin-text-muted font-medium uppercase tracking-wider">Revenue Generated</div>
            <div className="text-2xl font-bold text-admin-accent mt-1">₹{(analyticsData.totalRevenueGenerated || 0).toLocaleString('en-IN')}</div>
            <div className="text-xs text-admin-text-secondary mt-1 font-medium">From promo driven sales</div>
          </div>

          <div className="card-minimal p-5">
            <div className="text-xs text-admin-text-muted font-medium uppercase tracking-wider">Conversion Rate</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{analyticsData.conversionRate || 0}%</div>
            <div className="text-xs text-emerald-600 mt-1 font-medium">{analyticsData.totalActivePromos || 0} Active Campaigns</div>
          </div>
        </div>
      )}

      {/* Status Filter Bar */}
      {activeTab === 'list' && (
        <div className="flex gap-2">
          {[
            { id: 'All', label: 'All Promotions' },
            { id: 'Active', label: 'Active' },
            { id: 'Inactive', label: 'Inactive' },
            { id: 'Expired', label: 'Expired / History' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setStatusFilter(t.id);
                fetchPromos(t.id);
              }}
              className={`py-1.5 px-3.5 rounded text-xs font-semibold cursor-pointer border transition-colors ${statusFilter === t.id
                ? 'border-admin-accent bg-admin-accent text-white'
                : 'border-admin-border bg-admin-card text-admin-text-secondary hover:bg-admin-hover'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* MAIN VIEW: LIST OR ANALYTICS */}
      {activeTab === 'list' ? (
        <div className="card-minimal p-6">
          {loading ? (
            <div className="p-12 text-center text-admin-text-muted text-xs">Loading promotions database...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Tag size={48} className="text-admin-text-muted mx-auto mb-3" />
              <h3 className="heading-3 m-0">No Promo Codes Found</h3>
              <p className="text-admin-text-muted text-xs mt-1">Click &quot;Create Promo Code&quot; to launch a promotion campaign.</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Coupon &amp; Code</th>
                    <th>Discount &amp; Rules</th>
                    <th>Target Components</th>
                    <th>Customer Eligibility</th>
                    <th>Validity Period</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isExpired = item.endDate && new Date(item.endDate) < new Date();
                    const isInactive = item.status === 'Inactive' || item.status === 'inactive';
                    const badgeClasses = isInactive
                      ? 'border border-admin-border bg-admin-subtle text-admin-text-muted'
                      : isExpired
                        ? 'border border-amber-400/30 bg-amber-400/10 text-amber-600'
                        : 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-600';

                    const badgeLabel = isInactive ? '○ Inactive' : isExpired ? '⌛ Expired (History)' : '● Active';

                    return (
                      <tr key={item._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="badge badge-accent font-bold">
                              {item.code}
                            </span>
                            <div>
                              <div className="font-semibold text-admin-text-primary">{item.name || item.code}</div>
                              <div className="text-xs text-admin-text-muted">{item.shortDescription || item.message}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="font-semibold text-admin-text-primary">
                            {item.discountType === 'Percentage' ? `${item.discountValue || item.discount}% OFF` : `₹${item.discountValue || item.discount} OFF`}
                          </div>
                          <div className="text-xs text-admin-text-muted">
                            Min Cart: ₹{(item.minOrderAmount || 0).toLocaleString('en-IN')}
                            {item.maxDiscountAmount > 0 && ` | Max Cap: ₹${item.maxDiscountAmount}`}
                          </div>
                        </td>

                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(item.applyDiscountOn && item.applyDiscountOn.length > 0 ? item.applyDiscountOn : [item.targetComponent || 'Product Base Price']).slice(0, 3).map((comp, idx) => (
                              <span key={idx} className="bg-admin-subtle text-admin-text-secondary border border-admin-border text-[11px] font-medium py-0.5 px-2 rounded">
                                {comp}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td>
                          <div className="text-xs font-medium text-admin-text-primary">
                            {item.customerEligibility || item.userType || 'All Customers'}
                          </div>
                          {item.specificCustomerEmail && (
                            <div className="text-[11px] text-admin-text-muted">{item.specificCustomerEmail}</div>
                          )}
                        </td>

                        <td className="text-xs text-admin-text-muted">
                          <div>{item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A'}</div>
                          <div>to {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'N/A'}</div>
                        </td>

                        <td>
                          <button
                            onClick={() => handleToggleStatus(item._id)}
                            className={`py-1 px-2.5 rounded-full text-xs font-semibold cursor-pointer ${badgeClasses}`}
                          >
                            {badgeLabel}
                          </button>
                        </td>

                        <td className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="btn-secondary py-1 px-2 text-admin-accent"
                              title="Edit Promotion"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="btn-danger py-1 px-2"
                              title="Delete Promotion"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Analytics View Tab */
        <div className="card-minimal p-6">
          <h2 className="heading-2 mb-4">Top Performing Coupons</h2>
          {analyticsData && analyticsData.topCoupons ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {analyticsData.topCoupons.map((c, idx) => (
                <div key={idx} className="p-4 border border-admin-border rounded bg-admin-subtle">
                  <div className="flex justify-between items-center mb-2">
                    <span className="badge badge-accent font-bold">
                      {c.code}
                    </span>
                    <span className="text-xs font-semibold text-admin-accent">{c.usage} Redemptions</span>
                  </div>
                  <div className="text-xs text-admin-text-muted">Total Discount Given: <strong className="text-admin-text-primary">₹{c.discount.toLocaleString('en-IN')}</strong></div>
                  <div className="text-xs text-admin-text-muted mt-0.5">Revenue Generated: <strong className="text-emerald-600">₹{c.revenue.toLocaleString('en-IN')}</strong></div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-admin-text-muted text-xs">No redemption data recorded yet.</p>
          )}
        </div>
      )}

      {/* 6-SECTION PROMO CREATOR / EDITOR MODAL / DRAWER */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit  Promotion' : 'Create  Promotion'}
        variant="drawer"
        width="75vw"
      >
        <div className="w-full">
          {/* Modal Section Tabs */}
          <div className="flex gap-2 border-b border-admin-border pb-3.5 mb-6 flex-wrap">
            {[
              { id: 'general', label: '1. General Settings' },
              { id: 'customer', label: '2. Customer Type' },
              { id: 'product', label: '3. Product Scope' },
              { id: 'display', label: '4. Display & UI Preview' },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setModalTab(t.id)}
                className={`py-2 px-3.5 rounded text-xs font-semibold cursor-pointer border transition-colors ${modalTab === t.id
                  ? 'border-admin-accent bg-admin-accent text-white'
                  : 'border-admin-border bg-admin-subtle text-admin-text-secondary hover:bg-admin-hover'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSave}>
            {/* TAB 1: GENERAL */}
            {modalTab === 'general' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Promo Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Festive Discount"
                    className="form-control text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Promo Code *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. NEW01"
                    className="form-control text-xs font-bold uppercase tracking-wider"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">Short Description / Offer Tagline</label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={e => setShortDescription(e.target.value)}
                    placeholder="e.g. Get 10% OFF ..."
                    className="form-control text-xs"
                  />
                </div>

                <div>
                  <label className="form-label">Discount Type *</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value)}
                    className="form-control text-xs"
                  >
                    <option value="Percentage">Percentage Discount (%)</option>
                    <option value="Flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Discount Value *</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder="e.g. 10 or 500"
                    className="form-control text-xs"
                    required
                  />
                </div>

                {/* APPLY DISCOUNT ON MULTI-SELECT */}
                <div className="sm:col-span-2 bg-admin-subtle p-4 rounded border border-admin-border">
                  <label className="form-label mb-2">
                    Apply Discount On:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {DISCOUNT_COMPONENTS.map(c => (
                      <label key={c.id} className="flex items-center gap-1.5 text-xs cursor-pointer text-admin-text-secondary">
                        <input
                          type="checkbox"
                          checked={applyDiscountOn.includes(c.id)}
                          onChange={() => toggleComponentTarget(c.id)}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Max Discount Amount (Cap ₹)</label>
                  <input
                    type="number"
                    value={maxDiscountAmount}
                    onChange={e => setMaxDiscountAmount(e.target.value)}
                    placeholder="0 for no limit"
                    className="form-control text-xs"
                  />
                </div>

                <div>
                  <label className="form-label">Min Cart Value (₹)</label>
                  <input
                    type="number"
                    value={minOrderAmount}
                    onChange={e => setMinOrderAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="form-control text-xs"
                  />
                </div>

                <div>
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="form-control text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="form-control text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Total Global Usage Limit</label>
                  <input
                    type="number"
                    value={noOfUsers}
                    onChange={e => setNoOfUsers(e.target.value)}
                    className="form-control text-xs"
                  />
                </div>

                <div>
                  <label className="form-label">Usage Per Customer</label>
                  <input
                    type="number"
                    value={repeatUsage}
                    onChange={e => setRepeatUsage(e.target.value)}
                    className="form-control text-xs"
                  />
                </div>

              </div>
            )}

            {/* TAB 2: CUSTOMER TYPE */}
            {modalTab === 'customer' && (
              <div>
                <label className="form-label mb-2.5">
                  Select Customer Eligibility Rule
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-5">
                  {CUSTOMER_ELIGIBILITY_OPTIONS.map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setCustomerEligibility(opt.id);
                        if (opt.id === 'Specific Customer' && customerSearchResults.length === 0) {
                          handleSearchCustomers('');
                        }
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${customerEligibility === opt.id
                        ? 'border-admin-accent bg-admin-accent/10 shadow-xs font-semibold'
                        : 'border-admin-border bg-admin-card hover:bg-admin-hover'
                        }`}
                    >
                      <div className="font-semibold text-xs text-admin-text-primary">{opt.label}</div>
                      <div className="text-[11px] text-admin-text-muted mt-0.5">{opt.desc}</div>
                    </div>
                  ))}
                </div>

                {customerEligibility === 'Nth Purchase' && (
                  <div className="mb-5 bg-admin-subtle p-3.5 rounded-lg border border-admin-border">
                    <label className="form-label mb-1.5">
                      Specify Nth Order Count (e.g. 4 for 4th Order, completedOrders == 3)
                    </label>
                    <input
                      type="number"
                      value={nthPurchaseCount}
                      onChange={e => setNthPurchaseCount(e.target.value)}
                      className="form-control text-xs w-48"
                    />
                  </div>
                )}

                {customerEligibility === 'Specific Customer' && (
                  <div className="bg-admin-subtle p-4 rounded-xl border border-admin-border flex flex-col gap-4">
                    {/* Multi-Choice Selected Customers Header & Chips */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <label className="form-label mb-0 font-bold text-xs text-admin-text-primary flex items-center gap-2">
                          <span>Selected Specific Customers ({selectedCustomers.length})</span>
                          <span className="bg-admin-accent/15 text-admin-accent text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                            Multi-Choice
                          </span>
                        </label>
                        {selectedCustomers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedCustomers([])}
                            className="text-[11px] text-rose-500 font-medium hover:underline cursor-pointer bg-transparent border-none p-0"
                          >
                            Clear All ({selectedCustomers.length})
                          </button>
                        )}
                      </div>

                      {selectedCustomers.length > 0 ? (
                        <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl max-h-40 overflow-y-auto">
                          {selectedCustomers.map((c, i) => {
                            const isHexId = (str) => /^[0-9a-fA-F]{20,32}$/.test(String(str || ''));
                            const rawPhone = String(c.phone || c.mobile || c.mobileNumber || (!isHexId(c.id) && !String(c.id || '').includes('@') ? c.id : '')).trim();
                            const hasValidPhone = rawPhone !== '' && !isHexId(rawPhone);

                            const displayMain = hasValidPhone
                              ? rawPhone
                              : (c.email || 'Customer');

                            const displaySub = hasValidPhone
                              ? (c.email || ((c.name && c.name !== rawPhone && !isHexId(c.name)) ? c.name : ''))
                              : '';

                            return (
                              <div
                                key={c.id || c._id || i}
                                className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-2 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                              >
                                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] shrink-0 font-medium">
                                  {hasValidPhone ? '📱' : (c.email ? '✉️' : '👤')}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold block truncate max-w-[150px] text-[11px] tracking-tight">
                                    {displayMain}
                                  </span>
                                  {displaySub && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate max-w-[150px]">
                                      {displaySub}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCustomerFromSelection(c)}
                                  className="text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-bold text-xs border-none cursor-pointer p-0.5 rounded-md ml-1 transition-colors"
                                  title="Remove customer"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs text-amber-700 dark:text-amber-300 font-medium">
                          ⚠️ No specific customers chosen yet. Select one or multiple customers from the list below. In case you don't want a specific customer restriction, simply leave empty.
                        </div>
                      )}
                    </div>

                    {/* Customer Multi-Choice Selection List */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <label className="form-label mb-0 font-bold text-xs text-admin-text-primary">
                          Choose Customers ({customerSearchResults.length} Available)
                        </label>
                      </div>

                      <div className="relative mb-3">
                        <input
                          type="text"
                          value={customerSearchQuery}
                          onChange={e => handleSearchCustomers(e.target.value)}
                          placeholder="Search customer by name, mobile number, or email..."
                          className="form-control text-xs"
                          style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                        />
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted pointer-events-none" />
                        {searchingCustomers && (
                          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-accent animate-spin" />
                        )}
                      </div>

                      {/* Stable Results Container - Eliminates Layout Shifts / Page Shaking */}
                      <div className="min-h-[200px] flex flex-col justify-start">
                        {!searchingCustomers && customerSearchResults.length === 0 && (
                          <div className="text-xs text-admin-text-muted py-8 text-center bg-admin-card rounded-lg border border-admin-border my-auto">
                            No customer profiles found matching "{customerSearchQuery}". Try a different mobile or email.
                          </div>
                        )}

                        {customerSearchResults.length > 0 && (
                          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 transition-opacity ${searchingCustomers ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            {customerSearchResults.map((c, i) => {
                              const isChosen = selectedCustomers.some(
                                sc => String(sc._id || sc.id) === String(c._id || c.id) || (sc.email && sc.email === c.email) || (sc.phone && sc.phone === (c.phone || c.mobile || c.mobileNumber))
                              );
                              return (
                                <div
                                  key={c.id || c._id || i}
                                  onClick={() => toggleCustomerSelection(c)}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 ${isChosen
                                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                                      : 'border-admin-border bg-admin-card hover:bg-admin-hover'
                                    }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-xs text-admin-text-primary truncate flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isChosen}
                                        onChange={() => { }} // Handled by parent container click
                                        className="rounded text-emerald-600 cursor-pointer"
                                      />
                                      <span className="truncate">{c.name || c.fullName || 'Registered User'}</span>
                                    </div>
                                    <div className="text-[11px] text-admin-text-secondary truncate mt-0.5 pl-6">
                                      📞 {c.phone || c.mobile || c.mobileNumber || 'N/A'}
                                    </div>
                                    <div className="text-[11px] text-admin-text-muted truncate pl-6">
                                      ✉️ {c.email || 'N/A'}
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {isChosen ? (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleCustomerSelection(c); }}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 text-white border-none cursor-pointer flex items-center gap-1"
                                      >
                                        ✓ Selected
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleCustomerSelection(c); }}
                                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-admin-accent/15 text-admin-accent hover:bg-admin-accent hover:text-white transition-colors border-none cursor-pointer"
                                      >
                                        + Add
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PRODUCT SCOPE */}
            {modalTab === 'product' && (
              <div>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-1.5 font-medium text-xs text-admin-text-primary cursor-pointer">
                    <input type="radio" name="storeScope" checked={applyToEntireStore} onChange={() => setApplyToEntireStore(true)} /> Entire Store
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-xs text-admin-text-primary cursor-pointer">
                    <input type="radio" name="storeScope" checked={!applyToEntireStore} onChange={() => setApplyToEntireStore(false)} /> Specific Categories / Products
                  </label>
                </div>

                {!applyToEntireStore && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-admin-subtle p-4 rounded border border-admin-border">
                    <div>
                      <label className="form-label mb-1.5">Main Categories</label>
                      <select
                        multiple
                        value={selectedMainCategoryIds}
                        onChange={e => {
                          const opts = Array.from(e.target.selectedOptions, o => o.value);
                          setSelectedMainCategoryIds(opts);
                          setApplyToMainCategories(opts.length > 0);
                        }}
                        className="form-control text-xs h-24 p-1.5"
                      >
                        {mainCats.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="form-label mb-1.5">Categories</label>
                      <select
                        multiple
                        value={selectedCategoryIds}
                        onChange={e => {
                          const opts = Array.from(e.target.selectedOptions, o => o.value);
                          setSelectedCategoryIds(opts);
                          setApplyToCategories(opts.length > 0);
                        }}
                        className="form-control text-xs h-24 p-1.5"
                      >
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="form-label mb-1.5">Sub Categories</label>
                      <select
                        multiple
                        value={selectedSubCategoryIds}
                        onChange={e => {
                          const opts = Array.from(e.target.selectedOptions, o => o.value);
                          setSelectedSubCategoryIds(opts);
                          setApplyToSubCategories(opts.length > 0);
                        }}
                        className="form-control text-xs h-24 p-1.5"
                      >
                        {subCategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="form-label mb-1.5">Product Limit (Top N items)</label>
                      <input
                        type="number"
                        value={productLimit}
                        onChange={e => setProductLimit(e.target.value)}
                        className="form-control text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* TAB 5: DISPLAY & UI PREVIEW */}
            {modalTab === 'display' && (
              <div>
                <h3 className="heading-3 mb-3">Live Client Coupon Card Preview</h3>
                <div className="bg-admin-subtle border border-admin-border rounded-lg p-5 max-w-sm shadow-xs">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="badge badge-accent font-bold">
                      {code || 'PROMOCODE'}
                    </span>
                    <span className="text-[11px] text-admin-text-muted">Valid till {endDate || '2026-12-31'}</span>
                  </div>

                  <div className="font-semibold text-sm text-admin-text-primary">{name || 'Promotion Name'}</div>
                  <div className="text-xs text-admin-text-secondary mt-1">{shortDescription || `Get ${discountValue}% OFF on selected items`}</div>
                  <div className="text-[11px] text-admin-text-muted mt-2 italic">* Applies to selected pricing components</div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-admin-border">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); showToast('Promo Code action cancelled', 'warn'); }}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary text-xs"
              >
                {editingId ? 'Update Promotion' : 'Save Promotion'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default PromoList;