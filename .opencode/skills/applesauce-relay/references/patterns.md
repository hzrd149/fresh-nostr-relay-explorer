# Applesauce-Relay Patterns

Detailed examples and patterns for common use cases.

## Table of Contents

- [Fresh Framework Integration](#fresh-framework-integration)
- [Loading Single Events by Pointer](#loading-single-events-by-pointer)
- [Avoiding "no elements in sequence" Errors](#avoiding-no-elements-in-sequence-errors)
- [RelayPool Patterns](#relaypool-patterns)
- [Event Store Integration](#event-store-integration)
- [Authentication Patterns](#authentication-patterns)
- [Subscription Patterns](#subscription-patterns)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)

## Fresh Framework Integration

### Complete Route Example

```typescript
// routes/notes.tsx
import { lastValueFrom, mapEventsToStore } from "applesauce-core";
import { page } from "fresh";
import { Head } from "fresh/runtime";
import NoteFeed from "../islands/NoteFeed.tsx";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";
import { define } from "../utils.ts";

export const handler = define.handlers(async (ctx) => {
  const relay = pool.relay(ctx.state.relay);

  // Fetch initial notes (IMPORTANT: Use defaultValue to prevent errors)
  await lastValueFrom(
    relay.request({ kinds: [1], limit: 50 }).pipe(
      mapEventsToStore(eventStore),
    ),
    { defaultValue: null }, // Always provide default for potentially empty results
  );

  // Fetch profiles for note authors
  await lastValueFrom(
    relay.request({ kinds: [0], limit: 100 }).pipe(
      mapEventsToStore(eventStore),
    ),
    { defaultValue: null }, // Prevents "no elements in sequence" error
  );

  return page({});
});

export default define.page(function Notes(ctx) {
  return (
    <>
      <Head>
        <title>Notes - Nostr Relay Explorer</title>
      </Head>
      <div className="p-8">
        <NoteFeed relay={ctx.state.relay} />
      </div>
    </>
  );
});
```

### Complete Island Example

```typescript
// islands/NoteFeed.tsx
import { Note } from "applesauce-common/casts";
import { castTimelineStream } from "applesauce-common/observable";
import { mapEventsToStore } from "applesauce-core/observable";
import use$ from "../hooks/use$.ts";
import useSubscription from "../hooks/useSubscription.ts";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";

function NoteCard({ note }: { note: Note }) {
  const picture = use$(note.author.profile$.picture);
  const displayName = use$(note.author.profile$.displayName);

  return (
    <div className="card">
      <img src={picture} alt={displayName} />
      <div>{displayName}</div>
      <p>{note.event.content}</p>
    </div>
  );
}

export default function NoteFeed({ relay }: { relay: string }) {
  // Subscribe to live updates (no return value)
  useSubscription(
    () =>
      pool.relay(relay)
        .subscription({ kinds: [1], limit: 10 })
        .pipe(mapEventsToStore(eventStore)),
    [relay],
  );

  // Get reactive values from store
  const notes = use$(
    () =>
      eventStore.timeline({ kinds: [1], limit: 10 }).pipe(
        castTimelineStream(Note),
      ),
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {notes?.map((note) => <NoteCard key={note.id} note={note} />)}
    </div>
  );
}
```

## Loading Single Events by Pointer

### Pattern: Loading Event from EventPointer/AddressPointer

**RECOMMENDED PATTERN** - Use `eventStore.event()` with proper filtering and
timeout:

```typescript
import { Note } from "applesauce-common/casts";
import { castEventStream } from "applesauce-common/observable";
import { lastValueFrom, simpleTimeout } from "applesauce-core";
import { normalizeToEventPointer } from "applesauce-core/helpers";
import { filter, take } from "rxjs";

export const handler = define.handlers(async (ctx) => {
  const { nevent } = ctx.params;

  // Decode nip-19 identifier to EventPointer
  const eventPointer = normalizeToEventPointer(nevent);

  if (!eventPointer) {
    return page({ error: "Invalid nevent format" });
  }

  try {
    // Get event from store - triggers eventLoader automatically
    const note = await lastValueFrom(
      eventStore.event(eventPointer).pipe(
        castEventStream(Note, eventStore),
        filter((e) => e !== undefined), // Wait for event to load
        take(1), // Take first value
        simpleTimeout(5000, "Timeout loading event from relay"),
      ),
      { defaultValue: undefined }, // Fallback if timeout
    );

    if (!note) {
      return page({ error: "Event not found on relay" });
    }

    return page({ note });
  } catch (error) {
    return page({ error: error.message });
  }
});
```

**How it works:**

1. `eventStore.event(eventPointer)` returns an observable that:
   - Emits `undefined` initially if event not in store
   - Triggers the `eventLoader` to fetch from relays (uses relay hints from
     pointer)
   - Emits the event once loaded into store

2. `filter(e => e !== undefined)` - Waits for actual event (skips initial
   undefined)

3. `take(1)` - Completes after receiving first defined value

4. `simpleTimeout(5000)` - Throws TimeoutError if nothing emitted within 5
   seconds

5. `{ defaultValue: undefined }` - Handles timeout case gracefully

**DON'T DO THIS** (Manual fetching):

```typescript
// ❌ BAD - manually fetching before querying store
await lastValueFrom(
  pool.request(relays, { ids: [pointer.id] }).pipe(
    mapEventsToStore(eventStore),
  ),
);
const event = await lastValueFrom(
  eventStore.event(pointer).pipe(take(1)),
);
```

**Why the recommended pattern is better:**

- Leverages existing event loader infrastructure
- Uses relay hints from pointer for better discovery
- Checks lookup relays (NIP-05, NIP-65) automatically
- Prevents hanging with timeout
- Single observable chain instead of two separate fetches

## Avoiding "no elements in sequence" Errors

### The Problem

RxJS `lastValueFrom()` throws an error when the observable completes without
emitting any values. This commonly happens when:

- Fetching events that don't exist
- Querying with filters that match zero events
- Requesting profiles that aren't found
- Loading replies/zaps when none exist

### The Solution

**Always provide `defaultValue` to `lastValueFrom()`**:

```typescript
// ❌ BAD - throws if no events
await lastValueFrom(
  pool.request(relays, { kinds: [0], authors: [pubkey] }).pipe(
    mapEventsToStore(eventStore),
  ),
);

// ✅ GOOD - returns null if no events
await lastValueFrom(
  pool.request(relays, { kinds: [0], authors: [pubkey] }).pipe(
    mapEventsToStore(eventStore),
  ),
  { defaultValue: null },
);
```

### When to Use Default Values

**Always use when:**

- Fetching profiles (kind 0) - might not exist
- Loading replies/zaps - might be empty
- Any `pool.request()` that could return 0 results
- Querying with user-provided filters
- BehaviorSubject/Observable that might not emit

### Pattern: Fetching Multiple Related Events

```typescript
export const handler = define.handlers(async (ctx) => {
  const relay = pool.relay(ctx.state.relay);

  // Fetch root note
  await lastValueFrom(
    relay.request({ ids: [noteId] }).pipe(
      mapEventsToStore(eventStore),
    ),
    { defaultValue: null }, // Might not exist
  );

  // Get note from store
  const note = await lastValueFrom(
    eventStore.event({ id: noteId }).pipe(
      castEventStream(Note, eventStore),
      take(1),
    ),
    { defaultValue: undefined }, // Might not be found
  );

  if (!note) {
    return page({ error: "Note not found" });
  }

  // Fetch author profile (might not exist)
  await lastValueFrom(
    relay.request({ kinds: [0], authors: [note.event.pubkey] }).pipe(
      mapEventsToStore(eventStore),
    ),
    { defaultValue: null },
  );

  // Fetch replies (might be empty)
  await lastValueFrom(
    relay.request({ kinds: [1], "#e": [noteId] }).pipe(
      mapEventsToStore(eventStore),
    ),
    { defaultValue: null },
  );

  // Get replies from store (might be empty array)
  const replies = await lastValueFrom(
    note.replies$.pipe(take(1)),
    { defaultValue: [] },
  );

  return page({ note, replies });
});
```

### Pattern: Using combineLatest with Defaults

```typescript
await lastValueFrom(
  combineLatest([
    pool.request(relays, { kinds: [1], "#e": [eventId] }).pipe(
      mapEventsToStore(eventStore),
    ),
    pool.request(relays, { kinds: [9735], "#e": [eventId] }).pipe(
      mapEventsToStore(eventStore),
    ),
  ]),
  { defaultValue: [null, null] }, // Both might be empty
);
```

## RelayPool Patterns

### Pattern: Multi-Relay Fetching with Fallback

```typescript
const primaryRelays = [
  "wss://relay1.example.com",
  "wss://relay2.example.com",
];

const fallbackRelays = [
  "wss://backup1.example.com",
  "wss://backup2.example.com",
];

async function fetchWithFallback(filters: Filter) {
  try {
    // Try primary relays first
    const events = await lastValueFrom(
      pool.request(primaryRelays, filters).pipe(
        toArray(),
        timeout(5000),
      ),
    );

    if (events.length > 0) return events;
  } catch (err) {
    console.warn("Primary relays failed, trying fallback...");
  }

  // Fallback to backup relays
  return await lastValueFrom(
    pool.request(fallbackRelays, filters).pipe(toArray()),
  );
}
```

### Pattern: Read from Many, Write to Few

```typescript
const readRelays = [
  "wss://relay1.example.com",
  "wss://relay2.example.com",
  "wss://relay3.example.com",
  "wss://relay4.example.com",
];

const writeRelays = [
  "wss://my-relay.example.com",
  "wss://backup.example.com",
];

// Read from many relays for maximum coverage
pool.request(readRelays, { kinds: [1], limit: 50 })
  .subscribe((event) => console.log(event));

// Write only to trusted relays
await pool.publish(writeRelays, event);
```

### Pattern: Relay-Specific Filters

```typescript
// Query different data from different relays
const filterMap = {
  "wss://notes-relay.com": { kinds: [1], limit: 100 },
  "wss://media-relay.com": { kinds: [1063], limit: 50 },
  "wss://chat-relay.com": { kinds: [42], limit: 200 },
};

pool.subscriptionMap(filterMap).subscribe({
  next: (response) => {
    if (response !== "EOSE") {
      console.log(`Event from specialized relay:`, response);
    }
  },
});
```

### Pattern: Outbox Model Implementation

```typescript
import { createOutboxMap } from "applesauce-core/helpers/relay-selection";

// Fetch user profiles first to get their relay lists
const profiles = await fetchUserProfiles(userPubkeys);

// Create outbox map from profiles (NIP-65)
const outboxMap = createOutboxMap(profiles);

// Subscribe to each user's outbox relays
pool.outboxSubscription(
  outboxMap,
  {
    kinds: [1],
    since: unixNow() - 86400, // Last 24 hours
  },
).subscribe({
  next: (response) => {
    if (response !== "EOSE") {
      // Events from users' designated outbox relays
      console.log("Outbox event:", response);
    }
  },
});
```

### Pattern: Parallel Publishing with Response Tracking

```typescript
const relays = [
  "wss://relay1.example.com",
  "wss://relay2.example.com",
  "wss://relay3.example.com",
];

async function publishAndTrack(event: NostrEvent) {
  const responses = await pool.publish(relays, event);

  const successful = responses.filter((r) => r.ok);
  const failed = responses.filter((r) => !r.ok);

  console.log(`Published to ${successful.length}/${relays.length} relays`);

  if (failed.length > 0) {
    console.warn(
      "Failed relays:",
      failed.map((r) => ({
        relay: r.from,
        reason: r.message,
      })),
    );
  }

  return {
    success: successful.length > 0,
    total: relays.length,
    successful: successful.length,
    failed: failed.length,
    responses,
  };
}
```

### Pattern: Progressive Relay Loading

```typescript
class ProgressiveRelayLoader {
  private pool = new RelayPool();
  private activeRelays: string[] = [];

  // Start with fast, reliable relays
  private tier1 = ["wss://fast-relay.com"];
  private tier2 = ["wss://relay1.com", "wss://relay2.com"];
  private tier3 = ["wss://relay3.com", "wss://relay4.com"];

  async startFetching(filters: Filter) {
    // Tier 1: Fast initial response
    this.activeRelays = this.tier1;
    this.subscribe(filters);

    // Tier 2: Add more relays after 1 second
    setTimeout(() => {
      this.activeRelays = [...this.tier1, ...this.tier2];
      this.subscribe(filters);
    }, 1000);

    // Tier 3: Add remaining relays after 3 seconds
    setTimeout(() => {
      this.activeRelays = [...this.tier1, ...this.tier2, ...this.tier3];
      this.subscribe(filters);
    }, 3000);
  }

  private subscribe(filters: Filter) {
    this.pool.subscription(this.activeRelays, filters)
      .pipe(mapEventsToStore(eventStore))
      .subscribe();
  }
}
```

### Pattern: Relay Health Monitoring

```typescript
class RelayHealthMonitor {
  private pool = new RelayPool();
  private health = new Map<string, {
    failures: number;
    lastSuccess: number;
    blacklisted: boolean;
  }>();

  async testRelay(url: string): Promise<boolean> {
    try {
      const relay = this.pool.relay(url);

      // Try a simple count query with timeout
      const response = await lastValueFrom(
        relay.count({ kinds: [1], limit: 1 }).pipe(
          timeout(5000),
        ),
      );

      this.recordSuccess(url);
      return true;
    } catch (err) {
      this.recordFailure(url);
      return false;
    }
  }

  private recordSuccess(url: string) {
    const current = this.health.get(url) || {
      failures: 0,
      lastSuccess: Date.now(),
      blacklisted: false,
    };

    this.health.set(url, {
      failures: 0,
      lastSuccess: Date.now(),
      blacklisted: false,
    });
  }

  private recordFailure(url: string) {
    const current = this.health.get(url) || {
      failures: 0,
      lastSuccess: 0,
      blacklisted: false,
    };

    const failures = current.failures + 1;

    this.health.set(url, {
      failures,
      lastSuccess: current.lastSuccess,
      blacklisted: failures >= 3, // Blacklist after 3 failures
    });
  }

  getHealthyRelays(relays: string[]): string[] {
    return relays.filter((url) => {
      const health = this.health.get(url);
      return !health?.blacklisted;
    });
  }
}
```

### Pattern: Relay Group Management

```typescript
class RelayGroupManager {
  private pool = new RelayPool();

  // Define relay groups by purpose
  private groups = {
    personal: pool.group([
      "wss://my-relay.com",
      "wss://backup.com",
    ]),

    public: pool.group([
      "wss://relay.damus.io",
      "wss://relay.nostr.band",
      "wss://nos.lol",
    ]),

    paid: pool.group([
      "wss://paid-relay.com",
      "wss://premium-relay.com",
    ]),
  };

  // Publish to all groups
  async broadcastEvent(event: NostrEvent) {
    const results = await Promise.allSettled([
      this.groups.personal.publish(event),
      this.groups.public.publish(event),
      this.groups.paid.publish(event),
    ]);

    return results.map((result, i) => ({
      group: Object.keys(this.groups)[i],
      success: result.status === "fulfilled",
      responses: result.status === "fulfilled" ? result.value : [],
    }));
  }

  // Subscribe to specific group
  subscribeToGroup(groupName: keyof typeof this.groups, filters: Filter) {
    return this.groups[groupName].subscription(filters);
  }
}
```

### Pattern: Multi-Relay Negentropy Sync

```typescript
async function syncWithMultipleRelays(
  relays: string[],
  store: EventStore,
  filters: Filter,
) {
  const results: Array<{ relay: string; synced: number }> = [];

  // Track events synced from each relay
  let totalSynced = 0;

  pool.sync(relays, store, filters, "down")
    .pipe(
      tap((event) => {
        totalSynced++;
        console.log(`Synced ${totalSynced} events so far...`);
      }),
    )
    .subscribe({
      complete: () => {
        console.log(
          `Total synced: ${totalSynced} events from ${relays.length} relays`,
        );
      },
    });
}
```

### Pattern: Using completeOnEose for One-Time Queries

```typescript
import { completeOnEose } from "applesauce-relay/operators";
import { lastValueFrom, toArray } from "rxjs";

// Fetch all events and complete
async function fetchEvents(relay: Relay, filters: Filter) {
  const events = await lastValueFrom(
    relay.req(filters).pipe(
      completeOnEose(), // Complete on EOSE, filter out EOSE
      toArray(),
    ),
  );

  return events;
}

// Or with explicit EOSE handling
relay.req({ kinds: [1], limit: 50 })
  .pipe(completeOnEose(true)) // Include EOSE marker
  .subscribe({
    next: (response) => {
      if (response === "EOSE") {
        console.log("Finished loading stored events");
      } else {
        processEvent(response);
      }
    },
    complete: () => console.log("Query completed"),
  });
```

### Pattern: Controlling Pool Behavior

```typescript
const pool = new RelayPool({
  // Set generous timeouts for slow relays
  eoseTimeout: 30000,
  eventTimeout: 30000,
  keepAlive: 120000,

  // Enable ping for better connection monitoring
  enablePing: true,
  pingFrequency: 30000,
});

// Control offline relay behavior
pool.ignoreOffline = false; // Include offline relays

// Monitor pool changes
pool.relays$.subscribe((relaysMap) => {
  const online = Array.from(relaysMap.values())
    .filter((r) => r.connected);
  console.log(`${online.length}/${relaysMap.size} relays online`);
});

pool.add$.subscribe((relay) => {
  console.log(`New relay added: ${relay.url}`);

  // Set up monitoring for new relay
  relay.error$.subscribe((error) => {
    if (error) {
      console.error(`Relay ${relay.url} error:`, error);
    }
  });
});
```

### Pattern: Remove Relay from Pool

```typescript
// Remove and close connection
pool.remove("wss://relay.example.com", true);

// Remove but keep connection alive
pool.remove("wss://relay.example.com", false);

// Remove by relay instance
const relay = pool.relay("wss://relay.example.com");
pool.remove(relay, true);
```

## Event Store Integration

### Pattern: Fetch Multiple Event Types

```typescript
export const handler = define.handlers(async (ctx) => {
  const relay = pool.relay(ctx.state.relay);

  // Fetch in parallel
  await Promise.all([
    lastValueFrom(
      relay.request({ kinds: [1], limit: 50 }).pipe(
        mapEventsToStore(eventStore),
      ),
    ),
    lastValueFrom(
      relay.request({ kinds: [0], limit: 100 }).pipe(
        mapEventsToStore(eventStore),
      ),
    ),
    lastValueFrom(
      relay.request({ kinds: [3], authors: [userPubkey] }).pipe(
        mapEventsToStore(eventStore),
      ),
    ),
  ]);

  return page({});
});
```

### Pattern: Query with RxJS Operators

```typescript
import { filter, map, take } from "rxjs";

// Filter and transform events
relay.request({ kinds: [1], limit: 100 })
  .pipe(
    filter((event) => event.content.includes("nostr")),
    map((event) => ({
      id: event.id,
      content: event.content.slice(0, 100),
      timestamp: event.created_at,
    })),
    take(10),
    mapEventsToStore(eventStore),
  )
  .subscribe(/* ... */);
```

## Authentication Patterns

### Pattern: Automatic Auth with Fallback

```typescript
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";

export default function AuthenticatedIsland({ relay }: { relay: string }) {
  const authStatus = useSignal<"pending" | "authenticated" | "failed">(
    "pending",
  );

  useEffect(() => {
    const relayInstance = pool.relay(relay);

    const sub = relayInstance.challenge$.subscribe(async (challenge) => {
      if (!challenge) return;

      try {
        if (window.nostr) {
          await relayInstance.authenticate(window.nostr);
          authStatus.value = "authenticated";
        } else {
          console.warn("No signer available");
          authStatus.value = "failed";
        }
      } catch (err) {
        console.error("Auth failed:", err);
        authStatus.value = "failed";
      }
    });

    return () => sub.unsubscribe();
  }, [relay]);

  if (authStatus.value === "pending") {
    return <div>Authenticating...</div>;
  }

  if (authStatus.value === "failed") {
    return <div>Authentication required but failed</div>;
  }

  return <div>Authenticated content here</div>;
}
```

### Pattern: Check Auth Requirements

```typescript
const relay = pool.relay("wss://relay.example.com");

// Check if auth is required
const authRequired = await new Promise<boolean>((resolve) => {
  const sub = relay.authRequiredForRead$.subscribe((required) => {
    resolve(required);
    sub.unsubscribe();
  });
});

if (authRequired) {
  // Handle authentication
  await relay.authenticate(signer);
}

// Now proceed with request
const events = await lastValueFrom(
  relay.request({ kinds: [1] }).pipe(toArray()),
);
```

## Subscription Patterns

### Pattern: Infinite Reconnection

```typescript
// For critical subscriptions that must never die
relay.subscription(
  { kinds: [1], authors: [myPubkey] },
  {
    id: "my-feed",
    reconnect: Infinity, // Infinite reconnection
    resubscribe: Infinity, // Infinite resubscribe
  },
).subscribe({
  next: (response) => {
    if (response !== "EOSE") {
      handleEvent(response);
    }
  },
  error: (err) => {
    // This should rarely happen with Infinity reconnect
    console.error("Fatal subscription error:", err);
  },
});
```

### Pattern: Time-Limited Subscription

```typescript
import { takeUntil, timer } from "rxjs";

// Subscribe for 5 minutes then stop
relay.subscription({ kinds: [1] })
  .pipe(
    takeUntil(timer(5 * 60 * 1000)),
  )
  .subscribe({
    next: (response) => handleEvent(response),
    complete: () => console.log("Subscription ended after 5 minutes"),
  });
```

### Pattern: Filter-Updating Subscription

```typescript
import { BehaviorSubject, switchMap } from "rxjs";

const filters$ = new BehaviorSubject({
  kinds: [1],
  limit: 20,
});

// Subscription automatically updates when filters change
filters$.pipe(
  switchMap((filters) => relay.subscription(filters, { id: "dynamic-feed" })),
).subscribe((response) => {
  if (response !== "EOSE") {
    console.log("Event:", response);
  }
});

// Update filters
setTimeout(() => {
  filters$.next({
    kinds: [1],
    "#t": ["bitcoin"],
    limit: 20,
  });
}, 5000);
```

### Pattern: Multiple Relay Subscription

```typescript
import { merge } from "rxjs";

const relays = [
  "wss://relay1.example.com",
  "wss://relay2.example.com",
  "wss://relay3.example.com",
];

// Subscribe to same filter on multiple relays
merge(
  ...relays.map((url) =>
    pool.relay(url).subscription({ kinds: [1], limit: 10 })
  ),
).pipe(
  mapEventsToStore(eventStore),
).subscribe();
```

## Error Handling

### Pattern: Graceful Degradation

```typescript
import { catchError, of, retry } from "rxjs";

relay.request({ kinds: [1], limit: 50 })
  .pipe(
    retry({ count: 3, delay: 1000 }),
    catchError((err) => {
      console.error("Failed to fetch events:", err);
      // Return empty array instead of erroring
      return of([]);
    }),
    mapEventsToStore(eventStore),
  )
  .subscribe({
    complete: () => console.log("Request completed"),
  });
```

### Pattern: Connection State Monitoring

```typescript
export default function RelayMonitor({ relay }: { relay: string }) {
  const connected = useSignal(false);
  const error = useSignal<Error | null>(null);
  const attempts = useSignal(0);

  useEffect(() => {
    const relayInstance = pool.relay(relay);

    const subs = [
      relayInstance.connected$.subscribe((c) => connected.value = c),
      relayInstance.error$.subscribe((e) => error.value = e),
      relayInstance.attempts$.subscribe((a) => attempts.value = a),
    ];

    return () => subs.forEach((s) => s.unsubscribe());
  }, [relay]);

  return (
    <div>
      <div>Connected: {connected.value ? "✓" : "✗"}</div>
      <div>Attempts: {attempts.value}</div>
      {error.value && <div>Error: {error.value.message}</div>}
    </div>
  );
}
```

## Performance Optimization

### Pattern: Debounced Subscriptions

```typescript
import { debounceTime, distinctUntilChanged } from "rxjs";

// Only process events every 500ms
relay.subscription({ kinds: [1] })
  .pipe(
    debounceTime(500),
    distinctUntilChanged((a, b) =>
      a === "EOSE" || b === "EOSE" ? false : a.id === b.id
    ),
    mapEventsToStore(eventStore),
  )
  .subscribe();
```

### Pattern: Batch Event Processing

```typescript
import { bufferTime, filter } from "rxjs";

// Process events in batches every 2 seconds
relay.subscription({ kinds: [1] })
  .pipe(
    filter((response) => response !== "EOSE"),
    bufferTime(2000),
    filter((batch) => batch.length > 0),
  )
  .subscribe((events) => {
    console.log(`Processing ${events.length} events`);
    events.forEach((event) => eventStore.add(event));
  });
```

### Pattern: Lazy Relay Connection

```typescript
// Only connect when actually subscribing
function createLazyRelay(url: string) {
  let relay: Relay | null = null;

  return {
    subscribe(filters: Filter) {
      if (!relay) {
        relay = pool.relay(url);
      }
      return relay.subscription(filters);
    },

    disconnect() {
      if (relay) {
        relay.close();
        relay = null;
      }
    },
  };
}
```

### Pattern: Connection Pooling

```typescript
// Reuse connections efficiently
class RelayManager {
  private pool = new RelayPool();
  private subscriptions = new Map<string, Subscription>();

  subscribe(relayUrl: string, filters: Filter, id: string) {
    // Reuse existing subscription if filters match
    const existingId = `${relayUrl}-${JSON.stringify(filters)}`;

    if (this.subscriptions.has(existingId)) {
      return this.subscriptions.get(existingId)!;
    }

    const sub = this.pool.relay(relayUrl)
      .subscription(filters, { id })
      .subscribe(/* ... */);

    this.subscriptions.set(existingId, sub);
    return sub;
  }

  cleanup() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }
}
```

## Advanced Patterns

### Pattern: Event Deduplication

```typescript
import { distinctUntilKeyChanged } from "rxjs";

relay.subscription({ kinds: [1] })
  .pipe(
    filter((response) => response !== "EOSE"),
    distinctUntilKeyChanged("id"),
    mapEventsToStore(eventStore),
  )
  .subscribe();
```

### Pattern: Priority Relay Selection

```typescript
const relays = [
  { url: "wss://fast-relay.com", priority: 1 },
  { url: "wss://backup-relay.com", priority: 2 },
  { url: "wss://fallback-relay.com", priority: 3 },
];

async function fetchWithPriority(filters: Filter) {
  for (const { url } of relays.sort((a, b) => a.priority - b.priority)) {
    try {
      const events = await lastValueFrom(
        pool.relay(url)
          .request(filters)
          .pipe(toArray(), timeout(5000)),
      );

      if (events.length > 0) {
        return events;
      }
    } catch (err) {
      console.warn(`Relay ${url} failed, trying next...`);
    }
  }

  throw new Error("All relays failed");
}
```

### Pattern: Smart Caching

```typescript
class EventCache {
  private cache = new Map<
    string,
    { events: NostrEvent[]; timestamp: number }
  >();
  private ttl = 5 * 60 * 1000; // 5 minutes

  async getOrFetch(relay: Relay, filters: Filter): Promise<NostrEvent[]> {
    const key = JSON.stringify(filters);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.events;
    }

    const events = await lastValueFrom(
      relay.request(filters).pipe(toArray()),
    );

    this.cache.set(key, { events, timestamp: Date.now() });
    return events;
  }

  clear() {
    this.cache.clear();
  }
}
```
