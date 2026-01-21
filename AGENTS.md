# Agent Guidelines for fresh-nostr-relay-explorer

This document provides guidelines for AI coding agents working on this
Fresh/Deno project.

## Project Overview

This is a Fresh (Deno) web application for exploring Nostr relays. It uses:

- **Framework**: Fresh 2.x (file-based routing with Vite)
- **Runtime**: Deno (not Node.js)
- **UI**: Preact with Tailwind CSS 4.x
- **State**: Preact signals + RxJS observables
- **Nostr**: Applesauce libraries (core, relay, loaders, common)

## Project Structure

```
/
├── routes/           # File-based routing (pages + API endpoints)
├── islands/          # Client-side interactive components
├── components/       # Reusable server-side components
├── hooks/            # Preact hooks (use$, useSubscription)
├── lib/              # Core libraries (event-store, relay-pool)
├── static/           # Static assets served at root
├── main.ts           # App entry point
└── utils.ts          # Shared utilities (State interface, define)
```

## Import Conventions

### Path Aliases

- Use `@/` for imports from project root (configured in deno.json)
- External packages use JSR (jsr:) or npm: specifiers

### File Extensions

- Always include `.ts` or `.tsx` extensions in relative imports
- This is required by Deno

## TypeScript Guidelines

### Type Safety

- Use explicit types for function parameters and return values
- Leverage TypeScript's inference where it improves readability
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, and utility types

### Fresh-Specific Types

- Use `define.page()` for route components (provides typed ctx)
- Use `define.handlers()` for route handlers
- Use `define.middleware()` for middleware
- Define shared state in `utils.ts` State interface

Example:

```typescript
export const handler = define.handlers(async (ctx) => {
  // ctx.state is typed based on State interface
  const relay = ctx.state.relay;
  return page({ data });
});

export default define.page(function HomePage(ctx) {
  // ctx.state and ctx.data are typed
  return <div>...</div>;
});
```

### React/Preact Types

- Import types with `type` keyword:
  `import type { ComponentChildren } from "preact"`
- Use `ComponentChildren` for children props

## Code Style

### Formatting

- 2-space indentation
- Double quotes for strings
- Semicolons required
- Trailing commas in multiline objects/arrays
- Use Deno's built-in formatter (follows standard conventions)

### Naming Conventions

- **Files**: kebab-case (e.g., `event-store.ts`, `use$.ts`)
- **Components**: PascalCase files and function names (e.g., `NoteFeed.tsx`,
  `function NoteCard()`)
- **Routes**: Follow Fresh conventions (`index.tsx`, `_app.tsx`, `[name].tsx`)
- **Islands**: PascalCase files in `islands/` directory
- **Hooks**: camelCase with `use` prefix (e.g., `useSubscription`, `use$`)
- **Variables/functions**: camelCase
- **Types/Interfaces**: PascalCase
- **Constants**: camelCase (not UPPER_CASE unless true constants)

### Component Patterns

**Islands (Client-side)**:

```typescript
export default function MyIsland({ prop }: { prop: string }) {
  // Interactive, client-side only
  return <div>...</div>;
}
```

**Components (Server-side)**:

```typescript
export function MyComponent(props: MyComponentProps) {
  // Server-rendered, no interactivity
  return <button {...props} />;
}
```

**Routes**:

```typescript
export default define.page(function PageName(ctx) {
  return <div>...</div>;
});
```

### State Management

**Preact Signals**: For local UI state
```typescript
const count = useSignal(0);
```

**RxJS Observables**: For async data streams (Nostr events, relay subscriptions)

**IMPORTANT**: Choose the right hook for RxJS observables:

**`use$` hook** - For getting values from observables (server + client safe):
- Works on both server and client
- Returns the current value from the observable
- Use for event store queries and cast class properties
- Safe to call during SSR

```typescript
// Get values from event store
const notes = use$(() => eventStore.timeline({ kinds: [1], limit: 10 }), []);

// Get values from cast class properties
const displayName = use$(note.author.profile$.displayName);
const picture = use$(note.author.profile$.picture);
```

**`useSubscription` hook** - For live subscriptions (client-only):
- Does NOT return a value (only subscribes)
- Use for relay subscriptions and live data streams
- Should only trigger on the client (not during SSR)
- Handles cleanup automatically

```typescript
// Subscribe to live relay data (no return value)
useSubscription(
  () => pool.relay(relay).subscription({ kinds: [1], limit: 10 }).pipe(
    mapEventsToStore(eventStore)
  ),
  [relay]
);
```

**Typical pattern** - Combine both hooks:
```typescript
// 1. Subscribe to live updates (client-only, no SSR)
useSubscription(() => 
  pool.relay(relay).subscription({ kinds: [1] }).pipe(
    mapEventsToStore(eventStore)
  ), 
  [relay]
);

// 2. Get reactive values from store (server + client)
const notes = use$(() => eventStore.timeline({ kinds: [1] }), []);
```

**Context via middleware**: For shared app state (see main.ts)
```typescript
app.use(async (ctx) => {
  ctx.state.relay = Deno.env.get("RELAY") ?? "wss://relay.damus.io";
  return await ctx.next();
});
```

