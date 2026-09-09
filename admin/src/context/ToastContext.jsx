import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, X, Link2, ShieldAlert } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: 'Cannot Delete Item',
    message: '',
    details: '',
  });

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showErrorModal = (options) => {
    if (typeof options === 'string') {
      setModalState({
        isOpen: true,
        title: 'Cannot Delete Item',
        message: options,
        details: '',
      });
    } else if (options && typeof options === 'object') {
      setModalState({
        isOpen: true,
        title: options.title || 'Cannot Delete Item',
        message: options.message || options.errors?.[0] || 'Action cannot be completed due to linked dependencies.',
        details: options.details || '',
      });
    }
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast, showErrorModal }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isWarn = toast.type === 'warn' || toast.type === 'warning';
          const isError = toast.type === 'error';

          let bgClass = 'bg-emerald-800 text-white border-emerald-700';
          let icon = <CheckCircle size={18} className="text-emerald-400 shrink-0" />;

          if (isWarn) {
            bgClass = 'bg-amber-900 text-white border-amber-700';
            icon = <AlertTriangle size={18} className="text-amber-400 shrink-0" />;
          } else if (isError) {
            bgClass = 'bg-rose-900 text-white border-rose-700';
            icon = <AlertCircle size={18} className="text-rose-400 shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3 px-4 rounded-xl shadow-xl flex items-center justify-between text-xs font-semibold border min-w-[280px] max-w-[420px] transition-all duration-200 ${bgClass}`}
            >
              <span className="flex items-center gap-2.5">
                {icon}
                {toast.message}
              </span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="bg-transparent border-none text-slate-300 hover:text-white cursor-pointer ml-3.5 flex items-center"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {modalState.isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1100] animate-drawer-overlay p-4"
          onClick={closeModal}
        >
          <div
            className="bg-admin-card rounded-2xl w-[90%] max-w-[520px] shadow-2xl border border-admin-border overflow-hidden animate-drawer-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:px-6 border-b border-admin-border">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-500">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="m-0 text-base font-bold text-admin-text-primary">{modalState.title}</h3>
                  <p className="m-0 text-xs text-admin-text-muted font-medium mt-0.5">Interconnected Catalog Warning</p>
                </div>
              </div>
              <button
                type="button"
                className="bg-transparent border-none text-admin-text-muted hover:text-admin-text-primary cursor-pointer p-1.5 rounded-lg flex items-center justify-center transition-colors"
                onClick={closeModal}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 md:px-6 flex flex-col gap-4">
              <div className="bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 p-3.5 px-4 rounded-lg flex gap-3 items-start">
                <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-rose-800 dark:text-rose-300 text-sm">
                    Deletion Restricted
                  </span>
                  <p className="m-0 text-xs text-rose-700 dark:text-rose-400 leading-relaxed">{modalState.message}</p>
                </div>
              </div>

              <div className="bg-admin-subtle border border-admin-border rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-admin-text-primary">
                  <Link2 size={16} className="text-blue-500" />
                  <span>Interconnected Relationships</span>
                </div>
                <p className="m-0 text-xs text-admin-text-secondary leading-relaxed">
                  Main Categories, Categories, Subcategories, and Products are hierarchically linked in the system:
                </p>
                <div className="flex items-center gap-1.5 flex-wrap py-2.5">
                  <span className="text-[11px] font-semibold py-1 px-2.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Main Category
                  </span>
                  <span className="text-xs text-admin-text-muted">➔</span>
                  <span className="text-[11px] font-semibold py-1 px-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Category
                  </span>
                  <span className="text-xs text-admin-text-muted">➔</span>
                  <span className="text-[11px] font-semibold py-1 px-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Subcategory
                  </span>
                  <span className="text-xs text-admin-text-muted">➔</span>
                  <span className="text-[11px] font-semibold py-1 px-2.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Product
                  </span>
                </div>
                <p className="m-0 text-[11px] text-admin-text-muted italic">
                  Please remove, reassign, or un-link dependent items before deleting this record.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 bg-admin-subtle border-t border-admin-border flex justify-end">
              <button
                type="button"
                className="bg-admin-accent hover:opacity-90 text-white border-none py-2.5 px-6 rounded-lg text-sm font-semibold cursor-pointer shadow-xs transition-opacity"
                onClick={closeModal}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
