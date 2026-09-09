import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Edit2, Trash2, Upload, AlertCircle } from 'lucide-react';
import { validateImageFile, IMAGE_SPECS, validateDropdown } from '../../utils/validation';

const TodaysDealsBanner = () => {
  const [banners, setBanners] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [linkType, setLinkType] = useState('MainCategory');
  const [linkId, setLinkId] = useState('');
  const [status, setStatus] = useState('Active');
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});

  // Dynamic dropdown list options
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const { showToast } = useToast();

  useEffect(() => {
    fetchBanners();
    fetchDropdownOptions();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await api.get('/cms/todays-deals-banners');
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch {
      setBanners([]);
    }
  };

  const fetchDropdownOptions = async () => {
    try {
      const [mcRes, cRes, scRes, pRes] = await Promise.all([
        api.get('/main-categories').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/subcategories').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] }))
      ]);

      const ensureArr = (data, key) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data[key])) return data[key];
        return [];
      };

      setMainCategories(ensureArr(mcRes.data, 'mainCategories'));
      setCategories(ensureArr(cRes.data, 'categories'));
      setSubCategories(ensureArr(scRes.data, 'subCategories'));
      setProducts(ensureArr(pRes.data, 'products'));
    } catch (err) {
      console.error('Error fetching dropdown options:', err);
    }
  };

  const computeLinkUrl = (type, id) => {
    if (!id) return '';
    if (type === 'MainCategory') return `/shop?mainCategory=${id}`;
    if (type === 'Category') return `/category/${id}`;
    if (type === 'SubCategory') return `/shop?subCategory=${id}`;
    if (type === 'Product') return `/product/${id}`;
    return '';
  };

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const validation = await validateImageFile(file, IMAGE_SPECS.BANNER);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, image: validation.error }));
      showToast(validation.error, 'error');
      setImageFile(null);
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

    if (!editingId && !imageFile) {
      newErrors.image = "Today's deals banner image is required (PNG/JPG/JPEG, 2400×800 px, Max 500 KB).";
    }

    const linkTypeErr = validateDropdown(linkType, 'Link Type');
    if (linkTypeErr) newErrors.linkType = linkTypeErr;

    if (!linkId) {
      newErrors.linkId = `Please select a target ${linkType}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstMsg = Object.values(newErrors)[0];
      showToast(firstMsg || 'Please fix all validation errors before submitting.', 'error');
      return;
    }

    const formData = new FormData();
    if (imageFile) formData.append('image', imageFile);
    formData.append('linkType', linkType);
    formData.append('linkId', linkId);
    formData.append('linkUrl', computeLinkUrl(linkType, linkId));
    formData.append('status', status);

    try {
      if (editingId) {
        await api.put(`/cms/todays-deals-banners/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast("Today's deals banner updated!");
      } else {
        await api.post('/cms/todays-deals-banners', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast("Today's deals banner added!");
      }

      handleClear();
      fetchBanners();
    } catch {
      showToast('Failed to save banner', 'error');
    }
  };

  const handleEditClick = (b) => {
    setEditingId(b._id);
    setLinkType(b.linkType || 'MainCategory');
    setLinkId(b.linkId || '');
    setStatus(b.status || 'Active');
    setPreview(b.image || '');
    setImageFile(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClear = () => {
    setImageFile(null);
    setPreview('');
    setLinkId('');
    setLinkType('MainCategory');
    setStatus('Active');
    setEditingId(null);
    setErrors({});
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/cms/todays-deals-banners/${id}/status`);
      fetchBanners();
      showToast('Status updated');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await api.delete(`/cms/todays-deals-banners/${id}`);
      fetchBanners();
      showToast('Banner deleted');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const getTargetOptions = () => {
    if (linkType === 'MainCategory') return mainCategories.map(mc => ({ id: mc._id, name: mc.name }));
    if (linkType === 'Category') return categories.map(c => ({ id: c._id, name: c.name }));
    if (linkType === 'SubCategory') return subCategories.map(sc => ({ id: sc._id, name: sc.name }));
    if (linkType === 'Product') return products.map(p => ({ id: p._id, name: p.name || p.title || 'Product' }));
    return [];
  };

  const getItemName = (b) => {
    if (!b.linkId) return 'N/A';
    if (b.linkType === 'MainCategory') return mainCategories.find(mc => mc._id === b.linkId)?.name || b.linkId;
    if (b.linkType === 'Category') return categories.find(c => c._id === b.linkId)?.name || b.linkId;
    if (b.linkType === 'SubCategory') return subCategories.find(sc => sc._id === b.linkId)?.name || b.linkId;
    if (b.linkType === 'Product') {
      const p = products.find(prod => prod._id === b.linkId);
      return p ? (p.name || p.title) : b.linkId;
    }
    return b.linkId;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <h1 className="heading-1">{editingId ? "Edit Today's Deals Banner" : "Today's Deals Banner"}</h1>
      </div>

      {/* Form Card */}
      <div className="card-minimal p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
            
            {/* Image Upload Box */}
            <div>
              <label className="form-label">
                Banner Image (2400 × 800 px, Max 500 KB, PNG/JPG/JPEG) {editingId ? '(Optional to replace)' : '*'}
              </label>
              <div className="border-2 border-dashed border-admin-border rounded-md p-3 text-center bg-admin-subtle cursor-pointer relative">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={handleImageChange}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                {preview ? (
                  <img src={preview} alt="Banner Preview" className="h-15 w-full object-cover rounded" />
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-2">
                    <Upload size={16} className="text-admin-accent" />
                    <span className="text-xs font-medium text-admin-text-primary">Upload Image</span>
                  </div>
                )}
              </div>
              {errors.image && (
                <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.image}
                </span>
              )}
            </div>

            {/* Link Type Selector */}
            <div>
              <label className="form-label">Link Type *</label>
              <select
                className="form-control text-xs"
                value={linkType}
                onChange={(e) => { setLinkType(e.target.value); setLinkId(''); }}
              >
                <option value="MainCategory">Main Category</option>
                <option value="Category">Category</option>
                <option value="SubCategory">Sub Category</option>
                <option value="Product">Product</option>
              </select>
            </div>

            {/* Dynamic Target Dropdown */}
            <div>
              <label className="form-label">Select {linkType} *</label>
              <select
                className="form-control text-xs"
                value={linkId}
                onChange={(e) => setLinkId(e.target.value)}
                required
              >
                <option value="">-- Choose {linkType} --</option>
                {getTargetOptions().map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
              {errors.linkId && (
                <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.linkId}
                </span>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="form-label">Status *</label>
              <select
                className="form-control text-xs"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={handleClear} className="btn-secondary text-xs">
              Clear
            </button>
            <button type="submit" className="btn-primary text-xs">
              {editingId ? 'Update Banner' : 'Save Banner'}
            </button>
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="card-minimal p-6">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Banner Image</th>
                <th>Link Type</th>
                <th>Selected Target Item</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-admin-text-muted p-6">
                    No deal banners added yet
                  </td>
                </tr>
              ) : (
                banners.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <img src={b.image} alt="Banner" className="h-12 w-28 rounded-md object-cover border border-admin-border" />
                    </td>
                    <td>
                      <span className="badge badge-secondary">
                        {b.linkType || 'MainCategory'}
                      </span>
                    </td>
                    <td className="font-semibold text-admin-text-primary">
                      {getItemName(b)}
                    </td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={b.status === 'Active'}
                          onChange={() => handleToggleStatus(b._id)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td className="text-center">
                      <div className="inline-flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => handleEditClick(b)}
                          className="btn-secondary p-1.5 text-admin-accent"
                          title="Edit Banner"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b._id)}
                          className="btn-danger p-1.5"
                          title="Delete Banner"
                        >
                          <Trash2 size={15} />
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

export default TodaysDealsBanner;
