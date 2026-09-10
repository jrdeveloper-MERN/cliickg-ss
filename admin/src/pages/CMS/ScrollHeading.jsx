import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RichTextEditor from '../../components/Common/RichTextEditor';
import Pagination from '../../components/Common/Pagination';
import { Edit2, Trash2 } from 'lucide-react';

const ScrollHeading = () => {
  const [headings, setHeadings] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Active');
  const [editingId, setEditingId] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchHeadings();
  }, []);

  const fetchHeadings = async () => {
    try {
      const res = await api.get('/cms/scroll-headings');
      setHeadings(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHeadings([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      showToast('Scroll heading content is required', 'error');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/cms/scroll-headings/${editingId}`, {
          title: 'Scroll Heading',
          text,
          status
        });
        showToast('Scroll heading updated successfully!');
      } else {
        await api.post('/cms/scroll-headings', {
          title: 'Scroll Heading',
          text,
          status
        });
        showToast('Scroll heading saved successfully!');
      }
      setText('');
      setEditingId(null);
      fetchHeadings();
    } catch {
      showToast('Failed to save scroll heading', 'error');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/cms/scroll-headings/${id}/status`);
      fetchHeadings();
      showToast('Status updated');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scroll heading?')) return;
    try {
      await api.delete(`/cms/scroll-headings/${id}`);
      fetchHeadings();
      showToast('Heading deleted');
    } catch {
      showToast('Failed to delete heading', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <h1 className="heading-1">Scroll Heading Marquee</h1>
      </div>

      {/* Form Card */}
      <div className="card-minimal p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          <div>
            <label className="form-label">Scroll Heading Content *</label>
            <RichTextEditor value={text} onChange={setText} placeholder="Type marquee scrolling text..." />
          </div>

          <div className="max-w-xs">
            <label className="form-label">Status *</label>
            <select className="form-control text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            {editingId && (
              <button type="button" className="btn-secondary text-xs" onClick={() => { setEditingId(null); setText(''); showToast('Editing cancelled', 'warn'); }}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary text-xs">
              {editingId ? '✓ Update Scroll Heading' : '✓ Save Scroll Heading'}
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
                <th className="w-15">SNo</th>
                <th className="min-w-[300px]">Scrolling Heading Content</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {headings.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-admin-text-muted p-6">
                    No scroll headings created yet
                  </td>
                </tr>
              ) : (
                headings.slice((page - 1) * limit, page * limit).map((item, idx) => {
                  const itemId = item.id || item._id;
                  return (
                    <tr key={itemId || `sh-${idx}`}>
                      <td className="font-medium text-admin-text-secondary">{(page - 1) * limit + idx + 1}</td>
                      <td className="font-semibold text-admin-text-primary max-w-md">
                        <div dangerouslySetInnerHTML={{ __html: item.text || item.title }} />
                      </td>
                      <td>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={item.status === 'Active'}
                            onChange={() => handleToggleStatus(itemId)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td className="text-center">
                        <div className="inline-flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => { setText(item.text); setStatus(item.status); setEditingId(itemId); }}
                            className="btn-secondary p-1.5 text-admin-accent"
                            title="Edit Scroll Heading"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(itemId)}
                            className="btn-danger p-1.5"
                            title="Delete Scroll Heading"
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
          totalPages={Math.ceil(headings.length / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={headings.length}
          limit={limit}
        />
      </div>

    </div>
  );
};

export default ScrollHeading;
