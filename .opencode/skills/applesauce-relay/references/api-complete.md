# Complete API Reference

Comprehensive API documentation for applesauce-relay.

## Table of Contents
- [Relay Class](#relay-class)
- [RelayPool Class](#relaypool-class)
- [Observable Properties](#observable-properties)
- [Methods](#methods)
- [Types](#types)
- [Operators](#operators)

## Relay Class

### Constructor

```typescript
new Relay(url: string, opts?: RelayOptions): Relay
```

**Parameters:**
- `url` - WebSocket URL (must start with wss:// or ws://)
- `opts` - Optional configuration object

**RelayOptions:**
```typescript
interface RelayOptions {
  eoseTimeout?: number;       // EOSE timeout in ms (default: 10000)
  eventTimeout?: number;      // Event timeout in ms (default: 10000)
  publishTimeout?: number;    // Publish timeout in ms (default: 30000)
  keepAlive?: number;         // Keep-alive duration in ms (default: 30000)
  enablePing?: boolean;       // Enable ping (default: false)
  pingFrequency?: number;     // Ping frequency in ms (default: 29000)
  pingTimeout?: number;       // Ping timeout in ms (default: 20000)
  reconnectTimer?: (error: Error | CloseEvent, attempts: number) => Observable<number>;
}
```

### Observable Properties

#### Connection State

**`connected$: BehaviorSubject<boolean>`**
- Current connection status
- Emits `true` when connected, `false` when disconnected

**`ready$: Observable<boolean>`**
- Whether relay is ready for operations
- Setting to false causes operations to hang until ready

**`attempts$: BehaviorSubject<number>`**
- Number of reconnection attempts made
- Resets to 0 on successful connection

**`error$: BehaviorSubject<Error | null>`**
- Last connection error
- `null` when no error

**`open$: Subject<Event>`**
- Emits when WebSocket connection opens
- Emits native WebSocket Event

**`close$: Subject<CloseEvent>`**
- Emits when WebSocket connection closes
- Emits native CloseEvent

**`closing$: Subject<void>`**
- Emits when closing due to unsubscription
- Indicates graceful shutdown

#### Authentication

**`challenge$: BehaviorSubject<string | null>`**
- Authentication challenge from relay (NIP-42)
- `null` when no challenge

**`authenticated$: Observable<boolean>`**
- Current authentication state
- `false` if auth failed

**`authenticationResponse$: BehaviorSubject<PublishResponse | null>`**
- Response from last AUTH message
- Contains ok/message from relay

**`authRequiredForRead$: Observable<boolean>`**
- Whether authentication required for reading events
- Derived from relay limitations

**`authRequiredForPublish$: Observable<boolean>`**
- Whether authentication required for publishing
- Derived from relay limitations

#### Relay Information

**`information$: Observable<RelayInformation | null>`**
- NIP-11 information document
- Contains name, description, supported_nips, etc.

**`supported$: Observable<number[] | null>`**
- Array of supported NIP numbers
- Extracted from information document

**`limitations$: Observable<Partial<Limitations> | null | undefined>`**
- Relay limitations from NIP-11
- Contains max_message_length, max_subscriptions, etc.

**`icon$: Observable<string | undefined>`**
- Relay icon URL or favicon.ico URL
- Extracted from information document

#### Messages

**`message$: Observable<any>`**
- Passive observable of all relay messages
- Does not trigger connection
- Raw relay protocol messages

**`notice$: Observable<string>`**
- Passive observable of NOTICE messages
- Does not trigger connection
- Individual notice messages

**`notices$: BehaviorSubject<string[]>`**
- Array of all notices received
- Accumulated throughout connection lifetime

### Methods

#### Connection Management

**`close(): void`**
- Force close the relay connection
- Completes all active subscriptions
- Triggers `close$` observable

#### Information Retrieval

**`getInformation(): Promise<RelayInformation | null>`**
- Async method to get NIP-11 information document
- Returns promise that resolves to relay info

**`getSupported(): Promise<number[] | null>`**
- Async method to get supported NIPs array
- Returns promise that resolves to NIP numbers

**`getLimitations(): Promise<Partial<Limitations> | null | undefined>`**
- Async method to get relay limitations
- Returns promise that resolves to limitations object

#### Event Queries

**`req(filters: FilterInput, id?: string): Observable<SubscriptionResponse>`**
- Create REQ observable
- Emits events or "EOSE"
- Completes on connection close or error

**Parameters:**
- `filters` - Filter object or Observable<Filter | Filter[]>
- `id` - Optional subscription ID

**Returns:** Observable that emits:
- `NostrEvent` - Individual events
- `"EOSE"` - End of stored events marker

**`request(filters: FilterInput, opts?: SubscriptionOptions): Observable<NostrEvent>`**
- One-time request that completes on EOSE
- Automatically retries on errors
- Filters out EOSE markers

**Parameters:**
- `filters` - Filter object or Observable<Filter | Filter[]>
- `opts` - Optional subscription options

**Returns:** Observable of NostrEvent only

**`subscription(filters: FilterInput, opts?: SubscriptionOptions): Observable<SubscriptionResponse>`**
- Persistent subscription with auto-reconnect
- Retries on connection errors
- Resubscribes on relay CLOSE

**Parameters:**
- `filters` - Filter object or Observable<Filter | Filter[]>
- `opts` - Subscription options (id, reconnect, resubscribe)

**SubscriptionOptions:**
```typescript
interface SubscriptionOptions {
  id?: string;              // Subscription ID
  reconnect?: boolean | number | Infinity | RetryConfig;
  resubscribe?: boolean | number | Infinity | RepeatConfig;
}
```

**`count(filters: Filter | Filter[], id?: string): Observable<CountResponse>`**
- Send COUNT request (NIP-45)
- Returns single count response

**Parameters:**
- `filters` - Filter object or array
- `id` - Optional subscription ID

**Returns:** Observable<CountResponse>

**CountResponse:**
```typescript
interface CountResponse {
  count: number;
  approximate?: boolean;
}
```

#### Event Publishing

**`event(event: NostrEvent, verb?: "EVENT" | "AUTH"): Observable<PublishResponse>`**
- Send EVENT or AUTH message
- Returns observable of relay response
- Completes when OK received or timeout

**Parameters:**
- `event` - Signed Nostr event
- `verb` - "EVENT" (default) or "AUTH"

**Returns:** Observable<PublishResponse>

**PublishResponse:**
```typescript
interface PublishResponse {
  ok: boolean;
  message: string;
}
```

**`publish(event: NostrEvent, opts?: PublishOptions): Promise<PublishResponse>`**
- High-level publish with retries
- Automatically handles reconnection
- Returns promise of response

**Parameters:**
- `event` - Signed Nostr event
- `opts` - Optional publish options

**PublishOptions:**
```typescript
interface PublishOptions {
  retries?: number;     // Number of retries (default: 10)
  delay?: number;       // Delay between retries in ms (default: 1000)
}
```

#### Authentication

**`auth(event: NostrEvent): Promise<PublishResponse>`**
- Send AUTH message manually
- Event must be kind 22242 auth event

**`authenticate(signer: AuthSigner): Promise<PublishResponse>`**
- Authenticate using a signer
- Handles auth event creation

**AuthSigner:**
```typescript
interface AuthSigner {
  signEvent(event: UnsignedEvent): Promise<NostrEvent>;
}
```

#### Advanced Features

**`multiplex<T>(open: () => any, close: () => any, filter: (message: any) => boolean): Observable<T>`**
- Create multiplexed observable
- For advanced WebSocket message handling

**`negentropy(store: NegentropyReadStore, filter: Filter, reconcile: ReconcileFunction, opts?: NegentropySyncOptions): Promise<boolean>`**
- Low-level Negentropy sync (NIP-77)
- Requires custom reconcile function

**`sync(store: NegentropyReadStore, filter: Filter, direction?: SyncDirection): Observable<NostrEvent>`**
- High-level Negentropy sync
- Automatically handles send/receive

**SyncDirection:**
```typescript
enum SyncDirection {
  SEND = 1,        // Upload only
  RECEIVE = 2,     // Download only
  BOTH = 3         // Bidirectional (default)
}
```

**`send(message: any): void`**
- Send raw message to relay
- For advanced use cases

### Accessors (Getters)

**`get connected(): boolean`**
- Current connection state (sync)

**`get ready(): boolean`**
- Current ready state (sync)

**`get authenticated(): boolean`**
- Current auth state (sync)

**`get challenge(): string | null`**
- Current auth challenge (sync)

**`get authenticationResponse(): PublishResponse | null`**
- Last auth response (sync)

**`get information(): RelayInformation | null`**
- Current relay information (sync)

**`get notices(): string[]`**
- All notices received (sync)

## RelayPool Class

### Constructor

```typescript
new RelayPool(options?: RelayOptions): RelayPool
```

Create a relay pool with optional default relay options that apply to all relays.

**Parameters:**
- `options` - Optional RelayOptions object (same options as Relay constructor)

**Example:**
```typescript
const pool = new RelayPool({
  eoseTimeout: 15000,
  keepAlive: 60000,
  enablePing: true
});
```

### Properties

**`ignoreOffline: boolean`**
- Whether to ignore relays that have `ready=false` (default: `true`)
- Set to `false` to include offline/not-ready relays in operations

**`relays$: BehaviorSubject<Map<string, Relay>>`**
- Observable of all relays in the pool
- Emits whenever relays are added or removed

**`add$: Subject<IRelay>`**
- Emits when a relay is added to the pool

**`remove$: Subject<IRelay>`**
- Emits when a relay is removed from the pool

### Single Relay Methods

**`relay(url: string): Relay`**
- Get or create relay connection
- Reuses existing connections
- Returns Relay instance

**Example:**
```typescript
const pool = new RelayPool();
const relay1 = pool.relay("wss://relay.example.com");
const relay2 = pool.relay("wss://relay.example.com"); // Same instance
```

**`group(urls: string[]): RelayGroup`**
- Create a group of relays
- Returns RelayGroup instance
- Manages multiple relays as one unit

**Example:**
```typescript
const group = pool.group([
  "wss://relay1.example.com",
  "wss://relay2.example.com"
]);
```

### Multi-Relay Query Methods

**`req(relays: string[], filters: FilterInput, id?: string): Observable<SubscriptionResponse>`**
- Send REQ to multiple relays
- Does NOT deduplicate events
- Returns combined observable of all relay responses

**Parameters:**
- `relays` - Array of relay URLs
- `filters` - Filter object or Observable<Filter | Filter[]>
- `id` - Optional subscription ID

**`request(relays: string[], filters: FilterInput, opts?: SubscriptionOptions): Observable<NostrEvent>`**
- One-time request to multiple relays
- Automatically deduplicates events by ID
- Completes when all relays send EOSE
- Retries on errors

**Parameters:**
- `relays` - Array of relay URLs
- `filters` - Filter object or Observable<Filter | Filter[]>
- `opts` - Optional subscription options (retries, timeout)

**`subscription(relays: string[], filters: FilterInput, opts?: SubscriptionOptions): Observable<SubscriptionResponse>`**
- Persistent subscription to multiple relays
- Automatically deduplicates events
- Auto-reconnects on connection failures
- Resubscribes on relay CLOSE

**Parameters:**
- `relays` - Array of relay URLs
- `filters` - Filter object or Observable<Filter | Filter[]>
- `opts` - Subscription options (id, retries)

**`subscriptionMap(filterMap: Record<string, Filter | Filter[]>, opts?: SubscriptionOptions): Observable<SubscriptionResponse>`**
- Subscribe to different filters on different relays
- Each relay gets its own filter(s)
- Automatically deduplicates events

**Parameters:**
- `filterMap` - Object mapping relay URLs to filters
- `opts` - Optional subscription options

**Example:**
```typescript
pool.subscriptionMap({
  "wss://relay1.example.com": { kinds: [1], authors: ["pubkey1"] },
  "wss://relay2.example.com": { kinds: [1], authors: ["pubkey2"] }
}).subscribe(response => console.log(response));
```

**`outboxSubscription(outboxMap: OutboxMap, filters: Filter, opts?: SubscriptionOptions): Observable<SubscriptionResponse>`**
- Subscribe using outbox model (NIP-65)
- Queries each user's designated outbox relays
- Authors added automatically from outboxMap

**Parameters:**
- `outboxMap` - Map of pubkeys to relay URLs
- `filters` - Base filter (without authors - added automatically)
- `opts` - Optional subscription options

**OutboxMap type:**
```typescript
type OutboxMap = Record<string, string[]>;  // pubkey -> relay URLs
```

### Multi-Relay Publishing Methods

**`event(relays: string[], event: NostrEvent, verb?: "EVENT" | "AUTH"): Observable<PublishResponse & { from: string }>`**
- Send EVENT to multiple relays
- Returns observable of responses from each relay
- Each response includes `from` field with relay URL

**`publish(relays: string[], event: NostrEvent, opts?: PublishOptions): Promise<Array<PublishResponse & { from: string }>>`**
- Publish to multiple relays with retries
- Returns promise of all responses
- Automatically handles reconnection

**PublishOptions:**
```typescript
interface PublishOptions {
  retries?: number;     // Retries per relay (default: 10)
  delay?: number;       // Delay between retries in ms (default: 1000)
}
```

**PublishResponse with source:**
```typescript
interface PublishResponseWithSource {
  ok: boolean;
  message: string;
  from: string;         // Relay URL that sent this response
}
```

### Multi-Relay Advanced Methods

**`count(relays: string[], filters: Filter | Filter[], id?: string): Observable<Record<string, CountResponse>>`**
- Send COUNT to multiple relays
- Returns counts grouped by relay URL

**Example:**
```typescript
pool.count(relays, { kinds: [1] }).subscribe(counts => {
  Object.entries(counts).forEach(([url, response]) => {
    console.log(`${url}: ${response.count} events`);
  });
});
```

**`sync(relays: string[], store: NegentropyReadStore, filter: Filter, direction?: "up" | "down" | "both"): Observable<NostrEvent>`**
- Negentropy sync with multiple relays
- Bidirectional by default
- Automatically handles reconciliation

**Parameters:**
- `relays` - Array of relay URLs
- `store` - Event store or array of events
- `filter` - Filter for sync
- `direction` - "up" (upload), "down" (download), "both" (default)

### Observable Properties

**`relays$: Observable<Map<string, Relay>>`**
- Observable of all relays in pool
- Emits when relays are added or removed
- Map of URL to Relay instance

**`add$: Observable<Relay>`**
- Emits when relay is added to pool
- Fires on first access to new relay

**`remove$: Observable<Relay>`**
- Emits when relay is removed from pool
- Fires when relay is explicitly removed

**Example:**
```typescript
pool.relays$.subscribe(relaysMap => {
  console.log("Active relays:", Array.from(relaysMap.keys()));
});

pool.add$.subscribe(relay => {
  console.log("New relay:", relay.url);
});
```

## RelayGroup Class

Created via `pool.group()`. Provides same interface as Relay but for multiple relays.

### Methods

All methods work like Relay class but operate on multiple relays:

- `req(filters, id?)` - Send REQ to all relays in group
- `request(filters, opts?)` - One-time request with deduplication
- `subscription(filters, opts?)` - Persistent subscription with deduplication
- `event(event, verb?)` - Send EVENT to all relays
- `publish(event, opts?)` - Publish with retries to all relays
- `count(filters, id?)` - Count events across all relays

**Example:**
```typescript
const group = pool.group([
  "wss://relay1.example.com",
  "wss://relay2.example.com"
]);

// Query group like a single relay
group.request({ kinds: [1] }).subscribe(event => 
  console.log(event)
);

// Publish to all relays in group
const responses = await group.publish(event);
```

## Types

### Filter

```typescript
interface Filter {
  ids?: string[];           // Event IDs
  authors?: string[];       // Author pubkeys
  kinds?: number[];         // Event kinds
  since?: number;           // Unix timestamp
  until?: number;           // Unix timestamp
  limit?: number;           // Max results
  search?: string;          // Search string (NIP-50)
  [key: string]: any;       // Tag filters (#e, #p, etc.)
}
```

### NostrEvent

```typescript
interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}
```

### RelayInformation

```typescript
interface RelayInformation {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: Limitations;
  retention?: Retention[];
  relay_countries?: string[];
  language_tags?: string[];
  tags?: string[];
  posting_policy?: string;
  payments_url?: string;
  icon?: string;
}
```

### Limitations

```typescript
interface Limitations {
  max_message_length?: number;
  max_subscriptions?: number;
  max_filters?: number;
  max_limit?: number;
  max_subid_length?: number;
  max_event_tags?: number;
  max_content_length?: number;
  min_pow_difficulty?: number;
  auth_required?: boolean;
  payment_required?: boolean;
  restricted_writes?: boolean;
  created_at_lower_limit?: number;
  created_at_upper_limit?: number;
}
```

### SubscriptionResponse

```typescript
type SubscriptionResponse = NostrEvent | "EOSE";
```

Either a Nostr event or "EOSE" marker.

### FilterInput

```typescript
type FilterInput = Filter | Filter[] | Observable<Filter | Filter[]>;
```

Supports static filters or dynamic observable filters.

## Operators

### onlyEvents

Filters out "EOSE" markers, leaving only events:

```typescript
import { onlyEvents } from "applesauce-relay/operators";

relay.subscription({ kinds: [1] })
  .pipe(onlyEvents())
  .subscribe(event => {
    // Only NostrEvent here, no EOSE
    console.log(event.content);
  });
```

**Type:**
```typescript
function onlyEvents(): OperatorFunction<SubscriptionResponse, NostrEvent>
```

### completeOnEose

Completes the observable when EOSE is received:

```typescript
import { completeOnEose } from "applesauce-relay/operators";

// Complete on EOSE, filter out EOSE marker
relay.req({ kinds: [1] })
  .pipe(completeOnEose())
  .subscribe({
    next: event => console.log(event),  // Only events
    complete: () => console.log("EOSE received")
  });

// Complete on EOSE, include EOSE marker
relay.req({ kinds: [1] })
  .pipe(completeOnEose(true))
  .subscribe({
    next: response => {
      if (response === "EOSE") {
        console.log("EOSE marker");
      } else {
        console.log("Event");
      }
    },
    complete: () => console.log("Completed")
  });
```

**Signatures:**
```typescript
function completeOnEose(): OperatorFunction<SubscriptionResponse, NostrEvent>
function completeOnEose(includeEose: true): MonoTypeOperatorFunction<SubscriptionResponse>
function completeOnEose(includeEose: false): OperatorFunction<SubscriptionResponse, NostrEvent>
```

### mapEventsToStore

Maps events to event store (from applesauce-core):

```typescript
import { mapEventsToStore } from "applesauce-core/observable";

relay.subscription({ kinds: [1] })
  .pipe(mapEventsToStore(eventStore))
  .subscribe();
```

## Configuration Examples

### Basic Configuration

```typescript
const relay = new Relay("wss://relay.example.com", {
  eoseTimeout: 15000,
  keepAlive: 60000
});
```

### Custom Reconnection Logic

```typescript
import { timer } from "rxjs";

const relay = new Relay("wss://relay.example.com", {
  reconnectTimer: (error, attempts) => {
    // Exponential backoff with max 30s
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${attempts})`);
    return timer(delay);
  }
});
```

### Production Configuration

```typescript
const relay = new Relay("wss://relay.example.com", {
  // Generous timeouts for slow relays
  eoseTimeout: 30000,
  eventTimeout: 30000,
  publishTimeout: 60000,
  
  // Keep connections alive longer
  keepAlive: 120000,
  
  // Enable ping for better connection monitoring
  enablePing: true,
  pingFrequency: 30000,
  pingTimeout: 10000
});
```

## Error Codes

Common WebSocket close codes:

- `1000` - Normal closure
- `1001` - Going away (server shutdown)
- `1002` - Protocol error
- `1003` - Unsupported data
- `1006` - Abnormal closure (no close frame)
- `1008` - Policy violation
- `1009` - Message too big
- `1011` - Server error
- `1012` - Service restart
- `1013` - Try again later
- `1015` - TLS handshake failure

## Performance Considerations

### Connection Pooling

Reuse connections efficiently:

```typescript
// Good - reuses connection
const relay = pool.relay("wss://relay.example.com");
relay.subscription({ kinds: [1] }).subscribe(/* ... */);
relay.subscription({ kinds: [0] }).subscribe(/* ... */);

// Bad - creates multiple connections
const relay1 = new Relay("wss://relay.example.com");
const relay2 = new Relay("wss://relay.example.com");
```

### Memory Management

Clean up subscriptions:

```typescript
const subscription = relay.subscription({ kinds: [1] })
  .subscribe(/* ... */);

// Later, when done
subscription.unsubscribe();
```

### Batch Operations

Fetch multiple event types efficiently:

```typescript
// Parallel fetching
await Promise.all([
  lastValueFrom(relay.request({ kinds: [1] }).pipe(toArray())),
  lastValueFrom(relay.request({ kinds: [0] }).pipe(toArray()))
]);
```
