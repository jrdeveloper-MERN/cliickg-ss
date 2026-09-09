'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Plus, Pencil, Trash2, Phone, ArrowRight, Lock, MapPin } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import addressService from '../../services/address.service';
import orderService from '../../services/order.service';
import paymentService from '../../services/payment.service';
import shippingService from '../../services/shipping.service';
import getImageUrl from '../../utils/image.utils';
import { Address } from '../../types/auth/auth.types';
import { PaymentGateway } from '../../types/payments/payment.types';
import { CheckoutSkeleton } from '../../components/ui/Skeleton/Skeleton';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

interface PaymentSuccessScreenProps {
  orderId: string;
  paymentId?: string | null;
  onNavigateHome: () => void;
  onNavigateOrders: () => void;
}

function PaymentSuccessScreen({
  orderId,
  paymentId,
  onNavigateHome,
  onNavigateOrders,
}: PaymentSuccessScreenProps) {
  const [countdown, setCountdown] = useState<number>(10);
  const hasNavigatedRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const safeNavigate = (navigateFn: () => void) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    navigateFn();
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          safeNavigate(onNavigateHome);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-slate-50/50">
      <div className="bg-white w-full max-w-lg rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_15px_45px_rgba(0,0,0,0.06)] text-center animate-drawer-fade">
        <div className="w-20 h-20 bg-emerald-100/80 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 stroke-[2.5]" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] mb-2 tracking-tight">
          Payment Successful
        </h2>

        <p className="text-sm sm:text-base text-slate-500 mb-6 font-medium">
          Your payment has been verified successfully.
        </p>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 inline-block w-full max-w-xs mb-6">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Order Confirmation
          </span>
          <span className="text-base font-bold text-slate-800 font-mono block">
            #{orderId}
          </span>
          {paymentId && (
            <span className="text-xs text-slate-500 font-mono block mt-1">
              Payment ID: {paymentId}
            </span>
          )}
        </div>

        <p className="text-sm font-medium text-slate-600 mb-6">
          Redirecting to home in{' '}
          <span className="font-extrabold text-[#2563eb] font-mono text-base">
            {countdown}
          </span>{' '}
          seconds...
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => safeNavigate(onNavigateOrders)}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 px-6 sm:px-7 rounded-full text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer border-none"
          >
            View Orders
          </button>
          <button
            type="button"
            onClick={() => safeNavigate(onNavigateHome)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold py-3 px-6 sm:px-7 rounded-full text-sm transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>🏠</span> Go Home
          </button>
        </div>

        <p className="text-xs text-slate-400 font-medium m-0">
          Home redirect in{' '}
          <span className="font-bold text-slate-600 font-mono">{countdown}</span>{' '}
          seconds...
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, promoDiscount, appliedPromoCode, clearCart, cartLoading, isCartLoaded } = useCart();
  const { user, customer, updateProfile, loading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    address2: '',
    area: '',
    landmark: '',
    city: '',
    state: 'TAMIL NADU',
    pincode: '',
    paymentMethod: 'ONLINE',
    remarks: '',
  });
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((current) => (current?.text === text ? null : current));
    }, 4000);
  };

  const validateBillingForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Recipient Name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Recipient Name must be at least 2 characters.';
    }

    const cleanPhone = String(formData.phone).replace(/\D/g, '');
    if (!formData.phone || !cleanPhone) {
      errors.phone = 'Mobile Number is required.';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Mobile Number must be a valid 10-digit number.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !formData.email.trim()) {
      errors.email = 'Email Address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.address || !formData.address.trim()) {
      errors.address = 'Flat / House No. / Building is required.';
    }

    if (!formData.address2 || !formData.address2.trim()) {
      errors.address2 = 'Street / Area / Colony is required.';
    }

    if (!formData.area || !formData.area.trim()) {
      errors.area = 'Locality / Area is required.';
    }

    if (!formData.city || !formData.city.trim()) {
      errors.city = 'City is required.';
    }

    if (!formData.state || !formData.state.trim()) {
      errors.state = 'State is required.';
    }

    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Pincode must be a valid 6-digit postal code.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewAddress, setIsNewAddress] = useState(false);
  const [editingAddr, setEditingAddr] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    address2: '',
    area: '',
    landmark: '',
    city: '',
    state: 'TAMIL NADU',
    pincode: '',
  });

  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [selectedGatewayCode, setSelectedGatewayCode] = useState<string>('razorpay');
  const [submitting, setSubmitting] = useState(false);
  const [orderPlacedId, setOrderPlacedId] = useState<string | null>(null);
  const [verifiedPaymentId, setVerifiedPaymentId] = useState<string | null>(null);

  const [shippingCalculations, setShippingCalculations] = useState<any>(null);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('Standard');
  const [packagingOptions, setPackagingOptions] = useState<any[]>([]);
  const [selectedPackagingRuleId, setSelectedPackagingRuleId] = useState<string>('');
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState('');

  useEffect(() => {
    if (orderPlacedId || verifiedPaymentId || submitting) return;

    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (cartLoading || !isCartLoaded) return;

    if (cart.length === 0) {
      router.push('/cart');
      return;
    }

    loadInitialData();
  }, [user, authLoading, cartLoading, isCartLoaded, cart.length, orderPlacedId, verifiedPaymentId, submitting, router]);

  const loadInitialData = async () => {
    try {
      if (typeof window !== 'undefined' && !(window as any).Razorpay && !document.getElementById('razorpay-sdk-script')) {
        const script = document.createElement('script');
        script.id = 'razorpay-sdk-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
      }

      const [addrList, gwList, pkgList] = await Promise.all([
        addressService.getAddresses().catch(() => []),
        paymentService.getActiveGateways().catch(() => []),
        shippingService.getPackagingRules().catch(() => []),
      ]);

      setPackagingOptions(pkgList || []);

      if (gwList && gwList.length > 0) {
        setGateways(gwList);
        setSelectedGatewayCode(gwList[0].code || (gwList[0] as any).gateway || '');
      } else {
        setGateways([]);
      }

      let realAddresses: Address[] = addrList || [];

      if (customer && (customer.address1 || customer.address || customer.city || customer.pincode)) {
        const custParts = (customer.address || '').split(',').map((s: string) => s.trim());
        setFormData((prev) => ({
          ...prev,
          name: customer.name || user?.name || user?.fullName || '',
          email: customer.email || user?.email || '',
          phone: customer.phone || customer.mobileNumber || user?.mobileNumber || user?.phone || '',
          address: customer.address1 || custParts[0] || '',
          address2: customer.address2 || custParts[1] || '',
          area: customer.area || custParts[2] || '',
          landmark: customer.landmark || '',
          city: customer.city || custParts[3] || '',
          state: customer.state || 'TAMIL NADU',
          pincode: customer.pincode || '',
        }));
      } else if (realAddresses.length > 0) {
        const primary = realAddresses.find((a: any) => a.isDefault || a.isPrimary) || realAddresses[0];
        applyAddressToFormData(primary);
      } else if (user) {
        setFormData((prev) => ({
          ...prev,
          name: user.name || user.fullName || '',
          email: user.email || '',
          phone: String(user.mobileNumber || user.phone || '').trim(),
        }));
      }

      setAddresses(realAddresses);
    } catch (err) {
      console.error('Failed to load initial checkout data:', err);
    }
  };

  const applyAddressToFormData = (addr: any) => {
    const aId = String(addr.id || addr._id || '');
    setSelectedAddressId(aId);
    setFormData((prev) => ({
      ...prev,
      name: addr.name || addr.fullName || user?.name || user?.fullName || '',
      email: addr.email || user?.email || '',
      phone: addr.phone || addr.mobile || user?.mobileNumber || user?.phone || '',
      address: addr.address || addr.addressLine1 || '',
      address2: addr.address2 || addr.addressLine2 || '',
      area: addr.area || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || 'TAMIL NADU',
      pincode: addr.pincode || '',
    }));
  };

  useEffect(() => {
    if (orderPlacedId || cart.length === 0) return;

    if (!formData.pincode || formData.pincode.trim().length !== 6) {
      setShippingCalculations(null);
      setShippingError('');
      return;
    }

    const timer = setTimeout(() => {
      recalculateShipping();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    formData.pincode,
    formData.city,
    formData.state,
    formData.area,
    formData.paymentMethod,
    selectedPackagingRuleId,
    cart.length,
    cartTotal,
    orderPlacedId,
  ]);

  const recalculateShipping = async () => {
    if (!formData.pincode || formData.pincode.trim().length !== 6) return;

    setLoadingShipping(true);
    setShippingError('');

    try {
      const itemsPayload = cart.map((item: any) => ({
        productId: item.productId || item._id,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        price: Number(item.sellingPrice || item.price || 0),
        grossWeight: Number(item.grossWeight || item.weight || 0.5),
        length: Number(item.length || 10),
        width: Number(item.width || 10),
        height: Number(item.height || 10),
      }));

      const res: any = await shippingService.calculateShipping({
        address: {
          pincode: formData.pincode.trim(),
          city: formData.city,
          state: formData.state,
          area: formData.area,
          country: 'India',
        } as any,
        items: itemsPayload,
        packagingRuleId: selectedPackagingRuleId || undefined,
        paymentMethod: formData.paymentMethod === 'COD' ? 'COD' : 'Online',
        deliveryType: selectedDeliveryType,
      });

      if (res && res.serviceable !== false) {
        setShippingCalculations(res);
        const availableTypes = Object.keys(res.deliveryTypes || {});
        if (availableTypes.length > 0 && !availableTypes.includes(selectedDeliveryType)) {
          setSelectedDeliveryType(availableTypes[0]);
        }
      } else {
        setShippingCalculations(null);
        setShippingError(res?.message || 'Selected pincode is not serviceable for delivery.');
      }
    } catch (err: any) {
      console.error('Shipping calculation error:', err);
      setShippingError('Failed to verify shipping calculations for selected pincode.');
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let val = value;
    if (name === 'phone') {
      val = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData((prev) => ({ ...prev, [name]: val }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleUpdateBillingAddress = async () => {
    if (!validateBillingForm()) {
      showToast('Please correct the highlighted errors in Billing Details.', 'error');
      return;
    }

    try {
      if (selectedAddressId) {
        const payload = {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          addressLine1: formData.address.trim(),
          addressLine2: formData.address2.trim(),
          area: formData.area.trim(),
          landmark: formData.landmark.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        };
        const updated = await addressService.updateAddress(selectedAddressId, payload);
        setAddresses((prev) =>
          prev.map((a: any) => (String(a.id || a._id) === String(selectedAddressId) ? { ...a, ...updated } : a))
        );
        showToast('Saved delivery address updated successfully!', 'success');
      } else {
        const addrParts = [formData.address.trim(), formData.address2.trim(), formData.area.trim(), formData.city.trim(), formData.state.trim()].filter(Boolean);
        const formattedAddress = `${addrParts.join(', ')} - ${formData.pincode.trim()}`;
        const custPayload = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          address: formattedAddress,
          address1: formData.address.trim(),
          address2: formData.address2.trim(),
          area: formData.area.trim(),
          landmark: formData.landmark ? formData.landmark.trim() : '',
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        };
        if (updateProfile) await updateProfile(custPayload);
        showToast('Billing details saved to customer profile!', 'success');
      }
    } catch (err: any) {
      console.error('Failed to update address:', err);
      showToast(err.message || 'Failed to update address details.', 'error');
    }
  };

  const handleOpenAddModal = () => {
    setIsNewAddress(true);
    setEditingAddr({
      id: '',
      name: user?.name || user?.fullName || customer?.name || customer?.fullName || '',
      phone: user?.mobileNumber || user?.phone || customer?.phone || customer?.mobileNumber || '',
      email: user?.email || customer?.email || '',
      address: '',
      address2: '',
      area: '',
      landmark: '',
      city: '',
      state: 'TAMIL NADU',
      pincode: '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (addr: any) => {
    setIsNewAddress(false);
    setEditingAddr({
      id: String(addr.id || addr._id || ''),
      name: addr.name || addr.fullName || '',
      phone: addr.phone || addr.mobile || '',
      email: addr.email || '',
      address: addr.address || addr.addressLine1 || '',
      address2: addr.address2 || addr.addressLine2 || '',
      area: addr.area || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || 'TAMIL NADU',
      pincode: addr.pincode || '',
    });
    setIsEditModalOpen(true);
  };

  const handleModalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddr.name || !editingAddr.phone || !editingAddr.address || !editingAddr.city || !editingAddr.state || !editingAddr.pincode) {
      alert('Please fill out all required address fields.');
      return;
    }

    try {
      const payload = {
        name: editingAddr.name,
        phone: editingAddr.phone,
        email: editingAddr.email,
        addressLine1: editingAddr.address,
        addressLine2: editingAddr.address2,
        area: editingAddr.area,
        landmark: editingAddr.landmark,
        city: editingAddr.city,
        state: editingAddr.state,
        pincode: editingAddr.pincode,
      };

      if (isNewAddress || !editingAddr.id) {
        const created = await addressService.createAddress({ ...payload, isDefault: addresses.length === 0 });
        setAddresses((prev) => [...prev, created]);
        applyAddressToFormData(created);
        alert('New delivery address saved to Address Book.');
      } else {
        const updated = await addressService.updateAddress(editingAddr.id, payload);
        setAddresses((prev) =>
          prev.map((a: any) => (String(a.id || a._id) === String(editingAddr.id) ? { ...a, ...updated } : a))
        );
        if (selectedAddressId === editingAddr.id) {
          applyAddressToFormData(updated);
        }
        alert('Delivery address updated.');
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Modal address save error:', err);
      alert(err.message || 'Failed to save address details.');
    }
  };

  const handleDeleteAddress = (id: string) => {
    if (id === 'profile-primary' || (customer && (id === customer.id || id === customer._id))) {
      alert('Primary default profile address from customer record cannot be deleted.');
      return;
    }
    setDeletingAddressId(id);
  };

  const confirmDeleteAddress = async () => {
    if (!deletingAddressId) return;
    try {
      await addressService.deleteAddress(deletingAddressId);
      setAddresses((prev) => {
        const filtered = prev.filter((a: any) => String(a.id || a._id) !== String(deletingAddressId));
        if (selectedAddressId === deletingAddressId && filtered.length > 0) {
          applyAddressToFormData(filtered[0]);
        }
        return filtered;
      });
      setDeletingAddressId(null);
      alert('Address deleted successfully.');
    } catch (err: any) {
      console.error('Delete address error:', err);
      alert(err.message || 'Failed to delete address.');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    if (!validateBillingForm()) {
      showToast('Please correct the highlighted errors in Billing Details.', 'error');
      return;
    }

    if (!shippingCalculations || !shippingCalculations.serviceable) {
      showToast('Delivery is not available for this address or pincode. Please check your pincode.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const selectedCalc = shippingCalculations?.deliveryTypes?.[selectedDeliveryType] || { totalShippingCost: 0 };
      const totalShippingCost = Number(selectedCalc.totalShippingCost) || 0;
      const grandTotal = Number(shippingCalculations.finalTotal) || Math.max(0, Math.round(cartTotal - promoDiscount + totalShippingCost));

      const formattedFullAddress = `${formData.address}${formData.address2 ? ', ' + formData.address2 : ''}${formData.area ? ', ' + formData.area : ''}${formData.landmark ? ' (Landmark: ' + formData.landmark + ')' : ''}, ${formData.city}, ${formData.state} - ${formData.pincode}`;

      const orderPayload = {
        customerName: formData.name,
        mobile: formData.phone,
        email: formData.email,
        address: formattedFullAddress,
        paymentMethod: selectedGatewayCode ? selectedGatewayCode.toUpperCase() : 'RAZORPAY',
        paymentGateway: selectedGatewayCode || 'razorpay',
        total: grandTotal,
        items: cart,
        promoCode: appliedPromoCode || undefined,
        remarks: formData.remarks,
        shippingAddress: {
          pincode: formData.pincode.trim(),
          city: formData.city,
          state: formData.state,
          area: formData.area,
          country: 'India',
        },
        packagingRuleId: selectedPackagingRuleId || undefined,
        deliveryType: selectedDeliveryType,
      };

      let createdOrder = activeOrder;
      let createdOrderId = createdOrder?.id || (createdOrder as any)?._id || (createdOrder as any)?.orderId;

      const activeOrderTotal = Number((createdOrder as any)?.total || 0);
      if (!createdOrderId || (activeOrderTotal > 0 && Math.abs(activeOrderTotal - grandTotal) > 0.01)) {
        createdOrder = await orderService.createOrder(orderPayload);
        createdOrderId = createdOrder.id || (createdOrder as any)._id || (createdOrder as any).orderId || `ORD_${Date.now().toString().slice(-6)}`;
        setActiveOrder(createdOrder);
      }

      const paymentOrder = await paymentService.createPaymentOrder({
        gateway: selectedGatewayCode || 'razorpay',
        amount: grandTotal,
        orderId: createdOrderId,
      });

      if (typeof window !== 'undefined' && !(window as any).Razorpay) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.id = 'razorpay-sdk-script';
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      }

      const rzpKey = paymentOrder?.keyId || paymentOrder?.key || paymentOrder?.apiKey;
      const rzpOrderId = paymentOrder?.gatewayOrderId || paymentOrder?.paymentSessionId || paymentOrder?.id;

      if (!rzpKey || !rzpOrderId) {
        showToast('Payment gateway credentials not configured. Order saved for retry in My Orders.', 'error');
        setSubmitting(false);
        return;
      }

      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        let hasRecordedFailure = false;

        const options = {
          key: rzpKey,
          amount: Math.round(grandTotal * 100),
          currency: paymentOrder?.currency || 'INR',
          order_id: rzpOrderId,
          description: `Order #${(createdOrder as any)?.orderNo || createdOrderId}`,
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: formData.phone,
          },
          notes: {
            orderId: createdOrderId,
          },
          handler: async (response: any) => {
            try {
              await paymentService.verifyPayment({
                gateway: 'razorpay',
                orderId: createdOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              setVerifiedPaymentId(response.razorpay_payment_id || null);
              setOrderPlacedId(createdOrderId);
              await clearCart();
            } catch (vErr: any) {
              showToast(vErr.message || 'Payment verification error. Please contact support.', 'error');
            } finally {
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              if (!hasRecordedFailure) {
                paymentService.recordPaymentFailure({
                  orderId: createdOrderId,
                  reason: 'USER_CANCELLED',
                  errorMessage: 'Customer closed the payment gateway popup window.',
                });
                showToast('Payment window closed. Your order is saved and can be retried.', 'info');
              }
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);

        rzp.on('payment.failed', function (response: any) {
          hasRecordedFailure = true;
          const errorObj = response?.error || {};
          const reasonCode = errorObj.reason || errorObj.code || 'PAYMENT_FAILED';
          const errorMsg = errorObj.description || errorObj.reason || 'Payment failed at gateway.';

          paymentService.recordPaymentFailure({
            orderId: createdOrderId,
            reason: reasonCode,
            errorMessage: errorMsg,
            errorCode: errorObj.code,
            gatewayOrderId: errorObj.metadata?.order_id,
            gatewayPaymentId: errorObj.metadata?.payment_id,
            rawError: errorObj,
          });

          setActiveOrder(null);
          showToast(`Payment Failed: ${errorMsg}. You may retry with a new attempt.`, 'error');
        });

        rzp.open();
      } else {
        showToast('Razorpay Checkout SDK failed to load. Please disable ad-blockers and try again.', 'error');
        setSubmitting(false);
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      alert(err.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || cartLoading || !isCartLoaded) {
    return (
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-10 pb-20">
        <CheckoutSkeleton />
      </div>
    );
  }

  if (orderPlacedId) {
    return (
      <PaymentSuccessScreen
        orderId={orderPlacedId}
        paymentId={verifiedPaymentId}
        onNavigateHome={() => router.push('/')}
        onNavigateOrders={() => router.push('/orders')}
      />
    );
  }

  const activeDeliveryTypeCalc = shippingCalculations?.deliveryTypes?.[selectedDeliveryType];
  const totalShippingCost = Number(
    activeDeliveryTypeCalc?.totalShippingCost ??
    activeDeliveryTypeCalc?.baseCharge ??
    shippingCalculations?.totalShipping ??
    shippingCalculations?.shippingCharge ??
    0
  );
  const packagingFee = Number(shippingCalculations?.packagingCharge ?? 0);
  const grandTotal = Math.max(0, Math.round(cartTotal - promoDiscount + totalShippingCost + packagingFee));
  const isPincodeValid = Boolean(formData.pincode && formData.pincode.trim().length === 6);
  const isServiceable = Boolean(shippingCalculations && shippingCalculations.serviceable && !shippingError);
  const isCheckoutDisabled = submitting || loadingShipping || !isPincodeValid || !isServiceable;

  return (
    <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-10 pb-20 max-w-[1240px] relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[99999] text-white py-3 px-5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-3 animate-drawer-fade ${
            toastMessage.type === 'success' ? 'bg-emerald-600' : toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-blue-600'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="bg-transparent border-none text-white cursor-pointer text-base p-0"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">
        {/* Left Column: Billing Details & Saved Addresses */}
        <div className="flex flex-col gap-8">
          {/* Billing Details Card */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 m-0 pb-2 border-b-2 border-primary inline-block">
                Billing & Shipping Details
              </h3>
              <span className="text-[0.72rem] text-primary bg-rose-50 py-1 px-2.5 rounded-md font-bold border border-rose-200">
                Primary Default
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Recipient Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.name ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                />
                {formErrors.name && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.name}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile number"
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.phone ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                />
                {formErrors.phone && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.email ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                />
                {formErrors.email && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.email}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Flat / House No. / Building *</label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.address ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                />
                {formErrors.address && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.address}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Street / Area / Colony *</label>
                <input
                  type="text"
                  name="address2"
                  required
                  value={formData.address2}
                  onChange={handleInputChange}
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.address2 ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                />
                {formErrors.address2 && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.address2}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Locality / Area *</label>
                <input
                  type="text"
                  name="area"
                  required
                  value={formData.area}
                  onChange={handleInputChange}
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.area ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                />
                {formErrors.area && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.area}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleInputChange}
                  placeholder="e.g. Near City Center Mall"
                  className="w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border border-slate-300 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">City *</label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.city ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                />
                {formErrors.city && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.city}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">State *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.state ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                {formErrors.state && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.state}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  required
                  maxLength={6}
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="6-digit pincode"
                  className={`w-full py-2.5 px-3 rounded-md text-sm outline-none text-slate-800 bg-white border ${
                    formErrors.pincode ? 'border-rose-600' : 'border-slate-300 focus:border-primary'
                  }`}
                />
                {formErrors.pincode && (
                  <span className="text-rose-600 text-xs mt-1 block font-semibold">
                    {formErrors.pincode}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleUpdateBillingAddress}
                className="bg-primary hover:bg-primary-hover text-white border-none py-2.5 px-8 rounded-lg font-bold text-sm cursor-pointer transition-colors"
              >
                Update Saved Details
              </button>
            </div>
          </div>


        </div>

        {/* Right Column: Order Summary & Checkout Action */}
        <div className="flex flex-col gap-6">
          {/* Remarks Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b-2 border-primary inline-block">
              Order Instructions / Remarks
            </h3>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="E.g., Special delivery instructions, gift notes..."
              rows={3}
              className="w-full p-3 border border-slate-300 focus:border-primary rounded-lg text-xs outline-none resize-none"
            />
          </div>

          {/* Order Summary Card */}
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 mb-5 pb-2 border-b-2 border-primary inline-block">
              Order Summary
            </h3>

            {/* Cart Items List */}
            <div className="flex flex-col gap-4 mb-6">
              {cart.map((item: any) => {
                const itemPrice = Number(item.sellingPrice || item.price || 0);
                const itemImg = item.images?.[0] || item.productImage || item.image || 'product_placeholder.png';

                return (
                  <div key={item._id || item.productId} className="flex items-center gap-3">
                    <div className="relative w-14 h-14 border border-slate-100 rounded-lg flex items-center justify-center bg-slate-50 shrink-0">
                      <img
                        src={getImageUrl(itemImg)}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain p-1 rounded-md"
                      />
                      <span className="absolute -top-1.5 -left-1.5 bg-slate-800 text-white text-[0.68rem] font-extrabold rounded-full w-5 h-5 flex items-center justify-center shadow">
                        {item.quantity}
                      </span>
                    </div>

                    <div className="grow">
                      <div className="text-xs font-bold text-slate-800 leading-tight mb-0.5">
                        {item.name}
                      </div>
                      <div className="text-[0.78rem] text-slate-500">
                        ₹{itemPrice.toLocaleString('en-IN')} × {item.quantity}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-800">
                      ₹{(itemPrice * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pincode Notice / Serviceability Status Banner */}
            {!formData.pincode && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 py-2 border-t border-slate-100">
                <MapPin size={13} /> Enter 6-digit Pincode in Billing Details to compute shipping fees
              </div>
            )}

            {loadingShipping && (
              <div className="text-xs text-slate-500 py-2 border-t border-slate-100">
                Verifying courier serviceability & calculating live shipping fees...
              </div>
            )}

            {!loadingShipping && formData.pincode && formData.pincode.trim().length === 6 && shippingError && (
              <div className="flex items-start gap-2 text-xs text-rose-600 p-3 border-t border-rose-200 bg-rose-50 rounded-md mt-2">
                <span className="text-sm shrink-0">⚠️</span>
                <div>
                  <strong>Delivery Unserviceable</strong>
                  <div className="mt-0.5 text-rose-700">{shippingError}</div>
                </div>
              </div>
            )}

            {/* Packaging Rule Dropdown */}
            {packagingOptions && packagingOptions.length > 0 && (
              <div className="mb-4 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-600 block mb-1.5">
                  Special Gift Packaging (Optional)
                </label>
                <select
                  value={selectedPackagingRuleId}
                  onChange={(e) => setSelectedPackagingRuleId(e.target.value)}
                  className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs bg-white text-slate-800 outline-none"
                >
                  <option value="">No Special Packaging</option>
                  {packagingOptions.map((r: any) => {
                    const base = Number(r.baseAmount ?? r.charge ?? 0);
                    const gst = Number(r.gstRate ?? 18);
                    const totalPrice = r.price ?? r.totalPrice ?? (base + (base * (gst / 100)));
                    return (
                      <option key={r.id || r._id} value={r.id || r._id}>
                        {r.name} (+₹{Number(totalPrice).toLocaleString('en-IN')})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Delivery Speed Options */}
            {shippingCalculations && shippingCalculations.serviceable && shippingCalculations.deliveryTypes && (
              <div className="mb-5 border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-sm font-bold text-slate-900 tracking-tight">
                    Delivery Speed Options
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  {Object.entries(shippingCalculations.deliveryTypes || {})
                    .filter(([_, calc]: [string, any]) => calc && calc.enabled !== false)
                    .map(([type, calc]: [string, any], idx: number) => {
                      const totalCost = Number(calc.totalShippingCost) ?? Number(calc.baseCharge) ?? 0;
                      const deliveryDays = Number(calc.estimatedDays ?? calc.estimatedDeliveryDays ?? (type === 'SameDay' ? 0 : type === 'NextDay' ? 1 : 3));

                      const estDate = new Date();
                      estDate.setDate(estDate.getDate() + deliveryDays);
                      const formattedDate = estDate.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });
                      const dateFormattedDDMMYYYY = estDate.toLocaleDateString('en-GB');
                      const isSelected = selectedDeliveryType === type;

                      let displayTitle = `${type} Shipping`;
                      if (type === 'SameDay') displayTitle = 'Same Day Delivery';
                      if (type === 'NextDay') displayTitle = 'Next Day';
                      if (type === 'Standard') displayTitle = 'Standard Delivery';

                      return (
                        <label
                          key={type || `speed-${idx}`}
                          className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                            isSelected
                              ? 'border-2 border-slate-900 bg-slate-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="radio"
                              name="deliveryTypeRadio"
                              checked={isSelected}
                              onChange={() => setSelectedDeliveryType(type)}
                              className="accent-slate-900 w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                {displayTitle}
                              </div>
                              <div className="text-[0.74rem] text-slate-500 mt-0.5">
                                {deliveryDays === 0 ? (
                                  <span className="font-semibold">Delivered Today ({dateFormattedDDMMYYYY})</span>
                                ) : deliveryDays === 1 ? (
                                  <span className="font-semibold">Delivered Tomorrow ({dateFormattedDDMMYYYY})</span>
                                ) : (
                                  <span>Estimated Delivery: <strong className="text-slate-700">{dateFormattedDDMMYYYY}</strong> ({formattedDate})</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right font-bold text-slate-900 text-sm">
                            {totalCost === 0 ? (
                              <span className="text-emerald-600">FREE</span>
                            ) : (
                              `₹${totalCost.toLocaleString('en-IN')}`
                            )}
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Complete Price Breakdown */}
            <div className="flex flex-col gap-2.5 text-xs text-slate-600 border-t border-slate-100 pt-5 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <strong className="text-slate-800">₹{cartTotal.toLocaleString('en-IN')}</strong>
              </div>

              {appliedPromoCode && promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Promo Discount ({appliedPromoCode})</span>
                  <strong>-₹{promoDiscount.toLocaleString('en-IN')}</strong>
                </div>
              )}

              <div className="flex justify-between font-semibold text-slate-800">
                <span>Delivery Fee</span>
                <strong className={totalShippingCost === 0 ? 'text-emerald-600' : 'text-slate-800'}>
                  {totalShippingCost === 0 ? 'FREE' : `₹${totalShippingCost.toLocaleString('en-IN')}`}
                </strong>
              </div>

              {packagingFee > 0 && (
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Gift Packaging ({shippingCalculations?.packaging?.selected || 'Special'})</span>
                  <strong>₹{packagingFee.toLocaleString('en-IN')}</strong>
                </div>
              )}

              {shippingCalculations?.breakdown
                ?.filter((b: any) => b.amount !== 0 && b.key !== 'Subtotal' && b.key !== 'Shipping')
                .map((b: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-600">
                    <span>{b.label}</span>
                    <strong className={b.amount < 0 ? 'text-emerald-600' : 'text-slate-800'}>
                      {b.amount < 0 ? '-' : ''}₹{Math.abs(b.amount).toLocaleString('en-IN')}
                    </strong>
                  </div>
                ))}

              <div className="flex justify-between border-t border-slate-100 pt-3 text-lg text-slate-800 font-extrabold">
                <span>Grand Total</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Place Order CTA Button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isCheckoutDisabled}
              className="w-full bg-primary hover:bg-primary-hover text-white border-none py-3.5 rounded-lg font-bold text-sm cursor-pointer flex items-center justify-center gap-2 transition-colors mb-4 disabled:cursor-not-allowed disabled:opacity-60 shadow-md"
            >
              {submitting ? 'Processing Order...' : 'Confirm & Place Order'}
              {!submitting && <ArrowRight size={16} />}
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 justify-center mt-2">
              <Lock size={13} className="text-primary" />
              <span>Encrypted Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit / Add Address Modal Overlay */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[1000] p-4 animate-drawer-fade">
          <div className="bg-white rounded-2xl w-full max-w-[540px] overflow-hidden shadow-2xl relative">
            <div className="bg-primary p-4 px-6 flex justify-between items-center text-white">
              <h3 className="m-0 text-base font-bold">
                {isNewAddress ? 'Add New Delivery Address' : 'Edit Delivery Address'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="bg-transparent border-none text-white text-2xl cursor-pointer leading-none p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleModalSave} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    value={editingAddr.name}
                    onChange={(e) => setEditingAddr({ ...editingAddr, name: e.target.value })}
                    required
                    className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    value={editingAddr.phone}
                    onChange={(e) => setEditingAddr({ ...editingAddr, phone: e.target.value })}
                    required
                    className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Flat, House No., Building *</label>
                <input
                  type="text"
                  value={editingAddr.address}
                  onChange={(e) => setEditingAddr({ ...editingAddr, address: e.target.value })}
                  required
                  className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Street, Area, Colony *</label>
                <input
                  type="text"
                  value={editingAddr.address2}
                  onChange={(e) => setEditingAddr({ ...editingAddr, address2: e.target.value })}
                  required
                  className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Area / Locality *</label>
                  <input
                    type="text"
                    value={editingAddr.area}
                    onChange={(e) => setEditingAddr({ ...editingAddr, area: e.target.value })}
                    required
                    className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={editingAddr.landmark}
                    onChange={(e) => setEditingAddr({ ...editingAddr, landmark: e.target.value })}
                    placeholder="e.g. Near Apollo Hospital"
                    className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">City *</label>
                  <input
                    type="text"
                    value={editingAddr.city}
                    onChange={(e) => setEditingAddr({ ...editingAddr, city: e.target.value })}
                    required
                    className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">State *</label>
                  <select
                    value={editingAddr.state}
                    onChange={(e) => setEditingAddr({ ...editingAddr, state: e.target.value })}
                    required
                    className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Pincode *</label>
                  <input
                    type="text"
                    value={editingAddr.pincode}
                    onChange={(e) => setEditingAddr({ ...editingAddr, pincode: e.target.value })}
                    required
                    maxLength={6}
                    className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-center mt-2">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white border-none py-2.5 px-10 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                >
                  {isNewAddress ? 'Add Address' : 'Save & Update Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Address Custom Confirmation Modal Overlay */}
      {deletingAddressId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[1100] p-4 animate-drawer-fade">
          <div className="bg-white rounded-xl p-7 w-full max-w-[420px] shadow-2xl text-center">
            <h4 className="m-0 mb-3 text-base font-bold text-slate-800">
              Delete Address
            </h4>
            <p className="m-0 mb-6 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to remove this delivery address? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingAddressId(null)}
                className="py-2 px-6 rounded-md border border-slate-300 bg-white text-slate-600 text-xs font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAddress}
                className="py-2 px-6 rounded-md border-none bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Delete Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
