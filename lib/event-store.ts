import { EventStore } from "applesauce-core";
import { createEventLoaderForStore } from "applesauce-loaders/loaders";
import { pool } from "./relay-pool.ts";
import { EMPTY } from "rxjs";

export const eventStore = new EventStore();

eventStore.eventLoader = (pointer) => {
  console.log("eventLoader", pointer);
  return EMPTY;
};
// export const eventLoader = createEventLoaderForStore(eventStore, pool, {
//   lookupRelays: ["wss://index.hzrd149.com"],
// });
