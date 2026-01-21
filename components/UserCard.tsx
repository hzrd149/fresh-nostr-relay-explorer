import type { ComponentChildren } from "preact";
import { Avatar } from "./Avatar.tsx";
import { UserName } from "./UserName.tsx";

export interface UserCardProps {
  picture?: string;
  displayName?: string;
  pubkey: string;
  about?: string;
  children?: ComponentChildren;
  className?: string;
}

export function UserCard({
  picture,
  displayName,
  pubkey,
  about,
  children,
  className = "",
}: UserCardProps) {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Avatar src={picture} alt={displayName} size="lg" />
        <div className="flex-1 min-w-0">
          <UserName
            displayName={displayName}
            pubkey={pubkey}
            className="text-base"
          />
          {about && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
              {about}
            </p>
          )}
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}
