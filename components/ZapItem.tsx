import type { Zap } from "applesauce-common/casts";
import { npubEncode } from "applesauce-core/helpers";
import use$ from "../hooks/use$.ts";
import { Avatar } from "./Avatar.tsx";

export interface ZapItemProps {
  zap: Zap;
}

export function ZapItem({ zap }: ZapItemProps) {
  const picture = use$(zap.sender.profile$.picture);
  const displayName = use$(zap.sender.profile$.displayName);
  const amountSats = Math.round(zap.amount / 1000); // Convert msats to sats

  return (
    <div className="flex items-center gap-2 text-sm">
      <Avatar
        src={picture || `https://robohash.org/${zap.sender.pubkey}.png`}
        alt={displayName || npubEncode(zap.sender.pubkey)}
        size="sm"
      />
      <span className="font-medium">
        {displayName || `${zap.sender.pubkey.slice(0, 8)}...`}
      </span>
      <span className="text-yellow-600 dark:text-yellow-400">
        ⚡ {amountSats} sats
      </span>
    </div>
  );
}
