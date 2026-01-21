import { lastValueFrom, mapEventsToStore } from "applesauce-core";
import { page } from "fresh";
import { Head } from "fresh/runtime";
import UserList from "../islands/UserList.tsx";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";
import { define } from "../utils.ts";

export const handler = define.handlers(async (ctx) => {
  // Fetch initial user profiles
  await lastValueFrom(
    pool.relay(ctx.state.relay).request({ kinds: [0], limit: 100 }).pipe(
      mapEventsToStore(eventStore),
    ),
  );

  return page({});
});

export default define.page(function Users(ctx) {
  return (
    <>
      <Head>
        <title>Users - Nostr Relay Explorer</title>
      </Head>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Users
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Browse user profiles (kind 0) from {ctx.state.relay}
          </p>

          <UserList relay={ctx.state.relay} />
        </div>
      </div>
    </>
  );
});
