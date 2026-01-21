import type { Note } from "applesauce-common/casts";
import { neventEncode } from "applesauce-core/helpers";
import use$ from "../hooks/use$.ts";
import { Avatar } from "./Avatar.tsx";
import { UserName } from "./UserName.tsx";

export interface NoteCardProps {
  note: Note;
  clickable?: boolean;
  relay?: string;
}

export function NoteCard({ note, clickable = false, relay }: NoteCardProps) {
  const event = note.event;
  const picture = use$(note.author.profile$.picture);
  const displayName = use$(note.author.profile$.displayName);

  const content = (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={picture} alt={displayName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <UserName
              displayName={displayName}
              pubkey={event.pubkey}
              showPubkey={false}
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {event.created_at
                ? new Date(event.created_at * 1000).toLocaleString()
                : "unknown"}
            </span>
          </div>
        </div>
      </div>
      <div className="whitespace-pre-line text-neutral-800 dark:text-neutral-100 text-base">
        {event.content}
      </div>
    </div>
  );

  if (clickable && relay) {
    const nevent = neventEncode({ id: event.id, relays: [relay] });
    return (
      <a
        href={`/thread/${nevent}`}
        className="block hover:opacity-80 transition-opacity cursor-pointer"
      >
        {content}
      </a>
    );
  }

  return content;
}
