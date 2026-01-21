import { lastValueFrom, mapEventsToStore } from "applesauce-core";
import { page } from "fresh";
import { Head } from "fresh/runtime";
import LiveEventStream from "../islands/LiveEventStream.tsx";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";
import { define } from "../utils.ts";

export const handler = define.handlers(async (ctx) => {
  // Fetch initial events of various kinds
  await lastValueFrom(
    pool.relay(ctx.state.relay).request({ limit: 50 }).pipe(
      mapEventsToStore(eventStore),
    ),
  );

  return page({});
});

export default define.page(function Live(ctx) {
  return (
    <>
      <Head>
        <title>Live Feed - Nostr Relay Explorer</title>
      </Head>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Live Event Feed
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Real-time stream of all events from {ctx.state.relay}
          </p>

          <LiveEventStream relay={ctx.state.relay} />
        </div>
      </div>
    </>
  );
});
