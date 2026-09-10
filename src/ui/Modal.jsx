import { useEffect } from 'react';

export function Modal({ open, onClose, label, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label ?? 'Dialog'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div className="glass relative w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Select({ label, ...props }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      <select
        aria-label={label}
        className="ny-focus glass w-full rounded-xl bg-transparent px-3 py-2 text-sm text-white"
        {...props}
      />
    </label>
  );
}

export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label ?? 'Options'} className="glass inline-flex gap-1 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`ny-focus rounded-lg px-3 py-1.5 text-sm font-medium transition-transform ${
            value === o.value ? 'ny-accent-bg scale-[1.03]' : 'text-slate-300 hover:scale-[1.03]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
