import React from 'react';
import { MapPin, Phone, Mail, Eye, Building } from 'lucide-react';

const ShippingTab = ({ order, onOpenPriceBreakup }) => {
  if (!order) return null;

  const items = order.items && order.items.length > 0 ? order.items : [];

  const subtotal = Number(order.subtotal || order.total || 0);
  const couponDiscount = Number(order.promoDiscount || order.discount || 0);
  const shippingCharge = Number(order.shippingFee || 0);
  const extraCharges = Number(order.packagingFee || 0) + Number(order.additionalChargesTotal || 0);
  const gst = Number(order.gstTotal || 0);
  const grandTotal = Number(order.total || 0);
  const paidAmount = order.paymentStatus === 'Paid' || order.paymentStatus === 'Success' ? grandTotal : Number(order.amountPaid || 0);
  const balanceAmount = grandTotal - paidAmount;

  const shipAddr = typeof order.shippingAddress === 'object' && order.shippingAddress ? order.shippingAddress : {};
  const shipSnap = typeof order.shippingSnapshot === 'object' && order.shippingSnapshot ? order.shippingSnapshot : {};
  const billAddr = typeof order.billingAddress === 'object' && order.billingAddress ? order.billingAddress : {};

  const customerName = order.customerName || shipAddr.name || shipAddr.fullName || order.user?.username || order.user?.fullName || order.name || 'Customer';
  const customerMobile = order.mobile || order.phone || shipAddr.mobile || shipAddr.phone || shipAddr.mobileNumber || order.user?.mobile || order.user?.phone || 'N/A';
  const customerEmail = order.email || shipAddr.email || order.user?.email || '';

  const pincode =
    shipAddr.pincode || shipAddr.zip || shipAddr.postalCode || shipAddr.pinCode || shipAddr.pin ||
    order.pincode || order.zip || order.postalCode || order.pinCode || order.pin ||
    shipSnap.pincode || shipSnap.zip || shipSnap.postalCode ||
    billAddr.pincode || billAddr.zip || billAddr.postalCode ||
    'N/A';

  const fullStreetAddress =
    (typeof order.address === 'string' && order.address.trim()) ? order.address :
    (shipAddr.street || shipAddr.address || shipAddr.line1) ? [shipAddr.street || shipAddr.address || shipAddr.line1, shipAddr.line2, shipAddr.city].filter(Boolean).join(', ') :
    (shipSnap.address || 'Street Address');

  const stateName = shipAddr.state || order.state || shipSnap.state || billAddr.state || 'Tamil Nadu';
  const cityName = shipAddr.city || order.city || shipSnap.city || billAddr.city || '';

  return (
    <div className="flex flex-col gap-6">
      {/* Addresses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COMPANY ADDRESS (Left Side) */}
        <div className="bg-admin-subtle p-5 rounded-xl border border-admin-border">
          <div className="flex items-center gap-2 mb-3 text-admin-accent font-bold text-sm">
            <Building size={16} /> COMPANY ADDRESS (Sender / Dispatch)
          </div>

          <div className="text-xs text-admin-text-secondary leading-relaxed">
            <strong className="text-sm text-admin-text-primary block mb-0.5">
              Cliickg
            </strong>
            <div className="flex items-center gap-1.5 text-admin-text-primary mb-1 flex-wrap">
              <Phone size={13} className="text-admin-accent" /> <strong>+91 8667537255</strong>
            </div>
            <div>No: 6/4, 2nd floor nethaji street , madhiyalagan nagar , chennai</div>
            <div>State: Tamil Nadu, Country: India</div>
          </div>
        </div>

        {/* SHIPPING ADDRESS (Right Side / Customer Details) */}
        <div className="bg-admin-subtle p-5 rounded-xl border border-admin-border">
          <div className="flex items-center gap-2 mb-3 text-emerald-500 font-bold text-sm">
            <MapPin size={16} /> SHIPPING ADDRESS (Customer Details)
          </div>

          <div className="text-xs text-admin-text-secondary leading-relaxed">
            <strong className="text-sm text-admin-text-primary block mb-0.5">
              {customerName}
            </strong>
            <div className="flex items-center gap-1.5 text-admin-text-primary mb-1 flex-wrap">
              <Phone size={13} className="text-emerald-500" /> <strong>{customerMobile}</strong>
              {customerEmail && <span className="flex items-center gap-1">| <Mail size={12} className="inline ml-1" /> {customerEmail}</span>}
            </div>
            <div>{fullStreetAddress}</div>
            <div>Pincode: <strong>{pincode}</strong></div>
            <div>State: {stateName}{cityName ? `, City: ${cityName}` : ''}, Country: India</div>
          </div>
        </div>
      </div>

      {/* PRODUCT TABLE */}
      <div className="bg-admin-subtle rounded-xl border border-admin-border overflow-hidden">
        <div className="data-table-container">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Name</th>
                <th>Size</th>
                <th>Quantity</th>
                <th>Product Price</th>
                <th>Price Breakup</th>
                <th>Final Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="7" className="text-center p-6 text-admin-text-muted">No items found</td></tr>
              ) : (
                items.map((item, idx) => {
                  const itemName = item.name || item.productName || item.title || 'Product';

                  const attrs = (typeof item.attributes === 'object' && item.attributes) ? item.attributes : {};
                  const grade = attrs.grade || attrs.material || '';
                  const purity = item.purity || attrs.purity || attrs.metalPurity || item.metalPurity || attrs.goldPurity || '';
                  const color = item.metalColor || attrs.metalColor || attrs.color || item.color || attrs.goldColor || '';
                  const size = item.size || attrs.size || attrs.dimensions || attrs.ringSize || item.variantSize || attrs.variantSize || '';
                  const variant = item.variant || item.variantName || attrs.variant || attrs.variantName || '';

                  const specs = [];
                  if (grade) specs.push(grade);
                  if (purity) specs.push(purity);
                  if (color) specs.push(color);
                  if (size && size !== 'Standard' && size !== 'N/A') specs.push(`Size: ${size}`);

                  const specText = specs.length > 0 ? specs.join(' • ') : (variant || '-');

                  const unitPrice = Number(item.sellingPrice || item.price || item.unitPrice || 0);
                  const qty = Number(item.quantity || item.qty || 1);
                  const lineTotal = unitPrice * qty;

                  return (
                    <tr key={item._id || item.id || item.productId || idx}>
                      <td>
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-neutral-50 dark:bg-neutral-800 border border-admin-border flex items-center justify-center">
                          <img
                            src={item.image || item.productImage || item.images?.[0] || '/uploads/fallbackimg.png'}
                            alt={itemName}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </td>
                      <td className="font-semibold text-admin-text-primary">{itemName}</td>
                      <td className="text-xs text-admin-text-secondary">{specText}</td>
                      <td className="font-bold">{qty}</td>
                      <td>₹{unitPrice.toLocaleString('en-IN')}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => onOpenPriceBreakup && onOpenPriceBreakup(item)}
                          className="btn-secondary py-1 px-2 text-[11px] flex items-center gap-1"
                        >
                          <Eye size={12} /> View Breakup
                        </button>
                      </td>
                      <td className="font-bold text-admin-accent">₹{lineTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM SUMMARY */}
      <div className="flex justify-end">
        <div className="w-full max-w-[360px] bg-admin-subtle rounded-xl p-5 border border-admin-border flex flex-col gap-2 text-xs">
          <div className="flex justify-between text-admin-text-secondary">
            <span>Subtotal</span>
            <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-500 font-semibold">
              <span>Coupon Discount</span>
              <strong>-₹{couponDiscount.toLocaleString('en-IN')}</strong>
            </div>
          )}

          <div className="flex justify-between text-admin-text-secondary">
            <span>Shipping Charge</span>
            <strong>{shippingCharge === 0 ? 'FREE' : `₹${shippingCharge.toLocaleString('en-IN')}`}</strong>
          </div>

          {extraCharges > 0 && (
            <div className="flex justify-between text-admin-text-secondary">
              <span>Packaging &amp; Additional Charges</span>
              <strong>₹{extraCharges.toLocaleString('en-IN')}</strong>
            </div>
          )}

          <div className="flex justify-between border-t border-admin-border pt-2 text-base font-extrabold text-admin-text-primary">
            <span>Grand Total</span>
            <span className="text-admin-accent">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between text-xs text-emerald-500 font-semibold">
            <span>Paid Amount</span>
            <span>₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className={`flex justify-between text-xs font-semibold ${balanceAmount > 0 ? 'text-rose-500' : 'text-admin-text-muted'}`}>
            <span>Balance Due</span>
            <span>₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingTab;
