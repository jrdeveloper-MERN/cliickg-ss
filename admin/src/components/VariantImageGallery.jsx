import React, { useState } from 'react';
import { Upload, Trash2, Edit3, MoveLeft, MoveRight, ImageIcon, AlertCircle } from 'lucide-react';
import { validateImageFile, IMAGE_SPECS } from '../utils/validation';

const VariantImageGallery = ({ images = [], onChange, variantIndex = 0 }) => {
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [galleryError, setGalleryError] = useState('');

  const getPreviewUrl = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (item.preview) return item.preview;
    if (item.file) return URL.createObjectURL(item.file);
    if (item instanceof File) return URL.createObjectURL(item);
    return '';
  };

  const handleAddFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setGalleryError('');
    const currentCount = images.length;
    const remainingSlots = 10 - currentCount;

    if (remainingSlots <= 0) {
      setGalleryError('Maximum 10 images allowed per variant.');
      return;
    }

    const filesToValidate = files.slice(0, remainingSlots);
    const validAdditions = [];
    const errorMessages = [];

    for (const file of filesToValidate) {
      const res = await validateImageFile(file, IMAGE_SPECS.VARIANT_GALLERY);
      if (res.isValid) {
        validAdditions.push({
          file,
          preview: URL.createObjectURL(file)
        });
      } else {
        errorMessages.push(`${file.name}: ${res.error}`);
      }
    }

    if (errorMessages.length > 0) {
      setGalleryError(errorMessages.join(' | '));
    }

    if (validAdditions.length > 0) {
      onChange([...images, ...validAdditions]);
    }

    e.target.value = '';
  };

  const handleReplaceFile = async (index, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setGalleryError('');
    const res = await validateImageFile(file, IMAGE_SPECS.VARIANT_GALLERY);

    if (!res.isValid) {
      setGalleryError(res.error);
      e.target.value = '';
      return;
    }

    const updated = [...images];
    updated[index] = {
      file,
      preview: URL.createObjectURL(file)
    };
    onChange(updated);
    e.target.value = '';
  };

  const handleDelete = (index) => {
    setGalleryError('');
    const updated = images.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleMove = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    onChange(updated);
  };

  const handleDragStart = (idx) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (dropIdx) => {
    if (draggedIdx !== null && draggedIdx !== dropIdx) {
      handleMove(draggedIdx, dropIdx);
    }
    setDraggedIdx(null);
  };

  const isMaxReached = images.length >= 10;

  return (
    <div className="mt-5 p-4 bg-admin-subtle rounded-admin-xs border border-admin-border">
      {/* Header with Title and Counter */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h4 className="m-0 text-sm font-bold text-admin-text-primary flex items-center gap-1.5">
            <ImageIcon size={16} className="text-admin-accent" />
            Variant Images Gallery
          </h4>
          <span className="text-[11px] text-admin-text-muted block mt-0.5">
            Upload up to 10 images for this variant. First image will act as variant cover.
          </span>
        </div>

        {/* Counter Badge */}
        <div
          className={`text-xs font-bold py-1 px-2.5 rounded-full border ${
            isMaxReached
              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 border-rose-300 dark:border-rose-900'
              : 'bg-admin-accent-light text-admin-accent border-admin-border'
          }`}
        >
          {images.length}/10 Images
        </div>
      </div>

      {galleryError && (
        <div className="p-2 px-3 mb-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900 rounded-md text-rose-600 text-xs flex items-center gap-1.5">
          <AlertCircle size={14} />
          <span>{galleryError}</span>
        </div>
      )}

      {/* Grid of Preview Items */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3 items-center">
        {images.map((item, idx) => {
          const previewUrl = getPreviewUrl(item);
          return (
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              className={`relative w-full h-[110px] bg-white dark:bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center cursor-grab shadow-xs group ${
                draggedIdx === idx
                  ? 'border-2 border-dashed border-admin-accent'
                  : 'border border-admin-border'
              }`}
            >
              <img
                src={previewUrl}
                alt={`Variant image ${idx + 1}`}
                className="w-full h-full object-contain p-1"
              />

              {/* Cover Badge on first image */}
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-admin-accent text-white text-[9px] font-extrabold py-0.5 px-1.5 rounded uppercase">
                  Cover
                </span>
              )}

              {/* Index indicator */}
              <span className="absolute bottom-1 left-1 bg-slate-900/60 text-white text-[10px] font-semibold py-0.5 px-1.5 rounded">
                #{idx + 1}
              </span>

              {/* Quick Action Overlay */}
              <div className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-1.5">
                {/* Top reorder controls */}
                <div className="flex justify-between">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, idx - 1)}
                    className="bg-white/90 border-none rounded p-1 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                    title="Move Left"
                  >
                    <MoveLeft size={12} className="text-slate-900" />
                  </button>

                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => handleMove(idx, idx + 1)}
                    className="bg-white/90 border-none rounded p-1 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                    title="Move Right"
                  >
                    <MoveRight size={12} className="text-slate-900" />
                  </button>
                </div>

                {/* Bottom actions: Replace & Delete */}
                <div className="flex justify-center gap-2">
                  <label
                    htmlFor={`var-${variantIndex}-replace-${idx}`}
                    className="bg-admin-accent text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer hover:opacity-90"
                    title="Replace Image"
                  >
                    <Edit3 size={12} />
                  </label>
                  <input
                    id={`var-${variantIndex}-replace-${idx}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/*"
                    className="hidden"
                    onChange={(e) => handleReplaceFile(idx, e)}
                  />

                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="bg-rose-500 text-white border-none rounded-full w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-rose-600"
                    title="Delete Image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Upload Dropzone / Button Card */}
        {!isMaxReached ? (
          <label
            htmlFor={`var-img-upload-${variantIndex}`}
            className="h-[110px] border-2 border-dashed border-admin-border hover:border-admin-accent hover:bg-admin-accent-light rounded-lg bg-admin-card flex flex-col items-center justify-center cursor-pointer p-2 text-center transition-all duration-200"
          >
            <Upload size={20} className="text-admin-accent mb-1" />
            <span className="text-xs font-semibold text-admin-text-primary">
              Add Images
            </span>
            <span className="text-[9px] text-admin-text-muted mt-0.5">
              JPG, PNG, WEBP
            </span>
            <input
              id={`var-img-upload-${variantIndex}`}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/*"
              className="hidden"
              onChange={handleAddFiles}
            />
          </label>
        ) : (
          <div className="h-[110px] border border-admin-border rounded-lg bg-rose-50/50 dark:bg-rose-950/20 flex flex-col items-center justify-center p-2 text-center">
            <AlertCircle size={20} className="text-rose-500 mb-1" />
            <span className="text-[10px] font-bold text-rose-600">
              Limit Reached (10/10)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantImageGallery;
