import { mapEventsToStore } from "applesauce-core/observable";
import { map } from "rxjs";
import { EventCard } from "../components/EventCard.tsx";
import use$ from "../hooks/use$.ts";
import useSubscription from "../hooks/useSubscription.ts";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";

export default function LiveEventStream({ relay }: { relay: string }) {
  // Subscribe to all event types
  useSubscription(
    () =>
      pool.relay(relay).subscription({ limit: 50 }).pipe(
        mapEventsToStore(eventStore),
      ),
    [relay],
  );

  // Get all events from store
  const events = use$(
    () =>
      eventStore.timeline({ limit: 50 }).pipe(
        map((events) => events || []),
      ),
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {events?.length === 0 && (
        <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
          No events yet. Waiting for live events...
        </div>
      )}
      {events?.map((event) => (
        <EventCard
          key={event.id}
          kind={event.kind}
          content={event.content.slice(0, 200)}
          pubkey={event.pubkey}
          createdAt={event.created_at}
          id={event.id}
        >
          {event.tags.length > 0 && (
            <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              <strong>Tags:</strong> {event.tags.length} tag(s)
            </div>
          )}
        </EventCard>
      ))}
    </div>
  );
}
