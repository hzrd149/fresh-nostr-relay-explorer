---
name: applesauce-relay
description: Working with Nostr relays using the applesauce-relay library. Use when implementing Nostr relay connections, subscriptions, event publishing, relay information fetching, or any Nostr protocol operations. Covers Relay class usage, observable patterns, NIP-42 authentication, persistent subscriptions, relay pool management, and proper RxJS integration patterns.
---

# Applesauce-Relay

Guide for working with Nostr relays using the applesauce-relay library.

## Quick Start

### Single Relay

```typescript
import { Relay } from "applesauce-relay";

const relay = new Relay("wss://relay.example.com");

// Query events
relay.request({ kinds: [1], limit: 10 })
  .subscribe((event) => console.log(event));

// Publish event
const response = await relay.publish(event);
```

### Relay Pool (Recommended)

```typescript
import { RelayPool } from "applesauce-relay/pool";

const pool = new RelayPool();
const relays = ["wss://relay1.com", "wss://relay2.com"];

// Query multiple relays (auto-deduplicates)
pool.request(relays, { kinds: [1], limit: 10 })
  .subscribe((event) => console.log(event));

// Publish to multiple relays
const responses = await pool.publish(relays, event);
```

## Core Concepts

### Relay vs RelayPool

**Relay**: Single relay connection

- Use for: Direct operations, testing, fine-grained control
- Import: `import { Relay } from "applesauce-relay"`

**RelayPool**: Multiple relay manager

- Use for: Most applications (recommended)
- Automatic deduplication and connection management
- Import: `import { RelayPool } from "applesauce-relay/pool"`

### Observable Patterns

**Server-side (Fresh handlers)**:

```typescript
import { lastValueFrom } from "rxjs";

await lastValueFrom(
  relay.request({ kinds: [1] }).pipe(mapEventsToStore(eventStore)),
);
```

**Client-side (Islands)**:

```typescript
// Subscribe to live updates
useSubscription(
  () =>
    relay.subscription({ kinds: [1] }).pipe(
      mapEventsToStore(eventStore),
    ),
  [relay],
);

// Get reactive values
const notes = use$(() => eventStore.timeline({ kinds: [1] }), []);
```

## Common Operations

### Fetching Events

**One-time request**:

```typescript
// Server-side (IMPORTANT: Use defaultValue to prevent "no elements in sequence" error)
const events = await lastValueFrom(
  relay.request({ kinds: [1], limit: 50 }).pipe(
    mapEventsToStore(eventStore),
  ),
  { defaultValue: null }, // Always provide default for empty results
);

// Client-side
relay.request({ kinds: [1] }).subscribe((event) => console.log(event));
```

**Loading single events by pointer** (EventPointer/AddressPointer):

```typescript
import { simpleTimeout } from "applesauce-core";
import { normalizeToEventPointer } from "applesauce-core/helpers";
import { filter, take } from "rxjs";

// Decode nip-19 identifier
const eventPointer = normalizeToEventPointer(nevent);

// Use eventStore.event() - triggers eventLoader automatically
const note = await lastValueFrom(
  eventStore.event(eventPointer).pipe(
    castEventStream(Note, eventStore),
    filter((e) => e !== undefined), // Wait for event to load
    take(1), // Take first value
    simpleTimeout(5000, "Timeout loading event"), // Prevent hanging
  ),
  { defaultValue: undefined }, // Fallback if timeout
);
```

**Why this pattern?**

- `eventStore.event(pointer)` emits `undefined` initially, then the event when
  loaded
- The configured `eventLoader` automatically fetches from relays using pointer
  hints
- `filter(e => e !== undefined)` waits for actual event (skips initial
  undefined)
- `simpleTimeout()` prevents hanging if event isn't found
- Always use `defaultValue` to handle empty/timeout cases

**Persistent subscription**:

