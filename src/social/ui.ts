/**
 * Friends / Find / Requests / Chat social hub UI.
 */
import { fetchProfile, shortNpub } from "../nostr/profile";
import { getSession, onSessionChange } from "../nostr/session";
import { ensureNostrLogin, getCurrentProfile } from "../nostr/ui";
import { sendHeartbeat, setPresenceIdentity } from "../net/presence";
import {
  addFriend,
  dismissIncomingRequest,
  hasOutgoingRequest,
  isFriend,
  isWeakFriendName,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriend,
  updateFriendName,
  upsertIncomingRequest,
  upsertOutgoingRequest,
  type Friend,
} from "./friends";
import { searchPlayers, registerPlayer, type DirectoryPlayer } from "./directory";
import {
  friendRequestName,
  sendDm,
  subscribeInbox,
  subscribeThread,
  type DmMessage,
} from "./dm";
import {
  clearFriendAccept,
  fetchFriendRequests,
  postFriendAccept,
  postFriendDecline,
  postFriendRequest,
  syncLocalFriendState,
} from "./friendRequestsApi";
import {
  armAllSchedules,
  buildInviteJoinUrl,
  ackLobbyInvite,
  fetchLobbyInvites,
  onInviteJoin,
  rememberInviteFromDm,
  type LobbyInviteRow,
} from "./organize";
import { claimNotification, markNotificationSeen } from "./seenNotifs";
import { ensureBrowserNotifyPermission, notifyLobbyInvite } from "./browserNotify";

export type SocialHubCallbacks = {
  onJoinInvite: (invite: { room: string; password: string; eventMode?: boolean }) => void;
  /** Host creates this room and enters the lobby after invites are sent. */
  onHostLobby: (invite: { room: string; password: string }) => void;
  showToast: (text: string) => void;
  isRacing?: () => boolean;
};

type Tab = "entry" | "find" | "requests" | "friends" | "chat";

let callbacks: SocialHubCallbacks | null = null;
let activeTab: Tab = "entry";
let chatPeer: Friend | null = null;
let stopThread: (() => void) | null = null;
let stopInbox: (() => void) | null = null;
let threadMessages: DmMessage[] = [];
let searchTimer: number | null = null;
let requestPollTimer: number | null = null;
let lobbyPollTimer: number | null = null;
let searchSeq = 0;

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function myDisplayName(): string {
  const session = getSession();
  if (!session) return "RACER";
  const profile = getCurrentProfile();
  return (profile?.displayName || profile?.name || "RACER").slice(0, 24);
}

