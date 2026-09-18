/**
 * Friends / Find / Online / Chat / Organize social hub UI.
 */
import { fetchProfile, profileLabel, shortNpub } from "../nostr/profile";
import { getSession, onSessionChange } from "../nostr/session";
import { ensureNostrLogin, getCurrentProfile } from "../nostr/ui";
import { sendHeartbeat, setPresenceIdentity } from "../net/presence";
import { addFriend, isFriend, listFriends, removeFriend, type Friend } from "./friends";
import { searchPlayers, registerPlayer, type DirectoryPlayer } from "./directory";
import { sendDm, subscribeInbox, subscribeThread, type DmMessage } from "./dm";
import {
  armAllSchedules,
  buildInviteJoinUrl,
  listSchedules,
  onInviteJoin,
  organizeRace,
  rememberInviteFromDm,
  type ScheduledRace,
} from "./organize";

export type SocialHubCallbacks = {
  onJoinInvite: (invite: { room: string; password: string; eventMode?: boolean }) => void;
  showToast: (text: string) => void;
};

type Tab = "online" | "find" | "friends" | "chat" | "organize";

let callbacks: SocialHubCallbacks | null = null;
let activeTab: Tab = "online";
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

function restartInbox(): void {
  stopInbox?.();
  stopInbox = null;
  const session = getSession();
  if (!session) return;
  stopInbox = subscribeInbox({
    onMessage: (msg) => {
      if (msg.invite) {
        rememberInviteFromDm(session.pubkey, msg.invite, msg.from);
        if (msg.from !== session.pubkey) {
          callbacks?.showToast(
            `Race invite from ${msg.invite.fromName || shortNpub(msg.from)} · ${new Date(msg.invite.at).toLocaleString()}`,
          );
        }
      }
      if (chatPeer && (msg.from === chatPeer.pubkey || msg.to === chatPeer.pubkey)) {
        upsertThreadMessage(msg);
        renderChatMessages();
      }
    },
  });
}

function setTab(tab: Tab): void {
  activeTab = tab;
  for (const id of ["online", "find", "friends", "chat", "organize"] as const) {
    el(`social-tab-${id}`)?.classList.toggle("is-active", id === tab);
    el(`social-pane-${id}`)?.classList.toggle("hidden", id !== tab);
  }
  if (tab === "online") void refreshOnline();
  if (tab === "find") void runSearch(el<HTMLInputElement>("social-find-input")?.value || "");
  if (tab === "friends") renderFriends();
  if (tab === "chat") renderChatPeers();
  if (tab === "organize") renderOrganize();
}

