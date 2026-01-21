import { EventStore } from "applesauce-core";
import { createEventLoaderForStore } from "applesauce-loaders/loaders";
import { pool } from "./relay-pool.ts";

export const eventStore = new EventStore();

export const eventLoader = createEventLoaderForStore(eventStore, pool, {
  lookupRelays: ["wss://index.hzrd149.com", "wss://purplepag.es"],
});
