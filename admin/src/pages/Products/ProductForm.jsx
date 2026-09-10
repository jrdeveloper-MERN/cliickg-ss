import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import PricingTable from '../../components/PricingTable';
import VariantImageGallery from '../../components/VariantImageGallery';
import RichTextEditor from '../../components/Common/RichTextEditor';
import {
  validateImageFile, IMAGE_SPECS, trimString,
  validateRequired, validateDropdown
} from '../../utils/validation';
import {
  ArrowLeft, Check, X, Edit3, Plus, Trash2,
  ImageIcon, Loader2, AlertCircle, Award
} from 'lucide-react';

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'details'
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState({});

  // Categories & CMS Certificates
  const [mainCategories, setMainCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [cmsCertificates, setCmsCertificates] = useState([]);

  // Form Fields - Basic Details
  const [name, setName] = useState('');
  const [offerText, setOfferText] = useState('');
  const [mainCategoryId, setMainCategoryId] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [subCategoryId, setSubCategoryId] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [status, setStatus] = useState('Active');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');

  // Image files & previews
  const [productImage, setProductImage] = useState('');
  const [productImageFile, setProductImageFile] = useState(null);

  const [secondaryImage, setSecondaryImage] = useState('');
  const [secondaryImageFile, setSecondaryImageFile] = useState(null);

  // CMS Selected Certificates
  const [selectedCertificates, setSelectedCertificates] = useState([]);

  // Dynamic attributes metadata
  const [mappedAttributes, setMappedAttributes] = useState([]);
  const [allCaptions, setAllCaptions] = useState([]);

  // Factory function for clean product variant detail block
  const createDefaultDetailBlock = useCallback(() => ({
    sku: '',
    skuCode: '',
    mrp: '',
    offerPrice: '',
    gst: '',
    enableGst: false,
    price: 0,
    enableDiscount: false,
    discountType: 'Flat',
    discountValue: '',
    isDiscountActive: true,
    gstType: 'CGST + SGST',
    stock: '',
    availability: 'In Stock',
    stockStatus: 'Available',
    status: 'Active',
    images: [],
    attributes: {}
  }), []);

  // Variant specification blocks array
  const [productDetails, setProductDetails] = useState([createDefaultDetailBlock()]);

  // Form State Reset Function
  const resetForm = useCallback(() => {
    setName('');
    setOfferText('');
    setMainCategoryId('');
    setFilteredCategories([]);
    setCategoryId('');
    setFilteredSubCategories([]);
    setSubCategoryId('');
    setHsnCode('');
    setStatus('Active');
    setShortDescription('');
    setDescription('');
    setProductImage('');
    setProductImageFile(null);
    setSecondaryImage('');
    setSecondaryImageFile(null);
    setSelectedCertificates([]);
    setMappedAttributes([]);
    setProductDetails([createDefaultDetailBlock()]);
    setIsDirty(false);
  }, [createDefaultDetailBlock]);

  // Initial Data Fetching from Database
  useEffect(() => {
    fetchDatabaseData();
  }, [id]);

  // Prevent accidental navigation when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  const fetchDatabaseData = async () => {
    setIsLoadingData(true);
    try {
      const [mainRes, catRes, subRes, certsRes, captionsRes] = await Promise.all([
        api.get('/main-categories'),
        api.get('/categories'),
        api.get('/sub-categories'),
        api.get('/cms/certificates').catch(() => ({ data: [] })),
        api.get('/attribute/captions').catch(() => ({ data: [] }))
      ]);

      const mains = mainRes.data || [];
      const cats = catRes.data || [];
      const subs = subRes.data || [];
      const certs = Array.isArray(certsRes.data) ? certsRes.data : [];
      const captions = Array.isArray(captionsRes.data) ? captionsRes.data : (captionsRes.data?.data || []);

      setMainCategories(mains);
      setAllCategories(cats);
      setAllSubCategories(subs);
      setCmsCertificates(certs);
      setAllCaptions(captions);

      if (isEdit) {
        await fetchProductDetail(id, cats, subs);
      } else {
        resetForm();
      }
    } catch (err) {
      showToast('Error connecting to category database', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const getNormalizedAttributeList = useCallback(() => {
    if (mappedAttributes && mappedAttributes.length > 0) {
      return mappedAttributes.map((m) => {
        const captionName = m.attributeId?.caption || m.caption || m.name || '';
        const rawVals = Array.isArray(m.values) ? m.values : (m.attributeId?.values || []);
        const values = rawVals
          .map(v => typeof v === 'object' && v !== null ? (v.value || v.name || '') : String(v))
          .filter(Boolean);
        return {
          id: m._id || m.id || captionName,
          caption: captionName,
          values,
        };
      }).filter(a => Boolean(a.caption));
    }

    if (allCaptions && allCaptions.length > 0) {
      return allCaptions
        .filter(c => c.status !== 'Inactive')
        .map((c) => {
          const captionName = c.caption || '';
          const rawVals = Array.isArray(c.values) ? c.values : [];
          const values = rawVals
            .filter(v => !v || v.status !== 'Inactive')
            .map(v => typeof v === 'object' && v !== null ? (v.value || v.name || '') : String(v))
            .filter(Boolean);
          return {
            id: c._id || c.id || captionName,
            caption: captionName,
            values,
          };
        }).filter(a => Boolean(a.caption));
    }

    return [];
  }, [mappedAttributes, allCaptions]);

  const getIdStr = (item) => (item && typeof item === 'object' ? (item._id || item.id || '') : item || '');

  const fetchProductDetail = async (prodId, catList, subList) => {
    try {
      const res = await api.get(`/products/${prodId}`);
      const p = res.data;

      setName(p.name || '');
      setOfferText(p.offerText || '');
      setHsnCode(p.hsnCode || '');
      setStatus(p.status || 'Active');
      setShortDescription(p.shortDescription || '');
      setDescription(p.description || '');

      setProductImage(p.productImage || (p.images && p.images[0]) || '');
      setSecondaryImage(p.secondaryImage || (p.images && p.images[1]) || '');

      if (Array.isArray(p.certificates)) {
        setSelectedCertificates(p.certificates);
      } else if (p.certificates) {
        setSelectedCertificates([p.certificates]);
      } else {
        setSelectedCertificates([]);
      }

      const mId = getIdStr(p.mainCategoryId);
      const cId = getIdStr(p.categoryId);
      const sId = getIdStr(p.subCategoryId);

      setMainCategoryId(mId);

      const cats = catList.filter(c => getIdStr(c.mainCategoryId) === mId);
      setFilteredCategories(cats);
      setCategoryId(cId);

      const subs = subList.filter(s => getIdStr(s.categoryId) === cId);
      setFilteredSubCategories(subs);
      setSubCategoryId(sId);

      const detailsArr = (p.productDetails && p.productDetails.length > 0)
        ? p.productDetails
        : (p.variants && p.variants.length > 0 ? p.variants : []);

      if (detailsArr.length > 0) {
        setProductDetails(detailsArr.map(d => {
          const cfg = d.attributes?.pricingConfig || {};
          const varGst = d.finalGstRate !== undefined && d.finalGstRate !== ''
            ? d.finalGstRate
            : (d.gst !== undefined && d.gst !== '' ? d.gst : (cfg.gst !== undefined && cfg.gst !== '' ? cfg.gst : ''));

          // Extract clean user attributes (excluding pricingConfig)
          const cleanAttrs = {};
          if (d.attributes && typeof d.attributes === 'object') {
            const rawMap = d.attributes instanceof Map ? Object.fromEntries(d.attributes) : d.attributes;
            Object.entries(rawMap).forEach(([k, v]) => {
              if (k !== 'pricingConfig' && typeof v !== 'object') {
                cleanAttrs[k] = v;
              }
            });
          }

          return {
            ...d,
            sku: d.sku || d.skuCode || '',
            skuCode: d.skuCode || d.sku || '',
            stock: d.stock !== undefined && d.stock !== null ? d.stock : '',
            availability: d.stockStatus || d.availability || 'In Stock',
            stockStatus: d.stockStatus || d.availability || 'In Stock',
            mrp: d.mrp !== undefined && d.mrp !== null ? d.mrp : '',
            offerPrice: d.offerPrice !== undefined && d.offerPrice !== null ? d.offerPrice : '',
            price: d.price || d.offerPrice || d.mrp || 0,
            enableDiscount: d.enableDiscount !== undefined ? Boolean(d.enableDiscount) : Boolean(cfg.enableDiscount),
            discountType: d.discountType || cfg.discountType || 'Flat',
            discountValue: d.discountValue !== undefined && d.discountValue !== '' ? d.discountValue : (cfg.discountValue !== undefined && cfg.discountValue !== '' ? cfg.discountValue : ''),
            isDiscountActive: d.isDiscountActive !== undefined ? Boolean(d.isDiscountActive) : (cfg.isDiscountActive !== false),
            enableGst: d.enableGst !== undefined ? Boolean(d.enableGst) : (cfg.enableGst !== undefined ? Boolean(cfg.enableGst) : (Number(varGst) > 0)),
            gstType: d.gstType || cfg.gstType || 'CGST + SGST',
            finalGstRate: varGst,
            gst: varGst,
            images: Array.isArray(d.images) ? d.images : [],
            attributes: cleanAttrs
          };
        }));
      }

      if (mId && cId && sId) {
        fetchAttributeMappings(mId, cId, sId);
      }
      setIsDirty(false);
    } catch (err) {
      showToast('Failed to fetch product details from database', 'error');
    }
  };

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleMainChange = (mId) => {
    markDirty();
    setMainCategoryId(mId);
    setCategoryId('');
    setSubCategoryId('');
    setFilteredSubCategories([]);
    setMappedAttributes([]);
    if (mId) {
      const cats = allCategories.filter(c => getIdStr(c.mainCategoryId) === mId);
      setFilteredCategories(cats);
    } else {
      setFilteredCategories([]);
    }
  };

  const handleCategoryChange = (cId) => {
    markDirty();
    setCategoryId(cId);
    setSubCategoryId('');
    setMappedAttributes([]);
    if (cId) {
      const subs = allSubCategories.filter(s => getIdStr(s.categoryId) === cId);
      setFilteredSubCategories(subs);
    } else {
      setFilteredSubCategories([]);
    }
  };

  const handleSubCategoryChange = (sId) => {
    markDirty();
    setSubCategoryId(sId);
    if (mainCategoryId && categoryId && sId) {
      fetchAttributeMappings(mainCategoryId, categoryId, sId);
    }
  };

  const fetchAttributeMappings = async (mId, cId, sId) => {
    try {
      const res = await api.get('/attribute/mappings', {
        params: { mainCategoryId: mId, categoryId: cId, subCategoryId: sId },
      });
      setMappedAttributes(res.data || []);
    } catch (err) {
      console.error('Error loading dynamic attribute mappings:', err);
    }
  };

  const toggleCmsCertificate = (certUrl) => {
    markDirty();
    if (selectedCertificates.includes(certUrl)) {
      setSelectedCertificates(selectedCertificates.filter(c => c !== certUrl));
    } else {
      setSelectedCertificates([...selectedCertificates, certUrl]);
    }
  };

  const handlePricingChange = (blockIdx, updatedPricing) => {
    markDirty();
    const updated = [...productDetails];
    updated[blockIdx] = updatedPricing;
    setProductDetails(updated);
  };

  const addDetailBlock = () => {
    markDirty();
    setProductDetails([
      ...productDetails,
      createDefaultDetailBlock()
    ]);
  };

  const removeDetailBlock = (index) => {
    if (productDetails.length === 1) {
      showToast('At least one Product Detail block is required', 'error');
      return;
    }
    markDirty();
    setProductDetails(productDetails.filter((_, idx) => idx !== index));
  };

  const handleCancel = () => {
    if (isDirty) {
      if (!window.confirm('Discard unsaved changes?')) {
        return;
      }
    }
    showToast('Product editing cancelled. Changes discarded.', 'warn');
    resetForm();
    navigate('/products');
  };

  const handleProductImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    markDirty();
    const res = await validateImageFile(file, IMAGE_SPECS.PRODUCT_MAIN);
    if (!res.isValid) {
      setErrors(prev => ({ ...prev, productImage: res.error }));
      showToast(res.error, 'error');
      setProductImageFile(null);
      e.target.value = '';
      return;
    }

    setErrors(prev => ({ ...prev, productImage: null }));
    setProductImageFile(file);
  };

  const handleSecondaryImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    markDirty();
    const res = await validateImageFile(file, IMAGE_SPECS.PRODUCT_HOVER);
    if (!res.isValid) {
      setErrors(prev => ({ ...prev, secondaryImage: res.error }));
      showToast(res.error, 'error');
      setSecondaryImageFile(null);
      e.target.value = '';
      return;
    }

    setErrors(prev => ({ ...prev, secondaryImage: null }));
    setSecondaryImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    const trimmedName = trimString(name);
    const nameErr = validateRequired(trimmedName, 'Product Name');
    if (nameErr) newErrors.name = nameErr;

    const mainCatErr = validateDropdown(mainCategoryId, 'Main Category');
    if (mainCatErr) newErrors.mainCategoryId = mainCatErr;

    const catErr = validateDropdown(categoryId, 'Category');
    if (catErr) newErrors.categoryId = catErr;

    const subCatErr = validateDropdown(subCategoryId, 'Sub Category');
    if (subCatErr) newErrors.subCategoryId = subCatErr;

    if (!isEdit && !productImageFile && !productImage) {
      newErrors.productImage = 'Product Main Image is required (PNG/JPG/JPEG, 440×440 px, Max 500 KB).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix all validation errors before submitting.', 'error');
      if (newErrors.name || newErrors.mainCategoryId || newErrors.categoryId || newErrors.subCategoryId || newErrors.productImage || newErrors.secondaryImage) {
        setActiveTab('basic');
      }
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', trimmedName);
    formData.append('offerText', trimString(offerText));
    formData.append('mainCategoryId', mainCategoryId);
    formData.append('categoryId', categoryId);
    formData.append('subCategoryId', subCategoryId);
    formData.append('hsnCode', trimString(hsnCode));
    formData.append('status', status);
    formData.append('shortDescription', trimString(shortDescription));
    formData.append('description', trimString(description));
    formData.append('certificates', JSON.stringify(selectedCertificates));

    const primaryPrice = productDetails[0]?.finalPrice || productDetails[0]?.price || 0;
    const primaryStock = productDetails.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
    formData.append('price', primaryPrice);
    formData.append('stock', primaryStock);

    const preparedDetails = productDetails.map((detail, vIdx) => {
      const processedImages = [];
      const varImages = Array.isArray(detail.images) ? detail.images : [];

      varImages.forEach((imgItem, imgIdx) => {
        if (typeof imgItem === 'string') {
          processedImages.push(imgItem);
        } else if (imgItem && (imgItem.file || imgItem instanceof File)) {
          const fileObj = imgItem.file || imgItem;
          const placeholder = `__FILE_${vIdx}_${imgIdx}__`;
          processedImages.push(placeholder);
          formData.append(`variant_${vIdx}_image_${imgIdx}`, fileObj);
        }
      });

      return {
        ...detail,
        gst: detail.finalGstRate !== undefined && detail.finalGstRate !== ''
          ? detail.finalGstRate
          : (detail.gst !== undefined && detail.gst !== '' ? detail.gst : 0),
        finalGstRate: detail.finalGstRate !== undefined && detail.finalGstRate !== ''
          ? detail.finalGstRate
          : (detail.gst !== undefined && detail.gst !== '' ? detail.gst : 0),
        images: processedImages
      };
    });

    formData.append('productDetails', JSON.stringify(preparedDetails));

    if (productImageFile) {
      formData.append('productImage', productImageFile);
    }
    if (secondaryImageFile) {
      formData.append('secondaryImage', secondaryImageFile);
    }

    try {
      if (isEdit) {
        await api.put(`/products/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Product updated successfully!');
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Product created successfully!');
      }

      resetForm();
      setIsSubmitting(false);
      navigate('/products', { replace: true });
    } catch (err) {
      setIsSubmitting(false);
      showToast(err.response?.data?.message || 'Error saving product', 'error');
    }
  };

  const mainCatObj = mainCategories.find(m => (m._id || m.id) === mainCategoryId);
  const catObj = allCategories.find(c => (c._id || c.id) === categoryId);
  const subCatObj = allSubCategories.find(s => (s._id || s.id) === subCategoryId);

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Loader2 size={32} className="text-admin-accent animate-spin" />
        <p className="text-admin-text-secondary text-xs">Loading product details &amp; categories...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          type="button"
          className="btn-secondary text-xs flex items-center gap-1.5"
          onClick={handleCancel}
        >
          <ArrowLeft size={16} /> Back to Products
        </button>

        <h1 className="heading-2">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>

        <div className="hidden sm:block w-32"></div>
      </div>

      {/* Minimalist Tab Navigation */}
      <div className="flex bg-admin-card rounded-md p-1 border border-admin-border w-full sm:max-w-sm">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`flex-1 py-2 px-4 border-none rounded-md text-xs cursor-pointer transition-all ${
            activeTab === 'basic'
              ? 'bg-admin-accent/15 text-admin-accent font-semibold'
              : 'bg-transparent text-admin-text-secondary font-normal'
          }`}
        >
          Basic Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2 px-4 border-none rounded-md text-xs cursor-pointer transition-all ${
            activeTab === 'details'
              ? 'bg-admin-accent/15 text-admin-accent font-semibold'
              : 'bg-transparent text-admin-text-secondary font-normal'
          }`}
        >
          Product Variants &amp; Pricing
        </button>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-6">

        {/* ================= TAB 1: BASIC DETAILS ================= */}
        {activeTab === 'basic' && (
          <div className="card-minimal p-6 flex flex-col gap-5">

            <h3 className="heading-3">Basic Information</h3>

            {/* Row 1: Product Name, Offer Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. Product name"
                  value={name}
                  onChange={(e) => { markDirty(); setName(e.target.value); setErrors(prev => ({ ...prev, name: null })); }}
                />
                {errors.name && (
                  <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.name}
                  </span>
                )}
              </div>

              <div>
                <label className="form-label">Offer Tagline</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. Festival Special Offer"
                  value={offerText}
                  onChange={(e) => { markDirty(); setOfferText(e.target.value); }}
                />
              </div>
            </div>

            {/* Row 2: Main Category, Category, Sub Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Main Category *</label>
                <select className="form-control text-xs" value={mainCategoryId} onChange={(e) => { handleMainChange(e.target.value); setErrors(prev => ({ ...prev, mainCategoryId: null })); }}>
                  <option value="">Select Main Category</option>
                  {mainCategories.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
                {errors.mainCategoryId && (
                  <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.mainCategoryId}
                  </span>
                )}
                {mainCategories.length === 0 && (
                  <span className="text-rose-500 text-[11px] mt-1 inline-flex items-center gap-1">
                    <AlertCircle size={12} /> No main categories found in database
                  </span>
                )}
              </div>

              <div>
                <label className="form-label">Category *</label>
                <select className="form-control text-xs" value={categoryId} onChange={(e) => { handleCategoryChange(e.target.value); setErrors(prev => ({ ...prev, categoryId: null })); }} disabled={!mainCategoryId}>
                  <option value="">Select Category</option>
                  {filteredCategories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && (
                  <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.categoryId}
                  </span>
                )}
              </div>

              <div>
                <label className="form-label">Sub Category *</label>
                <select className="form-control text-xs" value={subCategoryId} onChange={(e) => { handleSubCategoryChange(e.target.value); setErrors(prev => ({ ...prev, subCategoryId: null })); }} disabled={!categoryId}>
                  <option value="">Select Sub Category</option>
                  {filteredSubCategories.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
                {errors.subCategoryId && (
                  <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.subCategoryId}
                  </span>
                )}
              </div>
            </div>

            {/* Row 3: HSN Code, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="form-label">HSN Code</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. 711319"
                  value={hsnCode}
                  onChange={(e) => { markDirty(); setHsnCode(e.target.value); }}
                />
              </div>

              <div>
                <label className="form-label">Status</label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={status === 'Active'}
                      onChange={() => { markDirty(); setStatus(status === 'Active' ? 'Inactive' : 'Active'); }}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className={`text-xs font-medium ${status === 'Active' ? 'text-emerald-500' : 'text-admin-text-muted'}`}>
                    {status}
                  </span>
                </div>
              </div>
            </div>

            {/* Short Description (TipTap) */}
            <div>
              <label className="form-label">Product Short Description</label>
              <RichTextEditor
                value={shortDescription}
                onChange={(val) => { markDirty(); setShortDescription(val); }}
                placeholder="Type short product summary..."
              />
            </div>

            {/* Full Description (TipTap) */}
            <div>
              <label className="form-label">Full Product Description</label>
              <RichTextEditor
                value={description}
                onChange={(val) => { markDirty(); setDescription(val); }}
                placeholder="Type detailed product specifications, features, and care instructions..."
              />
            </div>

            {/* Certificates Selection Box */}
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-admin-accent" />
                <h3 className="heading-3">Authenticity Certificates</h3>
              </div>
              <p className="subheading mb-4">Select certification badges for this product</p>

              {cmsCertificates.length === 0 ? (
                <div className="p-4 bg-admin-subtle rounded-md border border-admin-border text-xs text-admin-text-muted">
                  No certificates available. Upload certificate badges under Certificates to select them here.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {cmsCertificates.map((cert) => {
                    const isSelected = selectedCertificates.includes(cert.image);
                    return (
                      <div
                        key={cert._id}
                        onClick={() => toggleCmsCertificate(cert.image)}
                        className={`rounded-md p-3 text-center cursor-pointer transition-all ${
                          isSelected
                            ? 'border-2 border-admin-accent bg-admin-accent/10'
                            : 'border border-admin-border bg-admin-card hover:bg-admin-hover'
                        }`}
                      >
                        <div className="h-16 flex items-center justify-center mb-2">
                          <img src={cert.image} alt="Certificate Badge" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }}
                            className="cursor-pointer"
                          />
                          <span className={`text-xs ${isSelected ? 'font-semibold text-admin-accent' : 'font-normal text-admin-text-primary'}`}>
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Product Media & Image Upload */}
            <div className="mt-2">
              <h3 className="heading-3 mb-4">Product Images</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Main Image */}
                <div className="card-minimal p-4 text-center">
                  <label className="form-label">Main Image *</label>
                  <span className="text-[11px] text-admin-text-muted block mb-3">Max 500 KB (440×440px PNG/JPG/JPEG)</span>

                  <div className="relative w-44 h-44 bg-admin-subtle rounded-md overflow-hidden mx-auto mb-3 border border-admin-border flex items-center justify-center">
                    {productImageFile ? (
                      <img src={URL.createObjectURL(productImageFile)} alt="Product" className="w-full h-full object-cover" />
                    ) : productImage ? (
                      <img src={productImage} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-admin-text-muted" />
                    )}

                    <label htmlFor="prodImgInput" className="absolute top-1.5 right-1.5 bg-admin-accent text-white p-1.5 rounded-full cursor-pointer flex items-center justify-center shadow-md">
                      <Edit3 size={12} />
                    </label>
                    <input
                      id="prodImgInput"
                      type="file"
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      className="hidden"
                      onChange={handleProductImageChange}
                    />
                  </div>
                  {errors.productImage && (
                    <span className="text-rose-500 text-xs mt-1 flex items-center justify-center gap-1">
                      <AlertCircle size={12} /> {errors.productImage}
                    </span>
                  )}
                </div>

                {/* Secondary Hover Image */}
                <div className="card-minimal p-4 text-center">
                  <label className="form-label">Secondary Image (Hover)</label>
                  <span className="text-[11px] text-admin-text-muted block mb-3">Max 500 KB (440×440px PNG/JPG/JPEG)</span>

                  <div className="relative w-44 h-44 bg-admin-subtle rounded-md overflow-hidden mx-auto mb-3 border border-admin-border flex items-center justify-center">
                    {secondaryImageFile ? (
                      <img src={URL.createObjectURL(secondaryImageFile)} alt="Hover" className="w-full h-full object-cover" />
                    ) : secondaryImage ? (
                      <img src={secondaryImage} alt="Hover" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-admin-text-muted" />
                    )}

                    <label htmlFor="secImgInput" className="absolute top-1.5 right-1.5 bg-admin-accent text-white p-1.5 rounded-full cursor-pointer flex items-center justify-center shadow-md">
                      <Edit3 size={12} />
                    </label>
                    <input
                      id="secImgInput"
                      type="file"
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      className="hidden"
                      onChange={handleSecondaryImageChange}
                    />
                  </div>
                  {errors.secondaryImage && (
                    <span className="text-rose-500 text-xs mt-1 flex items-center justify-center gap-1">
                      <AlertCircle size={12} /> {errors.secondaryImage}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tab 1 Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={() => setActiveTab('details')}
              >
                Next: Product Variants &amp; Pricing »
              </button>
            </div>

          </div>
        )}

        {/* ================= TAB 2: PRODUCT DETAILS & PRICING ================= */}
        {activeTab === 'details' && (
          <div className="flex flex-col gap-5">

            {/* Top Summary Banner */}
            <div className="card-minimal p-4 px-5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-4 text-xs text-admin-text-primary flex-wrap">
                <span><strong>Product:</strong> {name || 'N/A'}</span>
                <span><strong>Main Cat:</strong> {mainCatObj?.name || 'N/A'}</span>
                <span><strong>Cat:</strong> {catObj?.name || 'N/A'}</span>
                <span><strong>Sub Cat:</strong> {subCatObj?.name || 'N/A'}</span>
              </div>
              <button
                type="button"
                className="btn-secondary text-xs flex items-center gap-1"
                onClick={addDetailBlock}
              >
                <Plus size={15} /> Add Variant Block
              </button>
            </div>

            {/* Render Detail Blocks */}
            {productDetails.map((detail, idx) => (
              <div
                key={idx}
                className="card-minimal p-6 relative"
              >
                {/* Variant Header */}
                <div className="flex items-center justify-between border-b border-admin-border pb-3 mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-admin-accent text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      Variant #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-semibold text-admin-text-secondary">
                      {detail.sku ? `SKU: ${detail.sku}` : 'New Variant'}
                    </span>
                  </div>
                  {productDetails.length > 1 && (
                    <button
                      type="button"
                      className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 rounded-md px-3 py-1 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      onClick={() => removeDetailBlock(idx)}
                      title="Remove this variant"
                    >
                      <Trash2 size={13} /> Remove Variant
                    </button>
                  )}
                </div>

                {/* Variant Specifications / Attributes Section */}
                <div className="bg-admin-subtle/40 border border-admin-border rounded-admin-sm p-4 mb-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h4 className="text-xs font-bold text-admin-text-primary tracking-wider uppercase m-0">
                      Variant Specifications &amp; Attributes
                    </h4>
                  </div>

                  {/* Render Side-by-Side Dropdowns (Left: Caption, Right: Value) */}
                  {(() => {
                    const effectiveAttrs = getNormalizedAttributeList();

                    // Convert current detail.attributes object to list of rows
                    const attrObject = detail.attributes || {};
                    const attributeKeys = Object.keys(attrObject);

                    const rows = attributeKeys.map(key => ({
                      caption: key,
                      value: String(attrObject[key] || ''),
                    }));

                    // If no attributes on variant yet, pre-fill with category mapped attributes if present
                    if (rows.length === 0 && effectiveAttrs.length > 0) {
                      effectiveAttrs.forEach(a => {
                        rows.push({ caption: a.caption, value: '' });
                      });
                    }

                    // Always ensure at least 1 row exists
                    if (rows.length === 0) {
                      rows.push({ caption: '', value: '' });
                    }

                    // Combine category mapped attributes & DB attribute captions
                    const allCaptionOptions = Array.from(new Set([
                      ...effectiveAttrs.map(a => a.caption),
                      ...allCaptions.filter(c => c.status !== 'Inactive').map(c => c.caption)
                    ])).filter(Boolean);

                    // Helper to get available values for a selected caption
                    const getValuesForCaption = (capName) => {
                      if (!capName) return [];
                      const mappedMatch = effectiveAttrs.find(a => a.caption === capName);
                      if (mappedMatch && mappedMatch.values?.length > 0) {
                        return mappedMatch.values;
                      }
                      const capMatch = allCaptions.find(c => c.caption === capName);
                      if (capMatch && Array.isArray(capMatch.values)) {
                        return capMatch.values
                          .filter(v => !v || v.status !== 'Inactive')
                          .map(v => typeof v === 'object' && v !== null ? (v.value || v.name || '') : String(v))
                          .filter(Boolean);
                      }
                      return [];
                    };

                    const updateVariantAttributes = (newRows) => {
                      markDirty();
                      const updated = [...productDetails];
                      const newAttrsObj = {};
                      newRows.forEach(r => {
                        if (r.caption) {
                          newAttrsObj[r.caption] = r.value || '';
                        }
                      });
                      updated[idx] = { ...updated[idx], attributes: newAttrsObj };
                      setProductDetails(updated);
                    };

                    return (
                      <div className="flex flex-col gap-3">
                        {rows.map((row, rIdx) => {
                          const availableValues = getValuesForCaption(row.caption);

                          return (
                            <div key={rIdx} className="flex items-center gap-3 bg-admin-card p-3 rounded-md border border-admin-border">
                              {/* Left Dropdown: Attribute Caption */}
                              <div className="flex-1">
                                <label className="form-label text-[11px] mb-1 block font-semibold text-admin-text-primary">
                                  Attribute Name (Caption)
                                </label>
                                <select
                                  className="form-control text-xs"
                                  value={row.caption}
                                  onChange={(e) => {
                                    const newCap = e.target.value;
                                    const newRows = [...rows];
                                    newRows[rIdx] = { caption: newCap, value: '' };
                                    updateVariantAttributes(newRows);
                                  }}
                                >
                                  <option value="">-- Select Attribute --</option>
                                  {allCaptionOptions.map((cName, cIdx) => (
                                    <option key={cIdx} value={cName}>{cName}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Right Dropdown: Attribute Value */}
                              <div className="flex-1">
                                <label className="form-label text-[11px] mb-1 block font-semibold text-admin-text-primary">
                                  Attribute Value
                                </label>
                                {availableValues.length > 0 ? (
                                  <select
                                    className="form-control text-xs"
                                    value={row.value}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      const newRows = [...rows];
                                      newRows[rIdx] = { ...newRows[rIdx], value: newVal };
                                      updateVariantAttributes(newRows);
                                    }}
                                    disabled={!row.caption}
                                  >
                                    <option value="">
                                      {row.caption ? `-- Select ${row.caption} Value --` : '-- Select Value --'}
                                    </option>
                                    {availableValues.map((val, vIdx) => (
                                      <option key={vIdx} value={val}>{val}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className="form-control text-xs"
                                    placeholder={row.caption ? `Enter ${row.caption} Value` : 'Select Attribute first'}
                                    value={row.value}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      const newRows = [...rows];
                                      newRows[rIdx] = { ...newRows[rIdx], value: newVal };
                                      updateVariantAttributes(newRows);
                                    }}
                                    disabled={!row.caption}
                                  />
                                )}
                              </div>

                              {/* Remove Row Button */}
                              <div className="flex items-end self-end pb-0.5">
                                <button
                                  type="button"
                                  className="bg-transparent border-none text-rose-500 hover:text-rose-700 cursor-pointer p-1.5 rounded transition-colors"
                                  onClick={() => {
                                    const newRows = rows.filter((_, i) => i !== rIdx);
                                    updateVariantAttributes(newRows);
                                  }}
                                  title="Remove attribute specification"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Variant Pricing Component */}
                <PricingTable
                  pricingData={detail}
                  onChange={(updated) => handlePricingChange(idx, updated)}
                />

                {/* Variant Images Gallery */}
                <VariantImageGallery
                  images={detail.images || []}
                  variantIndex={idx}
                  onChange={(updatedImages) => {
                    markDirty();
                    const updated = [...productDetails];
                    updated[idx] = { ...updated[idx], images: updatedImages };
                    setProductDetails(updated);
                  }}
                />

              </div>
            ))}

            {/* Add Variant Block Button Container */}
            <div className="border-2 border-dashed border-admin-border rounded-lg p-6 flex items-center justify-center bg-admin-card">
              <button
                type="button"
                className="btn-secondary py-2.5 px-5 text-xs flex items-center gap-1.5"
                onClick={addDetailBlock}
              >
                <Plus size={16} /> Add Product Variant Block
              </button>
            </div>

          </div>
        )}

        {/* Global Bottom Submit Actions Bar */}
        <div className="flex justify-end gap-3 p-4 px-6 bg-admin-card rounded-lg border border-admin-border">
          <button
            type="button"
            className="btn-secondary text-xs flex items-center gap-1.5"
            onClick={handleCancel}
          >
            <X size={16} /> Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2 px-6 text-xs flex items-center gap-1.5 disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Product' : 'Save Product')}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ProductForm;
