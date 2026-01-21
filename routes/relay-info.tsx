import { page } from "fresh";
import { Head } from "fresh/runtime";
import { pool } from "../lib/relay-pool.ts";
import { define } from "../utils.ts";

interface RelayInfoData {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  icon?: string;
  limitation?: {
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
  };
}

export const handler = define.handlers(async (ctx) => {
  const relay = pool.relay(ctx.state.relay);

  // Get relay information using the observables from Relay class
  const information = await relay.getInformation();
  const limitations = await relay.getLimitations();
  const supported = await relay.getSupported();

  const relayInfo: RelayInfoData = {
    ...information,
    supported_nips: supported || undefined,
    limitation: limitations || undefined,
  };

  return page({ relayInfo });
});

export default define.page<typeof handler>(function RelayInfoPage(ctx) {
  const { relayInfo } = ctx.data;

  return (
    <>
      <Head>
        <title>Relay Info - Nostr Relay Explorer</title>
      </Head>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Relay Information
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Details about {ctx.state.relay}
          </p>

          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Basic Information
              </h2>
              <dl className="space-y-3">
                {relayInfo.name && (
                  <div>
                    <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Name
                    </dt>
                    <dd className="text-neutral-900 dark:text-neutral-100">
                      {relayInfo.name}
                    </dd>
                  </div>
                )}
                {relayInfo.description && (
                  <div>
                    <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Description
                    </dt>
                    <dd className="text-neutral-900 dark:text-neutral-100">
                      {relayInfo.description}
                    </dd>
                  </div>
                )}
                {relayInfo.pubkey && (
                  <div>
                    <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Pubkey
                    </dt>
                    <dd className="text-neutral-900 dark:text-neutral-100 font-mono text-sm break-all">
                      {relayInfo.pubkey}
                    </dd>
                  </div>
                )}
                {relayInfo.contact && (
                  <div>
                    <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Contact
                    </dt>
                    <dd className="text-neutral-900 dark:text-neutral-100">
                      {relayInfo.contact}
                    </dd>
                  </div>
                )}
                {relayInfo.software && (
                  <div>
                    <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Software
                    </dt>
                    <dd className="text-neutral-900 dark:text-neutral-100">
                      {relayInfo.software}
                      {relayInfo.version && ` v${relayInfo.version}`}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {relayInfo.supported_nips && relayInfo.supported_nips.length > 0 &&
              (
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-6">
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                    Supported NIPs
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {relayInfo.supported_nips.map((nip) => (
                      <span
                        key={nip}
                        className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        NIP-{nip.toString().padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {relayInfo.limitation && (
              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-6">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Limitations
                </h2>
                <dl className="space-y-3">
                  {Object.entries(relayInfo.limitation).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) =>
                          l.toUpperCase())}
                      </dt>
                      <dd className="text-neutral-900 dark:text-neutral-100">
                        {typeof value === "boolean"
                          ? (value ? "Yes" : "No")
                          : value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {!relayInfo.name && !relayInfo.description &&
              (!relayInfo.supported_nips ||
                relayInfo.supported_nips.length === 0) &&
              (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong>{" "}
                  This relay does not provide NIP-11 information document or it
                  could not be fetched.
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
});
