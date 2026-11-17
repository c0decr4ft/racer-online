import "./style.css";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #game canvas");
}

// Phones (and a ?pad= link) are a controller. The race engine stays on the computer.
const padQuery = new URLSearchParams(location.search).get("pad") || "";
const mobileBlocked = document.documentElement.classList.contains("mobile-blocked");

if (mobileBlocked || padQuery) {
  if (padQuery) document.documentElement.classList.add("phone-pad");
  document.getElementById("app")?.setAttribute("aria-hidden", "true");
  const { loadOnlineConfig } = await import("./net/onlineConfig");
  await loadOnlineConfig();
  const { startPhonePad } = await import("./pad/phone");
  startPhonePad(padQuery);
} else {
  const [
    { initControlsHelp },
    { initFeedbackCompose },
    { Game },
    { loadOnlineConfig, configuredApiBase, configuredWsUrl },
    { startPresenceHeartbeat },
    { restoreSession },
    { initNostrUi },
    { initVehiclePhysics, vehiclePhysicsBackend },
    { initSettingsUi },
    { initSocialUi },
    { clearInviteQuery, parseInviteQuery },
    { GAME_VERSION },
    { initVersionBadge },
  ] = await Promise.all([
    import("./controlsHelp"),
    import("./feedbackCompose"),
    import("./game"),
    import("./net/onlineConfig"),
    import("./net/presence"),
    import("./nostr/session"),
    import("./nostr/ui"),
    import("./physics/vehiclePhysics"),
    import("./settingsUi"),
    import("./social/ui"),
    import("./social/organize"),
    import("./version"),
    import("./versions"),
  ]);

  await Promise.all([loadOnlineConfig(), initVehiclePhysics()]);

  initVersionBadge();
  initFeedbackCompose();
  initNostrUi();
  startPresenceHeartbeat();
  // Reconnect a persisted local/NIP-07 login quietly (no extension prompts on boot).
  // NIP-46 bunkers are NOT auto-restored — that opened auth popup storms.
  void restoreSession().catch(() => undefined);

  try {
    const game = new Game(canvas);
    Object.assign(window, { __game: game, __physicsBackend: vehiclePhysicsBackend() });
    initControlsHelp();
    initSettingsUi({
      onApply: (settings) => game.applyGameSettings(settings),
      onResetGhosts: () => game.clearGhostRecords(),
    });
    initSocialUi({
      onJoinInvite: (invite) => {
        game.joinFromInvite(invite);
      },
      onHostLobby: (invite) => {
        game.hostLobbyFromInvite(invite);
      },
      showToast: (text) => game.notify(text),
      isRacing: () => game.isInRace(),
    });

    const invite = parseInviteQuery();
    if (invite) {
      clearInviteQuery();
      game.joinFromInvite(invite);
    }

    const api = configuredApiBase();
    const ws = configuredWsUrl();
    console.info(
      `[racer] v${GAME_VERSION} ready` +
        ` · physics=${vehiclePhysicsBackend()}` +
        (api || ws ? ` · online api=${api || "—"} ws=${ws || "—"}` : " · local / offline online-config"),
    );
  } catch (err) {
    console.error("[racer] boot failed", err);
    const msg = err instanceof Error ? err.message : String(err);
    const gate = document.createElement("div");
    gate.className = "mobile-gate";
    gate.innerHTML = `<div class="mobile-gate-inner"><h1>GRAPHICS ERROR</h1><p>${msg.replace(/[<>&]/g, "")}</p><p>Try Chrome/Edge, update GPU drivers, or disable browser hardware acceleration and reload.</p></div>`;
    document.body.appendChild(gate);
  }
}