function playerRowHtml(
  player: { pubkey: string; name: string },
  opts: { online?: boolean; friend?: boolean },
): string {
  const session = getSession();
  const me = session?.pubkey.toLowerCase() === player.pubkey;
  const friend = opts.friend ?? (session ? isFriend(session.pubkey, player.pubkey) : false);
  return `<div class="social-row" data-pubkey="${player.pubkey}">
    <div class="social-row-main">
      <span class="social-row-name">${escapeHtml(player.name)}</span>
      <span class="social-row-meta">${opts.online ? "ONLINE" : shortNpub(player.pubkey)}${me ? " · you" : ""}</span>
    </div>
    <div class="social-row-actions">
      ${
        me
          ? ""
          : friend
            ? `<button type="button" class="btn-ghost social-mini" data-action="unfriend">REMOVE</button>
               <button type="button" class="social-mini" data-action="chat">CHAT</button>`
            : `<button type="button" class="social-mini" data-action="add">ADD</button>`
      }
    </div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function refreshOnline(): Promise<void> {
  const list = el("social-online-list");
  const status = el("social-online-status");
  if (!list) return;
  if (status) status.textContent = "Loading…";
  const result = await searchPlayers("");
  const session = getSession();
  const online = result.online.filter((p) => p.pubkey !== session?.pubkey.toLowerCase());
  if (status) {
    status.textContent =
      result.source === "empty"
        ? "Directory unavailable — is the game server online?"
        : online.length
          ? `${online.length} signed-in racer${online.length === 1 ? "" : "s"} online`
          : "Nobody else online right now";
  }
  list.innerHTML = online.length
    ? online.map((p) => playerRowHtml(p, { online: true })).join("")
    : `<p class="social-empty">No signed-in players online</p>`;
  bindRowActions(list);
}

async function runSearch(query: string): Promise<void> {
  const list = el("social-find-list");
  const status = el("social-find-status");
  if (!list) return;
  if (status) status.textContent = "Searching…";
  const result = await searchPlayers(query);
  const players = result.players;
  const onlineSet = new Set(result.online.map((p) => p.pubkey));
  if (status) {
    status.textContent =
      result.source === "empty"
        ? "Search unavailable — is the game server online?"
        : players.length
          ? `${players.length} match${players.length === 1 ? "" : "es"}`
          : query.trim()
            ? "No players found — they need a Sats Racer score or sign-in"
            : "No players in the directory yet";
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
  if (status) status.textContent = friends.length ? `${friends.length} friend${friends.length === 1 ? "" : "s"}` : "No friends yet — use Find";
  list.innerHTML = friends.length
    ? friends.map((f) => playerRowHtml(f, { friend: true })).join("")
    : `<p class="social-empty">Add friends from Find or Online</p>`;
  bindRowActions(list);
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
        if (action === "add") {
          addFriend(session.pubkey, { pubkey, name });
          callbacks?.showToast(`Added ${name}`);
          void refreshActiveLists();
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
          openChatWith({ pubkey, name, addedAt: Date.now() });
        }
      };
    });
  });
}

async function refreshActiveLists(): Promise<void> {
  if (activeTab === "online") await refreshOnline();
  if (activeTab === "find") {
    const q = (el<HTMLInputElement>("social-find-input")?.value || "").trim();
    await runSearch(q);
  }
  if (activeTab === "friends") renderFriends();
  if (activeTab === "chat") renderChatPeers();
  if (activeTab === "organize") renderOrganize();
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
            `<button type="button" class="social-peer-btn${chatPeer?.pubkey === f.pubkey ? " is-active" : ""}" data-pubkey="${f.pubkey}">${escapeHtml(f.name)}</button>`,
        )
        .join("")
    : `<p class="social-empty">Add a friend to start chatting</p>`;
  peers.querySelectorAll<HTMLButtonElement>(".social-peer-btn").forEach((btn) => {
    btn.onclick = () => {
      const pubkey = btn.dataset.pubkey || "";
      const friend = friends.find((f) => f.pubkey === pubkey);
      if (friend) openChatWith(friend);
    };
  });
  renderChatMessages();
}

function openChatWith(friend: Friend): void {
  chatPeer = friend;
  if (!isFriend(getSession()!.pubkey, friend.pubkey)) {
    addFriend(getSession()!.pubkey, friend);
  }
  setTab("chat");
  renderChatPeers();
  const title = el("social-chat-title");
  if (title) title.textContent = friend.name;
  threadMessages = [];
  stopThread?.();
  stopThread = subscribeThread(friend.pubkey, {
    onMessage: (msg) => {
      upsertThreadMessage(msg);
      renderChatMessages();
    },
  });
  renderChatMessages();
  el<HTMLInputElement>("social-chat-input")?.focus();
}

function upsertThreadMessage(msg: DmMessage): void {
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
  box.innerHTML = threadMessages.length
    ? threadMessages
        .map((m) => {
          const mine = m.from === me;
          const invite = m.invite
            ? `<button type="button" class="social-mini" data-invite-id="${m.id}">JUMP IN</button>`
            : "";
          const body = m.invite
            ? `Race invite · ${m.invite.room} · ${new Date(m.invite.at).toLocaleString()}`
            : m.plaintext;
          return `<div class="social-msg${mine ? " is-mine" : ""}"><div class="social-msg-bubble">${escapeHtml(body)}${invite}</div></div>`;
        })
        .join("")
    : `<p class="social-empty">No messages yet — say hi</p>`;
  box.querySelectorAll<HTMLButtonElement>("[data-invite-id]").forEach((btn) => {
    btn.onclick = () => {
      const msg = threadMessages.find((m) => m.id === btn.dataset.inviteId);
      if (!msg?.invite) return;
      callbacks?.onJoinInvite({
        room: msg.invite.room,
        password: msg.invite.password,
      });
    };
  });
  box.scrollTop = box.scrollHeight;
}

function renderOrganize(): void {
  const friendsBox = el("social-org-friends");
  const upcoming = el("social-org-upcoming");
  const session = getSession();
  if (!session) return;
  const friends = listFriends(session.pubkey);
  if (friendsBox) {
    friendsBox.innerHTML = friends.length
      ? friends
          .map(
            (f) =>
              `<label class="social-check"><input type="checkbox" name="org-friend" value="${f.pubkey}" checked /> ${escapeHtml(f.name)}</label>`,
          )
          .join("")
      : `<p class="social-empty">Add friends before organizing</p>`;
  }
  if (upcoming) {
    const rows = listSchedules(session.pubkey).filter((r) => r.at > Date.now() - 60_000);
    upcoming.innerHTML = rows.length
      ? rows
          .map(
            (r) =>
              `<div class="social-row">
                <div class="social-row-main">
                  <span class="social-row-name">${escapeHtml(r.room)}</span>
                  <span class="social-row-meta">${new Date(r.at).toLocaleString()}${r.fromName ? ` · ${escapeHtml(r.fromName)}` : ""}</span>
                </div>
                <div class="social-row-actions">
                  <button type="button" class="social-mini" data-jump="${r.id}">JUMP IN</button>
                </div>
              </div>`,
          )
          .join("")
      : `<p class="social-empty">No upcoming races</p>`;
    upcoming.querySelectorAll<HTMLButtonElement>("[data-jump]").forEach((btn) => {
      btn.onclick = () => {
        const row = rows.find((r) => r.id === btn.dataset.jump);
        if (row) {
          callbacks?.onJoinInvite({ room: row.room, password: row.password });
        }
      };
    });
  }
}

async function submitOrganize(e: Event): Promise<void> {
  e.preventDefault();
  const session = getSession();
  const status = el("social-org-status");
  if (!session) return;
  const room = (el<HTMLInputElement>("social-org-room")?.value || "").trim();
  const password = (el<HTMLInputElement>("social-org-pass")?.value || "").trim();
  const when = el<HTMLInputElement>("social-org-when")?.value;
  const selected = [
    ...document.querySelectorAll<HTMLInputElement>('input[name="org-friend"]:checked'),
  ].map((i) => i.value);
  if (!when) {
    if (status) status.textContent = "Pick a time";
    return;
  }
  const at = new Date(when).getTime();
  if (status) status.textContent = "Sending invites…";
  try {
    const result = await organizeRace({
      room,
      password,
      at,
      fromName: myDisplayName(),
      friendPubkeys: selected,
    });
    if (status) {
      status.textContent = `Sent ${result.sent} invite${result.sent === 1 ? "" : "s"}${
        result.failed.length ? ` · ${result.failed.length} failed` : ""
      }`;
    }
    callbacks?.showToast(`Race organized · ${result.schedule.room}`);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    renderOrganize();
  } catch (err) {
    if (status) status.textContent = err instanceof Error ? err.message : "Failed";
  }
}

async function sendChat(e: Event): Promise<void> {
  e.preventDefault();
  if (!chatPeer) return;
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
  setTab(activeTab);
  void refreshActiveLists();
  // Prefetch friend profile labels.
  const session = getSession();
  if (session) {
    for (const f of listFriends(session.pubkey)) {
      void fetchProfile(f.pubkey).then((p) => {
        if (!p) return;
        const label = profileLabel(f.pubkey, p);
        if (label && label !== f.name) {
          addFriend(session.pubkey, { pubkey: f.pubkey, name: label });
        }
      });
    }
  }
}

export function closeSocialHub(): void {
  el("social-hub")?.classList.add("hidden");
  stopThread?.();
  stopThread = null;
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

  for (const tab of ["online", "find", "friends", "chat", "organize"] as const) {
    el(`social-tab-${tab}`)?.addEventListener("click", () => setTab(tab));
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
  document.getElementById("social-org-form")?.addEventListener("submit", (e) => {
    void submitOrganize(e);
  });

  // Default organize time = +30 minutes
  const when = el<HTMLInputElement>("social-org-when");
  if (when && !when.value) {
    const d = new Date(Date.now() + 30 * 60_000);
    d.setSeconds(0, 0);
    when.value = new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }

  onSessionChange((session) => {
    syncPresenceFromSession();
    if (!session) {
      closeSocialHub();
      chatPeer = null;
      stopThread?.();
      stopThread = null;
    }
  });

  window.addEventListener("racer-race-invite", (ev) => {
    const detail = (ev as CustomEvent<ScheduledRace>).detail;
    if (!detail) return;
    callbacks?.showToast(`Race now · ${detail.room}`);
    const banner = el("social-invite-banner");
    if (banner) {
      banner.classList.remove("hidden");
      banner.innerHTML = `<span>Race starting: <strong>${escapeHtml(detail.room)}</strong></span>
        <button type="button" class="social-mini" id="social-invite-jump">JUMP IN</button>`;
      el("social-invite-jump")?.addEventListener("click", () => {
        banner.classList.add("hidden");
        callbacks?.onJoinInvite({ room: detail.room, password: detail.password });
      });
    }
  });

  syncPresenceFromSession();
}

/** Used by deep-link / organize jump-in copy helpers. */
export function inviteLinkFor(room: string, password: string): string {
  return buildInviteJoinUrl({ room, password });
}
