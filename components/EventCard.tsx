import type { ComponentChildren } from "preact";

export interface EventCardProps {
  kind: number;
  content?: string;
  pubkey: string;
  createdAt: number;
  id: string;
  children?: ComponentChildren;
  className?: string;
}

const kindColors: Record<number, string> = {
  0: "bg-blue-500",
  1: "bg-green-500",
  3: "bg-purple-500",
  4: "bg-red-500",
  5: "bg-orange-500",
  6: "bg-pink-500",
  7: "bg-yellow-500",
};

export function EventCard({
  kind,
  content,
  pubkey,
  createdAt,
  id,
  children,
  className = "",
}: EventCardProps) {
  const kindColor = kindColors[kind] || "bg-neutral-500";
  const date = new Date(createdAt * 1000);

  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`${kindColor} text-white text-xs font-medium px-2 py-1 rounded`}
        >
          kind {kind}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {pubkey.slice(0, 8)}...
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {date.toLocaleString()}
        </span>
      </div>
      {content && (
        <div className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-line mb-2 line-clamp-3">
          {content}
        </div>
      )}
      {children}
      <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 font-mono">
        {id.slice(0, 16)}...
      </div>
    </div>
  );
}
