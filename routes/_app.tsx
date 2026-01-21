import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Nostr Relay Explorer</title>
        <meta
          name="description"
          content="Explore and analyze Nostr relays with this comprehensive dashboard"
        />
      </head>
      <body className="bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased">
        <Component />
      </body>
    </html>
  );
});
