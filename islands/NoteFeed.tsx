import { Note } from "applesauce-common/casts";
import { castTimelineStream } from "applesauce-common/observable";
import { mapEventsToStore } from "applesauce-core/observable";
import use$ from "../hooks/use$.ts";
import useSubscription from "../hooks/useSubscription.ts";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";
import { tap } from "rxjs";

function NoteCard({ note }: { note: Note }) {
  const event = note.event;
  // const picture = use$(note.author.profile$.picture);
  const picture = use$(note.author.profile$.picture);
  const displayName = use$(note.author.profile$.displayName);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-4 border border-neutral-200 dark:border-neutral-700 max-w-xl">
      <div className="flex items-center gap-2 mb-2">
        <img src={picture} alt={displayName} className="w-8 h-8 rounded-full" />
        <div>{displayName || event.pubkey?.slice(0, 6)}</div>
        <span className="text-xs text-neutral-500">
          {event.created_at
            ? new Date(event.created_at * 1000).toLocaleString()
            : "unknown"}
        </span>
      </div>
      <div className="whitespace-pre-line text-neutral-800 dark:text-neutral-100 text-base">
        {event.content}
      </div>
    </div>
  );
}

export default function NoteFeed({ relay }: { relay: string }) {
  // Subscribe to new events
  useSubscription(
    () =>
      pool.relay(relay).subscription({ kinds: [1], limit: 10 }).pipe(
        tap((e) => typeof e === "object" && console.log("event", e.id)),
        mapEventsToStore(eventStore),
      ),
    [relay],
  );

  // get notes from event store
  const notes = use$(
    () =>
      eventStore.timeline({ kinds: [1], limit: 10 }).pipe(
        castTimelineStream(Note),
      ),
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <h2>Social feed:</h2>
      {notes?.map((event) => <NoteCard key={event.id} note={event} />)}
    </div>
  );
}
