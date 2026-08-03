import "./style.css";
import { initFeedbackCompose } from "./feedbackCompose";
import { Game } from "./game";
import { loadOnlineConfig, configuredApiBase, configuredWsUrl } from "./net/onlineConfig";
import { startPresenceHeartbeat } from "./net/presence";
import { initVehiclePhysics, vehiclePhysicsBackend } from "./physics/vehiclePhysics";
import { GAME_VERSION } from "./version";
import { initVersionSwitcher } from "./versions";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #game canvas");
}

await Promise.all([loadOnlineConfig(), initVehiclePhysics()]);

initVersionSwitcher();
initFeedbackCompose();
startPresenceHeartbeat();

const game = new Game(canvas);
Object.assign(window, { __game: game, __physicsBackend: vehiclePhysicsBackend() });
const api = configuredApiBase();
const ws = configuredWsUrl();
console.info(
  `[racer] v${GAME_VERSION} ready` +
    ` · physics=${vehiclePhysicsBackend()}` +
    (api || ws ? ` · online api=${api || "—"} ws=${ws || "—"}` : " · local / offline online-config"),
);
