export function Field({ label, hint, error, children }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </label>
  );
}

const controlClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";

export function Input({ label, hint, error, className = "", required = true, ...props }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <input required={required} className={`${controlClass} ${error ? "border-red-300 focus:border-red-500" : ""} ${className}`} {...props} />
    </Field>
  );
}

export function Textarea({ label, hint, error, className = "", required = true, rows = 4, ...props }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <textarea required={required} rows={rows} className={`${controlClass} min-h-24 resize-y ${error ? "border-red-300 focus:border-red-500" : ""} ${className}`} {...props} />
    </Field>
  );
}

export function Select({ label, hint, error, children, className = "", required = true, ...props }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <select required={required} className={`${controlClass} ${error ? "border-red-300 focus:border-red-500" : ""} ${className}`} {...props}>
        {children}
      </select>
    </Field>
  );
}
