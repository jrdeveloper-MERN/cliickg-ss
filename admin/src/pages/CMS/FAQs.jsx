import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RichTextEditor from '../../components/Common/RichTextEditor';
import Pagination from '../../components/Common/Pagination';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';

const FAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState('Active');
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const limit = 10;

  const { showToast } = useToast();

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const res = await api.get('/cms/faqs');
      setFaqs(Array.isArray(res.data) ? res.data : []);
    } catch {
      setFaqs([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    const cleanQuestion = (question || '').trim();
    const cleanAnswer = (answer || '').replace(/<[^>]*>/g, '').trim();

    if (!cleanQuestion) {
      newErrors.question = 'Question is required.';
    }
    if (!cleanAnswer) {
      newErrors.answer = 'Answer content is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstMsg = Object.values(newErrors)[0];
      showToast(firstMsg, 'error');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/cms/faqs/${editingId}`, {
          question: cleanQuestion,
          answer,
          sortOrder,
          status
        });
        showToast('FAQ updated successfully!');
      } else {
        await api.post('/cms/faqs', {
          question: cleanQuestion,
          answer,
          sortOrder,
          status
        });
        showToast('FAQ added successfully!');
      }

      setQuestion('');
      setAnswer('');
      setSortOrder(0);
      setStatus('Active');
      setEditingId(null);
      setErrors({});
      fetchFaqs();
    } catch {
      showToast('Failed to save FAQ', 'error');
    }
  };

  const handleEditClick = (faq) => {
    setEditingId(faq._id);
    setQuestion(faq.question || '');
    setAnswer(faq.answer || '');
    setSortOrder(faq.sortOrder || 0);
    setStatus(faq.status || 'Active');
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setSortOrder(0);
    setStatus('Active');
    setErrors({});
    showToast('FAQ action cancelled', 'warn');
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await api.put(`/cms/faqs/${id}`, { status: newStatus });
      fetchFaqs();
      showToast('FAQ status updated');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await api.delete(`/cms/faqs/${id}`);
      fetchFaqs();
      showToast('FAQ deleted');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <div>
        <h1 className="heading-1">{editingId ? "Edit FAQ" : "FAQ Management"}</h1>
      </div>

      {/* Form Card */}
      <div className="card-minimal p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Question *</label>
              <input
                type="text"
                className="form-control text-xs"
                placeholder="e.g. What is your return policy?"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setErrors(prev => ({ ...prev, question: null }));
                }}
              />
              {errors.question && (
                <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.question}
                </span>
              )}
            </div>
            <div>
              <label className="form-label">Sort Order</label>
              <input
                type="number"
                className="form-control text-xs"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="form-label">Status</label>
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

          <div>
            <label className="form-label">Answer *</label>
            <RichTextEditor
              value={answer}
              onChange={(val) => {
                setAnswer(val);
                setErrors(prev => ({ ...prev, answer: null }));
              }}
              placeholder="Type detailed answer content..."
            />
            {errors.answer && (
              <span className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.answer}
              </span>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-2">
            {editingId && (
              <button type="button" className="btn-secondary text-xs" onClick={handleCancelEdit}>
                Cancel Edit
              </button>
            )}
            <button type="submit" className="btn-primary text-xs">
              {editingId ? 'Update FAQ' : 'Save FAQ'}
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
                <th>Question</th>
                <th className="min-w-[280px]">Answer</th>
                <th>Priority</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {faqs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-admin-text-muted p-6">
                    No FAQs created yet
                  </td>
                </tr>
              ) : (
                faqs.slice((page - 1) * limit, page * limit).map((f, idx) => (
                  <tr key={f._id || f.id || `faq-${idx}`}>
                    <td className="font-medium text-admin-text-secondary">{(page - 1) * limit + idx + 1}</td>
                    <td className="font-semibold text-admin-text-primary max-w-[220px]">{f.question}</td>
                    <td className="max-w-xs text-xs text-admin-text-secondary leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: f.answer }} />
                    </td>
                    <td className="font-medium">{f.sortOrder || 0}</td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={f.status === 'Active'}
                          onChange={() => handleToggleStatus(f._id || f.id, f.status)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td className="text-center">
                      <div className="inline-flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => handleEditClick(f)}
                          className="btn-secondary p-1.5 text-admin-accent"
                          title="Edit FAQ"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(f._id || f.id)}
                          className="btn-danger p-1.5"
                          title="Delete FAQ"
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
          totalPages={Math.ceil(faqs.length / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={faqs.length}
          limit={limit}
        />
      </div>

    </div>
  );
};

export default FAQs;
