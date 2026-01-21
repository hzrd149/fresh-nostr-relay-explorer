import { Note } from "applesauce-common/casts";
import { castTimelineStream } from "applesauce-common/observable";
import { mapEventsToStore } from "applesauce-core/observable";
import use$ from "../hooks/use$.ts";
import useSubscription from "../hooks/useSubscription.ts";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";
import { tap } from "rxjs";
import { NoteCard } from "../components/NoteCard.tsx";

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
      {notes?.length === 0 && (
        <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
          No notes found. Waiting for events...
        </div>
      )}
      {notes?.map((note) => (
        <NoteCard key={note.id} note={note} clickable relay={relay} />
      ))}
    </div>
  );
}