**RxJS Observables**: For async data streams (Nostr events, relay subscriptions)

```typescript
// Subscribe to observable (no return value needed)
useSubscription(() => pool.relay(relay).subscription(...), [relay]);

// Get value from observable/BehaviorSubject
const notes = use$(() => eventStore.timeline(...), []);
```

**Context via middleware**: For shared app state (see main.ts)

```typescript
app.use(async (ctx) => {
  ctx.state.relay = Deno.env.get("RELAY") ?? "wss://relay.damus.io";
  return await ctx.next();
});
```

## Styling

- **Framework**: Tailwind CSS 4.x with Vite plugin
- **Approach**: Utility-first with className prop
- **Dark mode**: Support via `dark:` prefix classes
- Use semantic class names: `className="flex flex-col gap-4"`

## Error Handling

- Use try/catch for async operations that might fail
- Let Fresh's error boundaries handle unhandled errors
- Log errors for debugging: `console.error("message", error)`
- For relay operations, handle connection failures gracefully

## Environment Variables

- Use `Deno.env.get("VAR_NAME")` to access
- Set defaults for optional variables
- Store in `.env` files (gitignored)

Example:

```typescript
const relay = Deno.env.get("RELAY") ?? "wss://relay.damus.io";
```

## Deno-Specific Notes

- **No package.json**: Dependencies managed in deno.json imports
- **JSR/npm specifiers**: Use `jsr:@scope/package` or `npm:package`
- **Permissions**: Production needs `-A` flag (see start task)
- **Lock file**: deno.lock tracks dependency versions
- **node_modules**: Using "manual" mode for compatibility

## Common Patterns

### Creating a new route

1. Add file to `routes/` (e.g., `routes/profile.tsx`)
2. Use `define.page()` for component
3. Add `define.handlers()` if you need server logic

### Creating an island

Islands enable client-side interactivity and are rendered both on the server and
in the client.

1. Add file to `islands/` (PascalCase or kebab-case)
2. Export default function component
3. Islands are automatically hydrated on client

**Basic island example**:

```typescript
import { useSignal } from "@preact/signals";

export default function MyIsland() {
  const count = useSignal(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => (count.value += 1)}>+</button>
    </div>
  );
}
```

**Passing props to islands**: Only serializable values are supported:

- Primitives: `string`, `number`, `boolean`, `bigint`, `undefined`, `null`
- Special numbers: `Infinity`, `-Infinity`, `-0`, `NaN`
- Built-ins: `Uint8Array`, `URL`, `Date`, `RegExp`
- Collections: `Map`, `Set`, plain objects, arrays
- JSX Elements (server-rendered)
- Preact Signals (if inner value is serializable)

**Important**: Functions cannot be passed as props to islands.

```typescript
// WRONG - don't pass functions
<MyIsland onClick={() => console.log("hey")} />

// RIGHT - use signals or callbacks defined in the island
<MyIsland count={42} name="user" />
```

**Passing JSX to islands**: You can pass server-rendered JSX via props:

```typescript
<MyIsland jsx={<h1>hello</h1>}>
  <p>This text is rendered on the server</p>
</MyIsland>;
```

**Client-only rendering**: Use `IS_BROWSER` for client-only APIs:

```typescript
import { IS_BROWSER } from "fresh/runtime";

export function MyIsland() {
  if (!IS_BROWSER) return <div>Loading...</div>;

  // Client-only code (EventSource, navigator.getUserMedia, etc.)
  return <div>Client content</div>;
}
```

**Nesting islands**: Islands can be nested and receive serialized props:

```typescript
<MyIsland>
  <OtherIsland foo="serialized prop" />
</MyIsland>;
```

### Working with Nostr events

1. Use `pool.relay(url).subscription()` for live data
2. Store in `eventStore` via `mapEventsToStore()`
3. Query from store via `eventStore.timeline()`
4. Use `use$()` hook to reactively render

### Custom hooks

- Create in `hooks/` directory
- Follow React hooks rules
- Use `// deno-lint-ignore react-rules-of-hooks` if needed for special cases

## Linting

Deno lint rules configured in deno.json:

- Uses Fresh + recommended rule tags
- _fresh/ directory excluded from linting

Suppress specific rules when needed:

```typescript
// deno-lint-ignore react-rules-of-hooks
// deno-lint-ignore no-explicit-any
```

## Best Practices

1. **Type everything**: Leverage TypeScript for safety
2. **Keep islands small**: Only interactive parts should be islands
3. **Use signals wisely**: For UI state, not complex async logic
4. **Embrace RxJS**: For relay subscriptions and event streams
5. **Server-first**: Fetch data in handlers, not in components
6. **Follow Fresh patterns**: Use define.* helpers for typing
7. **Format before commit**: Run `deno fmt` before committing

## Resources

- [Fresh Documentation](https://fresh.deno.dev/docs)
- [Deno Documentation](https://docs.deno.com/)
- [Applesauce Docs](https://github.com/hzrd149/applesauce)
- [Nostr Protocol](https://nostr.com/)
