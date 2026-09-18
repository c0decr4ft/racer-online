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
  removeFriend,
  updateFriendName,
  upsertIncomingRequest,
  upsertOutgoingRequest,
  type Friend,
} from "./friends";
import { searchPlayers, registerPlayer, type DirectoryPlayer } from "./directory";
import {
  friendAcceptPlaintext,
  friendRequestName,
  friendRequestPlaintext,
  sendDm,
  subscribeInbox,
  subscribeThread,
  type DmMessage,
} from "./dm";
import {
  armAllSchedules,
  buildInviteJoinUrl,
  onInviteJoin,
  rememberInviteFromDm,
} from "./organize";
import { claimNotification, markNotificationSeen } from "./seenNotifs";

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

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function myDisplayName(): string {
  const session = getSession();
  if (!session) return "RACER";
  const profile = getCurrentProfile();
  return (profile?.displayName || profile?.name || "RACER").slice(0, 24);
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
    return;
  }
  const name = myDisplayName();
  setPresenceIdentity({ pubkey: session.pubkey, name });
  void sendHeartbeat();
  void registerPlayer(session.pubkey, name);
  armAllSchedules(session.pubkey);
  restartInbox();
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
          callbacks?.showToast(`Friend request from ${name}`);
        } else {
          markNotificationSeen(session.pubkey, msg.id);
        }
        if (activeTab === "requests") renderRequests();
        else updateRequestBadge();
        return;
      }
      if (msg.friendAccept) {
        const name = friendRequestName(msg.plaintext);
        addFriend(session.pubkey, { pubkey: msg.from, name });
        void refreshFriendDisplayNames(session.pubkey).then(() => void refreshActiveLists());
        if (shouldToast(session.pubkey, msg)) {
          callbacks?.showToast(`${name} accepted your friend request`);
        }
        void refreshActiveLists();
        return;
      }
      if (msg.invite) {
        rememberInviteFromDm(session.pubkey, msg.invite, msg.from);
        if (msg.from !== session.pubkey.toLowerCase() && shouldToast(session.pubkey, msg)) {
          const who = msg.invite.fromName || shortNpub(msg.from);
          const room = msg.invite.room || "lobby";
          callbacks?.showToast(`${who} has sent you a ${room} lobby request`);
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
    if (q.length >= 2) void runSearch(q);
    else clearFindList();
  }
  if (tab === "requests") renderRequests();
  if (tab === "friends") renderFriends();
  if (tab === "chat") {
    renderChatPeers();
    syncChatWithLabel();
  }
  if (tab === "entry") updateRequestBadge();
  updateRequestBadge();
}

function clearFindList(): void {
  const list = el("social-find-list");
  const status = el("social-find-status");
  if (status) status.textContent = "Type a username to search";
  if (list) list.innerHTML = `<p class="social-empty">Search to find racers</p>`;
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

async function runSearch(query: string): Promise<void> {
  const list = el("social-find-list");
  const status = el("social-find-status");
  if (!list) return;
  const q = query.trim();
  if (q.length < 2) {
    clearFindList();
    return;
  }
  if (status) status.textContent = "Searching…";
  const result = await searchPlayers(q);
  const session = getSession();
  const players = result.players.filter((p) => p.pubkey !== session?.pubkey.toLowerCase());
  const onlineSet = new Set(result.online.map((p) => p.pubkey));
  if (status) {
    status.textContent =
      result.source === "empty"
        ? "Search unavailable — is the game server online?"
        : players.length
          ? `${players.length} match${players.length === 1 ? "" : "es"}`
          : "No players found";
  }
  list.innerHTML = players.length
    ? players
        .map((p: DirectoryPlayer) => playerRowHtml(p, { online: onlineSet.has(p.pubkey) }))
        .join("")
    : `<p class="social-empty">No matches</p>`;
  bindRowActions(list);
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
          dismissIncomingRequest(session.pubkey, pubkey);
          callbacks?.showToast(`Declined ${name}`);
          renderRequests();
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
  try {
    await sendDm(pubkey, friendRequestPlaintext(myDisplayName()));
    upsertOutgoingRequest(session.pubkey, { pubkey, name });
    callbacks?.showToast(`Friend request sent to ${name}`);
    void refreshActiveLists();
  } catch (err) {
    callbacks?.showToast(err instanceof Error ? err.message : "Request failed");
  }
}

async function acceptFriendRequest(pubkey: string, name: string): Promise<void> {
  const session = getSession();
  if (!session) return;
  addFriend(session.pubkey, { pubkey, name });
  try {
    await sendDm(pubkey, friendAcceptPlaintext(myDisplayName()));
  } catch {
    /* still friends locally */
  }
  callbacks?.showToast(`You and ${name} are friends`);
  void refreshActiveLists();
}

async function refreshActiveLists(): Promise<void> {
  if (activeTab === "find") {
    const q = (el<HTMLInputElement>("social-find-input")?.value || "").trim();
    if (q.length >= 2) await runSearch(q);
    else clearFindList();
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
  const friends = listFriends(session.pubkey);
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
  document.getElementById("map-select")?.classList.add("hidden");
  document.getElementById("leaderboard")?.classList.add("hidden");
  document.getElementById("garage")?.classList.add("hidden");
  document.getElementById("multiplayer")?.classList.add("hidden");
  document.getElementById("dev-dash")?.classList.add("hidden");
  hub.classList.remove("hidden");
  syncPresenceFromSession();
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
  stopThread?.();
  stopThread = null;
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
    void ensureNostrLogin("Sign in with Nostr to find friends and chat").then((session) => {
      if (session) openSocialHub();
    });
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

  onSessionChange((session) => {
    syncPresenceFromSession();
    if (!session) {
      closeSocialHub();
      chatPeer = null;
      stopThread?.();
      stopThread = null;
    }
  });

  syncPresenceFromSession();
}

export function inviteLinkFor(room: string, password: string): string {
  return buildInviteJoinUrl({ room, password });
}
