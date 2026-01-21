import type { ComponentChildren } from "preact";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ComponentChildren;
  className?: string;
}

export function StatCard(
  { label, value, icon, className = "" }: StatCardProps,
) {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {value}
          </p>
        </div>
        {icon && (
          <div className="text-neutral-400 dark:text-neutral-500">{icon}</div>
        )}
      </div>
    </div>
  );
}
