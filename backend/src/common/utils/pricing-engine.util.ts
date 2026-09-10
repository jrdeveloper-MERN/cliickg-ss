import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

export interface PricingInput {
  mrp?: number | string | Prisma.Decimal;
  offerPrice?: number | string | Prisma.Decimal;
  price?: number | string | Prisma.Decimal;
  discountType?: string;
  discountValue?: number | string | Prisma.Decimal;
  gstRate?: number | string | Prisma.Decimal;
  gstMode?: string; // 'INCLUSIVE' | 'EXCLUSIVE'
  taxMode?: string; // 'CGST_SGST' | 'IGST'
  quantity?: number;
}

export interface PricingResult {
  mrp: number;
  discountAmount: number;
  offerPrice: number;
  taxableAmount: number;
  gstRate: number;
  taxMode: 'CGST_SGST' | 'IGST';
  gstMode: 'INCLUSIVE' | 'EXCLUSIVE';
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  itemFinalPrice: number;
  lineTaxableSubtotal: number;
  lineGstTotal: number;
  lineTotal: number;
}

function toDecimal(val: any, fallback = 0): InstanceType<typeof Decimal> {
  if (val === undefined || val === null || val === '') {
    return new Decimal(fallback);
  }
  try {
    const d = new Decimal(String(val).trim());
    return isNaN(d.toNumber()) ? new Decimal(fallback) : d;
  } catch {
    return new Decimal(fallback);
  }
}

/**
 * Authoritative single pricing calculation engine for CLIICK-G.
 * Guarantees exact 2-decimal arithmetic using Prisma.Decimal ROUND_HALF_UP.
 */
export function calculateItemPricing(input: PricingInput = {}): PricingResult {
  const mrpDec = toDecimal(input.mrp, 0);
  const rawOfferDec = toDecimal(input.offerPrice || input.price, 0);
  const discountValDec = toDecimal(input.discountValue, 0);
  const discountType = (input.discountType || 'Flat').trim();

  // 1. Calculate discount deduction and Offer Price
  let discountAmountDec = new Decimal(0);
  if (discountValDec.gt(0) && mrpDec.gt(0)) {
    if (discountType === 'Percentage') {
      const validRate = Decimal.min(new Decimal(100), discountValDec);
      discountAmountDec = mrpDec.mul(validRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    } else {
      discountAmountDec = Decimal.min(mrpDec, discountValDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
  }

  let offerPriceDec = rawOfferDec.gt(0) ? rawOfferDec : mrpDec;
  if (discountAmountDec.gt(0) && mrpDec.gt(0)) {
    offerPriceDec = Decimal.max(new Decimal(0), mrpDec.minus(discountAmountDec)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // 2. Tax Mode and GST Rate
  const rawGstRateDec = toDecimal(input.gstRate, 0);
  const gstRateDec = rawGstRateDec.gt(0) ? rawGstRateDec : new Decimal(0);
  const rawTaxMode = String(input.taxMode || 'CGST_SGST').trim().toUpperCase();
  const taxMode: 'CGST_SGST' | 'IGST' = rawTaxMode === 'IGST' ? 'IGST' : 'CGST_SGST';
  const isCgstSgst = taxMode === 'CGST_SGST';

  const rawGstMode = String(input.gstMode || 'EXCLUSIVE').trim().toUpperCase();
  const gstMode: 'INCLUSIVE' | 'EXCLUSIVE' = rawGstMode === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE';

  // 3. Taxable Amount, GST Amount & Final Item Price
  let taxableAmountDec = offerPriceDec;
  let gstAmountDec = new Decimal(0);
  let itemFinalPriceDec = offerPriceDec;

  if (gstRateDec.gt(0) && offerPriceDec.gt(0)) {
    if (gstMode === 'INCLUSIVE') {
      // Offer price already includes GST: taxable = offerPrice / (1 + rate/100)
      const divisor = new Decimal(100).add(gstRateDec);
      taxableAmountDec = offerPriceDec.mul(100).div(divisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      gstAmountDec = offerPriceDec.minus(taxableAmountDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      itemFinalPriceDec = offerPriceDec;
    } else {
      // EXCLUSIVE / Canonical contract: taxable = offerPrice, GST added on top
      taxableAmountDec = offerPriceDec;
      gstAmountDec = taxableAmountDec.mul(gstRateDec).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      itemFinalPriceDec = taxableAmountDec.add(gstAmountDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
  }

  // 4. CGST / SGST / IGST Split
  let cgstAmountDec = new Decimal(0);
  let sgstAmountDec = new Decimal(0);
  let igstAmountDec = new Decimal(0);

  if (gstAmountDec.gt(0)) {
    if (isCgstSgst) {
      cgstAmountDec = gstAmountDec.div(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      sgstAmountDec = gstAmountDec.minus(cgstAmountDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    } else {
      igstAmountDec = gstAmountDec;
    }
  }

  // 5. Quantity & Line Totals
  const rawQty = input.quantity !== undefined ? Number(input.quantity) : 1;
  const qty = Math.max(1, Math.floor(isNaN(rawQty) ? 1 : rawQty));
  const qtyDec = new Decimal(qty);

  const lineTaxableSubtotalDec = taxableAmountDec.mul(qtyDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const lineGstTotalDec = gstAmountDec.mul(qtyDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  // lineTotal is guaranteed to equal lineTaxableSubtotal + lineGstTotal
  const lineTotalDec = lineTaxableSubtotalDec.add(lineGstTotalDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    mrp: mrpDec.toNumber(),
    discountAmount: discountAmountDec.toNumber(),
    offerPrice: offerPriceDec.toNumber(),
    taxableAmount: taxableAmountDec.toNumber(),
    gstRate: gstRateDec.toNumber(),
    taxMode,
    gstMode,
    gstAmount: gstAmountDec.toNumber(),
    cgstAmount: cgstAmountDec.toNumber(),
    sgstAmount: sgstAmountDec.toNumber(),
    igstAmount: igstAmountDec.toNumber(),
    itemFinalPrice: itemFinalPriceDec.toNumber(),
    lineTaxableSubtotal: lineTaxableSubtotalDec.toNumber(),
    lineGstTotal: lineGstTotalDec.toNumber(),
    lineTotal: lineTotalDec.toNumber(),
  };
}
