import React from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop no longer closes modal on click to prevent accidental close on focus/visibility change */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 transform transition-all duration-200 scale-100">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-5">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-end space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}


