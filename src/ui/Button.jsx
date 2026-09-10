export function Button({ variant = 'primary', ...props }) {
  const base =
    'ny-focus inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-transform duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'ny-accent-bg hover:scale-[1.03] active:scale-[0.99]'
      : variant === 'ghost'
        ? 'glass glass-hover text-white'
        : 'border border-white/15 text-white hover:scale-[1.03]';
  return <button type="button" className={`${base} ${styles} ${props.className ?? ''}`} {...props} />;
}
