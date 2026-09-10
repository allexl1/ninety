export function Card({ children, className = '', ...props }) {
  return (
    <div className={`glass p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Row({ left, right, sub }) {
  return (
    <div className="ny-rowline flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{left}</div>
        {sub ? <div className="truncate text-xs text-slate-400">{sub}</div> : null}
      </div>
      <div className="ny-num text-sm text-white">{right}</div>
    </div>
  );
}
