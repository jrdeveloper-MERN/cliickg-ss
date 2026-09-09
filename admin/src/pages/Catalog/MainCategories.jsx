import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Common/Modal';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

const MainCategories = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');

  const { showToast, showErrorModal } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/main-categories');
      setItems(res.data);
    } catch (err) {
      showToast('Failed to load Main Categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setName(item.name);
      setStatus(item.status);
      setPreview(getImageUrl(item.image));
      setImageFile(null);
    } else {
      setEditingId(null);
      setName('');
      setStatus('Active');
      setPreview('');
      setImageFile(null);
    }
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      const targetId = id;
      const res = await api.patch(`/main-categories/${targetId}/status`);
      setItems(prev => prev.map(i => (i._id === targetId || i.id === targetId) ? { ...i, ...res.data, _id: res.data._id || res.data.id || targetId } : i));
      showToast('Status updated successfully');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Main Category?')) return;
    try {
      const res = await api.delete(`/main-categories/${id}`);
      setItems(items.filter(i => i._id !== id && i.id !== id));
      showToast(res.data?.message || 'Main Category deleted successfully');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to delete Main Category';
      showErrorModal({
        title: 'Cannot Delete Main Category',
        message: msg,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('status', status);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editingId) {
        const res = await api.put(`/main-categories/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems(items.map(i => i._id === editingId ? res.data : i));
        showToast('Main Category updated successfully');
      } else {
        const res = await api.post('/main-categories', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems([res.data, ...items]);
        showToast('Main Category created successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving Main Category', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Main Category Management</h1>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Add Main Category
        </button>
      </div>

      {/* Main Content Card */}
      <div className="card-minimal m-0 p-6">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">SNo</th>
                <th>Image</th>
                <th>Name</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center text-admin-text-muted p-6">Loading categories...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-admin-text-muted p-6">No Main Categories found</td></tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item._id}>
                    <td className="font-medium text-admin-text-secondary">{idx + 1}</td>
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
                    <td className="font-semibold text-admin-text-primary">{item.name}</td>
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
                          onClick={() => handleDelete(item._id)}
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
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Main Category' : 'Add Main Category'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Main Category Name *</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. "
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
            <button type="submit" className="btn-primary">Save Main Category</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MainCategories;
