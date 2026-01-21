import { lastValueFrom, mapEventsToStore } from "applesauce-core";
import { page } from "fresh";
import { Head } from "fresh/runtime";
import NoteFeed from "../islands/NoteFeed.tsx";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";
import { define } from "../utils.ts";

export const handler = define.handlers(async (ctx) => {
  // Fetch initial notes and profiles
  await lastValueFrom(
    pool.relay(ctx.state.relay).request({ kinds: [1], limit: 50 }).pipe(
      mapEventsToStore(eventStore),
    ),
  );

  await lastValueFrom(
    pool.relay(ctx.state.relay).request({ kinds: [0], limit: 100 }).pipe(
      mapEventsToStore(eventStore),
    ),
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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Notes Timeline
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Live feed of text notes (kind 1) from {ctx.state.relay}
          </p>

          <NoteFeed relay={ctx.state.relay} />
        </div>
      </div>
    </>
  );
});
