import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Common/Modal';
import Pagination from '../../components/Common/Pagination';
import { Plus, Edit2, Trash2, Sliders, ChevronsRight, ArrowLeft } from 'lucide-react';

const AttributeCaptions = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Caption Form Fields
  const [caption, setCaption] = useState('');
  const [inputType, setInputType] = useState('checkbox');
  const [iconShow, setIconShow] = useState(true);
  const [status, setStatus] = useState('Active');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');

  // Selected Caption for Values View
  const [activeCaptionForValues, setActiveCaptionForValues] = useState(null);
  const [editingValueId, setEditingValueId] = useState(null);
  const [valInput, setValInput] = useState('');
  const [valImageFile, setValImageFile] = useState(null);
  const [valShowImage, setValShowImage] = useState(true);
  const [valStatus, setValStatus] = useState('Active');

  const { showToast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/attribute/captions');
      setItems(res.data);
    } catch (err) {
      showToast('Failed to load Attribute Captions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setCaption(item.caption);
      setInputType(item.inputType || 'checkbox');
      setIconShow(item.iconShow);
      setStatus(item.status);
      setPreview(getImageUrl(item.image));
      setImageFile(null);
    } else {
      setEditingId(null);
      setCaption('');
      setInputType('checkbox');
      setIconShow(true);
      setStatus('Active');
      setPreview('');
      setImageFile(null);
    }
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      const targetId = id;
      const res = await api.patch(`/attribute/captions/${targetId}/status`);
      setItems(prev => prev.map((i) => (i._id === targetId || i.id === targetId) ? { ...i, ...res.data, _id: res.data._id || res.data.id || targetId } : i));
      if (activeCaptionForValues && (activeCaptionForValues._id === targetId || activeCaptionForValues.id === targetId)) {
        setActiveCaptionForValues(prev => ({ ...prev, ...res.data, _id: res.data._id || res.data.id || targetId }));
      }
      showToast('Status updated successfully');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Attribute Caption?')) return;
    try {
      await api.delete(`/attribute/captions/${id}`);
      setItems(items.filter((i) => i._id !== id && i.id !== id));
      if (activeCaptionForValues?._id === id || activeCaptionForValues?.id === id) {
        setActiveCaptionForValues(null);
      }
      showToast('Attribute Caption deleted successfully');
    } catch (err) {
      showToast('Failed to delete Attribute Caption', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('inputType', inputType);
    formData.append('iconShow', iconShow);
    formData.append('status', status);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editingId) {
        const res = await api.put(`/attribute/captions/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems(items.map((i) => (i._id === editingId || i.id === editingId) ? res.data : i));
        showToast('Attribute Caption updated successfully');
      } else {
        const res = await api.post('/attribute/captions', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems([res.data, ...items]);
        showToast('Attribute Caption created successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Error saving Attribute Caption', 'error');
    }
  };

  const handleSaveValue = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('value', valInput);
    formData.append('iconShow', valShowImage);
    formData.append('status', valStatus);
    if (valImageFile) {
      formData.append('image', valImageFile);
    }

    try {
      const activeId = activeCaptionForValues._id || activeCaptionForValues.id;
      let res;
      if (editingValueId) {
        res = await api.put(`/attribute/captions/${activeId}/values/${editingValueId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Value updated successfully');
      } else {
        res = await api.post(`/attribute/captions/${activeId}/values`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Value added successfully');
      }

      setActiveCaptionForValues(res.data);
      setItems(prev => prev.map((i) => (i._id === activeId || i.id === activeId) ? res.data : i));
      handleClearValueForm();
    } catch (err) {
      showToast('Failed to save value', 'error');
    }
  };

  const handleEditValueClick = (val) => {
    setEditingValueId(val._id || val.id);
    setValInput(val.value);
    setValShowImage(val.iconShow ?? true);
    setValStatus(val.status || 'Active');
    setValImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearValueForm = () => {
    setEditingValueId(null);
    setValInput('');
    setValImageFile(null);
    setValShowImage(true);
    setValStatus('Active');
  };

  const handleToggleValueStatus = async (valId) => {
    try {
      const activeId = activeCaptionForValues._id || activeCaptionForValues.id;
      const res = await api.patch(`/attribute/captions/${activeId}/values/${valId}/status`);
      const updatedCap = { ...res.data, _id: res.data._id || res.data.id || activeId };
      setActiveCaptionForValues(updatedCap);
      setItems(prev => prev.map((i) => (i._id === activeId || i.id === activeId) ? updatedCap : i));
      showToast('Value status updated');
    } catch (err) {
      showToast('Failed to update value status', 'error');
    }
  };

  const handleDeleteValue = async (valId) => {
    if (!window.confirm('Delete this value?')) return;
    try {
      const res = await api.delete(`/attribute/captions/${activeCaptionForValues._id}/values/${valId}`);
      setActiveCaptionForValues(res.data);
      setItems(items.map((i) => (i._id === res.data._id ? res.data : i)));
      showToast('Value deleted successfully');
    } catch (err) {
      showToast('Failed to delete value', 'error');
    }
  };

  if (activeCaptionForValues) {
    const valList = (activeCaptionForValues.values || []).filter((v) => Boolean(v && (v.value || v.id || v._id)));
    return (
      <div className="flex flex-col gap-6">
        {/* Top Navigation */}
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => { setActiveCaptionForValues(null); handleClearValueForm(); }} className="btn-secondary">
            <ArrowLeft size={16} /> Back to Captions
          </button>
          <div>
            <h1 className="heading-1">Values for Caption: {activeCaptionForValues.caption}</h1>
            <p className="subheading mt-0.5">Manage allowed attribute option values & icon visibility</p>
          </div>
        </div>

        {/* Add / Edit Value Form Box */}
        <div className="card-minimal m-0 p-6">
          <h3 className="heading-3 mb-4">
            {editingValueId ? 'Edit Option Value' : 'Add Option Value'}
          </h3>
          <form onSubmit={handleSaveValue} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
              <div>
                <label className="form-label">Value *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 24K, 22K, 18K, 16mm"
                  value={valInput}
                  onChange={(e) => setValInput(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={(e) => setValImageFile(e.target.files[0])}
                />
              </div>

              <div>
                <label className="form-label">Status</label>
                <select className="form-control" value={valStatus} onChange={(e) => setValStatus(e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-7">
                <label className="form-label flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={valShowImage}
                    onChange={(e) => setValShowImage(e.target.checked)}
                  />
                  <span>Show Image Icon</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              {editingValueId && (
                <button type="button" className="btn-secondary" onClick={handleClearValueForm}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="btn-primary">
                {editingValueId ? 'Update Value' : 'Save Value'}
              </button>
            </div>
          </form>
        </div>

        {/* Values Data Table */}
        <div className="card-minimal m-0 p-6">
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-16">Image</th>
                  <th>Value</th>
                  <th>Icon Show</th>
                  <th>Status</th>
                  <th className="text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {valList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-admin-text-muted p-6">
                      No values added for this caption yet
                    </td>
                  </tr>
                ) : (
                  valList.map((val) => (
                    <tr key={val._id}>
                      <td>
                        {val.image ? (
                          <img
                            src={getImageUrl(val.image)}
                            alt={val.value}
                            className="w-9 h-9 rounded-admin-xs object-cover border border-admin-border"
                          />
                        ) : (
                          <span className="text-admin-text-muted">-</span>
                        )}
                      </td>
                      <td className="font-semibold text-admin-text-primary">{val.value}</td>
                      <td>
                        <span className={`badge ${val.iconShow && val.status === 'Active' ? 'badge-accent' : 'badge-danger'}`}>
                          {val.iconShow && val.status === 'Active' ? 'Show' : 'Hide'}
                        </span>
                      </td>
                      <td>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={val.status === 'Active'}
                            onChange={() => handleToggleValueStatus(val._id)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td className="text-center">
                        <div className="inline-flex gap-2 justify-center">
                          <button
                            type="button"
                            className="btn-ghost p-1.5 text-admin-accent"
                            onClick={() => handleEditValueClick(val)}
                            title="Edit Value"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost p-1.5 text-admin-danger"
                            onClick={() => handleDeleteValue(val._id)}
                            title="Delete Value"
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
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Attribute Captions</h1>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Add Caption
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card-minimal m-0 p-6">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">Image</th>
                <th>Caption</th>
                <th>Icon Show</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center text-admin-text-muted p-6">Loading captions...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-admin-text-muted p-6">No Attribute Captions found</td></tr>
              ) : (
                items.slice((page - 1) * limit, page * limit).map((item, cIdx) => (
                  <tr key={item._id || item.id || `cap-${cIdx}`}>
                    <td>
                      {item.image ? (
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.caption}
                          className="w-9 h-9 rounded-admin-xs object-cover border border-admin-border"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-admin-xs bg-admin-subtle flex items-center justify-center text-admin-accent">
                          <Sliders size={16} />
                        </div>
                      )}
                    </td>
                    <td className="font-semibold text-admin-text-primary">{item.caption}</td>
                    <td>
                      <span className={`badge ${item.iconShow ? 'badge-accent' : 'badge-danger'}`}>
                        {item.iconShow ? 'Show' : 'Hide'}
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
                      <div className="inline-flex gap-2 justify-center items-center">
                        <button
                          type="button"
                          className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                          onClick={() => setActiveCaptionForValues(item)}
                          title="Manage Values for Caption"
                        >
                          <ChevronsRight size={14} /> Values
                        </button>
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

      {/* Edit / Create Caption Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Caption' : 'Add Caption'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Caption Name *</label>
            <input
              type="text"
              className="form-control"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. size"
              required
            />
          </div>

          <div>
            <label className="form-label">Icon / Image</label>
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
                className="mt-3 w-16 h-16 rounded-admin-xs object-cover"
              />
            )}
          </div>

          <div>
            <label className="form-label">Icon Show</label>
            <select className="form-control" value={iconShow ? 'true' : 'false'} onChange={(e) => setIconShow(e.target.value === 'true')}>
              <option value="true">Show Icon</option>
              <option value="false">Hide Icon</option>
            </select>
          </div>

          <div>
            <label className="form-label">Status</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-3">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Caption</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttributeCaptions;
