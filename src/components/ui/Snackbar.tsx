import React from 'react';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  onClose?: () => void;
}

export function Snackbar({ open, title, message, action, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed bottom-6 right-6 z-60 max-w-sm">
      <div className="bg-white border border-blue-100 shadow-lg rounded-xl p-4 flex items-start space-x-3 animate-slide-in">
        <div className="flex-1">
          {title && <div className="text-sm font-semibold text-gray-900">{title}</div>}
          {message && <div className="text-sm text-gray-600 mt-1">{message}</div>}
        </div>
        <div className="flex items-center space-x-2">
          {action}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>
      </div>
    </div>
  );
}

// small animation utility (Tailwind plugin or included styles assumed)
