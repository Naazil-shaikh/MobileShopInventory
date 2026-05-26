export const Input = ({ label, error, className = "", ...props }) => (
  <div className="w-full">
    {label && (
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
    )}
    <input
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${error ? "border-red-500" : ""} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);
