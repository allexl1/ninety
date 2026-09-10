export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="glass flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-2xl text-slate-300" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function SkeletonGrid({ n = 6 }) {
  return (
    <div className="ny-grid" aria-label="Loading" role="status">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="glass p-4">
          <div className="sk h-4 w-2/3" />
          <div className="sk mt-2 h-8 w-full" />
          <div className="sk mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div aria-label="Loading" role="status" className="glass p-3">
      <div className="sk h-5 w-full" />
    </div>
  );
}

export function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div role="status" className="glass fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-sm text-white">
      {msg}
    </div>
  );
}
