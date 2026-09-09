import React from 'react';
import { X } from 'lucide-react';

const PriceBreakupModal = ({ isOpen, onClose, item, order }) => {
  if (!isOpen || !item) return null;

  const variants = item.product && Array.isArray(item.product.variants) ? item.product.variants : [];
  const selectedVariant = variants.find(v => (item.variantId && v.id === item.variantId) || (item.sku && (v.sku === item.sku || v.skuCode === item.sku))) || item.variantDetails || null;

  const attr = item.attributes && typeof item.attributes === 'object' ? item.attributes : {};

  const productName = item.productName || item.name || item.product?.name || 'Product';
  const purity = selectedVariant?.purity || item.purity || attr.purity || '';
  const metalColor = selectedVariant?.metalColor || item.metalColor || attr.metalColor || '';
  const variantLabel = item.variant || item.variantName || (purity ? `${purity}${metalColor ? `, ${metalColor}` : ''}` : (selectedVariant?.sku || 'Standard'));
  const grossWeight = selectedVariant?.grossWeight ? Number(selectedVariant.grossWeight) : (item.grossWeight ? Number(item.grossWeight) : null);
  const netWeight = selectedVariant?.netWeight ? Number(selectedVariant.netWeight) : (item.netWeight ? Number(item.netWeight) : null);
  const qty = Number(item.quantity || item.qty || 1);

  const unitPrice = Number(item.unitPrice || item.sellingPrice || item.price || selectedVariant?.offerPrice || selectedVariant?.price || 0);
  const mrp = Number(selectedVariant?.mrp || item.mrp || unitPrice);
  const discount = Math.max(0, mrp - unitPrice);
  const gstRate = Number(selectedVariant?.gst !== undefined && selectedVariant?.gst !== '' ? selectedVariant.gst : (item.gstRate || attr.gstRate || 0));
  const rawGstMode = selectedVariant?.attributes?.pricingConfig?.gstMode || item.gstMode || attr.gstMode || 'INCLUSIVE';
  const isInclusive = String(rawGstMode).toUpperCase() === 'INCLUSIVE';
  const gstType = selectedVariant?.attributes?.pricingConfig?.gstType || attr.gstType || 'CGST + SGST';
  const isIgst = gstType === 'IGST';

  let totalAmount = Number(item.totalPrice || item.total || 0);
  if (!totalAmount || totalAmount <= 0) {
    if (isInclusive || gstRate === 0) {
      totalAmount = unitPrice * qty;
    } else {
      totalAmount = (unitPrice + (unitPrice * gstRate / 100)) * qty;
    }
  }

  let basePriceExclGst = totalAmount;
  let totalGstAmount = 0;

  if (gstRate > 0) {
    if (isInclusive) {
      basePriceExclGst = totalAmount / (1 + (gstRate / 100));
      totalGstAmount = totalAmount - basePriceExclGst;
    } else {
      basePriceExclGst = unitPrice * qty;
      totalGstAmount = basePriceExclGst * (gstRate / 100);
      totalAmount = basePriceExclGst + totalGstAmount;
    }
  } else {
    basePriceExclGst = totalAmount;
    totalGstAmount = 0;
  }

  const cgstAmount = totalGstAmount / 2;
  const sgstAmount = totalGstAmount / 2;

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[2000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-admin-card text-admin-text-primary rounded-xl w-[92%] max-w-[540px] max-h-[90vh] overflow-y-auto shadow-2xl border border-admin-border relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 px-5 border-b border-admin-border bg-admin-card sticky top-0 z-10">
          <h3 className="text-base font-bold text-blue-900 dark:text-blue-300 m-auto text-center">
            Price Breakup
          </h3>
          <button
            type="button"
            className="bg-transparent border-none text-admin-text-muted hover:text-admin-text-primary cursor-pointer p-1.5 rounded-md absolute right-4 flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          <div className="border border-admin-border rounded-lg overflow-hidden bg-admin-card">
            {/* Product Information */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border-y border-admin-border py-2 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide first:border-t-0">
              Product Information
            </div>
            <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
              <span className="text-admin-text-muted">Product Name</span>
              <span className="text-admin-text-primary font-semibold text-right">{productName}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
              <span className="text-admin-text-muted">Variant</span>
              <span className="text-admin-text-primary font-semibold text-right">{variantLabel}</span>
            </div>

            {(grossWeight !== null || netWeight !== null) && (
              <>
                <div className="bg-blue-50 dark:bg-blue-950/40 border-y border-admin-border py-2 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide">
                  Weight Information
                </div>
                {grossWeight !== null && (
                  <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
                    <span className="text-admin-text-muted">Gross Weight</span>
                    <span className="text-admin-text-primary font-semibold text-right">{grossWeight.toFixed(3)} g</span>
                  </div>
                )}
                {netWeight !== null && (
                  <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
                    <span className="text-admin-text-muted">Net Weight</span>
                    <span className="text-admin-text-primary font-semibold text-right">{netWeight.toFixed(3)} g</span>
                  </div>
                )}
              </>
            )}

            {/* Payment Summary */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border-y border-admin-border py-2 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide">
              Payment Summary ({qty} {qty === 1 ? 'Item' : 'Items'})
            </div>
            <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
              <span className="text-admin-text-muted">Maximum Retail Price (MRP)</span>
              <span className="text-admin-text-primary font-semibold text-right">₹{formatCurrency(mrp * qty)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
                <span className="text-admin-text-muted">MRP Discount</span>
                <span className="text-rose-500 font-semibold text-right">- ₹{formatCurrency(discount * qty)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
              <span className="text-admin-text-muted">Selling Base Price {gstRate > 0 && isInclusive ? '(Excl. GST)' : ''}</span>
              <span className="text-admin-text-primary font-semibold text-right">₹{formatCurrency(basePriceExclGst)}</span>
            </div>
            {gstRate > 0 && (
              <>
                <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
                  <span className="text-admin-text-muted">GST Tax Status</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    isInclusive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {isInclusive ? 'Included in Price (Inclusive)' : 'Excluded from Price (Added Extra)'}
                  </span>
                </div>
                {isIgst ? (
                  <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
                    <span className="text-admin-text-muted">IGST ({gstRate}%)</span>
                    <span className="text-admin-text-primary font-semibold text-right">
                      {isInclusive ? `₹${formatCurrency(totalGstAmount)} (Included)` : `+ ₹${formatCurrency(totalGstAmount)} (Excluded)`}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
                      <span className="text-admin-text-muted">CGST ({(gstRate / 2).toFixed(1)}%)</span>
                      <span className="text-admin-text-primary font-semibold text-right">
                        {isInclusive ? `₹${formatCurrency(cgstAmount)} (Included)` : `+ ₹${formatCurrency(cgstAmount)} (Excluded)`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 px-3.5 border-b border-admin-border text-xs">
                      <span className="text-admin-text-muted">SGST ({(gstRate / 2).toFixed(1)}%)</span>
                      <span className="text-admin-text-primary font-semibold text-right">
                        {isInclusive ? `₹${formatCurrency(sgstAmount)} (Included)` : `+ ₹${formatCurrency(sgstAmount)} (Excluded)`}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Final Paid Amount Banner */}
            <div className="flex justify-between items-center bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 p-3 px-4 font-extrabold text-base">
              <span>Final Paid Amount</span>
              <span>₹{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceBreakupModal;
