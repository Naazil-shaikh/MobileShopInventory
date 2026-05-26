export const LoadingSpinner = ({ size = "md", className = "" }) => {
  const sizes = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-12 w-12" };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2 border-slate-200 border-t-slate-800`}
      />
    </div>
  );
};

export const PageLoader = () => (
  <div className="flex min-h-[300px] items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);
