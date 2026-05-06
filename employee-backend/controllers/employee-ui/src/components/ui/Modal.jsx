export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
