export const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
  >
    {children}
  </div>
);

export const StatCard = ({ title, value, subtitle, accent = "slate" }) => {
  const accents = {
    slate: "border-l-slate-800",
    amber: "border-l-amber-500",
    emerald: "border-l-emerald-600",
    blue: "border-l-blue-600",
  };

  return (
    <Card className={`border-l-4 ${accents[accent]}`}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
    </Card>
  );
};
