import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { policyService } from '../../services/policy.service';
import { useToast } from '../../context/ToastContext';
import RichTextEditor from '../../components/Common/RichTextEditor';
import {
  ShieldCheck,
  Truck,
  FileText,
  RotateCcw,
  Save,
  Pencil,
  X,
  RefreshCw,
  Info,
} from 'lucide-react';

const POLICY_CONFIGS = {
  ABOUT: {
    type: 'ABOUT',
    title: 'About Us',
    slug: 'about-us',
    path: '/settings/about-us',
    clientUrl: '/about',
    icon: Info,
    description: 'Manage store brand story, company history, mission, craftsmanship, and customer values.',
    color: 'indigo',
  },
  DELIVERY: {
    type: 'DELIVERY',
    title: 'Delivery Policy',
    slug: 'delivery-policy',
    path: '/settings/delivery-policy',
    clientUrl: '/delivery-policy',
    icon: Truck,
    description: 'Manage shipping timelines, delivery options, transit standards, and carrier details.',
    color: 'emerald',
  },
  PRIVACY: {
    type: 'PRIVACY',
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    path: '/settings/privacy-policy',
    clientUrl: '/privacy-policy',
    icon: ShieldCheck,
    description: 'Manage user data protection, cookies, privacy disclosures, and compliance terms.',
    color: 'sky',
  },
  TERMS: {
    type: 'TERMS',
    title: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    path: '/settings/terms-and-conditions',
    clientUrl: '/terms-and-conditions',
    icon: FileText,
    description: 'Manage legal agreements, purchase terms, customer responsibilities, and website rules.',
    color: 'amber',
  },
  RETURN_REFUND: {
    type: 'RETURN_REFUND',
    title: 'Return & Refund Policy',
    slug: 'return-and-refund-policy',
    path: '/settings/return-and-refund-policy',
    clientUrl: '/return-and-refund-policy',
    icon: RotateCcw,
    description: 'Manage return eligibility, refund process, replacement timelines, and reverse logistics.',
    color: 'rose',
  },
};

const PolicyEditorPage = ({ type: propType }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Determine active policy from prop or URL pathname
  const activeType = useMemo(() => {
    if (propType && POLICY_CONFIGS[propType]) return propType;
    const path = location.pathname.toLowerCase();
    if (path.includes('delivery')) return 'DELIVERY';
    if (path.includes('privacy')) return 'PRIVACY';
    if (path.includes('terms')) return 'TERMS';
    if (path.includes('return')) return 'RETURN_REFUND';
    return 'DELIVERY';
  }, [propType, location.pathname]);

  const config = POLICY_CONFIGS[activeType] || POLICY_CONFIGS.DELIVERY;
  const IconComponent = config.icon;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form State
  const [title, setTitle] = useState(config.title);
  const [slug, setSlug] = useState(config.slug);
  const [isPublished, setIsPublished] = useState(true);
  const [contentHtml, setContentHtml] = useState('');
  const [contentJson, setContentJson] = useState(null);
  const [savedContentHtml, setSavedContentHtml] = useState('');
  const [savedContentJson, setSavedContentJson] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchPolicyData(activeType);
  }, [activeType]);

  const fetchPolicyData = async (typeToFetch) => {
    setLoading(true);
    setIsDirty(false);
    setIsEditing(false);
    try {
      const data = await policyService.getPolicyByType(typeToFetch);
      if (data) {
        setTitle(data.title || config.title);
        setSlug(data.slug || config.slug);
        setIsPublished(data.isPublished !== undefined ? Boolean(data.isPublished) : true);
        setContentHtml(data.contentHtml || '');
        setContentJson(data.contentJson || null);
        setSavedContentHtml(data.contentHtml || '');
        setSavedContentJson(data.contentJson || null);
        setLastUpdated(data.updatedAt || null);
      }
    } catch (err) {
      console.error('Error fetching policy:', err);
      showToast(err.response?.data?.message || `Failed to load ${config.title}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (html, json) => {
    setContentHtml(html);
    if (json) {
      setContentJson(json);
    }
    if (isEditing) {
      const hasChanged = html !== savedContentHtml;
      setIsDirty(hasChanged);
    }
  };

  const handlePublishToggle = async () => {
    const nextStatus = !isPublished;
    setIsPublished(nextStatus);
    try {
      await policyService.togglePolicyStatus(activeType);
      showToast(`${config.title} set to ${nextStatus ? 'Published' : 'Draft'}`, 'success');
    } catch (err) {
      console.error('Error toggling policy status:', err);
      setIsPublished(!nextStatus);
      showToast(err.response?.data?.message || 'Failed to update publication status', 'error');
    }
  };

  const handleCancelEdit = () => {
    setContentHtml(savedContentHtml);
    setContentJson(savedContentJson);
    setIsEditing(false);
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Please enter a policy title', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: activeType,
        title: title.trim(),
        slug: slug.trim(),
        contentJson: contentJson || { type: 'doc', content: [] },
        contentHtml: contentHtml || '',
        isPublished,
      };

      const result = await policyService.savePolicy(activeType, payload);
      setSavedContentHtml(contentHtml);
      setSavedContentJson(contentJson);
      setLastUpdated(result.updatedAt || new Date().toISOString());
      setIsDirty(false);
      setIsEditing(false);
      showToast(`${config.title} saved successfully!`, 'success');
    } catch (err) {
      console.error('Error saving policy:', err);
      showToast(err.response?.data?.message || `Failed to save ${config.title}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-admin-card p-6 rounded-xl border border-admin-border shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-500 rounded-xl">
            <IconComponent size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-admin-text-primary m-0">{config.title}</h1>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-admin-bg text-admin-text-secondary border border-admin-border rounded-full">
                {activeType}
              </span>
              {isEditing && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-full">
                  Editing Mode
                </span>
              )}
              {isEditing && isDirty && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-admin-text-muted mt-1 mb-0">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePublishToggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-admin-border bg-admin-bg hover:bg-admin-hover transition-colors cursor-pointer"
            title="Click to toggle Published / Draft status"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="text-xs font-bold text-admin-text-primary">
              {isPublished ? 'Published' : 'Draft'}
            </span>
            <div
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isPublished ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isPublished ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Pencil size={14} />
              Edit Policy
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-admin-text-secondary hover:text-admin-text-primary bg-admin-bg hover:bg-admin-hover border border-admin-border rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X size={14} />
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Policy
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tiptap Rich-Text Editor Box */}
      <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-admin-text-muted flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-sky-500" />
            <span>Loading policy document...</span>
          </div>
        ) : (
          <div className="p-4">
            <RichTextEditor
              value={contentJson || contentHtml}
              onChange={handleEditorChange}
              placeholder={`Write the official ${config.title} content here...`}
              isLocked={!isEditing}
              minHeight="350px"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyEditorPage;