```typescript
relay.subscription({ kinds: [1] }, {
  reconnect: Infinity, // Auto-reconnect forever
  resubscribe: 5, // Resubscribe 5 times if closed
}).subscribe((response) => {
  if (response === "EOSE") {
    console.log("End of stored events");
  } else {
    console.log("Event:", response);
  }
});
```

### Publishing Events

```typescript
// Simple publish with retries
const response = await relay.publish(event);
console.log(`Published: ${response.ok}`, response.message);

// Publish to multiple relays
const responses = await pool.publish(relays, event);
responses.forEach((r) => console.log(`${r.from}: ${r.ok ? "✓" : "✗"}`));
```

### Fetching Relay Info

**Server-side (recommended)**:

```typescript
export const handler = define.handlers(async (ctx) => {
  const relay = pool.relay(ctx.state.relay);

  const information = await relay.getInformation();
  const supported = await relay.getSupported();
  const limitations = await relay.getLimitations();

  return page({ relayInfo: { ...information, supported, limitations } });
});
```

**Client-side**:

```typescript
relay.information$.subscribe((info) => {
  if (info) console.log("Relay name:", info.name);
});

relay.supported$.subscribe((nips) => {
  if (nips?.includes(77)) console.log("Supports Negentropy");
});
```

## Fresh Framework Integration

### Server-Side Pattern

```typescript
// routes/notes.tsx
export const handler = define.handlers(async (ctx) => {
  await lastValueFrom(
    pool.relay(ctx.state.relay)
      .request({ kinds: [1], limit: 50 })
      .pipe(mapEventsToStore(eventStore)),
  );

  return page({});
});
```

### Client-Side Pattern

```typescript
// islands/NoteFeed.tsx
export default function NoteFeed({ relay }: { relay: string }) {
  // Subscribe to live updates
  useSubscription(
    () =>
      pool.relay(relay)
        .subscription({ kinds: [1] })
        .pipe(mapEventsToStore(eventStore)),
    [relay],
  );

  // Get reactive values
  const notes = use$(
    () => eventStore.timeline({ kinds: [1] }),
    [],
  );

  return <div>{/* Render notes */}</div>;
}
```

## Multi-Relay Operations

### Querying Multiple Relays

```typescript
const relays = ["wss://relay1.com", "wss://relay2.com"];

// Auto-deduplicated request
pool.request(relays, { kinds: [1], limit: 50 })
  .subscribe((event) => console.log(event));

// Persistent subscription
pool.subscription(relays, { kinds: [1] }, {
  id: "multi-feed",
  reconnect: Infinity,
}).subscribe((response) => console.log(response));
```

### Publishing to Multiple Relays

```typescript
const responses = await pool.publish(relays, event);

responses.forEach((response) => {
  console.log(`${response.from}: ${response.ok ? "✓" : "✗"}`);
  if (!response.ok) {
    console.log(`Error: ${response.message}`);
  }
});
```

### Advanced: Relay-Specific Filters

```typescript
const filterMap = {
  "wss://notes-relay.com": { kinds: [1], limit: 100 },
  "wss://media-relay.com": { kinds: [1063], limit: 50 },
};

pool.subscriptionMap(filterMap)
  .subscribe((response) => console.log(response));
```

### Advanced: Outbox Model (NIP-65)

```typescript
import { createOutboxMap } from "applesauce-core/helpers/relay-selection";

const outboxMap = createOutboxMap(userProfiles);

pool.outboxSubscription(outboxMap, {
  kinds: [1],
  since: unixNow() - 86400,
}).subscribe((response) => console.log(response));
```

## Authentication (NIP-42)

```typescript
// Listen for auth challenges
relay.challenge$.subscribe((challenge) => {
  if (!challenge) return;

  relay.authenticate(window.nostr)
    .then(() => console.log("Authenticated"))
    .catch((err) => console.error("Auth failed:", err));
});

// Check auth state
relay.authenticated$.subscribe((authenticated) => {
  console.log("Authenticated:", authenticated);
});
```

