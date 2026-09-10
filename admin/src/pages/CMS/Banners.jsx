import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Common/Modal';
import Pagination from '../../components/Common/Pagination';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { validateImageFile, IMAGE_SPECS } from '../../utils/validation';

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [linkType, setLinkType] = useState('');
  const [linkId, setLinkId] = useState('');
  const [status, setStatus] = useState('Active');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState({});

  // Dropdown Options state
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const { showToast } = useToast();

  useEffect(() => {
    fetchBanners();
    fetchOptions();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await api.get('/cms/banners');
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('Failed to load banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const ensureArray = (resData) => {
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.products)) return resData.products;
    if (Array.isArray(resData?.categories)) return resData.categories;
    if (Array.isArray(resData?.data)) return resData.data;
    return [];
  };

  const fetchOptions = async () => {
    try {
      const [mcRes, cRes, scRes, pRes] = await Promise.all([
        api.get('/main-categories').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/sub-categories').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] }))
      ]);

      setMainCategories(ensureArray(mcRes.data));
      setCategories(ensureArray(cRes.data));
      setSubCategories(ensureArray(scRes.data));
      setProducts(ensureArray(pRes.data));
    } catch (err) {
      console.error('Error loading link options', err);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await api.patch(`/cms/banners/${id}/status`);
      setBanners(banners.map(b => b._id === id ? res.data : b));
      showToast('Banner status updated');
    } catch (err) {
      showToast('Failed to update banner status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await api.delete(`/cms/banners/${id}`);
      setBanners(banners.filter(b => b._id !== id));
      showToast('Banner deleted successfully');
    } catch (err) {
      showToast('Failed to delete banner', 'error');
    }
  };

  const computeLinkUrl = (type, targetId) => {
    if (!targetId) return '/shop';
    if (type === 'Product') return `/product/${targetId}`;
    if (type === 'Category') return `/shop?category=${targetId}`;
    if (type === 'MainCategory') return `/shop?mainCategory=${targetId}`;
    if (type === 'SubCategory') return `/shop?subCategory=${targetId}`;
    return '/shop';
  };

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const validation = await validateImageFile(file, IMAGE_SPECS.BANNER);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, image: validation.error }));
      showToast(validation.error, 'error');
      setImageFile(null);
      setPreview('');
      e.target.value = '';
      return;
    }

    setErrors(prev => ({ ...prev, image: null }));
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!imageFile) {
      newErrors.image = 'Banner image is required (PNG/JPG/JPEG, 2400×800 px, Max 500 KB).';
    }

    if (!linkType) {
      newErrors.linkType = 'Please select a Link Type';
    }

    if (linkType && !linkId) {
      newErrors.linkId = `Please select a target ${linkType}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstMsg = Object.values(newErrors)[0];
      showToast(firstMsg || 'Please fill in all required fields before submitting.', 'error');
      return;
    }

    const calculatedUrl = computeLinkUrl(linkType, linkId);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('linkType', linkType);
    formData.append('linkId', linkId);
    formData.append('linkUrl', calculatedUrl);
    formData.append('status', status);

    try {
      const res = await api.post('/cms/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBanners([res.data, ...banners]);
      showToast('Banner uploaded & linked successfully!');
      setIsModalOpen(false);
      setImageFile(null);
      setPreview('');
      setLinkId('');
      setErrors({});
    } catch (err) {
      showToast(err.response?.data?.message || 'Error uploading banner', 'error');
    }
  };

  const safeMainCategories = ensureArray(mainCategories);
  const safeCategories = ensureArray(categories);
  const safeSubCategories = ensureArray(subCategories);
  const safeProducts = ensureArray(products);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Banner Management</h1>
          <p className="subheading mt-0.5">Upload &amp; link promotional banners for storefront sections</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => { setIsModalOpen(true); setErrors({}); }}>
          <Plus size={16} /> Add Banner
        </button>
      </div>

      {/* Main Content Card */}
      <div className="card-minimal p-6">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Banner Preview</th>
                <th>Section Placement</th>
                <th>Link Type</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-admin-text-muted p-6">No banners uploaded yet</td></tr>
              ) : (
                banners.slice((page - 1) * limit, page * limit).map((b, bIdx) => (
                  <tr key={b._id || b.id || `ban-${bIdx}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img src={b.image} alt="Banner" className="h-12 w-21 rounded-md object-cover border border-admin-border" />
                        {b.title && <span className="text-xs font-semibold text-admin-text-primary">{b.title}</span>}
                      </div>
                    </td>
                    <td><span className="badge badge-accent">{b.section || 'Hero Banner'}</span></td>
                    <td>
                      <span className="badge badge-secondary">
                        {b.linkType}: {b.linkId ? 'Linked' : 'All'}
                      </span>
                    </td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={b.status === 'Active'}
                          onChange={() => handleToggleStatus(b._id || b.id)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td className="text-center">
                      <button type="button" className="btn-danger p-1.5" onClick={() => handleDelete(b._id || b.id)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(banners.length / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={banners.length}
          limit={limit}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setErrors({}); }} title="Add Banner">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Banner Image Upload */}
          <div>
            <label className="form-label">Upload Banner Image * (2400 × 800 px, Max 500 KB, PNG/JPG/JPEG)</label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="form-control text-xs"
              onChange={handleImageChange}
            />
            {errors.image && (
              <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.image}
              </span>
            )}
            {preview && (
              <img src={preview} alt="Preview" className="mt-3 w-full h-32 rounded-md object-cover" />
            )}
          </div>

          {/* Link Type Selector */}
          <div>
            <label className="form-label">Link Type Target *</label>
            <select
              className="form-control text-xs"
              value={linkType}
              onChange={(e) => {
                setLinkType(e.target.value);
                setLinkId('');
              }}
            >
              <option value="">Select Link Type</option>
              <option value="MainCategory">Main Category</option>
              <option value="Category">Category</option>
              <option value="SubCategory">Sub Category</option>
              <option value="Product">Product</option>
            </select>
            {errors.linkType && (
              <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.linkType}
              </span>
            )}
          </div>

          {/* Target Dropdown based on Link Type */}
          <div>
            <label className="form-label">Select Target {linkType || 'Type'} *</label>
            {!linkType && (
              <select className="form-control text-xs" disabled>
                <option>Select Link Type first</option>
              </select>
            )}

            {linkType === 'MainCategory' && (
              <select className="form-control text-xs" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                <option value="">Select Main Category</option>
                {safeMainCategories.map(mc => {
                  const targetId = mc.id || mc._id;
                  return <option key={targetId} value={targetId}>{mc.name || mc.title}</option>;
                })}
              </select>
            )}

            {linkType === 'Category' && (
              <select className="form-control text-xs" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                <option value="">Select Category</option>
                {safeCategories.map(c => {
                  const targetId = c.id || c._id;
                  return <option key={targetId} value={targetId}>{c.name || c.title}</option>;
                })}
              </select>
            )}

            {linkType === 'SubCategory' && (
              <select className="form-control text-xs" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                <option value="">Select Sub Category</option>
                {safeSubCategories.map(sc => {
                  const targetId = sc.id || sc._id;
                  return <option key={targetId} value={targetId}>{sc.name || sc.title}</option>;
                })}
              </select>
            )}

            {linkType === 'Product' && (
              <select className="form-control text-xs" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                <option value="">Select Product</option>
                {safeProducts.map(p => {
                  const targetId = p.id || p._id;
                  return (
                    <option key={targetId} value={targetId}>
                      {p.name || p.title} (₹{p.sellingPrice || p.price})
                    </option>
                  );
                })}
              </select>
            )}
            {errors.linkId && (
              <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.linkId}
              </span>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="form-label">Status</label>
            <select className="form-control text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="btn-secondary text-xs" onClick={() => { setIsModalOpen(false); showToast('Banner creation cancelled', 'warn'); }}>Cancel</button>
            <button type="submit" className="btn-primary text-xs">Upload &amp; Link Banner</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Banners;