/** Prefer a real peer label — never store our own display name as theirs. */
function peerLabel(pubkey: string, candidate: string): string {
  const mine = myDisplayName().trim().toLowerCase();
  const cleaned = String(candidate || "").trim();
  if (!cleaned || cleaned.toLowerCase() === mine) return shortNpub(pubkey);
  return cleaned.slice(0, 24);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function syncPresenceFromSession(): void {
  const session = getSession();
  if (!session) {
    setPresenceIdentity(null);
    stopInbox?.();
    stopInbox = null;
    return;
  }
  const name = myDisplayName();
  setPresenceIdentity({ pubkey: session.pubkey, name });
  void sendHeartbeat();
  void registerPlayer(session.pubkey, name);
  armAllSchedules(session.pubkey);
  // Inbox starts only when Friends hub opens — never on cold boot (decrypt spam).
}

function notifyFriendMessage(msg: DmMessage): void {
  if (msg.friendRequest || msg.friendAccept || msg.invite) return;
  const session = getSession();
  if (!session || msg.from === session.pubkey.toLowerCase()) return;
  if (!isFriend(session.pubkey, msg.from)) return;
  // Don't spam if you're already looking at that thread
  if (chatPeer?.pubkey === msg.from && isSocialHubOpen() && activeTab === "chat") {
    markNotificationSeen(session.pubkey, msg.id);
    return;
  }
  if (!shouldToast(session.pubkey, msg)) return;
  if (callbacks?.isRacing?.()) {
    markNotificationSeen(session.pubkey, msg.id);
    return;
  }
  const friends = listFriends(session.pubkey);
  const name = friends.find((f) => f.pubkey === msg.from)?.name || shortNpub(msg.from);
  const preview = msg.plaintext.length > 40 ? `${msg.plaintext.slice(0, 40)}…` : msg.plaintext;
  callbacks?.showToast(`${name}: ${preview}`);
}

/** First-time toast only; skip backlog older than ~2 minutes and anything already shown. */
function shouldToast(ownerPubkey: string, msg: DmMessage): boolean {
  if (!claimNotification(ownerPubkey, msg.id)) return false;
  if (msg.createdAt < Date.now() - 120_000) return false;
  return true;
}

function restartInbox(): void {
  stopInbox?.();
  stopInbox = null;
  const session = getSession();
  if (!session) return;
  stopInbox = subscribeInbox({
    onMessage: (msg) => {
      if (msg.friendRequest) {
        const name = friendRequestName(msg.plaintext);
        upsertIncomingRequest(session.pubkey, { pubkey: msg.from, name });
        if (msg.from !== session.pubkey.toLowerCase() && shouldToast(session.pubkey, msg)) {
          if (!callbacks?.isRacing?.()) callbacks?.showToast(`Friend request from ${name}`);
        } else {
          markNotificationSeen(session.pubkey, msg.id);
        }
        if (activeTab === "requests") renderRequests();
        else updateRequestBadge();
        return;
      }
      if (msg.friendAccept) {
        const name = peerLabel(msg.from, friendRequestName(msg.plaintext));
        addFriend(session.pubkey, { pubkey: msg.from, name });
        void refreshFriendDisplayNames(session.pubkey).then(() => void refreshActiveLists());
        if (shouldToast(session.pubkey, msg) && !callbacks?.isRacing?.()) {
          callbacks?.showToast(`${name} accepted your friend request`);
        }
        void refreshActiveLists();
        return;
      }
      if (msg.invite) {
        rememberInviteFromDm(session.pubkey, msg.invite, msg.from);
        if (msg.from !== session.pubkey.toLowerCase() && shouldToast(session.pubkey, msg)) {
          if (!callbacks?.isRacing?.()) {
            const who = msg.invite.fromName || shortNpub(msg.from);
            const room = msg.invite.room || "lobby";
            callbacks?.showToast(`${who} has sent you a ${room} lobby request`);
          }
        } else {
          markNotificationSeen(session.pubkey, msg.id);
        }
      }
      if (chatPeer && (msg.from === chatPeer.pubkey || msg.to === chatPeer.pubkey)) {
        if (!msg.friendRequest && !msg.friendAccept) {
          upsertThreadMessage(msg);
          renderChatMessages();
        }
      }
      notifyFriendMessage(msg);
    },
  });
}

/** Only decrypt DMs when the user opens Chat — never on Find / add-friend. */
function ensureInboxRunning(): void {
  if (stopInbox) return;
  restartInbox();
}

function stopRequestPoll(): void {
  if (requestPollTimer != null) {
    window.clearInterval(requestPollTimer);
    requestPollTimer = null;
  }
}

function startRequestPoll(): void {
  stopRequestPoll();
  void syncFriendRequestsFromServer();
  void syncLobbyInvitesFromServer();
  requestPollTimer = window.setInterval(() => {
    void syncFriendRequestsFromServer();
    void syncLobbyInvitesFromServer();
  }, 12_000);
}

function stopLobbyPoll(): void {
  if (lobbyPollTimer != null) {
    window.clearInterval(lobbyPollTimer);
    lobbyPollTimer = null;
  }
}

function startLobbyPoll(): void {
  stopLobbyPoll();
  void syncLobbyInvitesFromServer();
  lobbyPollTimer = window.setInterval(() => {
    void syncLobbyInvitesFromServer();
  }, 4_000);
}

/** Drop-down JOIN bar — works from home, Friends, MP menus (not only Chat). */
function presentLobbyInviteBanner(inv: LobbyInviteRow, who: string): void {
  const session = getSession();
  if (!session) return;
  const banner = el("social-invite-banner");
  if (!banner) return;
  banner.classList.remove("hidden");
  banner.replaceChildren();
  const text = document.createElement("span");
  text.textContent = `${who} invited you to ${inv.room}`;
  const join = document.createElement("button");
  join.type = "button";
  join.className = "social-mini";
  join.textContent = "JOIN";
  join.addEventListener("click", () => {
    banner.classList.add("hidden");
    void ackLobbyInvite(session.pubkey, inv.id);
    callbacks?.onJoinInvite({ room: inv.room, password: inv.password });
  });
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "btn-ghost social-mini";
  dismiss.textContent = "LATER";
  dismiss.addEventListener("click", () => {
    banner.classList.add("hidden");
  });
  banner.append(text, join, dismiss);
  // Retrigger slide-down when a new invite replaces the previous one.
  banner.style.animation = "none";
  void banner.offsetWidth;
  banner.style.animation = "";
}

/** Server-targeted lobby invites — banner + browser notify, independent of Chat. */
async function syncLobbyInvitesFromServer(): Promise<void> {
  const session = getSession();
  if (!session) return;
  const invites = (await fetchLobbyInvites(session.pubkey))
    .filter((inv) => inv.from !== session.pubkey.toLowerCase())
    .sort((a, b) => a.at - b.at);
  if (!invites.length) return;

  const racing = !!callbacks?.isRacing?.();
  // Always keep the newest invite on the drop-down bar when not mid-race.
  if (!racing) {
    const newest = invites[invites.length - 1]!;
    const who = newest.fromName || shortNpub(newest.from);
    presentLobbyInviteBanner(newest, who);
  }

  for (const inv of invites) {
    const notifId = `lobby:${inv.id}`;
    if (!claimNotification(session.pubkey, notifId)) continue;
    const who = inv.fromName || shortNpub(inv.from);
    // OS notification when the tab is backgrounded (Chrome / etc.).
    notifyLobbyInvite({ who, room: inv.room, tag: notifId });
    if (!racing) {
      callbacks?.showToast(`${who} has sent you a ${inv.room} lobby request`);
    }
  }
}

/** Pull friend requests from the game server (JSON only — no extension prompts). */
async function syncFriendRequestsFromServer(): Promise<void> {
  const session = getSession();
  if (!session) return;
  const me = session.pubkey;
  const name = myDisplayName();

  // Heal first: push this browser's local inbox so a server redeploy can't wipe it.
  const healed = await syncLocalFriendState({
    from: me,
    fromName: name,
    outgoing: listOutgoingRequests(me),
    incoming: listIncomingRequests(me),
    friends: listFriends(me).map((f) => ({ pubkey: f.pubkey, name: f.name, at: f.addedAt })),
  });
  const snap = healed ?? (await fetchFriendRequests(me));
  if (!snap) return;

  let changed = false;
  for (const row of snap.incoming) {
    upsertIncomingRequest(me, { pubkey: row.pubkey, name: row.name });
    changed = true;
  }
  for (const row of snap.outgoing) {
    upsertOutgoingRequest(me, { pubkey: row.pubkey, name: row.name });
  }
  for (const row of snap.friends) {
    if (row.pubkey === me.toLowerCase()) continue;
    const label = peerLabel(row.pubkey, row.name);
    if (!isFriend(me, row.pubkey)) {
      addFriend(me, { pubkey: row.pubkey, name: label });
      changed = true;
    } else if (label !== shortNpub(row.pubkey)) {
      // Heal friends that were wrongly saved under our own display name.
      const cur = listFriends(me).find((f) => f.pubkey === row.pubkey);
      if (cur && cur.name.trim().toLowerCase() === name.trim().toLowerCase()) {
        updateFriendName(me, row.pubkey, label);
        changed = true;
      }
    }
  }
  for (const row of snap.accepted) {
    if (row.pubkey === me.toLowerCase()) continue;
    const label = peerLabel(row.pubkey, row.name);
    if (!isFriend(me, row.pubkey)) {
      addFriend(me, { pubkey: row.pubkey, name: label });
      if (!callbacks?.isRacing?.()) {
        callbacks?.showToast(`${label} accepted your friend request`);
      }
      changed = true;
    }
    void clearFriendAccept(me, row.pubkey, name);
  }
  if (changed) {
    if (activeTab === "requests") renderRequests();
    if (activeTab === "friends") renderFriends();
    if (activeTab === "chat") renderChatPeers();
    updateRequestBadge();
  } else {
    updateRequestBadge();
  }
}

/** Pull Nostr / directory names so friend chips never stick on "RACER". */
export async function refreshFriendDisplayNames(ownerPubkey?: string): Promise<Friend[]> {
  const session = getSession();
  const owner = ownerPubkey || session?.pubkey || "";
  if (!owner) return [];
  const friends = listFriends(owner);
  if (!friends.length) return friends;

  let directoryByPubkey = new Map<string, string>();
  try {
    const dir = await searchPlayers("");
    directoryByPubkey = new Map(dir.players.map((p) => [p.pubkey, p.name]));
  } catch {
    /* ignore */
  }

  await Promise.all(
    friends.map(async (f) => {
      const fromDir = directoryByPubkey.get(f.pubkey);
      if (fromDir && !isWeakFriendName(fromDir)) {
        updateFriendName(owner, f.pubkey, fromDir);
      }
      try {
        const profile = await fetchProfile(f.pubkey);
        const label = profile?.displayName || profile?.name;
        if (label && !isWeakFriendName(label)) {
          updateFriendName(owner, f.pubkey, label);
        } else if (isWeakFriendName(f.name) && fromDir && !isWeakFriendName(fromDir)) {
          updateFriendName(owner, f.pubkey, fromDir);
        }
      } catch {
        /* ignore */
      }
    }),
  );
  return listFriends(owner);
}

function updateRequestBadge(): void {
  const session = getSession();
  const btn = el("social-goto-requests");
  if (!btn || !session) return;
  const n = listIncomingRequests(session.pubkey).length;
  btn.textContent = n > 0 ? `REQUESTS (${n})` : "REQUESTS";
}

function showSocialView(tab: Tab): void {
  activeTab = tab;
  el("social-entry")?.classList.toggle("hidden", tab !== "entry");
  for (const id of ["find", "requests", "friends", "chat"] as const) {
    el(`social-pane-${id}`)?.classList.toggle("hidden", id !== tab);
  }
  if (tab === "find") {
    const q = (el<HTMLInputElement>("social-find-input")?.value || "").trim();
    if (q.length >= 1) void runSearch(q);
    else void showBrowsePlayers();
  }
  if (tab === "requests") {
    void syncFriendRequestsFromServer().then(() => renderRequests());
  }
  if (tab === "friends") renderFriends();
  if (tab === "chat") {
    ensureInboxRunning();
    renderChatPeers();
    syncChatWithLabel();
  }
  if (tab === "entry") {
    void syncFriendRequestsFromServer();
    updateRequestBadge();
  }
  updateRequestBadge();
}

function clearFindList(): void {
  const list = el("social-find-list");
  const status = el("social-find-status");
  if (status) status.textContent = "Type a username to search";
  if (list) list.innerHTML = `<p class="social-empty">Search to find racers</p>`;
}

function renderFindPlayers(players: DirectoryPlayer[], onlineSet: Set<string>, statusText: string): void {
  const list = el("social-find-list");
  const status = el("social-find-status");
  if (status) status.textContent = statusText;
  if (!list) return;
  list.innerHTML = players.length
    ? players.map((p) => playerRowHtml(p, { online: onlineSet.has(p.pubkey) })).join("")
    : `<p class="social-empty">No matches</p>`;
  bindRowActions(list);
}

/** Recent / online racers when the Find box is empty. */
async function showBrowsePlayers(): Promise<void> {
  const list = el("social-find-list");
  const status = el("social-find-status");
  if (!list) return;
  const seq = ++searchSeq;
  if (status) status.textContent = "Loading racers…";
  const result = await searchPlayers("");
  if (seq !== searchSeq) return;
  const session = getSession();
  const players = result.players.filter((p) => p.pubkey !== session?.pubkey.toLowerCase()).slice(0, 24);
  const onlineSet = new Set(result.online.map((p) => p.pubkey));
  if (result.source === "empty") {
    clearFindList();
    if (status) status.textContent = "Search unavailable — is the game server online?";
    return;
  }
  renderFindPlayers(
    players,
    onlineSet,
    players.length
      ? `${players.length} recent racer${players.length === 1 ? "" : "s"} — type to filter`
      : "Type a username to search",
  );
}

async function runSearch(query: string): Promise<void> {
  const list = el("social-find-list");
  const status = el("social-find-status");
  if (!list) return;
  const q = query.trim();
  if (q.length < 1) {
    void showBrowsePlayers();
    return;
  }
  const seq = ++searchSeq;
  if (status) status.textContent = "Searching…";
  const result = await searchPlayers(q);
  if (seq !== searchSeq) return;
  const session = getSession();
  const players = result.players.filter((p) => p.pubkey !== session?.pubkey.toLowerCase());
  const onlineSet = new Set(result.online.map((p) => p.pubkey));
  if (result.source === "empty") {
    renderFindPlayers([], onlineSet, "Search unavailable — is the game server online?");
    return;
  }
  renderFindPlayers(
    players,
    onlineSet,
    players.length
      ? `${players.length} match${players.length === 1 ? "" : "es"}`
      : "No players found",
  );
}

function playerRowHtml(
  player: { pubkey: string; name: string },
  opts: { online?: boolean; friend?: boolean } = {},
): string {
  const session = getSession();
  const me = session?.pubkey.toLowerCase() === player.pubkey;
  const friend = opts.friend ?? (session ? isFriend(session.pubkey, player.pubkey) : false);
  const outgoing = session ? hasOutgoingRequest(session.pubkey, player.pubkey) : false;
  let actions = "";
  if (!me) {
    if (friend) {
      actions = `<button type="button" class="btn-ghost social-mini" data-action="unfriend">REMOVE</button>
                 <button type="button" class="social-mini" data-action="chat">CHAT</button>`;
    } else if (outgoing) {
      actions = `<button type="button" class="btn-ghost social-mini" disabled>SENT</button>`;
    } else {
      actions = `<button type="button" class="social-mini" data-action="request">REQUEST</button>`;
    }
  }
  return `<div class="social-row" data-pubkey="${player.pubkey}">
    <div class="social-row-main">
      <span class="social-row-name">${escapeHtml(player.name)}</span>
      <span class="social-row-meta">${opts.online ? "ONLINE" : shortNpub(player.pubkey)}${me ? " · you" : ""}</span>
    </div>
    <div class="social-row-actions">${actions}</div>
  </div>`;
}

function renderFriends(): void {
  const list = el("social-friends-list");
  const status = el("social-friends-status");
  const session = getSession();
  if (!list || !session) return;
  const friends = listFriends(session.pubkey);
  if (status) {
    status.textContent = friends.length
      ? `${friends.length} friend${friends.length === 1 ? "" : "s"}`
      : "No friends yet — search Find and send a request";
  }
  list.innerHTML = friends.length
    ? friends.map((f) => playerRowHtml(f, { friend: true })).join("")
    : `<p class="social-empty">Accepted friends show up here</p>`;
  bindRowActions(list);
}

function renderRequests(): void {
  const list = el("social-requests-list");
  const status = el("social-requests-status");
  const session = getSession();
  if (!list || !session) return;
  const incoming = listIncomingRequests(session.pubkey);
  if (status) {
    status.textContent = incoming.length
      ? `${incoming.length} pending request${incoming.length === 1 ? "" : "s"}`
      : "No friend requests";
  }
  list.innerHTML = incoming.length
    ? incoming
        .map(
          (r) => `<div class="social-row" data-pubkey="${r.pubkey}">
            <div class="social-row-main">
              <span class="social-row-name">${escapeHtml(r.name)}</span>
              <span class="social-row-meta">${shortNpub(r.pubkey)}</span>
            </div>
            <div class="social-row-actions">
              <button type="button" class="social-mini" data-action="accept">YES</button>
              <button type="button" class="btn-ghost social-mini" data-action="decline">NO</button>
            </div>
          </div>`,
        )
        .join("")
    : `<p class="social-empty">When someone requests you, YES / NO shows here</p>`;
  bindRowActions(list);
  updateRequestBadge();
}

function bindRowActions(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(".social-row").forEach((row) => {
    const pubkey = row.dataset.pubkey || "";
    const name =
      row.querySelector(".social-row-name")?.textContent?.trim() || shortNpub(pubkey);
    row.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((btn) => {
      btn.onclick = () => {
        const session = getSession();
        if (!session || !pubkey) return;
        const action = btn.dataset.action;
        if (action === "request") {
          void sendFriendRequest(pubkey, name);
        } else if (action === "unfriend") {
          removeFriend(session.pubkey, pubkey);
          if (chatPeer?.pubkey === pubkey) {
            chatPeer = null;
            stopThread?.();
            stopThread = null;
          }
          callbacks?.showToast(`Removed ${name}`);
          void refreshActiveLists();
        } else if (action === "chat") {
          if (!isFriend(session.pubkey, pubkey)) {
            callbacks?.showToast("Accept a friend request before chatting");
            return;
          }
          openChatWith({ pubkey, name, addedAt: Date.now() });
        } else if (action === "accept") {
          void acceptFriendRequest(pubkey, name);
        } else if (action === "decline") {
          void declineFriendRequest(pubkey, name);
        }
      };
    });
  });
}

async function sendFriendRequest(pubkey: string, name: string): Promise<void> {
  const session = getSession();
  if (!session) return;
  if (isFriend(session.pubkey, pubkey)) {
    callbacks?.showToast("Already friends");
    return;
  }
  const snap = await postFriendRequest(session.pubkey, pubkey, myDisplayName());
  if (!snap) {
    callbacks?.showToast("Could not send request — try again");
    return;
  }
  if (snap.accepted.some((r) => r.pubkey === pubkey.toLowerCase()) || isFriend(session.pubkey, pubkey)) {
    addFriend(session.pubkey, { pubkey, name: peerLabel(pubkey, name) });
    callbacks?.showToast(`You and ${name} are friends`);
  } else {
    upsertOutgoingRequest(session.pubkey, { pubkey, name });
    callbacks?.showToast(`Friend request sent to ${name}`);
  }
  void refreshActiveLists();
}

async function acceptFriendRequest(pubkey: string, name: string): Promise<void> {
  const session = getSession();
  if (!session) return;
  const label = peerLabel(pubkey, name);
  addFriend(session.pubkey, { pubkey, name: label });
  const snap = await postFriendAccept(session.pubkey, pubkey, myDisplayName());
  if (!snap) {
    callbacks?.showToast(`Friends with ${label} on this device — sync failed`);
  } else {
    callbacks?.showToast(`You and ${label} are friends`);
  }
  void refreshFriendDisplayNames(session.pubkey).then(() => void refreshActiveLists());
  void refreshActiveLists();
}

async function declineFriendRequest(pubkey: string, name: string): Promise<void> {
  const session = getSession();
  if (!session) return;
  dismissIncomingRequest(session.pubkey, pubkey);
  void postFriendDecline(session.pubkey, pubkey, myDisplayName());
  callbacks?.showToast(`Declined ${name}`);
  renderRequests();
}

async function refreshActiveLists(): Promise<void> {
  if (activeTab === "find") {
    const q = (el<HTMLInputElement>("social-find-input")?.value || "").trim();
    if (q.length >= 1) await runSearch(q);
    else await showBrowsePlayers();
  }
  if (activeTab === "requests") renderRequests();
  if (activeTab === "friends") renderFriends();
  if (activeTab === "chat") renderChatPeers();
  if (activeTab === "entry") updateRequestBadge();
  updateRequestBadge();
}

function syncChatWithLabel(): void {
  const label = el("social-chat-with");
  if (!label) return;
  label.textContent = chatPeer ? chatPeer.name.toUpperCase() : "Pick a friend below";
}

function formatChatTime(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function renderChatPeers(): void {
  const peers = el("social-chat-peers");
  const session = getSession();
  if (!peers || !session) return;
  const me = session.pubkey.toLowerCase();
  const mine = myDisplayName().trim().toLowerCase();
  const seen = new Set<string>();
  const friends = listFriends(session.pubkey).filter((f) => {
    if (!f.pubkey || f.pubkey === me || seen.has(f.pubkey)) return false;
    seen.add(f.pubkey);
    return true;
  });
  // Heal chips that still show our own name from the old sync bug.
  for (const f of friends) {
    if (f.name.trim().toLowerCase() === mine) {
      updateFriendName(session.pubkey, f.pubkey, shortNpub(f.pubkey));
      f.name = shortNpub(f.pubkey);
      void refreshFriendDisplayNames(session.pubkey).then(() => {
        if (activeTab === "chat") renderChatPeers();
      });
    }
  }
  peers.innerHTML = friends.length
    ? friends
        .map(
          (f) =>
            `<button type="button" class="garage-kind-btn${chatPeer?.pubkey === f.pubkey ? " is-active" : ""}" data-pubkey="${f.pubkey}">${escapeHtml(f.name).toUpperCase()}</button>`,
        )
        .join("")
    : `<p class="social-empty">Accept a friend request to chat</p>`;
  peers.querySelectorAll<HTMLButtonElement>("[data-pubkey]").forEach((btn) => {
    btn.onclick = () => {
      const pubkey = btn.dataset.pubkey || "";
      const friend = friends.find((f) => f.pubkey === pubkey);
      if (friend) openChatWith(friend);
    };
  });
  renderChatMessages();
}

function openChatWith(friend: Friend): void {
  const session = getSession();
  if (!session || !isFriend(session.pubkey, friend.pubkey)) {
    callbacks?.showToast("You can only chat with accepted friends");
    return;
  }
  ensureInboxRunning();
  chatPeer = friend;
  showSocialView("chat");
  renderChatPeers();
  syncChatWithLabel();
  threadMessages = [];
  stopThread?.();
  stopThread = subscribeThread(friend.pubkey, {
    onMessage: (msg) => {
      if (msg.friendRequest || msg.friendAccept) return;
      upsertThreadMessage(msg);
      renderChatMessages();
    },
  });
  renderChatMessages();
  el<HTMLInputElement>("social-chat-input")?.focus();
}

function upsertThreadMessage(msg: DmMessage): void {
  if (msg.friendRequest || msg.friendAccept) return;
  if (threadMessages.some((m) => m.id === msg.id)) return;
  threadMessages.push(msg);
  threadMessages.sort((a, b) => a.createdAt - b.createdAt);
  if (threadMessages.length > 120) threadMessages = threadMessages.slice(-120);
}

function renderChatMessages(): void {
  const box = el("social-chat-messages");
  if (!box) return;
  if (!chatPeer) {
    box.innerHTML = `<p class="social-empty">Pick a friend to chat</p>`;
    return;
  }
  const me = getSession()?.pubkey.toLowerCase();
  const visible = threadMessages.filter((m) => !m.friendRequest && !m.friendAccept);
  box.innerHTML = visible.length
    ? visible
        .map((m) => {
          const mine = m.from === me;
          const time = formatChatTime(m.createdAt);
          if (m.invite) {
            const who = m.invite.fromName || (mine ? "You" : shortNpub(m.from));
            const room = m.invite.room || "lobby";
            const body = mine
              ? `You sent a ${room} lobby request`
              : `${who} has sent you a ${room} lobby request`;
            const btn = mine
              ? ""
              : `<button type="button" class="social-mini" data-invite-id="${m.id}">JOIN</button>`;
            return `<div class="social-msg${mine ? " is-mine" : ""}"><div class="social-msg-bubble social-msg-invite"><span class="social-msg-text">${escapeHtml(body)}</span>${btn}<span class="social-msg-meta">${escapeHtml(time)}</span></div></div>`;
          }
          return `<div class="social-msg${mine ? " is-mine" : ""}"><div class="social-msg-bubble"><span class="social-msg-text">${escapeHtml(m.plaintext)}</span><span class="social-msg-meta">${escapeHtml(time)}</span></div></div>`;
        })
        .join("")
    : `<p class="social-empty">No messages yet — say hi</p>`;
  box.querySelectorAll<HTMLButtonElement>("[data-invite-id]").forEach((btn) => {
    btn.onclick = () => {
      const msg = visible.find((m) => m.id === btn.dataset.inviteId);
      if (!msg?.invite) return;
      closeSocialHub();
      callbacks?.onJoinInvite({
        room: msg.invite.room,
        password: msg.invite.password,
      });
    };
  });
  box.scrollTop = box.scrollHeight;
}

async function sendChat(e: Event): Promise<void> {
  e.preventDefault();
  if (!chatPeer) return;
  const session = getSession();
  if (!session || !isFriend(session.pubkey, chatPeer.pubkey)) {
    callbacks?.showToast("You can only chat with accepted friends");
    return;
  }
  const input = el<HTMLInputElement>("social-chat-input");
  const status = el("social-chat-status");
  const text = (input?.value || "").trim();
  if (!text) return;
  if (input) input.value = "";
  if (status) status.textContent = "Sending…";
  try {
    const msg = await sendDm(chatPeer.pubkey, text);
    upsertThreadMessage(msg);
    renderChatMessages();
    if (status) status.textContent = "";
  } catch (err) {
    if (status) status.textContent = err instanceof Error ? err.message : "Send failed";
  }
}

export function openSocialHub(): void {
  const hub = el("social-hub");
  if (!hub) return;
  document.getElementById("overlay")?.classList.add("hidden");
  document.getElementById("map-select")?.classList.add("hidden");
  document.getElementById("leaderboard")?.classList.add("hidden");
  document.getElementById("garage")?.classList.add("hidden");
  document.getElementById("multiplayer")?.classList.add("hidden");
  document.getElementById("dev-dash")?.classList.add("hidden");
  hub.classList.remove("hidden");
  syncPresenceFromSession();
  // Do NOT start the encrypted DM inbox here — that decrypt storm asks for
  // many extension permissions. Friend requests use the game server; Chat
  // starts the inbox only when opened.
  startRequestPoll();
  showSocialView("entry");
  const session = getSession();
  if (session) {
    void refreshFriendDisplayNames(session.pubkey).then(() => {
      if (activeTab === "friends") renderFriends();
      if (activeTab === "chat") renderChatPeers();
    });
  }
}

export function closeSocialHub(): void {
  el("social-hub")?.classList.add("hidden");
  document.getElementById("overlay")?.classList.remove("hidden");
  stopThread?.();
  stopThread = null;
  stopInbox?.();
  stopInbox = null;
  stopRequestPoll();
  chatPeer = null;
  showSocialView("entry");
}

export function isSocialHubOpen(): boolean {
  const hub = el("social-hub");
  return !!hub && !hub.classList.contains("hidden");
}

export function initSocialUi(cbs: SocialHubCallbacks): void {
  callbacks = cbs;
  onInviteJoin((invite) => {
    cbs.onJoinInvite({ room: invite.room, password: invite.password });
  });

  document.getElementById("home-friends-btn")?.addEventListener("click", () => {
    ensureBrowserNotifyPermission();
    void ensureNostrLogin("Sign in with Nostr to find friends and chat").then((session) => {
      if (session) openSocialHub();
    });
  });
  document.getElementById("multiplayer-btn")?.addEventListener("click", () => {
    ensureBrowserNotifyPermission();
  });
  document.getElementById("social-back-btn")?.addEventListener("click", () => closeSocialHub());

  const go = (tab: Tab) => () => showSocialView(tab);
  document.getElementById("social-goto-friends")?.addEventListener("click", go("friends"));
  document.getElementById("social-goto-find")?.addEventListener("click", go("find"));
  document.getElementById("social-goto-requests")?.addEventListener("click", go("requests"));
  document.getElementById("social-goto-chat")?.addEventListener("click", go("chat"));

  for (const id of ["friends", "find", "requests", "chat"] as const) {
    document.getElementById(`social-${id}-back`)?.addEventListener("click", () => showSocialView("entry"));
  }

  el<HTMLInputElement>("social-find-input")?.addEventListener("input", () => {
    if (searchTimer) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      const q = el<HTMLInputElement>("social-find-input")?.value || "";
      void runSearch(q);
    }, 280);
  });
  document.getElementById("social-find-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = el<HTMLInputElement>("social-find-input")?.value || "";
    void runSearch(q);
  });

  document.getElementById("social-chat-form")?.addEventListener("submit", (e) => {
    void sendChat(e);
  });

  // Pull invites immediately when returning to the tab.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && getSession()) {
      void syncLobbyInvitesFromServer();
    }
  });

  onSessionChange((session) => {
    syncPresenceFromSession();
    if (!session) {
      stopRequestPoll();
      stopLobbyPoll();
      closeSocialHub();
      el("social-invite-banner")?.classList.add("hidden");
      chatPeer = null;
      stopThread?.();
      stopThread = null;
    } else {
      void syncFriendRequestsFromServer();
      startLobbyPoll();
    }
  });

  syncPresenceFromSession();
  if (getSession()) {
    void syncFriendRequestsFromServer();
    startLobbyPoll();
  }
}

export function inviteLinkFor(room: string, password: string): string {
  return buildInviteJoinUrl({ room, password });
}
