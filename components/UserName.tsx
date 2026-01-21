export interface UserNameProps {
  displayName?: string;
  pubkey?: string;
  className?: string;
  showPubkey?: boolean;
}

export function UserName({
  displayName,
  pubkey,
  className = "",
  showPubkey = true,
}: UserNameProps) {
  const name = displayName || (pubkey ? `${pubkey.slice(0, 8)}...` : "Unknown");
  const hasDisplayName = !!displayName;

  return (
    <span className={`font-medium ${className}`}>
      {name}
      {hasDisplayName && showPubkey && pubkey && (
        <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400 font-normal">
          ({pubkey.slice(0, 6)})
        </span>
      )}
    </span>
  );
}
