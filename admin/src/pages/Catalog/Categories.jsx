import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Common/Modal';
import Pagination from '../../components/Common/Pagination';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

const Categories = () => {
  const [items, setItems] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [name, setName] = useState('');
  const [mainCategoryId, setMainCategoryId] = useState('');
  const [status, setStatus] = useState('Active');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');

  const { showToast, showErrorModal } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, mainRes] = await Promise.all([
        api.get('/categories'),
        api.get('/main-categories'),
      ]);
      setItems(catRes.data);
      setMainCategories(mainRes.data);
    } catch (err) {
      showToast('Failed to load Categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setName(item.name);
      setMainCategoryId(item.mainCategoryId?._id || item.mainCategoryId || '');
      setStatus(item.status);
      setPreview(getImageUrl(item.image));
      setImageFile(null);
    } else {
      setEditingId(null);
      setName('');
      setMainCategoryId(mainCategories[0]?._id || '');
      setStatus('Active');
      setPreview('');
      setImageFile(null);
    }
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      const targetId = id;
      const res = await api.patch(`/categories/${targetId}/status`);
      setItems(prev => prev.map(i => (i._id === targetId || i.id === targetId) ? { ...i, ...res.data, _id: res.data._id || res.data.id || targetId } : i));
      showToast('Status updated successfully');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Category?')) return;
    try {
      const res = await api.delete(`/categories/${id}`);
      const updated = items.filter(i => i._id !== id && i.id !== id);
      setItems(updated);
      if ((page - 1) * limit >= updated.length && page > 1) {
        setPage(page - 1);
      }
      showToast(res.data?.message || 'Category deleted successfully');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to delete Category';
      showErrorModal({
        title: 'Cannot Delete Category',
        message: msg,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('mainCategoryId', mainCategoryId);
    formData.append('status', status);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editingId) {
        const res = await api.put(`/categories/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems(items.map(i => i._id === editingId ? res.data : i));
        showToast('Category updated successfully');
      } else {
        const res = await api.post('/categories', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems([res.data, ...items]);
        setPage(1);
        showToast('Category created successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving Category', 'error');
    }
  };

  const paginatedItems = items.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Category Management</h1>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Main Content Card */}
      <div className="card-minimal m-0 p-6">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">SNo</th>
                <th>Name</th>
                <th>Image</th>
                <th>Main Category</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center text-admin-text-muted p-6">Loading categories...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-admin-text-muted p-6">No Categories found</td></tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr key={item._id || item.id || `cat-${idx}`}>
                    <td className="font-medium text-admin-text-secondary">{(page - 1) * limit + idx + 1}</td>
                    <td className="font-semibold text-admin-text-primary">{item.name}</td>
                    <td>
                      {item.image ? (
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="w-10 h-10 rounded-admin-xs object-cover border border-admin-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-admin-xs bg-admin-subtle flex items-center justify-center text-admin-text-muted">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-accent">
                        {item.mainCategoryId?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={item.status === 'Active'}
                          onChange={() => handleToggleStatus(item._id || item.id)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td className="text-center">
                      <div className="inline-flex gap-2 justify-center">
                        <button
                          type="button"
                          className="btn-ghost p-1.5 text-admin-accent"
                          onClick={() => handleOpenModal(item)}
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-1.5 text-admin-danger"
                          onClick={() => handleDelete(item._id || item.id)}
                          title="Delete"
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

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(items.length / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={items.length}
          limit={limit}
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Main Category *</label>
            <select
              className="form-control"
              value={mainCategoryId}
              onChange={(e) => setMainCategoryId(e.target.value)}
              required
            >
              <option value="">Select Main Category</option>
              {mainCategories.map((main) => (
                <option key={main._id} value={main._id}>
                  {main.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Category Name *</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enter Category name"
              required
            />
          </div>

          <div>
            <label className="form-label">Category Image</label>
            <input
              type="file"
              accept="image/*"
              className="form-control"
              onChange={(e) => {
                const file = e.target.files[0];
                setImageFile(file);
                if (file) setPreview(URL.createObjectURL(file));
              }}
            />
            {preview && (
              <img
                src={getImageUrl(preview)}
                alt="Preview"
                className="mt-3 w-20 h-20 rounded-admin-xs object-cover"
              />
            )}
          </div>

          <div>
            <label className="form-label">Status</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-3">
            <button type="button" className="btn-secondary" onClick={() => { setIsModalOpen(false); showToast('Action cancelled', 'warn'); }}>Cancel</button>
            <button type="submit" className="btn-primary">Save Category</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categories;
