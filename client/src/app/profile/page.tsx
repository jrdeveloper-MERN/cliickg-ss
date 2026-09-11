'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  ArrowLeft,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import addressService from '../../services/address.service';
import orderService from '../../services/order.service';
import authService from '../../services/auth.service';
import getImageUrl from '../../utils/image.utils';
import { Address, Customer } from '../../types/auth/auth.types';
import { Order } from '../../types/orders/order.types';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const PriceBreakupModal = ({ item, order, onClose }: { item: any; order: any; onClose: () => void }) => {
  if (!item || !order) return null;

  const itemQty = Number(item.quantity || 1);
  const basePrice = Number(item.price || item.unitPrice || item.sellingPrice || 0);
  const makingCharges = Number(item.makingCharges || item.attributes?.makingCharges || 0);
  const netMaking = makingCharges;

  const itemGst = Number(
    item.gstAmount !== undefined
      ? item.gstAmount
      : item.attributes?.gstAmount !== undefined
        ? item.attributes.gstAmount
        : item.attributes?.gst !== undefined
          ? item.attributes.gst
          : 0
  );

  const totalItemAmount = Number(
    item.totalPrice !== undefined && item.totalPrice !== null
      ? item.totalPrice
      : item.total !== undefined && item.total !== null
        ? item.total
        : basePrice * itemQty + itemGst
  );

  const subtotalBase = Math.max(0, totalItemAmount - itemGst);

  return (
    <div
      className="fixed inset-0 bg-black/55 z-[99999] flex items-center justify-center p-4 animate-drawer-fade"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[540px] max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
          <h3 className="m-0 text-lg font-bold text-slate-800 font-serif">Price Breakup</h3>
          <button
            type="button"
            onClick={onClose}
            className="border-none bg-transparent cursor-pointer text-lg text-slate-500 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 text-xs text-slate-600">
          <div className="border-b border-dashed border-slate-200 pb-3">
            <strong className="text-slate-900 block mb-1.5 font-bold">Product Information</strong>
            <div className="flex justify-between">
              <span>Product Name</span>
              <span className="font-semibold text-slate-800">{item.name || item.productName}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Variant</span>
              <span className="font-semibold text-slate-800">{item.variant || item.variantName || 'Standard'}</span>
            </div>
          </div>

          {makingCharges > 0 && (
            <div className="border-b border-dashed border-slate-200 pb-3">
              <strong className="text-slate-900 block mb-1 font-bold">Additional Processing Charges</strong>
              <div className="flex justify-between text-slate-500">
                <span>Charges</span>
                <span>₹{Math.round(makingCharges).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600 mt-0.5">
                <span>Net Charges</span>
                <span>₹{Math.round(netMaking).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-1.5">
            <strong className="text-slate-900 mb-1 font-bold">Payment Summary</strong>
            <div className="flex justify-between">
              <span>Base Subtotal (Excl. GST)</span>
              <span>₹{Math.round(subtotalBase).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>GST Tax</span>
              <span>+₹{Math.round(itemGst).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between bg-rose-50 p-3 rounded-md text-primary font-extrabold text-base mt-1.5">
              <span>Final Paid Amount</span>
              <span>₹{Math.round(totalItemAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, customer, checkAuth, updateProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?from=/profile');
    }
  }, [user, authLoading, router]);

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'order-view'>('profile');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    gender: 'Male',
    dob: '',
    address1: '',
    address2: '',
    area: '',
    state: '',
    landmark: '',
    city: '',
    pincode: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [userAddresses, setUserAddresses] = useState<Address[]>([]);
  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [deletingAddrId, setDeletingAddrId] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address>({
    id: '',
    name: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  const confirmDeleteSavedAddress = async () => {
    if (!deletingAddrId) return;
    try {
      await addressService.deleteAddress(deletingAddrId);
      setInfoMessage('Address deleted successfully!');
      fetchUserAddresses();
    } catch (err: any) {
      setErrorMessage(err.message || 'Primary address cannot be deleted.');
    } finally {
      setDeletingAddrId(null);
    }
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedBreakupItem, setSelectedBreakupItem] = useState<any>(null);

  const formatDateForInput = (dobStr?: string) => {
    if (!dobStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) return dobStr;
    try {
      const d = new Date(dobStr);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  const normalizeState = (st?: string) => {
    if (!st || !st.trim()) return '';
    const found = INDIAN_STATES.find((s) => s.toLowerCase() === st.trim().toLowerCase());
    return found || st.trim();
  };

  useEffect(() => {
    if (!user && !customer) return;

    const baseCust: any = customer || {};
    const baseParts = (baseCust.address || '').split(',').map((s: string) => s.trim());
    const bStreet = baseCust.address1 || baseParts[0] || '';
    const bStreet2 = baseCust.address2 || baseParts[1] || '';
    const bArea = baseCust.area || baseParts[2] || '';
    const bCity = baseCust.city || baseParts[3] || '';
    let bState = normalizeState(baseCust.state);
    let bPincode = baseCust.pincode || '';
    const bLastPart = baseParts[baseParts.length - 1] || '';
    if (!bPincode && bLastPart.includes('-')) {
      const subParts = bLastPart.split('-');
      bState = normalizeState(subParts[0].trim()) || bState;
      bPincode = subParts[1].trim() || bPincode;
    }

    setProfileData({
      id: baseCust._id || baseCust.id || '',
      name: baseCust.name || user?.name || '',
      phone: baseCust.phone || user?.mobileNumber || user?.phone || '',
      email: baseCust.email || user?.email || '',
      gender: baseCust.gender || 'Male',
      dob: formatDateForInput(baseCust.dob || ''),
      address1: bStreet,
      address2: bStreet2,
      area: bArea,
      state: bState,
      landmark: baseCust.landmark || '',
      city: bCity,
      pincode: bPincode,
    });

    fetchUserAddresses();
  }, [user, customer]);

  const fetchUserAddresses = async () => {
    try {
      const list = await addressService.getAddresses();
      setUserAddresses(list);
    } catch (err) {
      console.error('Failed to load delivery addresses:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'order-view') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await orderService.getMyOrders();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    const errors: Record<string, string> = {};

    if (!profileData.name || !profileData.name.trim()) {
      errors.name = 'Full Name is required.';
    } else if (profileData.name.trim().length < 2) {
      errors.name = 'Full Name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (profileData.email && profileData.email.trim() && !emailRegex.test(profileData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (profileData.dob) {
      const selectedDate = new Date(profileData.dob);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(selectedDate.getTime()) || selectedDate > today) {
        errors.dob = 'Date of birth cannot be in the future.';
      }
    }

    if (!profileData.address1 || !profileData.address1.trim()) {
      errors.address1 = 'Address Line 1 is required.';
    }
    if (!profileData.area || !profileData.area.trim()) {
      errors.area = 'Area is required.';
    }
    if (!profileData.city || !profileData.city.trim()) {
      errors.city = 'City is required.';
    }
    if (!profileData.state || !profileData.state.trim()) {
      errors.state = 'State is required.';
    }
    if (!profileData.pincode || !/^\d{6}$/.test(profileData.pincode.trim())) {
      errors.pincode = 'Pincode must be a valid 6-digit postal code.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const addrParts = [
        profileData.address1.trim(),
        profileData.address2 ? profileData.address2.trim() : '',
        profileData.area.trim(),
        profileData.city.trim(),
        profileData.state.trim(),
      ].filter(Boolean);
      const formattedAddress = `${addrParts.join(', ')} - ${profileData.pincode.trim()}`;

      const payload: Partial<Customer> = {
        name: profileData.name.trim(),
        email: profileData.email.trim().toLowerCase(),
        gender: profileData.gender,
        dob: profileData.dob,
        address: formattedAddress,
        address1: profileData.address1.trim(),
        address2: profileData.address2 ? profileData.address2.trim() : '',
        area: profileData.area.trim(),
        landmark: profileData.landmark ? profileData.landmark.trim() : '',
        city: profileData.city.trim(),
        state: profileData.state.trim(),
        pincode: profileData.pincode.trim(),
      };

      if (profileData.id) {
        await authService.updateCustomerProfile(profileData.id, payload);
      } else if (updateProfile) {
        await updateProfile(payload);
      }

      if (checkAuth) await checkAuth();
      setInfoMessage('Profile updated successfully!');
      fetchUserAddresses();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddress.name || !editingAddress.phone || !editingAddress.addressLine1 || !editingAddress.city || !editingAddress.state || !editingAddress.pincode) {
      setErrorMessage('Please fill out all required fields.');
      return;
    }

    try {
      const payload: Omit<Address, 'id' | '_id'> = {
        name: editingAddress.name,
        fullName: editingAddress.name,
        phone: editingAddress.phone,
        mobile: editingAddress.phone,
        email: editingAddress.email,
        addressLine1: editingAddress.addressLine1,
        addressLine2: editingAddress.addressLine2,
        area: editingAddress.area,
        landmark: editingAddress.landmark,
        city: editingAddress.city,
        state: editingAddress.state,
        pincode: editingAddress.pincode,
        isDefault: editingAddress.isDefault,
      };

      if (editingAddress.id) {
        await addressService.updateAddress(editingAddress.id, payload);
      } else {
        await addressService.createAddress(payload);
      }

      setIsAddrModalOpen(false);
      await fetchUserAddresses();
      if (checkAuth) await checkAuth();
      setInfoMessage('Delivery address saved successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save address.');
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setActiveTab('order-view');
  };

  if (authLoading || !user) {
    return (
      <div className="w-[min(100%-2rem,960px)] mx-auto py-24 text-center min-h-[50vh] flex items-center justify-center">
        <div className="text-slate-500 font-semibold animate-pulse">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="w-[min(100%-2rem,960px)] mx-auto py-12 pb-20">
      {/* Header Tabs Navigation */}
      <div className="bg-white p-6 md:p-8 pb-6 rounded-t-2xl border border-rose-100 border-b-0">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-800 m-0">
              {activeTab === 'profile' ? 'My Profile' : activeTab === 'orders' ? 'My Orders' : 'Order Details'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              Manage your personal info, saved delivery addresses, and orders
            </p>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors border ${
                activeTab === 'profile'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-primary border-primary hover:bg-rose-50'
              }`}
            >
              My Profile
            </button>

            <Link
              href="/orders"
              className="bg-white hover:bg-rose-50 text-primary border border-primary py-2 px-5 rounded-lg font-bold text-xs flex items-center gap-1.5 no-underline transition-colors"
            >
              <ShoppingBag size={16} />
              My Orders
            </Link>
          </div>
        </div>

        {infoMessage && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-md text-xs mt-5">
            {infoMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 p-3 rounded-md text-xs mt-5">
            {errorMessage}
          </div>
        )}
      </div>

      {/* TAB 1: Profile & Delivery Address Book */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 md:p-10 pt-0 rounded-b-2xl border border-rose-100 border-t-0 shadow-[0_8px_30px_rgba(232,90,113,0.04)]">
          {/* Main Profile Form */}
          <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleProfileChange}
                placeholder="Enter Full Name"
                className={`w-full py-2.5 px-3.5 rounded-lg border text-sm outline-none text-slate-800 bg-white ${
                  fieldErrors.name ? 'border-rose-600 bg-rose-50/40' : 'border-slate-300 focus:border-primary'
                }`}
              />
              {fieldErrors.name && <span className="text-rose-600 text-xs mt-1 block font-medium">{fieldErrors.name}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Mobile <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={profileData.phone}
                readOnly
                disabled
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-200 text-sm outline-none bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Email Address (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleProfileChange}
                placeholder="Enter Email Address"
                className={`w-full py-2.5 px-3.5 rounded-lg border text-sm outline-none text-slate-800 bg-white ${
                  fieldErrors.email ? 'border-rose-600 bg-rose-50/40' : 'border-slate-300 focus:border-primary'
                }`}
              />
              {fieldErrors.email && <span className="text-rose-600 text-xs mt-1 block font-medium">{fieldErrors.email}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Gender <span className="text-rose-600">*</span>
              </label>
              <div className="flex gap-6 h-10 items-center">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Male"
                    checked={profileData.gender === 'Male'}
                    onChange={() => setProfileData((prev) => ({ ...prev, gender: 'Male' }))}
                    className="accent-primary"
                  />
                  Male
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Female"
                    checked={profileData.gender === 'Female'}
                    onChange={() => setProfileData((prev) => ({ ...prev, gender: 'Female' }))}
                    className="accent-primary"
                  />
                  Female
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={profileData.dob}
                max={new Date().toISOString().split('T')[0]}
                onChange={handleProfileChange}
                className={`w-full py-2.5 px-3.5 rounded-lg border text-sm outline-none text-slate-800 bg-white ${
                  fieldErrors.dob ? 'border-rose-600 bg-rose-50/40' : 'border-slate-300 focus:border-primary'
                }`}
              />
              {fieldErrors.dob && <span className="text-rose-600 text-xs mt-1 block font-medium">{fieldErrors.dob}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Address Line 1 <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="address1"
                value={profileData.address1}
                onChange={handleProfileChange}
                placeholder="House / Flat / Door No, Street Name"
                className={`w-full py-2.5 px-3.5 rounded-lg border text-sm outline-none text-slate-800 bg-white ${
                  fieldErrors.address1 ? 'border-rose-600 bg-rose-50/40' : 'border-slate-300 focus:border-primary'
                }`}
              />
              {fieldErrors.address1 && <span className="text-rose-600 text-xs mt-1 block font-medium">{fieldErrors.address1}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Address Line 2 (Optional)</label>
              <input
                type="text"
                name="address2"
                value={profileData.address2}
                onChange={handleProfileChange}
                placeholder="Apartment / Colony / Street Line 2"
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 focus:border-primary text-sm outline-none text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Area <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="area"
                value={profileData.area}
                onChange={handleProfileChange}
                placeholder="Area / Locality"
                className={`w-full py-2.5 px-3.5 rounded-lg border text-sm outline-none text-slate-800 bg-white ${
                  fieldErrors.area ? 'border-rose-600 bg-rose-50/40' : 'border-slate-300 focus:border-primary'
                }`}
              />
              {fieldErrors.area && <span className="text-rose-600 text-xs mt-1 block font-medium">{fieldErrors.area}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Landmark (Optional)</label>
              <input
                type="text"
                name="landmark"
                value={profileData.landmark}
                onChange={handleProfileChange}
                placeholder="Nearby Landmark"
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 focus:border-primary text-sm outline-none text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                City <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={profileData.city}
                onChange={handleProfileChange}
                placeholder="City / District"
                className={`w-full py-2.5 px-3.5 rounded-lg border text-sm outline-none text-slate-800 bg-white ${
                  fieldErrors.city ? 'border-rose-600 bg-rose-50/40' : 'border-slate-300 focus:border-primary'
                }`}
              />
              {fieldErrors.city && <span className="text-rose-600 text-xs mt-1 block font-medium">{fieldErrors.city}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                State <span className="text-rose-600">*</span>
              </label>
              <select
                name="state"
                value={profileData.state}
                onChange={handleProfileChange}
                className={`w-full py-2.5 px-3.5 rounded-lg border text-sm outline-none text-slate-800 bg-white ${
                  fieldErrors.state ? 'border-rose-600 bg-rose-50/40' : 'border-slate-300 focus:border-primary'
                }`}
              >
                <option value="">-- Select State --</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st.toUpperCase()}
                  </option>
                ))}
              </select>
              {fieldErrors.state && <span className="text-rose-600 text-xs mt-1 block font-medium">{fieldErrors.state}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Pincode <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="pincode"
                value={profileData.pincode}
                onChange={handleProfileChange}
                placeholder="6-digit Pincode"
                maxLength={6}
                className={`w-full py-2.5 px-3.5 rounded-lg border text-sm outline-none text-slate-800 bg-white ${
                  fieldErrors.pincode ? 'border-rose-600 bg-rose-50/40' : 'border-slate-300 focus:border-primary'
                }`}
              />
              {fieldErrors.pincode && <span className="text-rose-600 text-xs mt-1 block font-medium">{fieldErrors.pincode}</span>}
            </div>

            <div className="md:col-span-2 flex justify-center mt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-hover text-white border-none py-3 px-12 rounded-lg font-bold text-sm cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>

        </div>
      )}

      {/* TAB 2: Orders List */}
      {activeTab === 'orders' && (
        <div className="bg-white p-8 rounded-b-2xl border border-rose-100 border-t-0 shadow-[0_8px_30px_rgba(232,90,113,0.04)]">
          {ordersLoading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading your orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-14 text-slate-500">
              <p className="m-0 mb-4 text-sm">No orders found.</p>
              <Link
                href="/shop"
                className="bg-primary hover:bg-primary-hover text-white py-2.5 px-6 rounded-lg font-bold text-xs no-underline inline-block transition-colors"
              >
                Shop Now
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse rounded-lg overflow-hidden text-xs">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="p-3 px-4 text-left font-bold">Order No</th>
                    <th className="p-3 px-4 text-left font-bold">Date</th>
                    <th className="p-3 px-4 text-left font-bold">Price</th>
                    <th className="p-3 px-4 text-left font-bold">Via</th>
                    <th className="p-3 px-4 text-center font-bold">Payment Status</th>
                    <th className="p-3 px-4 text-center font-bold">Status</th>
                    <th className="p-3 px-4 text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any, idx: number) => {
                    const isSuccess = String(order.paymentStatus || '').toUpperCase() === 'SUCCESS' || String(order.paymentMethod) === 'COD';
                    const statusVal = String(order.orderStatus || 'RECEIVED').toUpperCase();
                    const orderIdStr = order.orderNo || order.orderId || `CliickG-${(order.id || order._id || '').substring(0, 6)}`;

                    return (
                      <tr key={order.id || order._id || idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="p-3.5 px-4 font-semibold text-slate-800">{orderIdStr}</td>
                        <td className="p-3.5 px-4 text-slate-500">
                          {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 px-4 font-bold text-slate-800">
                          ₹{(order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 px-4 text-slate-500">{order.paymentMethod || 'Online'}</td>
                        <td className="p-3.5 px-4 text-center">
                          <span
                            className={`inline-block text-[0.72rem] font-extrabold py-1 px-2.5 rounded-full uppercase border ${
                              isSuccess ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'bg-rose-50 text-primary border-primary'
                            }`}
                          >
                            {order.paymentStatus || (order.paymentMethod === 'COD' ? 'COD' : 'PENDING')}
                          </span>
                        </td>
                        <td className="p-3.5 px-4 text-center">
                          <span className="inline-block text-[0.72rem] font-bold py-1 px-2.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {statusVal}
                          </span>
                        </td>
                        <td className="p-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleViewOrder(order)}
                            className="inline-flex items-center gap-1 border border-primary bg-white hover:bg-rose-50 text-primary py-1 px-3 rounded text-[0.78rem] font-bold cursor-pointer transition-colors"
                          >
                            <Eye size={12} />
                            VIEW
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Detailed Order View */}
      {activeTab === 'order-view' && selectedOrder && (
        <div className="bg-white p-8 rounded-b-2xl border border-rose-100 border-t-0 shadow-[0_8px_30px_rgba(232,90,113,0.04)]">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <ShoppingBag size={28} className="text-primary" />
              <h2 className="text-2xl font-bold text-slate-800 m-0 font-serif">Order Details</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 py-2 px-5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Orders
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-rose-50/50 p-5 rounded-lg mb-8 text-xs text-slate-600">
            <div>
              <strong>Order No:</strong> {selectedOrder.orderNo || selectedOrder.orderId || `CliickG-${(selectedOrder.id || selectedOrder._id || '').substring(0, 6)}`}
            </div>
            <div>
              <strong>Date:</strong> {new Date(selectedOrder.orderDate || selectedOrder.createdAt || '').toLocaleDateString()}
            </div>
            <div>
              <strong>Via:</strong> {selectedOrder.paymentMethod || 'Online'}
            </div>
          </div>

          {/* Ordered Items Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-2.5 px-3.5 text-left font-semibold">Image</th>
                  <th className="p-2.5 px-3.5 text-left font-semibold">Item Name</th>
                  <th className="p-2.5 px-3.5 text-center font-semibold">Qty</th>
                  <th className="p-2.5 px-3.5 text-left font-semibold">Price</th>
                  <th className="p-2.5 px-3.5 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(selectedOrder.items || []).map((item: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="p-3 px-3.5">
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded border border-slate-200"
                      />
                    </td>
                    <td className="p-3 px-3.5 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedBreakupItem(item)}
                          className="bg-primary hover:bg-primary-hover text-white border-none text-[0.72rem] py-0.5 px-2 rounded font-bold cursor-pointer transition-colors"
                        >
                          Price Breakup
                        </button>
                      </div>
                    </td>
                    <td className="p-3 px-3.5 text-center text-slate-800 font-bold">{item.quantity}</td>
                    <td className="p-3 px-3.5 font-bold text-slate-800">
                      ₹{(item.price || item.sellingPrice || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 px-3.5 text-center">
                      <span className="text-[0.7rem] font-bold py-0.5 px-2 rounded bg-slate-100 text-slate-600">
                        {selectedOrder.orderStatus || 'RECEIVED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {selectedBreakupItem && selectedOrder && (
        <PriceBreakupModal item={selectedBreakupItem} order={selectedOrder} onClose={() => setSelectedBreakupItem(null)} />
      )}
    </div>
  );
}
