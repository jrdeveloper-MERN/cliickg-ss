'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '500px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-drawer-fade"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="py-4 px-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-sans text-base font-bold text-slate-800 m-0">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        ) : null}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
