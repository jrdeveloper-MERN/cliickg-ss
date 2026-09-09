import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RichTextEditor from '../../components/Common/RichTextEditor';
import { Upload, Pencil, Check, X, Lock } from 'lucide-react';

const ContactUs = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});

  // Page Header settings
  const [pageTitle, setPageTitle] = useState('Contact Us');
  const [heading, setHeading] = useState('Get In Touch');
  const [description, setDescription] = useState('');

  // Store/Branch Contact details (Flat Fields)
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [googleMapEmbed, setGoogleMapEmbed] = useState('');
  const [businessHours, setBusinessHours] = useState('');

  // Social Links
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [youtube, setYoutube] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [pinterest, setPinterest] = useState('');

  // SEO Fields
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');

  useEffect(() => {
    fetchContactPage();
  }, []);

  const fetchContactPage = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cms/contact');
      if (res.data && res.data.pageTitle) {
        const d = res.data;
        setPageTitle(d.pageTitle || 'Contact Us');
        setHeading(d.heading || 'Get In Touch');
        setDescription(d.description || '');

        setFacebook(d.facebook || '');
        setInstagram(d.instagram || '');
        setWhatsapp(d.whatsapp || '');
        setYoutube(d.youtube || '');
        setTwitter(d.twitter || '');
        setLinkedin(d.linkedin || '');
        setPinterest(d.pinterest || '');

        setSeoTitle(d.seoTitle || '');
        setSeoDescription(d.seoDescription || '');
        setSeoKeywords(d.seoKeywords || '');

        // Map first branch details if exist
        if (Array.isArray(d.branches) && d.branches.length > 0) {
          const mainBranch = d.branches[0];
          setStoreName(mainBranch.storeName || '');
          setAddress(mainBranch.address || '');
          setPhone(mainBranch.phone || '');
          setSecondaryPhone(mainBranch.secondaryPhone || '');
          setEmail(mainBranch.email || '');
          setSecondaryEmail(mainBranch.secondaryEmail || '');
          setGoogleMapEmbed(mainBranch.googleMapEmbed || '');
          setBusinessHours(mainBranch.businessHours || '');
        }
      }
    } catch (err) {
      showToast('Failed to load contact page configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Inline inputs validation before saving
  const validateForm = (data) => {
    const newErrors = {};

    // Page Title
    if (!data.pageTitle) {
      newErrors.pageTitle = 'Contact Page Title is required';
    } else if (data.pageTitle.length > 100) {
      newErrors.pageTitle = 'Page Title cannot exceed 100 characters';
    }

    // Heading
    if (!data.heading) {
      newErrors.heading = 'Left Side Heading is required';
    } else if (data.heading.length > 100) {
      newErrors.heading = 'Heading cannot exceed 100 characters';
    }

    // Description
    if (!data.description || data.description === '<p></p>' || data.description.trim() === '') {
      newErrors.description = 'Left Side Description description is required';
    }

    // Store Name
    if (!data.storeName) {
      newErrors.storeName = 'Store Name is required';
    } else if (data.storeName.length > 100) {
      newErrors.storeName = 'Store Name cannot exceed 100 characters';
    }

    // Address
    if (!data.address || data.address === '<p></p>' || data.address.trim() === '') {
      newErrors.address = 'Store Address is required';
    }

    // Primary Phone: +91XXXXXXXXXX, 10 digits, spaces or dashes
    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!data.phone) {
      newErrors.phone = 'Primary Phone number is required';
    } else if (!phoneRegex.test(data.phone.trim())) {
      newErrors.phone = 'Phone number format must be a valid phone number';
    }

    // Secondary Phone: validate only when filled
    if (data.secondaryPhone && !phoneRegex.test(data.secondaryPhone.trim())) {
      newErrors.secondaryPhone = 'Phone number format must be a valid phone number';
    }

    // Primary Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email) {
      newErrors.email = 'Primary Email is required';
    } else if (!emailRegex.test(data.email.trim())) {
      newErrors.email = 'Please provide a valid email format';
    }

    // Secondary Email
    if (data.secondaryEmail && !emailRegex.test(data.secondaryEmail.trim())) {
      newErrors.secondaryEmail = 'Please provide a valid email format';
    }

    // Google Maps <iframe> Embed Code check
    if (!data.googleMapEmbed || !data.googleMapEmbed.trim()) {
      newErrors.googleMapEmbed = 'Google Maps <iframe> Embed Code is required';
    } else {
      const mapVal = data.googleMapEmbed.trim().toLowerCase();
      const isEmbedCode = mapVal.includes('google.com/maps/embed') || mapVal.includes('pb=') || mapVal.includes('src=') || mapVal.includes('<iframe');
      if (!isEmbedCode) {
        newErrors.googleMapEmbed = 'Please paste a valid Google Maps <iframe> Embed Code (from Google Maps > Share > Embed a map > Copy HTML)';
      }
    }

    // Social Links URL validation
    const urlRegex = /^https?:\/\/.+/;
    const socials = [
      { key: 'facebook', label: 'Facebook' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'youtube', label: 'YouTube' },
      { key: 'twitter', label: 'Twitter/X' },
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'pinterest', label: 'Pinterest' }
    ];

    socials.forEach(s => {
      const val = data[s.key];
      if (val && val.trim() && !urlRegex.test(val.trim())) {
        newErrors[s.key] = `${s.label} link must be a valid URL starting with http:// or https://`;
      }
    });

    setErrors(newErrors);
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstMsg = newErrors[errorKeys[0]];
      showToast(firstMsg, 'error');
      return false;
    }
    return true;
  };

  // Save Config to Server
  const handleSaveConfig = async (e) => {
    e.preventDefault();

    let mapUrlVal = googleMapEmbed.trim();
    if (mapUrlVal.includes('<iframe')) {
      const srcMatch = mapUrlVal.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        mapUrlVal = srcMatch[1];
      }
    }

    // Pack trimmed payload values
    const payloadData = {
      pageTitle: pageTitle.trim(),
      heading: heading.trim(),
      description: description,
      storeName: storeName.trim(),
      address: address,
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim(),
      email: email.trim(),
      secondaryEmail: secondaryEmail.trim(),
      googleMapEmbed: mapUrlVal,
      businessHours: businessHours,
      facebook: facebook.trim(),
      instagram: instagram.trim(),
      whatsapp: whatsapp.trim(),
      youtube: youtube.trim(),
      twitter: twitter.trim(),
      linkedin: linkedin.trim(),
      pinterest: pinterest.trim(),
      seoTitle: seoTitle.trim(),
      seoDescription: seoDescription.trim(),
      seoKeywords: seoKeywords.trim()
    };

    if (!validateForm(payloadData)) {
      return;
    }

    try {
      setSaving(true);
      const payload = {
        pageTitle: payloadData.pageTitle,
        heading: payloadData.heading,
        description: payloadData.description,
        facebook: payloadData.facebook,
        instagram: payloadData.instagram,
        whatsapp: payloadData.whatsapp,
        youtube: payloadData.youtube,
        twitter: payloadData.twitter,
        linkedin: payloadData.linkedin,
        pinterest: payloadData.pinterest,
        seoTitle: payloadData.seoTitle,
        seoDescription: payloadData.seoDescription,
        seoKeywords: payloadData.seoKeywords,
        branches: [
          {
            name: 'Main Branch',
            storeName: payloadData.storeName,
            address: payloadData.address,
            phone: payloadData.phone,
            secondaryPhone: payloadData.secondaryPhone,
            email: payloadData.email,
            secondaryEmail: payloadData.secondaryEmail,
            googleMapEmbed: payloadData.googleMapEmbed,
            businessHours: payloadData.businessHours,
            displayOrder: 0,
            status: 'Active'
          }
        ]
      };

      await api.put('/cms/contact', payload);
      showToast('Contact Us Page CMS saved successfully!');
      setErrors({});
      setIsEditing(false);
      fetchContactPage();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1 flex items-center gap-2.5">
            Contact Us CMS Configuration
            {!isEditing && (
              <span className="text-xs font-medium py-1 px-2.5 rounded-full bg-admin-subtle text-admin-text-muted border border-admin-border inline-flex items-center gap-1">
                <Lock size={12} /> Read-Only Mode
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {!isEditing ? (
            <button
              type="button"
              className="btn-primary flex items-center gap-2 py-2.5 px-5.5 font-semibold text-xs"
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={16} /> Edit Contact Info
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary flex items-center gap-1.5 py-2.5 px-4.5 text-xs"
                onClick={() => {
                  setIsEditing(false);
                  showToast('Editing cancelled', 'warn');
                  fetchContactPage();
                }}
                disabled={saving}
              >
                <X size={16} /> Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex items-center gap-1.5 py-2.5 px-5.5 text-xs"
                onClick={handleSaveConfig}
                disabled={saving || loading}
              >
                <Check size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </>
          )}
        </div>
      </div>

      {(loading && !saving) && <p className="text-admin-text-muted text-xs">Loading configuration...</p>}

      <form onSubmit={handleSaveConfig} className="flex flex-col gap-6">

        {/* 1. Page Header details */}
        <div className="card-minimal p-6 flex flex-col gap-5">
          <h3 className="text-base font-bold border-b border-admin-border pb-2 m-0 text-admin-text-primary">
            Page Headers &amp; Content
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Contact Page Title *
                <span className="float-right font-normal text-[11px] text-admin-text-muted">
                  {pageTitle.length}/100
                </span>
              </label>
              <input
                type="text"
                className="form-control text-xs"
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value.slice(0, 100))}
                placeholder="e.g. Contact Us"
                disabled={!isEditing}
                required
              />
              {errors.pageTitle && <span className="text-rose-500 text-[11px] mt-1 block">{errors.pageTitle}</span>}
            </div>

            <div>
              <label className="form-label">
                Left Side Heading *
                <span className="float-right font-normal text-[11px] text-admin-text-muted">
                  {heading.length}/100
                </span>
              </label>
              <input
                type="text"
                className="form-control text-xs"
                value={heading}
                onChange={(e) => setHeading(e.target.value.slice(0, 100))}
                placeholder="e.g. Get In Touch"
                disabled={!isEditing}
                required
              />
              {errors.heading && <span className="text-rose-500 text-[11px] mt-1 block">{errors.heading}</span>}
            </div>
          </div>

          <div>
            <label className="form-label">Left Side Description (Rich Text Editor) *</label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Provide page description text..."
              readOnly={!isEditing}
            />
            {errors.description && <span className="text-rose-500 text-[11px] mt-1 block">{errors.description}</span>}
          </div>
        </div>

        {/* 2. Store Information (Direct Management) */}
        <div className="card-minimal p-6 flex flex-col gap-5">
          <h3 className="text-base font-bold border-b border-admin-border pb-2 m-0 text-admin-text-primary">
            Store Location &amp; Contact Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">
                Store Name *
                <span className="float-right font-normal text-[11px] text-admin-text-muted">
                  {storeName.length}/100
                </span>
              </label>
              <input
                type="text"
                className="form-control text-xs"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value.slice(0, 100))}
                placeholder="e.g. Store name"
                disabled={!isEditing}
                required
              />
              {errors.storeName && <span className="text-rose-500 text-[11px] mt-1 block">{errors.storeName}</span>}
            </div>

            <div>
              <label className="form-label">Primary Phone *</label>
              <input
                type="tel"
                className="form-control text-xs"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 6379689700"
                disabled={!isEditing}
                required
              />
              {errors.phone && <span className="text-rose-500 text-[11px] mt-1 block">{errors.phone}</span>}
            </div>

            <div>
              <label className="form-label">Secondary Phone (Optional)</label>
              <input
                type="tel"
                className="form-control text-xs"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                placeholder="e.g. +91 1234567890"
                disabled={!isEditing}
              />
              {errors.secondaryPhone && <span className="text-rose-500 text-[11px] mt-1 block">{errors.secondaryPhone}</span>}
            </div>

            <div>
              <label className="form-label">Primary Email *</label>
              <input
                type="email"
                className="form-control text-xs"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. demo@gmail.com"
                disabled={!isEditing}
                required
              />
              {errors.email && <span className="text-rose-500 text-[11px] mt-1 block">{errors.email}</span>}
            </div>

            <div>
              <label className="form-label">Secondary Email (Optional)</label>
              <input
                type="email"
                className="form-control text-xs"
                value={secondaryEmail}
                onChange={(e) => setSecondaryEmail(e.target.value)}
                placeholder="e.g. support@brand.com"
                disabled={!isEditing}
              />
              {errors.secondaryEmail && <span className="text-rose-500 text-[11px] mt-1 block">{errors.secondaryEmail}</span>}
            </div>
          </div>

          <div>
            <label className="form-label">Google Maps &lt;iframe&gt; Embed Code *</label>
            <textarea
              className="form-control text-xs font-mono"
              rows={3}
              value={googleMapEmbed}
              onChange={(e) => setGoogleMapEmbed(e.target.value)}
              placeholder='<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
              disabled={!isEditing}
              required
            />
            {errors.googleMapEmbed && <span className="text-rose-500 text-[11px] mt-1.5 block">{errors.googleMapEmbed}</span>}
          </div>

          <div>
            <label className="form-label">Store Address (Rich Text Editor) *</label>
            <RichTextEditor
              value={address}
              onChange={setAddress}
              placeholder="Provide store address detail..."
              readOnly={!isEditing}
            />
            {errors.address && <span className="text-rose-500 text-[11px] mt-1 block">{errors.address}</span>}
          </div>

          <div>
            <label className="form-label">Business Hours / Timings (Rich Text Editor)</label>
            <RichTextEditor
              value={businessHours}
              onChange={setBusinessHours}
              placeholder="Provide timings (e.g. Monday - Saturday: 10:00 AM - 8:30 PM, Sunday: Closed)"
              readOnly={!isEditing}
            />
          </div>
        </div>

        {/* 3. Social Media Links */}
        <div className="card-minimal p-6 flex flex-col gap-5">
          <h3 className="text-base font-bold border-b border-admin-border pb-2 m-0 text-admin-text-primary">
            Social Media Links (Optional)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Facebook URL</label>
              <input
                type="url"
                className="form-control text-xs"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/brandname"
                disabled={!isEditing}
              />
              {errors.facebook && <span className="text-rose-500 text-[11px] mt-1 block">{errors.facebook}</span>}
            </div>

            <div>
              <label className="form-label">Instagram URL</label>
              <input
                type="url"
                className="form-control text-xs"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/brandname"
                disabled={!isEditing}
              />
              {errors.instagram && <span className="text-rose-500 text-[11px] mt-1 block">{errors.instagram}</span>}
            </div>

            <div>
              <label className="form-label">WhatsApp Link</label>
              <input
                type="url"
                className="form-control text-xs"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="https://wa.me/phonenumber"
                disabled={!isEditing}
              />
              {errors.whatsapp && <span className="text-rose-500 text-[11px] mt-1 block">{errors.whatsapp}</span>}
            </div>

            <div>
              <label className="form-label">YouTube URL</label>
              <input
                type="url"
                className="form-control text-xs"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/channelname"
                disabled={!isEditing}
              />
              {errors.youtube && <span className="text-rose-500 text-[11px] mt-1 block">{errors.youtube}</span>}
            </div>

            <div>
              <label className="form-label">Twitter/X URL</label>
              <input
                type="url"
                className="form-control text-xs"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/username"
                disabled={!isEditing}
              />
              {errors.twitter && <span className="text-rose-500 text-[11px] mt-1 block">{errors.twitter}</span>}
            </div>

            <div>
              <label className="form-label">LinkedIn URL</label>
              <input
                type="url"
                className="form-control text-xs"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                disabled={!isEditing}
              />
              {errors.linkedin && <span className="text-rose-500 text-[11px] mt-1 block">{errors.linkedin}</span>}
            </div>

            <div>
              <label className="form-label">Pinterest URL</label>
              <input
                type="url"
                className="form-control text-xs"
                value={pinterest}
                onChange={(e) => setPinterest(e.target.value)}
                placeholder="https://pinterest.com/username"
                disabled={!isEditing}
              />
              {errors.pinterest && <span className="text-rose-500 text-[11px] mt-1 block">{errors.pinterest}</span>}
            </div>
          </div>
        </div>

        {/* 4. SEO Configurations */}
        <div className="card-minimal p-6 flex flex-col gap-5">
          <h3 className="text-base font-bold border-b border-admin-border pb-2 m-0 text-admin-text-primary">
            SEO Metadata (Optional)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">SEO Meta Title</label>
              <input
                type="text"
                className="form-control text-xs"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="e.g. Contact Us | CLIICKG"
                disabled={!isEditing}
              />
            </div>

            <div>
              <label className="form-label">SEO Meta Description</label>
              <input
                type="text"
                className="form-control text-xs"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Summarize the page content for search results..."
                disabled={!isEditing}
              />
            </div>

            <div>
              <label className="form-label">SEO Meta Keywords</label>
              <input
                type="text"
                className="form-control text-xs"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                placeholder="e.g. contact, store locations"
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>

        {/* Save / Edit Bottom Action Bar */}
        <div className="flex justify-end gap-3 mt-3">
          {!isEditing ? (
            <button
              type="button"
              className="btn-primary py-2.5 px-6 flex items-center gap-2 text-xs"
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={16} /> Edit Details
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary py-2.5 px-5 flex items-center gap-1.5 text-xs"
                onClick={() => {
                  setIsEditing(false);
                  showToast('Editing cancelled', 'warn');
                  fetchContactPage();
                }}
                disabled={saving}
              >
                <X size={16} /> Cancel
              </button>
              <button
                type="submit"
                className="btn-primary py-2.5 px-6 flex items-center gap-1.5 text-xs"
                disabled={saving || loading}
              >
                <Check size={16} /> {saving ? 'Saving Changes...' : 'Save CMS Configuration'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ContactUs;
