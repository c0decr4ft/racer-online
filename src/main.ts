import "./style.css";
import { initControlsHelp } from "./controlsHelp";
import { initFeedbackCompose } from "./feedbackCompose";
import { Game } from "./game";
import { loadOnlineConfig, configuredApiBase, configuredWsUrl } from "./net/onlineConfig";
import { startPresenceHeartbeat } from "./net/presence";
import { restoreSession } from "./nostr/session";
import { initNostrUi } from "./nostr/ui";
import { initVehiclePhysics, vehiclePhysicsBackend } from "./physics/vehiclePhysics";
import { GAME_VERSION } from "./version";
import { initVersionBadge } from "./versions";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #game canvas");
}

// Mobile gate (set by the inline script in index.html): show DESKTOP ONLY and
// never boot the engine, presence, or session restore on phones/tablets.
const mobileBlocked = document.documentElement.classList.contains("mobile-blocked");

if (!mobileBlocked) {
  await Promise.all([loadOnlineConfig(), initVehiclePhysics()]);

  initVersionBadge();
  initFeedbackCompose();
  initControlsHelp();
  initNostrUi();
  startPresenceHeartbeat();
  // Reconnect a persisted Nostr login (NIP-07 pubkey / NIP-46 nbunksec) in the background.
  void restoreSession().catch(() => undefined);

  const game = new Game(canvas);
  Object.assign(window, { __game: game, __physicsBackend: vehiclePhysicsBackend() });
  const api = configuredApiBase();
  const ws = configuredWsUrl();
  console.info(
    `[racer] v${GAME_VERSION} ready` +
      ` · physics=${vehiclePhysicsBackend()}` +
      (api || ws ? ` · online api=${api || "—"} ws=${ws || "—"}` : " · local / offline online-config"),
  );
}
