import React from 'react';
import { Tag, CheckCircle } from 'lucide-react';

function toNum(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = parseFloat(String(val));
  return isNaN(num) ? defaultVal : num;
}

function formatMoney(amount) {
  const safe = isNaN(amount) ? 0 : amount;
  return safe.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PricingTable = ({ pricingData = {}, onChange }) => {
  const safeData = {
    sku: '',
    stock: '',
    availability: 'In Stock',
    mrp: '',
    offerPrice: '',
    gst: '',
    enableGst: false,
    enableDiscount: false,
    discountType: 'Flat',
    discountValue: '',
    isDiscountActive: true,
    gstMode: 'EXCLUSIVE',
    taxMode: 'CGST_SGST',
    gstType: 'CGST + SGST',
    ...pricingData,
  };

  const mrpVal = Math.max(0, toNum(safeData.mrp, 0));
  const enableDiscount = Boolean(safeData.enableDiscount);
  const isDiscountActive = Boolean(safeData.isDiscountActive);
  const discountType = safeData.discountType === 'Percentage' ? 'Percentage' : 'Flat';
  const rawDiscountVal = Math.max(0, toNum(safeData.discountValue, 0));

  const enableGst = safeData.enableGst !== undefined
    ? Boolean(safeData.enableGst)
    : (safeData.gst !== undefined && safeData.gst !== '' && Number(safeData.gst) > 0);
  const rawGstRate = safeData.gst !== undefined && safeData.gst !== null ? safeData.gst : '';
  const gstRateVal = enableGst ? Math.max(0, toNum(rawGstRate, 0)) : 0;
  
  const gstMode = (safeData.gstMode || 'EXCLUSIVE').toUpperCase() === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE';
  const rawTaxMode = safeData.taxMode || safeData.gstType || 'CGST_SGST';
  const taxMode = (rawTaxMode === 'IGST' || rawTaxMode === 'igst') ? 'IGST' : 'CGST_SGST';
  const isCgstSgst = taxMode === 'CGST_SGST';

  let deductionVal = 0;
  if (enableDiscount && isDiscountActive && mrpVal > 0 && rawDiscountVal > 0) {
    if (discountType === 'Percentage') {
      const validRate = Math.min(100, rawDiscountVal);
      deductionVal = (mrpVal * validRate) / 100;
    } else {
      deductionVal = Math.min(mrpVal, rawDiscountVal);
    }
  }

  const calculatedOfferPrice = Math.max(0, mrpVal - deductionVal);
  const effectivePrice = calculatedOfferPrice;

  const totalGstRate = gstRateVal;
  const halfGstRate = totalGstRate / 2;

  let taxableAmount = effectivePrice;
  let totalGstAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let finalPayableVal = effectivePrice;

  if (enableGst && totalGstRate > 0) {
    if (gstMode === 'INCLUSIVE') {
      // Offer price ALREADY includes GST
      const divisor = 1 + (totalGstRate / 100);
      taxableAmount = effectivePrice / divisor;
      totalGstAmount = effectivePrice - taxableAmount;
      finalPayableVal = effectivePrice;
    } else {
      // EXCLUSIVE: GST is added on top of Offer Price
      taxableAmount = effectivePrice;
      totalGstAmount = (effectivePrice * totalGstRate) / 100;
      finalPayableVal = effectivePrice + totalGstAmount;
    }

    if (isCgstSgst) {
      cgstAmount = totalGstAmount / 2;
      sgstAmount = totalGstAmount / 2;
      igstAmount = 0;
    } else {
      igstAmount = totalGstAmount;
      cgstAmount = 0;
      sgstAmount = 0;
    }
  }

  const handleFieldChange = (field, value) => {
    const updated = {
      ...safeData,
      [field]: value,
    };

    const nextMrp = field === 'mrp' ? Math.max(0, toNum(value, 0)) : mrpVal;
    const nextEnable = field === 'enableDiscount' ? Boolean(value) : enableDiscount;
    const nextActive = field === 'isDiscountActive' ? Boolean(value) : isDiscountActive;
    const nextType = field === 'discountType' ? value : discountType;
    const nextDiscVal = field === 'discountValue' ? Math.max(0, toNum(value, 0)) : rawDiscountVal;

    let nextDeduction = 0;
    if (nextEnable && nextActive && nextMrp > 0 && nextDiscVal > 0) {
      if (nextType === 'Percentage') {
        nextDeduction = (nextMrp * Math.min(100, nextDiscVal)) / 100;
      } else {
        nextDeduction = Math.min(nextMrp, nextDiscVal);
      }
    }

    const nextOffer = Math.max(0, nextMrp - nextDeduction);

    updated.mrp = field === 'mrp' ? value : safeData.mrp;
    updated.offerPrice = nextOffer;
    updated.price = nextOffer;
    updated.finalPrice = nextOffer;

    if (field === 'taxMode') {
      updated.gstType = value === 'IGST' ? 'IGST' : 'CGST + SGST';
    }

    if (field === 'enableGst') {
      updated.enableGst = Boolean(value);
      if (!value) {
        updated.gst = '';
      }
    }

    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Variant Metadata Row (SKU, Stock, Availability) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="form-label text-xs font-semibold">SKU CODE</label>
          <input
            type="text"
            className="form-control text-xs"
            placeholder="e.g. SKU-1001"
            value={safeData.sku || safeData.skuCode || ''}
            onChange={(e) => handleFieldChange('sku', e.target.value)}
          />
        </div>

        <div>
          <label className="form-label text-xs font-semibold">STOCK QTY</label>
          <input
            type="number"
            min="0"
            className="form-control text-xs"
            placeholder="e.g. 10"
            value={safeData.stock !== undefined && safeData.stock !== null ? safeData.stock : ''}
            onChange={(e) => handleFieldChange('stock', e.target.value)}
          />
        </div>

        <div>
          <label className="form-label text-xs font-semibold">AVAILABILITY</label>
          <select
            className="form-control text-xs"
            value={safeData.availability || safeData.stockStatus || 'In Stock'}
            onChange={(e) => handleFieldChange('availability', e.target.value)}
          >
            <option value="In Stock">Available (In Stock)</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Made to Order">Made to Order</option>
          </select>
        </div>
      </div>

      {/* 2. Real-time Product Pricing Card */}
      <div className="bg-admin-card border border-admin-border rounded-admin-sm p-5 flex flex-col gap-5">
        <div className="flex items-center gap-2 border-b border-admin-border pb-2.5">
          <Tag size={18} className="text-admin-accent" />
          <h4 className="text-xs font-bold text-admin-accent tracking-wider uppercase m-0">
            PRODUCT CHARGES
          </h4>
        </div>

        {/* MRP Input */}
        <div className="max-w-[300px]">
          <label className="form-label text-xs font-semibold">MRP (₹) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted text-sm">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control !pl-7 font-semibold text-xs text-admin-text-primary"
              placeholder="10000.00"
              value={safeData.mrp !== undefined && safeData.mrp !== null ? safeData.mrp : ''}
              onChange={(e) => handleFieldChange('mrp', e.target.value)}
            />
          </div>
          <small className="text-[11px] text-admin-text-muted">Base Maximum Retail Price</small>
        </div>

        {/* 3. MRP DISCOUNT (DEDUCTION) ROW */}
        <div
          className={`p-4 md:p-5 rounded-admin-xs flex flex-col gap-3.5 transition-colors duration-150 ${
            enableDiscount
              ? 'bg-admin-subtle border border-admin-accent'
              : 'bg-admin-subtle/50 border border-admin-border'
          }`}
        >
          {/* Header Row: Toggle Switch, Badge & Calculated Net */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <label className="switch cursor-pointer m-0">
                <input
                  type="checkbox"
                  checked={enableDiscount}
                  onChange={(e) => handleFieldChange('enableDiscount', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <span className="text-xs font-bold text-admin-text-primary">
                MRP Discount (Deduction)
              </span>
              <span className="text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 py-0.5 px-2 rounded-full">
                - Deduction
              </span>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-admin-text-muted uppercase tracking-wider">
                CALCULATED NET
              </div>
              <div
                className={`text-sm font-extrabold ${
                  enableDiscount && isDiscountActive && deductionVal > 0
                    ? 'text-rose-600'
                    : 'text-admin-text-muted'
                }`}
              >
                - ₹{formatMoney(deductionVal)}
              </div>
            </div>
          </div>

          {/* Row Inputs: Charge Type, Value & Active Checkbox */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 items-center ${
              enableDiscount ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'
            }`}
          >
            {/* Charge Type Dropdown */}
            <div>
              <label className="form-label text-[11px]">CHARGE TYPE</label>
              <select
                className="form-control text-xs"
                value={discountType}
                disabled={!enableDiscount}
                onChange={(e) => handleFieldChange('discountType', e.target.value)}
              >
                <option value="Flat">Flat (₹)</option>
                <option value="Percentage">Percentage (%)</option>
              </select>
            </div>

            {/* Value Input */}
            <div>
              <label className="form-label text-[11px]">DISCOUNT VALUE</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-admin-text-muted text-xs">
                  {discountType === 'Percentage' ? '%' : '₹'}
                </span>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'Percentage' ? 100 : mrpVal}
                  step={discountType === 'Percentage' ? '0.1' : '0.01'}
                  className="form-control !pl-6 text-xs"
                  disabled={!enableDiscount}
                  placeholder={discountType === 'Percentage' ? '10' : '1000'}
                  value={safeData.discountValue !== undefined && safeData.discountValue !== null ? safeData.discountValue : ''}
                  onChange={(e) => handleFieldChange('discountValue', e.target.value)}
                />
              </div>
            </div>

            {/* Discount Active Checkbox */}
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="discountActiveCheck"
                checked={enableDiscount && isDiscountActive}
                disabled={!enableDiscount}
                onChange={(e) => handleFieldChange('isDiscountActive', e.target.checked)}
                className="w-4 h-4 accent-admin-accent cursor-pointer disabled:cursor-not-allowed"
              />
              <label
                htmlFor="discountActiveCheck"
                className={`text-xs font-semibold text-admin-text-primary m-0 ${
                  enableDiscount ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                Discount Active
              </label>
            </div>
          </div>
        </div>

        {/* 4. FINAL GST SECTION WITH INCLUSIVE / EXCLUSIVE MODE */}
        <div
          className={`p-4 md:p-5 rounded-admin-xs flex flex-col gap-3.5 transition-colors duration-150 ${
            enableGst
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/40'
              : 'bg-admin-subtle/50 border border-admin-border'
          }`}
        >
          {/* Header Row: Enable GST Toggle Switch, Badge & Total GST */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <label className="switch cursor-pointer m-0">
                <input
                  type="checkbox"
                  checked={enableGst}
                  onChange={(e) => handleFieldChange('enableGst', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <span className="text-xs font-bold text-admin-text-primary">
                Final GST Charges
              </span>
              <span
                className={`text-[11px] font-semibold py-0.5 px-2 rounded-full ${
                  enableGst
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-admin-subtle text-admin-text-muted'
                }`}
              >
                {enableGst ? (gstMode === 'INCLUSIVE' ? 'GST Inclusive' : '+ GST Exclusive') : 'GST Disabled'}
              </span>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-admin-text-muted uppercase tracking-wider">
                TOTAL GST AMOUNT
              </div>
              <div
                className={`text-sm font-extrabold ${
                  enableGst && totalGstAmount > 0 ? 'text-emerald-600' : 'text-admin-text-muted'
                }`}
              >
                {gstMode === 'INCLUSIVE' ? '' : '+ '}₹{formatMoney(enableGst ? totalGstAmount : 0)}
              </div>
            </div>
          </div>

          {/* Row Inputs: GST Mode (Inclusive/Exclusive), Tax Mode & GST Rate Input */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start ${
              enableGst ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'
            }`}
          >
            {/* GST Mode Selector (Inclusive vs Exclusive) */}
            <div>
              <label className="form-label text-[11px] font-bold">GST MODE</label>
              <select
                className="form-control text-xs font-semibold"
                value={gstMode}
                disabled={!enableGst}
                onChange={(e) => handleFieldChange('gstMode', e.target.value)}
              >
                <option value="EXCLUSIVE">Exclusive (+ GST Added to Price)</option>
                <option value="INCLUSIVE">Inclusive (GST Included in Price)</option>
              </select>
            </div>

            {/* Tax Mode Selector (CGST + SGST vs IGST) */}
            <div>
              <label className="form-label text-[11px] font-bold">TAX MODE</label>
              <select
                className="form-control text-xs"
                value={taxMode}
                disabled={!enableGst}
                onChange={(e) => handleFieldChange('taxMode', e.target.value)}
              >
                <option value="CGST_SGST">CGST + SGST (Intra-State)</option>
                <option value="IGST">IGST (Inter-State)</option>
              </select>
            </div>

            {/* GST Rate (%) Input */}
            <div>
              <label className="form-label text-[11px] font-bold">FINAL GST RATE (%)</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted text-xs">%</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="form-control pr-7 text-xs"
                  disabled={!enableGst}
                  placeholder="e.g. 18"
                  value={safeData.gst !== undefined && safeData.gst !== null ? safeData.gst : ''}
                  onChange={(e) => handleFieldChange('gst', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* GST BREAKDOWN DISPLAY */}
          <div className="bg-admin-card p-3 rounded border border-admin-border flex justify-between items-center flex-wrap gap-2 mt-1">
            <div className="text-[11px] text-admin-text-secondary">
              Taxable Base: <strong className="text-admin-text-primary">₹{formatMoney(taxableAmount)}</strong>
              {gstMode === 'INCLUSIVE' && enableGst && totalGstAmount > 0 && (
                <span className="text-emerald-600 font-semibold ml-2">(Includes ₹{formatMoney(totalGstAmount)} GST)</span>
              )}
            </div>
            <div className="text-right flex items-center gap-3">
              {enableGst && totalGstRate > 0 ? (
                isCgstSgst ? (
                  <span className="text-xs font-semibold text-admin-text-secondary">
                    CGST ({halfGstRate}%): <span className="text-emerald-600">₹{formatMoney(cgstAmount)}</span> | SGST ({halfGstRate}%): <span className="text-emerald-600">₹{formatMoney(sgstAmount)}</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-admin-text-secondary">
                    IGST ({totalGstRate}%): <span className="text-emerald-600">₹{formatMoney(igstAmount)}</span>
                  </span>
                )
              ) : (
                <span className="text-xs font-semibold text-admin-text-muted">
                  No GST Applied (0%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 5. SUMMARY & EFFECTIVE FINAL PAYABLE PRICE CARD */}
        <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/25 rounded-admin-sm p-4 px-5 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-500" />
              <span className="text-xs font-bold text-admin-text-primary">
                Pricing Summary ({gstMode === 'INCLUSIVE' ? 'Inclusive of GST' : 'Exclusive of GST'}):
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-admin-text-muted mr-1.5">Final Payable Price:</span>
              <span className="text-xl font-extrabold text-emerald-600">
                ₹{formatMoney(finalPayableVal)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs border-t border-emerald-500/15 pt-2.5">
            <div>
              <span className="text-admin-text-muted">MRP: </span>
              <strong className="text-admin-text-primary font-bold">₹{formatMoney(mrpVal)}</strong>
            </div>
            <div>
              <span className="text-admin-text-muted">Discount: </span>
              <strong className={deductionVal > 0 ? 'text-rose-600 font-bold' : 'text-admin-text-primary font-bold'}>
                {deductionVal > 0 ? `-₹${formatMoney(deductionVal)}` : '₹0.00'}
              </strong>
            </div>
            <div>
              <span className="text-admin-text-muted">Offer Price: </span>
              <strong className="text-admin-text-primary font-bold">₹{formatMoney(effectivePrice)}</strong>
            </div>
            <div>
              <span className="text-admin-text-muted">GST ({totalGstRate}%): </span>
              <strong className="text-emerald-600 font-bold">
                {gstMode === 'INCLUSIVE' ? `Included (₹${formatMoney(totalGstAmount)})` : `+₹${formatMoney(totalGstAmount)}`}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingTable;