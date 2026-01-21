import { mapEventsToStore } from "applesauce-core/observable";
import use$ from "../hooks/use$.ts";
import useSubscription from "../hooks/useSubscription.ts";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";
import { UserCard } from "../components/UserCard.tsx";
import { map } from "rxjs";

interface ProfileData {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  [key: string]: unknown;
}

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  content: string;
  tags: string[][];
  sig: string;
}

function ProfileCard({ event }: { event: NostrEvent }) {
  let profileData: ProfileData = {};
  try {
    profileData = JSON.parse(event.content);
  } catch {
    // ignore parse errors
  }

  return (
    <UserCard
      picture={profileData.picture as string | undefined}
      displayName={(profileData.display_name || profileData.name) as
        | string
        | undefined}
      pubkey={event.pubkey}
      about={profileData.about as string | undefined}
    />
  );
}

export default function UserList({ relay }: { relay: string }) {
  // Subscribe to profile events (kind 0)
  useSubscription(
    () =>
      pool.relay(relay).subscription({ kinds: [0], limit: 100 }).pipe(
        mapEventsToStore(eventStore),
      ),
    [relay],
  );

  // Get profiles from event store
  const profiles = use$(
    () =>
      eventStore.timeline({ kinds: [0], limit: 100 }).pipe(
        map((events) => events || []),
      ),
    [],
  );

  return (
    <div>
      {profiles?.length === 0 && (
        <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
          No users found. Waiting for profile events...
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles?.map((event) => (
          <ProfileCard key={event.pubkey} event={event} />
        ))}
      </div>
    </div>
  );
}
