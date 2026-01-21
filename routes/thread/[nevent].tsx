import { Note } from "applesauce-common/casts";
import { castEventStream } from "applesauce-common/observable";
import {
  lastValueFrom,
  mapEventsToStore,
  simpleTimeout,
} from "applesauce-core";
import { kinds, relaySet } from "applesauce-core/helpers";
import { normalizeToEventPointer } from "applesauce-core/helpers";
import { page } from "fresh";
import { Head } from "fresh/runtime";
import { combineLatest } from "rxjs";
import { filter, take } from "rxjs";
import { ThreadNoteItem } from "../../components/ThreadNoteItem.tsx";
import { eventStore } from "../../lib/event-store.ts";
import { pool } from "../../lib/relay-pool.ts";
import { define } from "../../utils.ts";
import type { EventPointer } from "nostr-tools/nip19";

interface ThreadData {
  note?: Note;
  eventPointer?: EventPointer;
  error?: string;
}

export const handler = define.handlers(async (ctx) => {
  const { nevent } = ctx.params;

  // Decode the nevent
  const eventPointer = normalizeToEventPointer(nevent);

  if (!eventPointer) {
    return page({ error: "Invalid nevent format" });
  }

  try {
    // Determine which relays to use
    const relays = eventPointer.relays && eventPointer.relays.length > 0
      ? eventPointer.relays
      : [ctx.state.relay];

    // Get the note from event store (with timeout)
    // This will trigger the eventLoader to fetch it from relays if not already in store
    const note = await lastValueFrom(
      eventStore.event(eventPointer).pipe(
        castEventStream(Note, eventStore),
        filter((e) => e !== undefined),
        take(1),
        simpleTimeout(5000, "Timeout loading event from relay"),
      ),
      { defaultValue: undefined },
    );

    if (!note) {
      return page({ error: "Event not found on relay" });
    }

    // Fetch the author's profile
    await lastValueFrom(
      pool.request(relays, { kinds: [0], authors: [note.event.pubkey] }).pipe(
        mapEventsToStore(eventStore),
      ),
      { defaultValue: null },
    );

    // Get the author's inboxes for loading replies and zaps
    const inboxes = await lastValueFrom(
      note.author.inboxes$.pipe(take(1)),
      { defaultValue: undefined },
    );

    // Fetch all replies (kind 1) and zaps (kind 9735) that reference this event
    const replyRelays = relaySet(relays, inboxes);

    await lastValueFrom(
      combineLatest([
        // Fetch replies
        pool.request(replyRelays, {
          kinds: [kinds.ShortTextNote],
          "#e": [eventPointer.id],
        }).pipe(
          mapEventsToStore(eventStore),
        ),
        // Fetch zaps
        pool.request(replyRelays, {
          kinds: [kinds.Zap],
          "#e": [eventPointer.id],
        }).pipe(
          mapEventsToStore(eventStore),
        ),
      ]),
      { defaultValue: [null, null] },
    );

    // Fetch profiles for all reply authors
    const replies = await lastValueFrom(
      note.replies$.pipe(take(1)),
      { defaultValue: [] },
    );

    const replyAuthors = replies?.map((r) => r.event.pubkey) || [];
    if (replyAuthors.length > 0) {
      await lastValueFrom(
        pool.request(replyRelays, {
          kinds: [0],
          authors: replyAuthors,
        }).pipe(
          mapEventsToStore(eventStore),
        ),
        { defaultValue: null },
      );
    }

    // Fetch profiles for zap senders
    const zaps = await lastValueFrom(
      note.zaps$.pipe(take(1)),
      { defaultValue: [] },
    );

    const zapSenders = zaps?.map((z) => z.sender.pubkey) || [];
    if (zapSenders.length > 0) {
      await lastValueFrom(
        pool.request(replyRelays, {
          kinds: [0],
          authors: zapSenders,
        }).pipe(
          mapEventsToStore(eventStore),
        ),
        { defaultValue: null },
      );
    }

    return page({ note, eventPointer });
  } catch (error) {
    console.error("Error loading thread:", error);
    return page({
      error: error instanceof Error ? error.message : "Failed to load thread",
    });
  }
});

export default define.page<typeof handler>(function Thread({ data }) {
  if ("error" in data) {
    return (
      <>
        <Head>
          <title>Thread Error - Nostr Relay Explorer</title>
        </Head>
        <div className="p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-2">
                Error Loading Thread
              </h1>
              <p className="text-red-700 dark:text-red-300">{data.error}</p>
              <a
                href="/notes"
                className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← Back to Notes
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!("note" in data)) {
    return (
      <>
        <Head>
          <title>Loading Thread - Nostr Relay Explorer</title>
        </Head>
        <div className="p-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Thread - Nostr Relay Explorer</title>
      </Head>
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <a
              href="/notes"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              ← Back to Notes
            </a>
          </div>

          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Thread
          </h1>

          <ThreadNoteItem note={data.note} isRoot />
        </div>
      </div>
    </>
  );
});
