import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Save, RotateCcw, Plus, Trash2, ArrowUp, ArrowDown, Check, Eye, EyeOff, Info, Layers } from 'lucide-react';

const OrderFlowSettings = () => {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // New step form modal state
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    fetchOrderFlow();
  }, []);

  const fetchOrderFlow = async () => {
    setLoading(true);
    try {
      const res = await api.get('/order-flow/admin');
      if (res.data && res.data.steps) {
        setSteps(res.data.steps);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load order flow settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formattedSteps = steps.map((st, idx) => ({
        ...st,
        stepOrder: idx + 1
      }));
      const res = await api.put('/order-flow', { steps: formattedSteps });
      if (res.data && res.data.steps) {
        setSteps(res.data.steps);
        showToast('Order process flow updated successfully!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save order flow', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset order process flow to default 7 steps?')) {
      return;
    }
    setResetting(true);
    try {
      const res = await api.post('/order-flow/reset');
      if (res.data && res.data.steps) {
        setSteps(res.data.steps);
        showToast('Reset to default order process flow', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset order flow', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    const updated = [...steps];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setSteps(updated);
  };

  const handleMoveDown = (index) => {
    if (index >= steps.length - 1) return;
    const updated = [...steps];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setSteps(updated);
  };

  const handleToggleActive = (index) => {
    const updated = [...steps];
    updated[index].isActive = !updated[index].isActive;
    setSteps(updated);
  };

  const handleRemoveStep = (index) => {
    if (steps.length <= 1) {
      showToast('Process flow must contain at least one step', 'warning');
      return;
    }
    const updated = steps.filter((_, i) => i !== index);
    setSteps(updated);
  };

  const handleAddStep = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      showToast('Step label is required', 'warning');
      return;
    }
    const key = newKey.trim() || newLabel.trim();
    const newStepObj = {
      key,
      label: newLabel.trim(),
      description: newDescription.trim(),
      stepOrder: steps.length + 1,
      isActive: true,
      badgeColor: '#8b5cf6'
    };
    setSteps([...steps, newStepObj]);
    setNewKey('');
    setNewLabel('');
    setNewDescription('');
    showToast(`Added step "${newLabel}"`, 'success');
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="heading-1 flex items-center gap-2.5">
            <Layers className="text-admin-accent" size={28} /> Dynamic Order Process Flow
          </h1>
          <p className="subheading mt-1">
            Configure and order process steps shown to customers during order tracking. Changes automatically sync to the frontend client app.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || loading}
            className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs"
          >
            <RotateCcw size={15} /> {resetting ? 'Resetting...' : 'Reset Defaults'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-primary flex items-center gap-1.5 py-2 px-5 font-bold text-xs"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Flow Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-admin-text-muted text-xs">Loading order process flow...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Flow Steps List */}
          <div className="lg:col-span-2 card-minimal p-5">
            <div className="font-bold text-sm text-admin-text-primary mb-4 flex justify-between items-center">
              <span>Active Process Flow Steps ({steps.filter(s => s.isActive).length} / {steps.length})</span>
              <span className="text-xs text-admin-text-muted">Use ↑ ↓ to reorder</span>
            </div>

            <div className="flex flex-col gap-3">
              {steps.map((st, idx) => (
                <div
                  key={st.key || idx}
                  className={`bg-admin-card border rounded-lg p-4 flex flex-col gap-2.5 shadow-xs ${
                    st.isActive ? 'border-admin-border opacity-100' : 'border-admin-border/50 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2.5">
                    
                    {/* Step order badge & Reorder controls */}
                    <div className="flex items-center gap-2">
                      <span className={`text-white font-extrabold text-[11px] py-0.5 px-2 rounded-full min-w-[24px] text-center ${
                        st.isActive ? 'bg-rose-500' : 'bg-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>

                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className={`p-0.5 text-admin-text-secondary hover:text-admin-text-primary ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                          title="Move Up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === steps.length - 1}
                          className={`p-0.5 text-admin-text-secondary hover:text-admin-text-primary ${idx === steps.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                          title="Move Down"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Status Key */}
                    <div className="flex-1 flex gap-2.5 items-center">
                      <input
                        type="text"
                        className="form-control text-xs font-bold flex-1"
                        placeholder="Display Label"
                        value={st.label}
                        onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                      />
                      <input
                        type="text"
                        className="form-control text-xs w-32 text-admin-text-muted"
                        placeholder="Status Key"
                        value={st.key}
                        onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                      />
                    </div>

                    {/* Actions: Toggle Active / Remove */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(idx)}
                        className={`py-1 px-2.5 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          st.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-admin-subtle text-admin-text-muted'
                        }`}
                      >
                        {st.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                        {st.isActive ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                        title="Remove Step"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Subtext description input */}
                  <div>
                    <input
                      type="text"
                      className="form-control text-xs text-admin-text-secondary"
                      placeholder="Optional step subtext / description for customer"
                      value={st.description || ''}
                      onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Form: Add Custom Step */}
          <div className="flex flex-col gap-5">
            
            <div className="card-minimal p-5">
              <h3 className="heading-3 mb-4 flex items-center gap-1.5">
                <Plus size={18} className="text-admin-accent" /> Add Custom Flow Step
              </h3>

              <form onSubmit={handleAddStep} className="flex flex-col gap-4">
                <div>
                  <label className="form-label">Display Label *</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    placeholder="e.g. Quality Checked"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Internal Status Key</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    placeholder="e.g. Quality Checked"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                  />
                  <small className="text-[11px] text-admin-text-muted">Leave blank to use label as key</small>
                </div>

                <div>
                  <label className="form-label">Description Subtext</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    placeholder="e.g. Items inspected by quality team"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-2 font-bold text-xs mt-1"
                >
                  Add Step to Flow
                </button>
              </form>
            </div>

            {/* Info Card */}
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-5 text-rose-800 dark:text-rose-300 text-xs">
              <div className="font-bold text-xs mb-1.5 flex items-center gap-1.5">
                <Info size={16} /> How Process Flow Works
              </div>
              <ul className="pl-4 m-0 space-y-1 list-disc text-[11px] leading-relaxed">
                <li>Step order dictates how the timeline circles are rendered left-to-right on frontend order view.</li>
                <li>When an order&apos;s status reaches a step, all previous active steps will show as completed.</li>
                <li>Disabling a step hides it from customer view without deleting historical order data.</li>
              </ul>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default OrderFlowSettings;
