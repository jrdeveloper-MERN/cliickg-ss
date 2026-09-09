import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Edit, ExternalLink, Image as ImageIcon, Save, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const PODTab = ({ order, onCourierUpdated }) => {
  if (!order) return null;

  const items = order.items && order.items.length > 0 ? order.items : [];
  const snap = typeof order.shippingSnapshot === 'object' && order.shippingSnapshot ? order.shippingSnapshot : {};

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [courierMasters, setCourierMasters] = useState([]);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [sendingQuantity, setSendingQuantity] = useState(1);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [courierNotes, setCourierNotes] = useState('');
  
  // Image Upload state
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form Validation & Accessibility State
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Form Field Refs for Accessibility Focus
  const productRef = useRef(null);
  const courierRef = useRef(null);
  const trackingRef = useRef(null);
  const quantityRef = useRef(null);
  const dispatchDateRef = useRef(null);
  const deliveryDateRef = useRef(null);

  // Dispatch history
  const [dispatchHistory, setDispatchHistory] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchCouriersMaster();

    if (items.length > 0) {
      const firstId = snap.productId || items[0]._id || items[0].productId || items[0].id || '';
      setSelectedProductId(firstId);
      setSendingQuantity(snap.sendingQuantity || items[0].quantity || 1);
    } else {
      setSelectedProductId('');
      setSendingQuantity(1);
    }

    const savedName = snap.courierName || order.courierName || order.courier?.courierName || '';
    const savedId = snap.courierId || order.courierId || order.courier?._id || '';
    setSelectedCourierId(savedId);
    setCourierName(savedName);

    setTrackingNumber(snap.trackingNumber || order.trackingNumber || '');
    setTrackingUrl(snap.trackingUrl || order.trackingUrl || '');
    
    if (snap.dispatchDate) {
      const d = new Date(snap.dispatchDate);
      setDispatchDate(!isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    } else {
      setDispatchDate(new Date().toISOString().slice(0, 10));
    }

    if (snap.expectedDelivery) {
      const ed = new Date(snap.expectedDelivery);
      setExpectedDelivery(!isNaN(ed.getTime()) ? ed.toISOString().slice(0, 10) : '');
    } else {
      setExpectedDelivery('');
    }

    setCourierNotes(snap.notes || '');
    setReceiptPreview(snap.receiptImage || '');
    setReceiptImage(null);

    if (snap.trackingNumber || order.trackingNumber || snap.courierName || order.courierName) {
      setDispatchHistory([{
        id: order.id || order._id,
        orderNo: order.orderNo || order.orderId,
        courierName: snap.courierName || order.courierName || order.courier?.courierName || 'N/A',
        trackingNumber: snap.trackingNumber || order.trackingNumber || 'N/A',
        trackingUrl: snap.trackingUrl || order.trackingUrl || '',
        dispatchDate: snap.dispatchDate || order.updatedAt || order.createdAt,
        expectedDelivery: snap.expectedDelivery || snap.estimatedDeliveryDate,
        status: order.shipmentStatus || order.orderStatus || 'Dispatched',
        productName: snap.productName || (items[0]?.name || items[0]?.productName) || 'Item',
        sendingQuantity: snap.sendingQuantity || items[0]?.quantity || 1,
        receiptImage: snap.receiptImage || ''
      }]);
    } else {
      setDispatchHistory([]);
    }

    setErrors({});
    setTouched({});
  }, [order]);

  const fetchCouriersMaster = async () => {
    try {
      const res = await api.get('/shipping/couriers-admin');
      const list = res.data?.data || res.data || [];
      const activeList = list.filter(c => c.status !== 'Inactive');
      setCourierMasters(activeList);
      
      const currentName = snap.courierName || order.courierName || order.courier?.courierName;
      if (currentName) {
        const matched = activeList.find(c => c.courierName.toLowerCase() === currentName.toLowerCase() || c._id === (order.courierId || order.courier?._id));
        if (matched) {
          setSelectedCourierId(matched._id);
          setCourierName(matched.courierName);
        } else {
          setCourierName(currentName);
        }
      }
    } catch (err) {
      console.warn('Couriers master fetch error:', err.message);
    }
  };

  const selectedItem = items.find(i => (i._id === selectedProductId || i.productId === selectedProductId || i.id === selectedProductId)) || items[0];
  const remainingQty = selectedItem ? Number(selectedItem.quantity || 1) : 1;

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'productId':
        if (!value) error = 'Please select a product.';
        break;
      case 'courier':
        if (!value || !value.trim()) error = 'Please select a courier partner.';
        break;
      case 'trackingNumber':
        if (!value || !value.trim()) error = 'Please enter tracking number / AWB.';
        break;
      case 'sendingQuantity': {
        const num = Number(value);
        if (!value || isNaN(num) || num < 1) error = 'Quantity must be at least 1.';
        else if (num > remainingQty) error = `Quantity cannot exceed ${remainingQty}.`;
        break;
      }
      case 'dispatchDate':
        if (!value) error = 'Dispatch date is required.';
        break;
      case 'expectedDelivery':
        if (value && dispatchDate && new Date(value) < new Date(dispatchDate)) {
          error = 'Expected delivery cannot be earlier than dispatch date.';
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleBlur = (name, value) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleProductSelectChange = (e) => {
    const pId = e.target.value;
    setSelectedProductId(pId);
    if (touched.productId) {
      setErrors(prev => ({ ...prev, productId: validateField('productId', pId) }));
    }
    const matched = items.find(i => (i._id === pId || i.productId === pId || i.id === pId));
    if (matched) {
      setSendingQuantity(matched.quantity || 1);
    }
  };

  const handleCourierSelectChange = (e) => {
    const val = e.target.value;
    setSelectedCourierId(val);
    const matched = courierMasters.find(c => c._id === val);
    const name = matched ? matched.courierName : val;
    setCourierName(name);
    if (touched.courier) {
      setErrors(prev => ({ ...prev, courier: validateField('courier', name) }));
    }
  };

  const handleTrackingNumberChange = (val) => {
    setTrackingNumber(val);
    if (touched.trackingNumber) {
      setErrors(prev => ({ ...prev, trackingNumber: validateField('trackingNumber', val) }));
    }
  };

  const handleQuantityChange = (val) => {
    setSendingQuantity(val);
    if (touched.sendingQuantity) {
      setErrors(prev => ({ ...prev, sendingQuantity: validateField('sendingQuantity', val) }));
    }
  };

  const handleDispatchDateChange = (val) => {
    setDispatchDate(val);
    if (touched.dispatchDate) {
      setErrors(prev => ({ ...prev, dispatchDate: validateField('dispatchDate', val) }));
    }
    if (touched.expectedDelivery && expectedDelivery) {
      setErrors(prev => ({ ...prev, expectedDelivery: validateField('expectedDelivery', expectedDelivery) }));
    }
  };

  const handleExpectedDeliveryChange = (val) => {
    setExpectedDelivery(val);
    if (touched.expectedDelivery) {
      setErrors(prev => ({ ...prev, expectedDelivery: validateField('expectedDelivery', val) }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Receipt image size exceeds 5MB limit', 'error');
      return;
    }
    setReceiptImage(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setReceiptImage(null);
    setReceiptPreview('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedProductId) {
      newErrors.productId = 'Please select a product.';
    }

    if (!courierName || !courierName.trim()) {
      newErrors.courier = 'Please select a courier partner.';
    }

    if (!trackingNumber || !trackingNumber.trim()) {
      newErrors.trackingNumber = 'Please enter the tracking/AWB number.';
    }

    const rawQtyStr = String(sendingQuantity).trim();
    const qtyNum = Number(rawQtyStr);
    if (!rawQtyStr || isNaN(qtyNum)) {
      newErrors.sendingQuantity = 'Quantity must be a valid number.';
    } else if (!Number.isInteger(qtyNum)) {
      newErrors.sendingQuantity = 'Quantity must be a whole integer.';
    } else if (qtyNum < 1) {
      newErrors.sendingQuantity = 'Quantity must be at least 1.';
    } else if (qtyNum > remainingQty) {
      newErrors.sendingQuantity = `Quantity cannot exceed the remaining quantity (${remainingQty}).`;
    }

    if (!dispatchDate || !dispatchDate.trim()) {
      newErrors.dispatchDate = 'Dispatch date is required.';
    } else if (isNaN(new Date(dispatchDate).getTime())) {
      newErrors.dispatchDate = 'Please enter a valid dispatch date.';
    }

    if (expectedDelivery) {
      const delDateObj = new Date(expectedDelivery);
      if (isNaN(delDateObj.getTime())) {
        newErrors.expectedDelivery = 'Please enter a valid expected delivery date.';
      } else if (dispatchDate && delDateObj < new Date(dispatchDate)) {
        newErrors.expectedDelivery = 'Expected delivery cannot be earlier than dispatch date.';
      }
    }

    setErrors(newErrors);
    setTouched({
      productId: true,
      courier: true,
      trackingNumber: true,
      sendingQuantity: true,
      dispatchDate: true,
      expectedDelivery: true,
    });

    if (newErrors.productId && productRef.current) {
      productRef.current.focus();
    } else if (newErrors.courier && courierRef.current) {
      courierRef.current.focus();
    } else if (newErrors.trackingNumber && trackingRef.current) {
      trackingRef.current.focus();
    } else if (newErrors.sendingQuantity && quantityRef.current) {
      quantityRef.current.focus();
    } else if (newErrors.dispatchDate && dispatchDateRef.current) {
      dispatchDateRef.current.focus();
    } else if (newErrors.expectedDelivery && deliveryDateRef.current) {
      deliveryDateRef.current.focus();
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitDispatch = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the validation errors in the form before submitting.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedImageUrl = receiptPreview && !receiptImage ? receiptPreview : '';
      if (receiptImage) {
        const formData = new FormData();
        formData.append('image', receiptImage);
        try {
          const uploadRes = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          uploadedImageUrl = uploadRes.data?.url || uploadRes.data?.imageUrl || uploadRes.data?.filePath || '';
        } catch (uploadErr) {
          console.warn('Image upload endpoint fallback:', uploadErr.message);
        }
      }

      const targetId = order.id || order._id || order.orderId;
      const res = await api.patch(`/orders/${targetId}/courier`, {
        courierId: selectedCourierId || undefined,
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim(),
        productId: selectedProductId,
        productName: selectedItem?.name || selectedItem?.productName || ' Item',
        sendingQuantity: Number(sendingQuantity),
        dispatchDate,
        expectedDelivery,
        notes: courierNotes.trim(),
        receiptImage: uploadedImageUrl
      });

      showToast('Shipment dispatched successfully', 'success');
      
      const updatedOrder = res.data?.data || res.data;
      if (updatedOrder) {
        const uSnap = typeof updatedOrder.shippingSnapshot === 'object' && updatedOrder.shippingSnapshot ? updatedOrder.shippingSnapshot : {};
        setDispatchHistory([{
          id: updatedOrder.id || updatedOrder._id,
          orderNo: updatedOrder.orderNo || updatedOrder.orderId,
          courierName: uSnap.courierName || updatedOrder.courierName || updatedOrder.courier?.courierName || courierName || 'N/A',
          trackingNumber: uSnap.trackingNumber || updatedOrder.trackingNumber || trackingNumber || 'N/A',
          trackingUrl: uSnap.trackingUrl || updatedOrder.trackingUrl || trackingUrl || '',
          dispatchDate: uSnap.dispatchDate || updatedOrder.updatedAt || dispatchDate,
          expectedDelivery: uSnap.expectedDelivery || uSnap.estimatedDeliveryDate || expectedDelivery,
          status: updatedOrder.shipmentStatus || updatedOrder.orderStatus || 'Dispatched',
          productName: uSnap.productName || selectedItem?.name || selectedItem?.productName || 'Item',
          sendingQuantity: uSnap.sendingQuantity || Number(sendingQuantity),
          receiptImage: uSnap.receiptImage || uploadedImageUrl
        }]);
      }

      if (onCourierUpdated) onCourierUpdated(updatedOrder);

      setReceiptImage(null);
      setErrors({});
      setTouched({});
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      showToast(serverMsg || 'Failed to save courier dispatch.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDispatch = (log) => {
    if (log.productId) setSelectedProductId(log.productId);
    if (log.courierName) setCourierName(log.courierName);
    if (log.trackingNumber && log.trackingNumber !== 'N/A') setTrackingNumber(log.trackingNumber);
    if (log.trackingUrl) setTrackingUrl(log.trackingUrl);
    if (log.sendingQuantity) setSendingQuantity(log.sendingQuantity);
    if (log.dispatchDate) setDispatchDate(new Date(log.dispatchDate).toISOString().slice(0, 10));
    if (log.expectedDelivery) setExpectedDelivery(new Date(log.expectedDelivery).toISOString().slice(0, 10));
    if (log.receiptImage) setReceiptPreview(log.receiptImage);
    showToast('Editing dispatch details in form above', 'info');
  };

  const handleDeleteDispatch = async () => {
    try {
      const targetId = order.id || order._id || order.orderId;
      await api.delete(`/orders/${targetId}/courier`);
      showToast('Courier dispatch details deleted successfully', 'success');
      setDispatchHistory([]);
      if (onCourierUpdated) onCourierUpdated();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete courier dispatch', 'error');
    }
  };

  const hasDispatchedShipment = Boolean(
    snap.trackingNumber ||
    order.trackingNumber ||
    snap.courierName ||
    order.courierName ||
    order.courier?.courierName ||
    (dispatchHistory.length > 0 && dispatchHistory[0].trackingNumber && dispatchHistory[0].trackingNumber !== 'N/A')
  );

  const activeCourierName = snap.courierName || order.courierName || order.courier?.courierName || (dispatchHistory.length > 0 ? dispatchHistory[0].courierName : '');

  const formatDateDisplay = (dateVal) => {
    if (!dateVal || dateVal === 'N/A' || dateVal === 'null') return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* SHIPPING & LOGISTICS DISPATCH BRIEF */}
      <div className="bg-admin-subtle rounded-xl p-4 md:px-6 border border-admin-border flex justify-between items-center flex-wrap gap-5 text-xs">
        <div>
          <span className="text-[11px] text-admin-text-muted font-bold uppercase tracking-wider">Delivery Option</span>
          <div className="font-bold text-admin-text-primary text-sm mt-0.5">
            {snap.deliveryType || order.deliveryType || 'Standard Shipping'}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-admin-text-muted font-bold uppercase tracking-wider">Zone / Source</span>
          <div className="font-bold text-admin-text-primary text-sm mt-0.5">
            {typeof snap.zone === 'object'
              ? (snap.zone.name || snap.zone.code || 'National Zone')
              : (snap.zone || 'National Zone')} ({
              typeof snap.warehouse === 'object'
                ? (snap.warehouse.name || snap.warehouse.code || 'Main WH')
                : (snap.warehouse || 'Main WH')
            })
          </div>
        </div>
        <div>
          <span className="text-[11px] text-admin-text-muted font-bold uppercase tracking-wider">Estimated Delivery</span>
          <div className="font-bold text-emerald-500 text-sm mt-0.5">
            {formatDateDisplay(snap.expectedDelivery || snap.estimatedDeliveryDate)}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-admin-text-muted font-bold uppercase tracking-wider">Courier Status</span>
          <div className={`font-bold text-sm mt-0.5 ${hasDispatchedShipment ? 'text-sky-500' : 'text-admin-text-muted'}`}>
            {hasDispatchedShipment ? `${activeCourierName || 'Courier'} — ${order.shipmentStatus || 'Dispatched'}` : 'Pending Dispatch'}
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Receipt Image Upload Right */}
      <form onSubmit={handleSubmitDispatch} noValidate className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Form Left */}
        <div className="bg-admin-subtle p-5 rounded-xl border border-admin-border flex flex-col gap-4">
          <div className="text-sm font-bold text-admin-text-primary">
            Dispatch Details &amp; Courier Information
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pod-select-product" className="block text-xs font-bold text-admin-text-muted mb-1">
                Select Product *
              </label>
              <select
                id="pod-select-product"
                ref={productRef}
                className={`form-control text-xs ${touched.productId && errors.productId ? 'border-rose-500' : ''}`}
                value={selectedProductId}
                onChange={handleProductSelectChange}
                onBlur={() => handleBlur('productId', selectedProductId)}
                aria-invalid={Boolean(touched.productId && errors.productId)}
              >
                {items.length === 0 ? (
                  <option value="">No Products Available</option>
                ) : (
                  items.map((it, idx) => {
                    const itemVal = it._id || it.productId || it.id || String(idx);
                    const itemName = it.name || it.productName || ' Item';
                    const itemVar = it.variant || it.selectedSize || it.purity || 'Standard';
                    return (
                      <option key={itemVal} value={itemVal}>
                        {itemName} ({itemVar}) — Qty: {it.quantity || 1}
                      </option>
                    );
                  })
                )}
              </select>
              {touched.productId && errors.productId && (
                <span className="text-rose-500 text-[11px] flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.productId}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="pod-available-qty" className="block text-xs font-bold text-admin-text-muted mb-1">
                Available Item Quantity
              </label>
              <div className="relative">
                <input
                  id="pod-available-qty"
                  type="text"
                  readOnly
                  value={`${remainingQty} unit(s)`}
                  className="form-control text-xs bg-admin-card cursor-not-allowed font-semibold"
                />
                <span className="text-[11px] text-emerald-500 font-semibold mt-1 block">
                  ✓ {remainingQty} available for dispatch
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="pod-courier-partner" className="block text-xs font-bold text-admin-text-muted mb-1">
                Courier Partner Name *
              </label>
              <select
                id="pod-courier-partner"
                ref={courierRef}
                className={`form-control text-xs ${touched.courier && errors.courier ? 'border-rose-500' : ''}`}
                value={selectedCourierId || (courierName ? courierName : '')}
                onChange={handleCourierSelectChange}
                onBlur={() => handleBlur('courier', courierName)}
                aria-invalid={Boolean(touched.courier && errors.courier)}
              >
                <option value="">Select Courier Partner...</option>
                {courierMasters.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.courierName} ({c.courierCode})
                  </option>
                ))}
                {courierName && !courierMasters.some(c => c._id === selectedCourierId || c.courierName === courierName) && (
                  <option value={courierName}>{courierName}</option>
                )}
              </select>
              {touched.courier && errors.courier && (
                <span className="text-rose-500 text-[11px] flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.courier}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="pod-tracking-number" className="block text-xs font-bold text-admin-text-muted mb-1">
                Tracking ID / AWB *
              </label>
              <input
                id="pod-tracking-number"
                ref={trackingRef}
                type="text"
                className={`form-control text-xs ${touched.trackingNumber && errors.trackingNumber ? 'border-rose-500' : ''}`}
                value={trackingNumber}
                onChange={(e) => handleTrackingNumberChange(e.target.value)}
                onBlur={(e) => handleBlur('trackingNumber', e.target.value)}
                placeholder="AWB / Tracking Number"
                aria-invalid={Boolean(touched.trackingNumber && errors.trackingNumber)}
              />
              {touched.trackingNumber && errors.trackingNumber && (
                <span className="text-rose-500 text-[11px] flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.trackingNumber}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="pod-sending-quantity" className="block text-xs font-bold text-admin-text-muted mb-1">
                Sending Quantity *
              </label>
              <input
                id="pod-sending-quantity"
                ref={quantityRef}
                type="number"
                min="1"
                max={remainingQty}
                className={`form-control text-xs ${touched.sendingQuantity && errors.sendingQuantity ? 'border-rose-500' : ''}`}
                value={sendingQuantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                onBlur={(e) => handleBlur('sendingQuantity', e.target.value)}
                aria-invalid={Boolean(touched.sendingQuantity && errors.sendingQuantity)}
              />
              {touched.sendingQuantity && errors.sendingQuantity && (
                <span className="text-rose-500 text-[11px] flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.sendingQuantity}
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="pod-tracking-url" className="block text-xs font-bold text-admin-text-muted mb-1">
              Tracking URL
            </label>
            <input
              id="pod-tracking-url"
              type="url"
              className="form-control text-xs"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://track.bluedart.com/..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pod-dispatch-date" className="block text-xs font-bold text-admin-text-muted mb-1">
                Dispatch Date *
              </label>
              <input
                id="pod-dispatch-date"
                ref={dispatchDateRef}
                type="date"
                className={`form-control text-xs ${touched.dispatchDate && errors.dispatchDate ? 'border-rose-500' : ''}`}
                value={dispatchDate}
                onChange={(e) => handleDispatchDateChange(e.target.value)}
                onBlur={(e) => handleBlur('dispatchDate', e.target.value)}
                aria-invalid={Boolean(touched.dispatchDate && errors.dispatchDate)}
              />
              {touched.dispatchDate && errors.dispatchDate && (
                <span className="text-rose-500 text-[11px] flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.dispatchDate}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="pod-expected-delivery" className="block text-xs font-bold text-admin-text-muted mb-1">
                Expected Delivery Date
              </label>
              <input
                id="pod-expected-delivery"
                ref={deliveryDateRef}
                type="date"
                min={dispatchDate || undefined}
                className={`form-control text-xs ${touched.expectedDelivery && errors.expectedDelivery ? 'border-rose-500' : ''}`}
                value={expectedDelivery}
                onChange={(e) => handleExpectedDeliveryChange(e.target.value)}
                onBlur={(e) => handleBlur('expectedDelivery', e.target.value)}
                aria-invalid={Boolean(touched.expectedDelivery && errors.expectedDelivery)}
              />
              {touched.expectedDelivery && errors.expectedDelivery && (
                <span className="text-rose-500 text-[11px] flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.expectedDelivery}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="pod-courier-notes" className="block text-xs font-bold text-admin-text-muted m-0">
                Courier Notes / Special Instructions
              </label>
              <span className="text-[11px] text-admin-text-muted">
                {courierNotes.length}/500 chars
              </span>
            </div>
            <textarea
              id="pod-courier-notes"
              rows="2"
              maxLength={500}
              className="form-control text-xs resize-none"
              value={courierNotes}
              onChange={(e) => setCourierNotes(e.target.value)}
              placeholder="Secure tamper-proof box sealed..."
            />
          </div>

          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-1.5 py-2 px-6 text-xs disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <Save size={15} /> {submitting ? 'Saving Dispatch...' : 'Save Courier Dispatch'}
            </button>
          </div>
        </div>

        {/* Courier Image Upload Right */}
        <div className="bg-admin-subtle p-5 rounded-xl border border-admin-border flex flex-col gap-4 items-center text-center">
          <div className="text-sm font-bold text-admin-text-primary">
            Courier Receipt / POD Slip
          </div>

          {receiptPreview ? (
            <div className="w-full flex flex-col items-center gap-2.5">
              <div className="w-full h-44 rounded-lg overflow-hidden border border-admin-border">
                <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <label className="btn-secondary py-1 px-2.5 text-xs cursor-pointer flex items-center gap-1">
                  <Edit size={12} /> Replace
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleImageChange} className="hidden" />
                </label>
                <button type="button" onClick={handleRemoveImage} className="btn-secondary py-1 px-2.5 text-xs text-rose-500 flex items-center gap-1">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="w-full h-44 rounded-xl border-2 border-dashed border-admin-border flex flex-col items-center justify-center gap-2 cursor-pointer bg-admin-card p-4 hover:border-admin-accent transition-colors">
              <Upload size={24} className="text-admin-accent" />
              <span className="text-xs text-admin-text-muted">Click to upload slip or receipt photo</span>
              <span className="text-[11px] text-admin-text-muted">PNG, JPG, WEBP (Max 5MB)</span>
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>
      </form>

      {/* Courier History Table */}
      <div className="bg-admin-subtle rounded-xl border border-admin-border overflow-hidden">
        <div className="p-4 px-5 border-b border-admin-border font-bold text-sm text-admin-text-primary">
          Courier Dispatch &amp; Tracking History
        </div>

        <div className="data-table-container">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Order No</th>
                <th>Image</th>
                <th>Product Name</th>
                <th>Sending Qty</th>
                <th>Courier Name</th>
                <th>Tracking ID</th>
                <th>Tracking URL</th>
                <th>Dispatch Date</th>
                <th>Expected Delivery</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dispatchHistory.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center p-6 text-admin-text-muted">
                    No courier dispatch history recorded yet for Order #{order.orderNo || order.orderId}
                  </td>
                </tr>
              ) : (
                dispatchHistory.map((log, idx) => (
                  <tr key={log.id || log._id || idx}>
                    <td>{idx + 1}</td>
                    <td className="font-bold">{log.orderNo || order.orderNo || order.orderId}</td>
                    <td>
                      {log.receiptImage ? (
                        <a href={log.receiptImage} target="_blank" rel="noopener noreferrer" className="text-admin-accent inline-flex items-center">
                          <ImageIcon size={16} />
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td className="font-semibold">{log.productName || ' Item'}</td>
                    <td className="font-bold">{log.sendingQuantity || 1}</td>
                    <td className="font-semibold text-purple-600 dark:text-purple-400">
                      {log.courierName && log.courierName !== 'N/A' ? log.courierName : (snap.courierName || order.courierName || order.courier?.courierName || 'N/A')}
                    </td>
                    <td className="font-mono font-bold">
                      {log.trackingNumber && log.trackingNumber !== 'N/A' ? log.trackingNumber : (snap.trackingNumber || order.trackingNumber || 'N/A')}
                    </td>
                    <td>
                      {(log.trackingUrl || snap.trackingUrl || order.trackingUrl) ? (
                        <a href={log.trackingUrl || snap.trackingUrl || order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-500 hover:underline">
                          Link <ExternalLink size={11} />
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td>{formatDateDisplay(log.dispatchDate || snap.dispatchDate)}</td>
                    <td>{formatDateDisplay(log.expectedDelivery || snap.expectedDelivery)}</td>
                    <td>
                      <span className="badge badge-accent">{log.status || order.orderStatus || 'Dispatched'}</span>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditDispatch(log)}
                          className="btn-secondary py-1 px-1.5 text-[11px] flex items-center gap-1"
                          title="Edit Courier Dispatch"
                        >
                          <Edit size={12} /> Edit
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteDispatch}
                          className="btn-secondary py-1 px-1.5 text-[11px] text-rose-500 flex items-center gap-1"
                          title="Delete Courier Dispatch"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PODTab;
