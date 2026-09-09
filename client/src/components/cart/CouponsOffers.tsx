'use client';

import React, { useState } from 'react';
import { ChevronRight, X, Check, Percent } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

interface CouponsOffersProps {
  availablePromos: any[];
  subtotal: number;
}

export const CouponsOffers: React.FC<CouponsOffersProps> = ({ availablePromos, subtotal }) => {
  const {
    appliedPromoCode,
    promoDiscount,
    validatePromo,
    clearPromo,
    promoError,
  } = useCart();

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromoDetails, setSelectedPromoDetails] = useState<any>(null);

  const handleApply = (code: string) => {
    if (!code || !code.trim()) return;
    setPromoCodeInput(code.toUpperCase());
    validatePromo(code.trim().toUpperCase());
  };

  const handleRemove = () => {
    clearPromo();
    setPromoCodeInput('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
          Coupons & offers
        </h4>
        {availablePromos.length > 0 && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-transparent border-none text-primary hover:text-primary-hover text-sm font-bold cursor-pointer flex items-center gap-1 p-0 transition-colors"
          >
            View all ({availablePromos.length}) <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Input Code Form or Applied Banner */}
      {!appliedPromoCode ? (
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter promo code"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
              className="flex-1 py-2.5 px-3.5 border border-slate-300 focus:border-primary rounded-lg text-sm font-semibold outline-none tracking-wide transition-colors"
            />
            <button
              type="button"
              onClick={() => handleApply(promoCodeInput)}
              className="bg-primary hover:bg-primary-hover text-white border-none py-2.5 px-5 rounded-lg font-bold text-xs tracking-wider cursor-pointer transition-colors"
            >
              APPLY
            </button>
          </div>
          {promoError && (
            <p className="text-xs text-rose-500 mt-1.5 font-semibold m-0">{promoError}</p>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
              <Check size={16} /> Promo "{appliedPromoCode}" Applied!
            </div>
            <p className="text-xs text-emerald-800 m-0 mt-0.5 font-semibold">
              You saved ₹{(promoDiscount || 0).toLocaleString('en-IN')} on this order!
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="bg-transparent border-none text-rose-600 text-xs font-bold cursor-pointer underline hover:text-rose-700 transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      {/* Active Promos List  */}
      {availablePromos.length > 0 ? (
        <div className="flex flex-col gap-3">
          {availablePromos.slice(0, 3).map((promo, idx) => {
            const isApplied = appliedPromoCode === promo.code;

            return (
              <div key={promo.id || promo._id || promo.code}>
                {idx > 0 && <div className="border-t border-dashed border-slate-200 mb-3" />}
                <div className="flex items-start justify-between gap-3">
                  {/* Left Icon */}
                  <div className="w-11 h-11 aspect-square rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Percent size={20} />
                  </div>

                  {/* Middle Info */}
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-900 leading-tight">
                      Save {promo.discountType === 'Percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue}`} with {promo.code}
                    </div>

                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                      Applicable on your cart!
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPromoDetails(promo);
                        setIsModalOpen(true);
                      }}
                      className="bg-transparent border-none text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer p-0 mt-1 inline-flex items-center gap-0.5 transition-colors"
                    >
                      View details <ChevronRight size={12} />
                    </button>
                  </div>

                  {/* Right Action Button */}
                  <div>
                    {isApplied ? (
                      <div className="bg-emerald-100 text-emerald-700 border border-emerald-300 py-1.5 px-3 rounded-lg font-bold text-xs flex items-center gap-1">
                        <Check size={14} /> APPLIED
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApply(promo.code)}
                        className="bg-white hover:bg-primary text-primary hover:text-white border border-primary py-1.5 px-4 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                      >
                        APPLY
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-slate-500 text-center py-2 italic">
          No offers available for your cart right now.
        </div>
      )}

      {/* View All Coupons Modal Drawer */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-drawer-fade"
          onClick={() => {
            setIsModalOpen(false);
            setSelectedPromoDetails(null);
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 m-0">
                  Available Coupons & Offers
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Select a coupon to apply to your order
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedPromoDetails(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selected Promo Detailed View or Full List */}
            {selectedPromoDetails ? (
              <div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-extrabold text-orange-700 bg-orange-100 py-1 px-2.5 rounded-md border border-dashed border-orange-300">
                      {selectedPromoDetails.code}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      {selectedPromoDetails.discountType === 'Percentage' ? `${selectedPromoDetails.discountValue}% OFF` : `₹${selectedPromoDetails.discountValue} OFF`}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 m-0 mb-2 leading-snug">
                    {selectedPromoDetails.description || selectedPromoDetails.title || 'Special promotional discount for online orders.'}
                  </p>
                  <div className="text-xs text-slate-500 flex flex-col gap-1">
                    <div>• Minimum Order Value: ₹{Number(selectedPromoDetails.minOrderAmount || 0).toLocaleString('en-IN')}</div>
                    {Number(selectedPromoDetails.maxDiscountAmount || 0) > 0 && (
                      <div>• Maximum Discount: ₹{Number(selectedPromoDetails.maxDiscountAmount).toLocaleString('en-IN')}</div>
                    )}
                    <div>• Target: {selectedPromoDetails.targetComponent || 'Subtotal'}</div>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPromoDetails(null)}
                    className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Back to all coupons
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApply(selectedPromoDetails.code);
                      setIsModalOpen(false);
                      setSelectedPromoDetails(null);
                    }}
                    className="flex-1 py-2.5 rounded-lg border-none bg-primary hover:bg-primary-hover text-white font-bold text-sm cursor-pointer transition-colors"
                  >
                    APPLY COUPON
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {availablePromos.map((promo) => {
                  const minCart = Number(promo.minOrderAmount || 0);
                  const isEligible = subtotal >= minCart;
                  const remaining = minCart - subtotal;
                  const isApplied = appliedPromoCode === promo.code;

                  return (
                    <div
                      key={promo.id || promo._id || promo.code}
                      className={`rounded-xl p-3.5 flex flex-col gap-2 border ${
                        isApplied ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-orange-700 bg-orange-50 border border-dashed border-orange-300 py-0.5 px-2 rounded">
                            {promo.code}
                          </span>
                          <span className="text-xs font-bold text-emerald-600">
                            {promo.discountType === 'Percentage' ? `${promo.discountValue}% OFF` : `₹${promo.discountValue} OFF`}
                          </span>
                        </div>

                        {isApplied ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 py-1 px-2.5 rounded-md">
                            APPLIED ✓
                          </span>
                        ) : !isEligible ? (
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 py-1 px-2.5 rounded-md">
                            LOCKED 🔒
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleApply(promo.code);
                              setIsModalOpen(false);
                            }}
                            className="bg-primary hover:bg-primary-hover text-white border-none py-1.5 px-3.5 rounded-md font-bold text-xs cursor-pointer transition-colors"
                          >
                            APPLY
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 leading-snug">
                        {promo.description || promo.title || `Get discount on orders above ₹${minCart}`}
                      </div>

                      {!isEligible ? (
                        <div className="text-xs text-orange-700 font-bold">
                          Shop for ₹{remaining.toLocaleString('en-IN')} more to unlock this offer
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-600 font-bold">
                          Eligible for your current cart!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsOffers;
