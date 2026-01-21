# Detailed Guides

Comprehensive guides for specific applesauce-relay features.

## Table of Contents

- [Relay Pool Operations](#relay-pool-operations)
- [Observable Properties](#observable-properties)
- [Configuration Options](#configuration-options)
- [Advanced Features](#advanced-features)

## Relay Pool Operations

### Request (Query with Auto-Deduplication)

```typescript
// Fetch from multiple relays, automatically deduplicated
pool.request(relays, { kinds: [1], limit: 50 }, {
  retries: 2,
  timeout: 5000,
}).subscribe({
  next: (event) => console.log("Received event:", event.id),
  complete: () => console.log("Request complete"),
});

// Server-side usage
const events = await lastValueFrom(
  pool.request(relays, { kinds: [1], limit: 50 }).pipe(
    toArray(),
    mapEventsToStore(eventStore),
  ),
);
```

### Subscription (Persistent Multi-Relay)

```typescript
// Subscribe to multiple relays with auto-reconnect
pool.subscription(relays, { kinds: [1, 7], "#t": ["nostr"] }, {
  id: "multi-relay-feed",
  reconnect: Infinity, // Reconnect forever
  resubscribe: 5, // Resubscribe 5 times if closed
}).subscribe({
  next: (response) => {
    if (response === "EOSE") {
      console.log("End of stored events from all relays");
    } else {
      console.log("Event:", response);
    }
  },
});
```

### REQ (Low-Level Multi-Relay)

```typescript
// Send REQ to multiple relays (no deduplication)
pool.req(relays, { kinds: [1], limit: 10 })
  .subscribe({
    next: (response) => {
      if (response === "EOSE") {
        console.log("EOSE from all relays");
      } else {
        console.log("Event:", response);
      }
    },
  });
```

**Note:** `req()` does NOT deduplicate events. Use `request()` or
`subscription()` for automatic deduplication.

### Counting Events

```typescript
pool.count(relays, { kinds: [1], authors: [pubkey] })
  .subscribe((counts) => {
    // counts is Record<string, CountResponse>
    Object.entries(counts).forEach(([relay, response]) => {
      console.log(`${relay}: ${response.count} events`);
    });
  });
```

### Negentropy Sync Across Relays

```typescript
pool.sync(
  relays,
  eventStore,
  { kinds: [1], authors: [pubkey] },
  "down", // or "up" or "both" (default)
).subscribe({
  next: (event) => console.log("Synced event:", event),
  complete: () => console.log("Sync complete with all relays"),
});
```

### Relay Groups

```typescript
const group = pool.group([
  "wss://relay1.example.com",
  "wss://relay2.example.com",
]);

// Use group like individual relay
group.req({ kinds: [1] }).subscribe(console.log);
group.event(event).subscribe(console.log);
group.publish(event).then((responses) => console.log(responses));
group.request({ kinds: [1] }).subscribe(console.log);
group.subscription({ kinds: [1] }).subscribe(console.log);
```

### Pool Observables

```typescript
// Track all relays in pool
pool.relays$.subscribe((relaysMap) => {
  console.log("Relays:", Array.from(relaysMap.keys()));
});

// Listen for relay additions
pool.add$.subscribe((relay) => {
  console.log("Relay added:", relay.url);
});

// Listen for relay removals
pool.remove$.subscribe((relay) => {
  console.log("Relay removed:", relay.url);
});
```

## Observable Properties

### Connection State

- `connected$` - Boolean connection status
- `ready$` - Whether relay is ready for operations
- `attempts$` - Number of reconnection attempts
- `error$` - Last connection error
- `open$` - Emits when websocket opens
- `close$` - Emits when websocket closes
- `closing$` - Emits when closing due to unsubscription

### Authentication

- `challenge$` - Auth challenge from relay
- `authenticated$` - Boolean auth state
- `authenticationResponse$` - Last auth response
- `authRequiredForRead$` - Whether auth required for reading
- `authRequiredForPublish$` - Whether auth required for publishing

### Relay Information

- `information$` - NIP-11 information document
- `supported$` - Array of supported NIPs
- `limitations$` - Relay limitations object
- `icon$` - Relay icon URL or favicon.ico URL

### Messages

- `message$` - All messages from relay
- `notice$` - NOTICE messages only
- `notices$` - Array of all notices received

## Configuration Options

### Relay Constructor Options

```typescript
const relay = new Relay("wss://relay.example.com", {
  // Timeouts (milliseconds)
  eoseTimeout: 10000, // EOSE timeout (default 10s)
  eventTimeout: 10000, // OK message timeout (default 10s)
  publishTimeout: 30000, // Publish timeout (default 30s)
  keepAlive: 30000, // Keep connection alive (default 30s)

  // Ping settings
  enablePing: false, // Enable ping (default false)
  pingFrequency: 29000, // Ping frequency (default 29s)
  pingTimeout: 20000, // Ping timeout (default 20s)

  // Custom reconnect timer
  reconnectTimer: (error, attempts) => {
    return timer(Math.min(1000 * Math.pow(2, attempts), 30000));
  },
});
```

### Subscription Options

```typescript
relay.subscription(
  { kinds: [1] },
  {
    id: "my-sub", // Subscription ID
    reconnect: 10, // Number of reconnection attempts
    // or: reconnect: Infinity  // Infinite reconnection
    // or: reconnect: { count: 10, delay: 2000 }

    resubscribe: 5, // Resubscribe attempts on CLOSE
    // or: resubscribe: { count: 5, delay: 1000 }
  },
);
```

### RelayPool Constructor Options

```typescript
const pool = new RelayPool({
  // Same options as Relay constructor
  eoseTimeout: 15000,
  keepAlive: 60000,
  enablePing: true,
});

// Control offline relay behavior
pool.ignoreOffline = false; // Include offline relays (default: true)
```

## Advanced Features

### Dynamic Filters

```typescript
import { BehaviorSubject } from "rxjs";
import { onlyEvents } from "applesauce-relay/operators";

const filters = new BehaviorSubject({
  kinds: [1],
  limit: 20,
});

relay.req(filters)
  .pipe(onlyEvents())
  .subscribe((event) => console.log(event.content));

// Update filters later
setTimeout(() => {
  filters.next({
    kinds: [1],
    "#t": ["nostr"],
    limit: 20,
  });
}, 5000);
```

### Counting Events (NIP-45)

```typescript
import { lastValueFrom } from "rxjs";

// Simple count
relay.count({ kinds: [1], authors: [pubkey] })
  .subscribe((response) => {
    console.log(`Found ${response.count} events`);
  });

// Or with async/await
const response = await lastValueFrom(
  relay.count({ kinds: [1] }),
);
console.log(`Total events: ${response.count}`);
```

### Negentropy Sync (NIP-77)

```typescript
import { SyncDirection } from "applesauce-relay";

// Bidirectional sync (default)
relay.sync(eventStore, { kinds: [1], authors: [pubkey] })
  .subscribe({
    next: (event) => console.log("Received event:", event),
    complete: () => console.log("Sync complete"),
  });

// Download only
relay.sync(eventStore, { kinds: [1] }, SyncDirection.RECEIVE)
  .subscribe((event) => console.log("Downloaded:", event));

// Upload only
relay.sync(eventStore, { kinds: [1] }, SyncDirection.SEND)
  .subscribe({
    complete: () => console.log("Upload complete"),
  });
```

### Manual Authentication

```typescript
import { makeAuthEvent } from "nostr-tools/nip42";

relay.challenge$.subscribe(async (challenge) => {
  if (!challenge) return;

  const auth = await window.nostr.signEvent(
    makeAuthEvent(relay.url, challenge),
  );

  relay.auth(auth).subscribe({
    next: (response) => console.log("Auth response:", response),
    error: (err) => console.error("Auth failed:", err),
  });
});
```

### Monitoring Connection State

```typescript
// Connection status
relay.connected$.subscribe((connected) => {
  console.log("Connected:", connected);
});

// Connection attempts
relay.attempts$.subscribe((attempts) => {
  console.log("Reconnection attempts:", attempts);
});

// Connection errors
relay.error$.subscribe((error) => {
  if (error) console.error("Connection error:", error);
});

// WebSocket events
relay.open$.subscribe((event) => {
  console.log("WebSocket opened");
});

relay.close$.subscribe((event) => {
  console.log("WebSocket closed:", event.code, event.reason);
});
```

### Relay Notices

```typescript
// All notices
relay.notices$.subscribe((notices) => {
  console.log("All notices:", notices);
});

// Individual notice messages
relay.notice$.subscribe((notice) => {
  console.log("New notice:", notice);
});

// Access current notices synchronously
const currentNotices = relay.notices;
```
