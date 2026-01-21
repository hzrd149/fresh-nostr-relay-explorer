import { lastValueFrom, mapEventsToStore } from "applesauce-core";
import { page } from "fresh";
import { Head } from "fresh/runtime";
import { StatCard } from "../components/StatCard.tsx";
import { eventStore } from "../lib/event-store.ts";
import { pool } from "../lib/relay-pool.ts";
import { define } from "../utils.ts";

export const handler = define.handlers(async (ctx) => {
  // Fetch some initial data for stats
  await lastValueFrom(
    pool.relay(ctx.state.relay).request({ kinds: [1], limit: 50 }).pipe(
      mapEventsToStore(eventStore),
    ),
  );

  await lastValueFrom(
    pool.relay(ctx.state.relay).request({ kinds: [0], limit: 50 }).pipe(
      mapEventsToStore(eventStore),
    ),
  );

  return page({});
});

export default define.page(function Home(ctx) {
  return (
    <>
      <Head>
        <title>Dashboard - Nostr Relay Explorer</title>
      </Head>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Explore and analyze Nostr relay: <span className="font-mono text-sm">{ctx.state.relay}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Notes"
              value="..."
              icon={<span className="text-3xl">📝</span>}
            />
            <StatCard
              label="Active Users"
              value="..."
              icon={<span className="text-3xl">👥</span>}
            />
            <StatCard
              label="Relay Status"
              value="Connected"
              icon={<span className="text-3xl">⚡</span>}
            />
            <StatCard
              label="Event Types"
              value="..."
              icon={<span className="text-3xl">🔢</span>}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Welcome
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                This is a Nostr relay explorer built with Fresh and Deno. Use the navigation on the left to explore different aspects of the relay.
              </p>
              <div className="space-y-2">
                <a
                  href="/notes"
                  className="block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → View Notes Timeline
                </a>
                <a
                  href="/users"
                  className="block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → Browse Users
                </a>
                <a
                  href="/relay-info"
                  className="block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → Relay Information
                </a>
                <a
                  href="/live"
                  className="block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → Live Event Feed
                </a>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                About Nostr
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Nostr is a simple, open protocol that enables global, decentralized, and censorship-resistant social media.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400">
                This explorer connects to relays to fetch and display events in real-time, allowing you to see the activity happening on the network.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
