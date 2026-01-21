import type { Note } from "applesauce-common/casts";
import use$ from "../hooks/use$.ts";
import { Avatar } from "./Avatar.tsx";
import { UserName } from "./UserName.tsx";
import { ZapItem } from "./ZapItem.tsx";

export interface ThreadNoteItemProps {
  note: Note;
  isRoot?: boolean;
}

export function ThreadNoteItem({ note, isRoot = false }: ThreadNoteItemProps) {
  const event = note.event;
  const picture = use$(note.author.profile$.picture);
  const displayName = use$(note.author.profile$.displayName);
  const replies = use$(note.replies$);
  const zaps = use$(note.zaps$);

  return (
    <div className="mb-2">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar src={picture} alt={displayName} size={isRoot ? "lg" : "md"} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <UserName
                displayName={displayName}
                pubkey={event.pubkey}
                showPubkey={false}
                className={isRoot ? "text-lg" : ""}
              />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {event.created_at
                  ? new Date(event.created_at * 1000).toLocaleString()
                  : "unknown"}
              </span>
            </div>
          </div>
        </div>
        <div
          className={`whitespace-pre-line text-neutral-800 dark:text-neutral-100 ${
            isRoot ? "text-lg" : "text-base"
          }`}
        >
          {event.content.trim()}
        </div>

        {zaps && zaps.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {zaps.length} zap{zaps.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {zaps.map((zap) => <ZapItem key={zap.uid} zap={zap} />)}
            </div>
          </div>
        )}
      </div>

      {replies && replies.length > 0 && (
        <div className="ml-6 mt-2 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700">
          {replies.map((reply) => (
            <ThreadNoteItem key={reply.uid} note={reply} isRoot={false} />
          ))}
        </div>
      )}
    </div>
  );
}
