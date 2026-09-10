/**
 * Standard Pricing Engine for CLIICKG Client Application (TypeScript)
 * Based exclusively on MRP, Offer Price, and GST (Inclusive & Exclusive modes).
 */

export function calculatePricing(detail: any = {}): any {
  const mrp = parseFloat(detail.mrp || detail.originalPrice) || 0;

  const explicitTaxable = detail.taxableAmount !== undefined && detail.taxableAmount !== '' && !isNaN(Number(detail.taxableAmount)) ? parseFloat(detail.taxableAmount) : null;
  const explicitOffer = detail.offerPrice !== undefined && detail.offerPrice !== '' && !isNaN(Number(detail.offerPrice)) ? parseFloat(detail.offerPrice) : null;
  const explicitGstAmount = detail.gstAmount !== undefined && detail.gstAmount !== '' && !isNaN(Number(detail.gstAmount)) ? parseFloat(detail.gstAmount) : null;
  const rawSelling = detail.sellingPrice !== undefined && detail.sellingPrice !== '' ? parseFloat(detail.sellingPrice) : (detail.price !== undefined && detail.price !== '' ? parseFloat(detail.price) : 0);

  const enableGst = detail.enableGst !== undefined
    ? Boolean(detail.enableGst)
    : (detail.attributes?.pricingConfig?.enableGst !== undefined
      ? Boolean(detail.attributes.pricingConfig.enableGst)
      : (detail.gst !== undefined && detail.gst !== '' && Number(detail.gst) > 0));

  const rawGst = enableGst
    ? (detail.finalGstRate !== undefined && detail.finalGstRate !== ''
        ? detail.finalGstRate
        : (detail.gst !== undefined && detail.gst !== '' ? detail.gst : 0))
    : 0;

  const parsedGst = parseFloat(String(rawGst));
  const finalGstRate = isNaN(parsedGst) || parsedGst < 0 ? 0 : parsedGst;

  const rawGstMode = detail.gstMode || detail.attributes?.pricingConfig?.gstMode || 'EXCLUSIVE';
  const gstMode = String(rawGstMode).toUpperCase() === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE';

  let offerPrice = 0;
  if (explicitTaxable !== null && explicitTaxable > 0) {
    offerPrice = explicitTaxable;
  } else if (explicitOffer !== null && explicitOffer > 0) {
    offerPrice = explicitOffer;
  } else if (explicitGstAmount !== null && explicitGstAmount > 0 && rawSelling > explicitGstAmount) {
    offerPrice = rawSelling - explicitGstAmount;
  } else if (mrp > 0 && (rawSelling === 0 || rawSelling >= mrp)) {
    offerPrice = mrp;
  } else if (rawSelling > 0) {
    if (enableGst && finalGstRate > 0 && gstMode === 'EXCLUSIVE') {
      const divisor = 1 + (finalGstRate / 100);
      offerPrice = parseFloat((rawSelling / divisor).toFixed(2));
    } else {
      offerPrice = rawSelling;
    }
  }

  const effectivePrice = offerPrice > 0 ? offerPrice : (mrp > 0 ? mrp : 0);

  const rawTaxMode = detail.taxMode || detail.attributes?.pricingConfig?.taxMode || detail.gstType || detail.attributes?.pricingConfig?.gstType || 'CGST_SGST';
  const taxMode = (rawTaxMode === 'IGST' || rawTaxMode === 'igst') ? 'IGST' : 'CGST_SGST';
  const isCgstSgst = taxMode === 'CGST_SGST';
  const gstType = isCgstSgst ? 'CGST + SGST' : 'IGST';

  let taxableAmount = effectivePrice;
  let finalGstAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let finalPayablePrice = effectivePrice;

  if (enableGst && finalGstRate > 0) {
    if (gstMode === 'INCLUSIVE') {
      const divisor = 1 + (finalGstRate / 100);
      taxableAmount = parseFloat((effectivePrice / divisor).toFixed(2));
      finalGstAmount = parseFloat((effectivePrice - taxableAmount).toFixed(2));
      finalPayablePrice = effectivePrice;
    } else {
      taxableAmount = effectivePrice;
      if (explicitGstAmount !== null && explicitGstAmount > 0 && explicitTaxable !== null) {
        finalGstAmount = explicitGstAmount;
      } else {
        finalGstAmount = parseFloat(((effectivePrice * finalGstRate) / 100).toFixed(2));
      }
      finalPayablePrice = parseFloat((effectivePrice + finalGstAmount).toFixed(2));
    }

    if (isCgstSgst) {
      cgstAmount = parseFloat((finalGstAmount / 2).toFixed(2));
      sgstAmount = parseFloat((finalGstAmount - cgstAmount).toFixed(2));
      igstAmount = 0;
    } else {
      igstAmount = finalGstAmount;
      cgstAmount = 0;
      sgstAmount = 0;
    }
  }

  const halfGstRate = finalGstRate / 2;

  return {
    mrp,
    offerPrice,
    basePrice: effectivePrice,
    subtotal: effectivePrice,
    gstMode,
    taxMode,
    gstType,
    enableGst,
    finalGstRate,
    taxableAmount,
    cgstRate: isCgstSgst ? halfGstRate : 0,
    sgstRate: isCgstSgst ? halfGstRate : 0,
    cgstAmount,
    sgstAmount,
    igstAmount,
    finalGstAmount,
    finalPrice: effectivePrice,
    finalPayablePrice,
  };
}
