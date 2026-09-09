'use client';

import React, { useState } from 'react';
import { Building, MapPin, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import sellerService from '../../services/seller.service';

export default function SellerRegistrationFormPage() {
  const [businessName, setBusinessName] = useState('');
  const [sellerType, setSellerType] = useState('Seller');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [pincode, setPincode] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ sellerId: string; businessName: string; status: string } | null>(null);

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    const cleanBusinessName = businessName.trim();
    if (!cleanBusinessName) {
      errs.businessName = 'Business name is required';
    } else if (cleanBusinessName.length < 2) {
      errs.businessName = 'Business name must be at least 2 characters';
    } else if (cleanBusinessName.length > 150) {
      errs.businessName = 'Business name must not exceed 150 characters';
    }

    const cleanSellerType = sellerType.trim();
    if (!cleanSellerType) {
      errs.sellerType = 'Seller type is required';
    } else if (cleanSellerType.length < 2) {
      errs.sellerType = 'Seller type must be at least 2 characters';
    } else if (cleanSellerType.length > 50) {
      errs.sellerType = 'Seller type must not exceed 50 characters';
    }

    const cleanGst = gstNumber.trim().toUpperCase();
    if (cleanGst) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
        errs.gstNumber = 'Invalid GSTIN format';
      }
    }

    const cleanPan = panNumber.trim().toUpperCase();
    if (!cleanPan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      errs.panNumber = 'Invalid PAN format. Example: ABCDE1234F';
    }

    const cleanContactPerson = contactPerson.trim();
    if (!cleanContactPerson) {
      errs.contactPerson = 'Contact person is required';
    } else if (cleanContactPerson.length < 2) {
      errs.contactPerson = 'Contact person must be at least 2 characters';
    } else if (cleanContactPerson.length > 100) {
      errs.contactPerson = 'Contact person must not exceed 100 characters';
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Enter a valid email address';
    }

    const cleanMobile = mobileNumber.trim().replace(/\D/g, '');
    if (!cleanMobile || !/^[6-9][0-9]{9}$/.test(cleanMobile)) {
      errs.mobileNumber = 'Enter a valid 10-digit Indian mobile number';
    }

    const cleanLocation = businessLocation.trim();
    if (!cleanLocation) {
      errs.businessLocation = 'Business location is required';
    } else if (cleanLocation.length < 2) {
      errs.businessLocation = 'Business location must be at least 2 characters';
    } else if (cleanLocation.length > 200) {
      errs.businessLocation = 'Business location must not exceed 200 characters';
    }

    const cleanPincode = pincode.trim();
    if (!cleanPincode || !/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      errs.pincode = 'Enter a valid 6-digit Indian pincode';
    }

    const cleanCategory = productCategory.trim();
    if (!cleanCategory) {
      errs.productCategory = 'Product category is required';
    } else if (cleanCategory.length < 2) {
      errs.productCategory = 'Product category must be at least 2 characters';
    } else if (cleanCategory.length > 100) {
      errs.productCategory = 'Product category must not exceed 100 characters';
    }

    if (!agreementAccepted) {
      errs.agreementAccepted = 'You must agree to the seller registration terms';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        businessName: businessName.trim(),
        sellerType: sellerType.trim(),
        gstNumber: gstNumber.trim().toUpperCase() || undefined,
        panNumber: panNumber.trim().toUpperCase(),
        contactPerson: contactPerson.trim(),
        email: email.trim().toLowerCase(),
        mobileNumber: mobileNumber.trim().replace(/\D/g, ''),
        businessLocation: businessLocation.trim(),
        pincode: pincode.trim(),
        productCategory: productCategory.trim(),
        agreementAccepted: true,
      };

      const res = await sellerService.registerSeller(payload);

      if (res.success && res.data) {
        setSuccessData({
          sellerId: res.data.sellerId,
          businessName: res.data.businessName,
          status: res.data.status,
        });
      }
    } catch (err: any) {
      const appErr = err?.appError || err?.response?.data;
      const msg = appErr?.message || err?.message || 'Failed to submit seller registration. Please try again.';
      setServerError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setBusinessName('');
    setSellerType('Seller');
    setGstNumber('');
    setPanNumber('');
    setContactPerson('');
    setEmail('');
    setMobileNumber('');
    setBusinessLocation('');
    setPincode('');
    setProductCategory('');
    setAgreementAccepted(false);
    setErrors({});
    setServerError(null);
  };

  return (
    <div className="w-[min(100%-2rem,960px)] mx-auto py-8 pb-16">
      {/* Top Banner / Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center py-1.5 px-3.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-3">
          <ShieldCheck size={14} className="mr-1.5" /> Partner Onboarding
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 m-0 mb-2 tracking-tight">
          Seller Register Form
        </h1>
        <p className="text-xs md:text-sm text-slate-500 m-0">
          Complete your business profile below to join our verified seller network.
        </p>
      </div>

      <div className="w-full">
        {/* SUCCESS CARD */}
        {successData ? (
          <div className="bg-white rounded-2xl p-8 md:p-10 text-center border border-slate-200 shadow-md max-w-[560px] mx-auto">
            <div className="mb-4">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 m-0 mb-2">
              Registration Submitted!
            </h2>
            <p className="text-xs md:text-sm text-slate-500 m-0 mb-6 leading-relaxed">
              Thank you for applying to join the CLIICKG seller network. Your application is under admin review.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 px-5 border border-slate-200 mb-6 text-left flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Seller ID:</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 py-0.5 px-2.5 rounded">
                  {successData.sellerId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Business Name:</span>
                <span className="text-xs font-semibold text-slate-900">{successData.businessName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Application Status:</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 py-0.5 px-2.5 rounded-full">
                  {successData.status}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={resetForm}
                className="bg-amber-600 hover:bg-amber-700 text-white border-none py-2.5 px-5 rounded-lg font-semibold text-xs cursor-pointer inline-flex items-center transition-colors"
              >
                Register Another Seller
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
            {serverError && (
              <div className="flex items-center bg-rose-50 text-rose-800 border border-rose-200 p-3.5 px-4 rounded-lg text-xs">
                <AlertCircle size={20} className="shrink-0 mr-2.5" />
                <div>
                  <strong>Submission Error:</strong> {serverError}
                </div>
              </div>
            )}

            {/* SECTION 1: BUSINESS INFORMATION */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center mb-5 pb-3 border-b border-slate-100">
                <Building size={20} className="text-amber-600 mr-2.5" />
                <h2 className="text-xs font-bold text-slate-900 m-0 tracking-wider">
                  BUSINESS INFORMATION
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Business Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 transition-colors ${
                      errors.businessName ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.businessName && <span className="text-xs text-rose-500 mt-0.5">{errors.businessName}</span>}
                </div>

                {/* Seller Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Seller Type
                  </label>
                  <input
                    type="text"
                    value={sellerType}
                    readOnly
                    className="py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"
                  />
                </div>

                {/* GST Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    GST Number <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={gstNumber}
                    maxLength={15}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 uppercase transition-colors ${
                      errors.gstNumber ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.gstNumber && <span className="text-xs text-rose-500 mt-0.5">{errors.gstNumber}</span>}
                </div>

                {/* PAN Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    PAN Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your PAN Number"
                    value={panNumber}
                    maxLength={10}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 uppercase transition-colors ${
                      errors.panNumber ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.panNumber && <span className="text-xs text-rose-500 mt-0.5">{errors.panNumber}</span>}
                </div>
              </div>
            </div>

            {/* SECTION 2: CONTACT & LOCATION */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center mb-5 pb-3 border-b border-slate-100">
                <MapPin size={20} className="text-amber-600 mr-2.5" />
                <h2 className="text-xs font-bold text-slate-900 m-0 tracking-wider">
                  CONTACT & LOCATION
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Contact Person */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Contact Person <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter contact person name"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 transition-colors ${
                      errors.contactPerson ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.contactPerson && <span className="text-xs text-rose-500 mt-0.5">{errors.contactPerson}</span>}
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 transition-colors ${
                      errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.email && <span className="text-xs text-rose-500 mt-0.5">{errors.email}</span>}
                </div>

                {/* Mobile Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={mobileNumber}
                    maxLength={10}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 transition-colors ${
                      errors.mobileNumber ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.mobileNumber && <span className="text-xs text-rose-500 mt-0.5">{errors.mobileNumber}</span>}
                </div>

                {/* Business Location */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Business Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter city / address"
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 transition-colors ${
                      errors.businessLocation ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.businessLocation && <span className="text-xs text-rose-500 mt-0.5">{errors.businessLocation}</span>}
                </div>

                {/* Pincode */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Pincode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit pincode"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 transition-colors ${
                      errors.pincode ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.pincode && <span className="text-xs text-rose-500 mt-0.5">{errors.pincode}</span>}
                </div>

                {/* Product Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Product Category <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter product category"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className={`py-2.5 px-3.5 rounded-lg border text-xs outline-none bg-white text-slate-900 transition-colors ${
                      errors.productCategory ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                  {errors.productCategory && <span className="text-xs text-rose-500 mt-0.5">{errors.productCategory}</span>}
                </div>
              </div>
            </div>

            {/* CONSENT & AGREEMENT */}
            <div className="bg-white rounded-xl p-5 px-6 border border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="w-4.5 h-4.5 mt-0.5 accent-amber-600 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-normal">
                  I agree and confirm that the information provided is accurate and consent to joining the seller network.
                </span>
              </label>
              {errors.agreementAccepted && <span className="text-xs text-rose-500 mt-1 block">{errors.agreementAccepted}</span>}
            </div>

            {/* ACTIONS BAR */}
            <div className="flex items-center justify-start gap-4 mt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-700 text-white border-none py-3 px-7 rounded-lg font-bold text-sm inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
