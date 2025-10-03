// JSX runtime handles React import automatically

interface Props {
  open: boolean;
  onClose: () => void;
  name?: string;
  phone?: string;
  address?: string;
  roleLabel: string;
}

export function ContactDrawer({ open, onClose, name, phone, address, roleLabel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase text-gray-500">{roleLabel}</div>
            <div className="text-lg font-semibold text-gray-900">{name || 'N/A'}</div>
          </div>
          <button onClick={onClose} className="rounded border px-3 py-1">Close</button>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div><span className="font-medium">Phone:</span> {phone ? (<a href={`tel:${phone}`} className="text-blue-600 hover:text-blue-700">{phone}</a>) : 'N/A'}</div>
          <div><span className="font-medium">Address:</span> {address || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}


