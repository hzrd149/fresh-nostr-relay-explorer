import type { ComponentChildren } from "preact";

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: ComponentChildren;
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

export function Avatar({ src, alt, size = "md", fallback }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt || "Avatar"}
        className={`${sizeClass} rounded-full object-cover bg-neutral-200 dark:bg-neutral-700`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-medium`}
    >
      {fallback || "?"}
    </div>
  );
}
