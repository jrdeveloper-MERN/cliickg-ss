import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Common/Pagination';
import { Plus, Edit2, Trash2, Check, X, Info, Search, Upload, Image as ImageIcon } from 'lucide-react';

const StorePromises = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Standalone Section Banner States
  const [sectionBannerUrl, setSectionBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [bannerLoading, setBannerLoading] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(0);
  const [iconFile, setIconFile] = useState(null);
  const [preview, setPreview] = useState('');

  // Table controls
  const [search, setSearch] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const { showToast } = useToast();

  useEffect(() => {
    fetchStorePromises();
    fetchSectionBanner();
  }, []);

  const fetchStorePromises = async () => {
    try {
      const res = await api.get('/cms/store-promises');
      setItems(res.data);
    } catch (err) {
      showToast('Failed to load Store Promises', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionBanner = async () => {
    try {
      const res = await api.get('/cms/store-promises/banner');
      if (res.data?.bannerUrl) {
        setSectionBannerUrl(res.data.bannerUrl);
        setBannerPreview(getImageUrl(res.data.bannerUrl));
      } else {
        setSectionBannerUrl('');
        setBannerPreview('');
      }
    } catch (err) {
      console.error('Error loading store promise section banner:', err);
    }
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!bannerFile && !sectionBannerUrl) {
      showToast('Please select a banner image file', 'error');
      return;
    }
    if (!bannerFile) {
      showToast('No new image file selected', 'info');
      return;
    }

    setBannerLoading(true);
    const formData = new FormData();
    formData.append('image', bannerFile);

    try {
      const res = await api.post('/cms/store-promises/banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSectionBannerUrl(res.data.bannerUrl);
      setBannerPreview(getImageUrl(res.data.bannerUrl));
      setBannerFile(null);
      showToast('Section Banner Image saved successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save Section Banner', 'error');
    } finally {
      setBannerLoading(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (!window.confirm('Delete this Section Banner Image?')) return;
    setBannerLoading(true);
    try {
      await api.delete('/cms/store-promises/banner');
      setSectionBannerUrl('');
      setBannerPreview('');
      setBannerFile(null);
      showToast('Section Banner Image deleted successfully');
    } catch (err) {
      showToast('Failed to delete Section Banner', 'error');
    } finally {
      setBannerLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setOrder(item.order || 0);
    setPreview(item.icon ? getImageUrl(item.icon) : '');
    setIconFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClear = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setOrder(items.length + 1);
    setIconFile(null);
    setPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter Title', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('order', order);
    if (iconFile) {
      formData.append('icon', iconFile);
    }

    try {
      if (editingId) {
        const res = await api.put(`/cms/store-promises/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems(items.map(i => i._id === editingId ? res.data : i));
        showToast('Store Promise updated successfully');
      } else {
        const res = await api.post('/cms/store-promises', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems([...items, res.data]);
        showToast('Store Promise created successfully');
      }
      handleClear();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving Store Promise', 'error');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await api.patch(`/cms/store-promises/${id}/status`);
      setItems(items.map(i => i._id === id ? res.data : i));
      showToast('Status updated successfully');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Store Promise?')) return;
    try {
      await api.delete(`/cms/store-promises/${id}`);
      setItems(items.filter(i => i._id !== id));
      showToast('Store Promise deleted successfully');
    } catch (err) {
      showToast('Failed to delete Store Promise', 'error');
    }
  };

  const filteredItems = items.filter(item =>
    item.title?.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / entriesPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  return (
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Store Promises</h1>
          <p className="subheading mt-0.5">Manage customer trust guarantees and store promises</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={handleClear}>
          <Plus size={16} /> Add Promise
        </button>
      </div>

      {/* STANDALONE SECTION BANNER IMAGE CARD (LEFT SIDE IMAGE FOR FRONTEND) */}
      <div className="card-minimal p-6 border-2 border-admin-accent/30 bg-gradient-to-r from-admin-card via-admin-card to-amber-500/5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-admin-text-primary m-0 flex items-center gap-2">
              <ImageIcon size={18} /> Section Banner Image (Left Side)
            </h3>
            <p className="text-xs text-admin-text-muted mt-1 m-0">
              Upload a single common cover banner image for the left side of the "Our Promises" section on the frontend product details page.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBanner} className="flex flex-col gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Image Preview Container */}
            <div className="w-56 h-36 rounded-xl border-2 border-dashed border-admin-border bg-admin-subtle overflow-hidden flex flex-col items-center justify-center relative group shrink-0">
              {bannerPreview ? (
                <>
                  <img src={bannerPreview} alt="Promises Section Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteBanner}
                      className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 cursor-pointer border-none"
                      title="Delete Banner Image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-admin-text-muted p-3 text-center">
                  <Upload size={24} className="text-amber-500" />
                  <span className="text-[11px] font-medium">No Banner Image</span>
                </div>
              )}
            </div>

            {/* Upload & Action Buttons */}
            <div className="flex flex-col gap-3 flex-1 min-w-[240px]">
              <div>
                <label className="form-label text-xs font-semibold">Select Banner Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control text-xs"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setBannerFile(file);
                      setBannerPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={bannerLoading || (!bannerFile && !sectionBannerUrl)}
                  className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer disabled:opacity-50"
                >
                  <Check size={16} /> Save Banner Image
                </button>

                {(bannerPreview || sectionBannerUrl) && (
                  <button
                    type="button"
                    onClick={handleDeleteBanner}
                    disabled={bannerLoading}
                    className="btn-danger flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer border-none"
                  >
                    <Trash2 size={15} /> Delete Banner Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Input Form Card */}
      <div className="card-minimal p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-control text-xs"
                placeholder="e.g. 100% Certified"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Icon Image *</label>
              <input
                type="file"
                accept="image/*"
                className="form-control text-xs"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setIconFile(file);
                  if (file) setPreview(URL.createObjectURL(file));
                }}
              />
              {preview && (
                <img src={preview} alt="Preview" className="mt-1.5 w-9 h-9 rounded object-cover" />
              )}
            </div>

            <div>
              <label className="form-label">Sort Order</label>
              <input
                type="number"
                className="form-control text-xs"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex items-center gap-1.5 text-xs">
                <Check size={16} /> {editingId ? 'Update' : 'Save'}
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-control text-xs min-h-[60px] resize-y"
              placeholder="Optional description text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="card-minimal p-6">
        {/* Table Top Controls */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <div className="text-xs text-admin-text-secondary flex items-center gap-2">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="form-control text-xs w-18 p-1.5"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="search-box w-64">
            <Search size={15} className="text-admin-text-muted shrink-0 pointer-events-none" />
            <input
              type="text"
              placeholder="Search promises..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-18">Icon</th>
                <th>Title</th>
                <th>Description</th>
                <th className="text-center w-20">Order</th>
                <th>Status</th>
                <th className="text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-6 text-admin-text-muted text-xs">
                    No Store Promises found
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const iconSrc = item.icon ? (item.icon.startsWith('http') || item.icon.startsWith('/') ? item.icon : `/${item.icon}`) : '';
                  return (
                    <tr key={item._id || item.id}>
                      <td>
                        {iconSrc ? (
                          <img src={iconSrc} alt={item.title} className="w-9 h-9 object-contain" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-admin-subtle flex items-center justify-center">
                            <Info size={18} className="text-admin-accent" />
                          </div>
                        )}
                      </td>
                      <td className="font-semibold text-admin-text-primary">{item.title}</td>
                      <td className="text-admin-text-secondary text-xs whitespace-pre-line">{item.description}</td>
                      <td className="text-center font-medium">{item.order}</td>
                      <td>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={item.status === 'Active'}
                            onChange={() => handleToggleStatus(item._id)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td className="text-center">
                        <div className="inline-flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="btn-secondary p-1.5 text-admin-accent"
                            title="Edit Promise"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item._id || item.id)}
                            className="btn-danger p-1.5"
                            title="Delete Promise"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalItems={filteredItems.length}
          limit={entriesPerPage}
        />
      </div>
    </div>
  );
};

export default StorePromises;
