import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, variant = 'modal', width }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDrawer = variant === 'drawer';

  if (isDrawer) {
    return (
      <div
        className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex justify-end items-stretch z-[1000] animate-drawer-overlay"
        onClick={onClose}
      >
        <div
          className="bg-admin-card border-l border-admin-border h-screen max-w-[1200px] min-w-[320px] flex flex-col shadow-2xl text-admin-text-primary animate-drawer-content"
          style={{ width: width || '75vw' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 md:px-7 border-b border-admin-border bg-admin-card sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <h3 className="m-0 text-lg font-bold text-admin-text-primary">
                {title}
              </h3>
            </div>
            <button
              type="button"
              className="bg-transparent border-none text-admin-text-muted hover:text-admin-text-primary cursor-pointer p-1.5 rounded-lg flex items-center justify-center transition-colors"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-7 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-admin-card border border-admin-border rounded-admin-sm w-[90%] max-w-[560px] max-h-[90vh] overflow-y-auto shadow-admin-lg text-admin-text-primary"
        style={width ? { width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 px-6 border-b border-admin-border">
          <h3 className="m-0 text-base font-bold text-admin-text-primary">{title}</h3>
          <button
            type="button"
            className="bg-transparent border-none text-admin-text-muted hover:text-admin-text-primary cursor-pointer p-1.5 rounded-lg flex items-center justify-center transition-colors"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
