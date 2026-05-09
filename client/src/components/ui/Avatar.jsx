export default function Avatar({ name = "User", src, size = "md", className = "" }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };

  return src ? (
    <img src={src} alt={name} className={`${sizes[size]} rounded-2xl object-cover ${className}`} />
  ) : (
    <span className={`${sizes[size]} inline-flex items-center justify-center rounded-2xl bg-blue-600 font-semibold text-white shadow-sm ${className}`}>
      {name?.trim()?.[0]?.toUpperCase() || "U"}
    </span>
  );
}
