import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Common/Pagination';
import { Plus, Edit2, Trash2, Award, Upload, AlertCircle, Eye, X, ChevronUp } from 'lucide-react';
import { validateImageFile, IMAGE_SPECS, validateDropdown } from '../../utils/validation';
import Modal from '../../components/Common/Modal';

const Certificates = () => {
  const [certs, setCerts] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [viewingCert, setViewingCert] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchCerts();
  }, []);

  const fetchCerts = async () => {
    try {
      const res = await api.get('/cms/certificates');
      setCerts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCerts([]);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const validation = await validateImageFile(file, IMAGE_SPECS.CERTIFICATE);
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

  const handleClear = () => {
    setTitle('');
    setDescription('');
    setStatus('Active');
    setImageFile(null);
    setPreview('');
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!editingId && !imageFile) {
      newErrors.image = 'Certificate image is required (PNG/JPG/JPEG, 500×500 px, Max 500 KB).';
    }

    const statusErr = validateDropdown(status, 'Status');
    if (statusErr) newErrors.status = statusErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstMsg = Object.values(newErrors)[0];
      showToast(firstMsg || 'Please fix all validation errors before submitting.', 'error');
      return;
    }

    const formData = new FormData();
    if (imageFile) formData.append('image', imageFile);
    formData.append('title', title.trim() || imageFile?.name || 'Certificate');
    formData.append('description', description.trim());
    formData.append('status', status);

    try {
      if (editingId) {
        await api.put(`/cms/certificates/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('Certificate updated successfully!');
      } else {
        await api.post('/cms/certificates', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('Certificate added successfully!');
      }

      handleClear();
      setShowAddForm(false);
      fetchCerts();
    } catch {
      showToast('Failed to save certificate', 'error');
    }
  };

  const handleEditClick = (cert) => {
    setEditingId(cert._id || cert.id);
    setTitle(cert.title || '');
    setDescription(cert.description || '');
    setStatus(cert.status || 'Active');
    setPreview(cert.image || '');
    setImageFile(null);
    setErrors({});
    setShowAddForm(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/cms/certificates/${id}/status`);
      fetchCerts();
      showToast('Certificate status updated');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this certificate?')) return;
    try {
      await api.delete(`/cms/certificates/${id}`);
      fetchCerts();
      showToast('Certificate deleted');
    } catch {
      showToast('Failed to delete certificate', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Certificates Management</h1>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setErrors({});
            if (editingId) {
              setEditingId(null);
              setImageFile(null);
              setPreview('');
            }
          }}
        >
          {showAddForm ? <ChevronUp size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Close Form' : 'Add Certificate'}
        </button>
      </div>

      {/* Add / Edit Section Form Card */}
      {showAddForm && (
        <div className="card-minimal p-6">
          <h3 className="heading-3 mb-4">
            {editingId ? 'Edit Certificate' : 'Add New Certificate'}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">

              {/* Title Field */}
              <div>
                <label className="form-label">Title (Optional)</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. Certificate of Authenticity"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="form-label">Status *</label>
                <select className="form-control text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {errors.status && (
                  <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.status}
                  </span>
                )}
              </div>

              {/* Image Upload Box */}
              <div className="sm:col-span-2">
                <label className="form-label">
                  Certificate Image (500 × 500 px, Max 500 KB, PNG/JPG/JPEG) {editingId ? '(Optional to replace)' : '*'}
                </label>
                <div className="border-2 border-dashed border-admin-border rounded-md p-5 text-center bg-admin-subtle cursor-pointer relative">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={handleImageChange}
                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                  />
                  {preview ? (
                    <img src={preview} alt="Certificate Preview" className="max-h-32 w-auto object-contain mx-auto rounded-md shadow-xs border border-admin-border bg-white p-1" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload size={20} className="text-admin-accent" />
                      <span className="text-xs font-medium text-admin-text-primary">
                        Click to select Certificate Image
                      </span>
                    </div>
                  )}
                </div>
                {errors.image && (
                  <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.image}
                  </span>
                )}
              </div>

              {/* Description Field */}
              <div className="sm:col-span-2">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-control text-xs"
                  rows={2}
                  placeholder="Optional certificate details or certification body info..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => { handleClear(); setShowAddForm(false); showToast('Certificate action cancelled', 'warn'); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs">
                {editingId ? 'Update Certificate' : 'Save Certificate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table displaying Certificates */}
      <div className="card-minimal p-6">
        <div className="data-table-container overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="w-32">Certificate Image</th>
                <th>Title</th>
                <th>Description</th>
                <th className="w-28 text-center">Status</th>
                <th className="w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-admin-text-muted p-6">
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Award size={32} className="text-admin-text-disabled" />
                      <span>No certificates uploaded yet</span>
                    </div>
                  </td>
                </tr>
              ) : (
                certs.slice((page - 1) * limit, page * limit).map((c, cIdx) => {
                  const certId = c._id || c.id || `cert-${cIdx}`;
                  const certImg = c.image ? (c.image.startsWith('http') || c.image.startsWith('/') ? c.image : `/${c.image}`) : '';
                  return (
                    <tr key={certId} className="hover:bg-admin-subtle/50 transition-colors">
                      <td className="py-3">
                        <div
                          className="w-24 h-16 rounded-lg overflow-hidden border border-admin-border bg-white p-1 flex items-center justify-center cursor-pointer hover:border-admin-accent transition-all group relative"
                          onClick={() => setViewingCert(c)}
                          title="Click to preview full certificate"
                        >
                          {certImg ? (
                            <img src={certImg} alt={c.title || 'Certificate'} className="w-full h-full object-contain" />
                          ) : (
                            <Award size={24} className="text-admin-text-disabled" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                            <Eye size={16} className="text-white" />
                          </div>
                        </div>
                      </td>
                      <td className="font-semibold text-admin-text-primary text-xs">
                        {c.title || 'Certificate'}
                      </td>
                      <td className="text-admin-text-secondary text-xs max-w-md truncate">
                        {c.description || '-'}
                      </td>
                      <td className="text-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={c.status === 'Active'}
                            onChange={() => handleToggleStatus(certId)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td className="text-center">
                        <div className="inline-flex gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => setViewingCert(c)}
                            className="btn-secondary p-1.5 text-admin-text-secondary hover:text-admin-accent"
                            title="View Full Certificate"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClick(c)}
                            className="btn-secondary p-1.5 text-admin-accent"
                            title="Edit Certificate"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(certId)}
                            className="btn-danger p-1.5"
                            title="Delete Certificate"
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

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(certs.length / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={certs.length}
          limit={limit}
        />
      </div>

      {/* Full Resolution Preview Modal */}
      {viewingCert && (
        <Modal
          isOpen={Boolean(viewingCert)}
          onClose={() => setViewingCert(null)}
          title={viewingCert.title || 'Certificate Preview'}
          size="large"
        >
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="max-h-[70vh] overflow-auto border border-admin-border rounded-lg p-2 bg-white flex items-center justify-center w-full">
              <img
                src={viewingCert.image ? (viewingCert.image.startsWith('http') || viewingCert.image.startsWith('/') ? viewingCert.image : `/${viewingCert.image}`) : ''}
                alt={viewingCert.title || 'Certificate'}
                className="max-h-[65vh] w-auto object-contain mx-auto"
              />
            </div>
            {viewingCert.description && (
              <p className="text-xs text-admin-text-secondary text-center max-w-xl">
                {viewingCert.description}
              </p>
            )}
            <div className="flex justify-end w-full">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setViewingCert(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Certificates;