## RxJS Operators

```typescript
import { completeOnEose, onlyEvents } from "applesauce-relay/operators";

// Filter out EOSE markers
relay.subscription({ kinds: [1] })
  .pipe(onlyEvents())
  .subscribe((event) => console.log(event));

// Complete when EOSE received
relay.req({ kinds: [1] })
  .pipe(completeOnEose())
  .subscribe({
    next: (event) => console.log(event),
    complete: () => console.log("EOSE received"),
  });
```

## Configuration

```typescript
// Single relay with options
const relay = new Relay("wss://relay.example.com", {
  eoseTimeout: 15000,
  keepAlive: 60000,
  enablePing: true,
});

// Pool with default options for all relays
const pool = new RelayPool({
  eoseTimeout: 15000,
  keepAlive: 60000,
});

// Control offline relay behavior
pool.ignoreOffline = false; // Include offline relays
```

## Best Practices

1. **Use RelayPool for most applications** - Better connection management
2. **Server-side**: Use `request()` + `lastValueFrom()` for initial data
3. **Client-side**: Use `subscription()` for live updates
4. **Always pipe through `mapEventsToStore()`** - Centralized event storage
5. **Use `useSubscription()` for live, `use$()` for reactive values**
6. **Fetch relay info server-side** - Use `getInformation()` in handlers
7. **Handle auth challenges early** - Subscribe to `challenge$` at startup
8. **Use `publish()` not `event()`** - Automatic retries and reconnection
9. **CRITICAL: Always use `defaultValue` with `lastValueFrom()`** - Prevents "no
   elements in sequence" errors
10. **For single events: Use `eventStore.event()` with `filter()` and
    `simpleTimeout()`** - Don't manually fetch then query

## Detailed Documentation

For comprehensive information, see the reference files:

- **[references/api-complete.md](references/api-complete.md)** - Complete API
  reference
  - All Relay class methods and properties
  - All RelayPool class methods and properties
  - RelayGroup class documentation
  - Complete type definitions
  - All operators with type signatures

- **[references/patterns.md](references/patterns.md)** - Advanced patterns and
  examples
  - Fresh framework integration examples
  - Multi-relay patterns
  - Event store integration
  - Authentication patterns
  - Error handling
  - Performance optimization

## Troubleshooting

**"no elements in sequence" error**:

- **Cause**: `lastValueFrom()` called on observable that completes without
  emitting
- **Fix**: Always provide `{ defaultValue: <value> }` as second parameter
- **When**: Any `pool.request()`, profile fetches, or queries that might return
  0 results

```typescript
// ❌ BAD - throws error if no events
await lastValueFrom(pool.request(relays, { kinds: [0] }));

// ✅ GOOD - returns null if no events
await lastValueFrom(
  pool.request(relays, { kinds: [0] }).pipe(mapEventsToStore(eventStore)),
  { defaultValue: null },
);
```

**Events not showing up**:

- Ensure `mapEventsToStore(eventStore)` is in pipeline
- Check that `useSubscription()` is called (doesn't return values)
- Verify filters are correct

**Type errors with ctx.data**:

- Use `define.page<typeof handler>()` pattern
- Ensure handler returns `page({ data })`

**Connection issues**:

- Check `relay.connected$` and `relay.error$`
- Verify relay URL format (wss:// or ws://)
- Check browser console for WebSocket errors

**Authentication failures**:

- Subscribe to `challenge$` before operations
- Check `authRequiredForRead$` and `authRequiredForPublish$`
- Verify signer (window.nostr) is available

**Event not loading by pointer**:

- Use `eventStore.event(pointer)` not manual `pool.request()`
- Add `filter(e => e !== undefined)` to wait for load
- Use `simpleTimeout()` to prevent infinite waiting
- Verify eventLoader is configured with lookup relays
