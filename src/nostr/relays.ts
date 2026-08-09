/** Shared Nostr relay pool + NIP-46 transport wiring (loaded once). */
import { RelayPool } from "applesauce-relay";
import { NostrConnectSigner } from "applesauce-signers";

/** Public relays used for profiles, NIP-46 transport, and score publication. */
export const DEFAULT_RELAYS = ["wss://nos.lol", "wss://relay.primal.net"];

export const pool = new RelayPool();

// NIP-46 signers talk to the remote signer over relays — route that through our pool.
// (Relay-first parameter order, matching the signer's connection method types.)
NostrConnectSigner.subscriptionMethod = (relays, filters) => pool.subscription(relays, filters);
NostrConnectSigner.publishMethod = async (relays, event) => {
  await pool.publish(relays, event);
};
