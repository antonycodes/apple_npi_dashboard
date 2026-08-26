import type { LarkTables } from './larkTypes';
import type { DeskAlert } from './deskAlerts';

type RealtimeListener = (tables?: LarkTables) => void;
type AlertListener = (alert: DeskAlert) => void;
type AlertClearedListener = (alertId: string) => void;

let socket: WebSocket | null = null;
let socketUrl = '';
let reconnectTimer: number | null = null;
let reconnectDelay = 1000;
const listeners = new Set<RealtimeListener>();
const alertListeners = new Set<AlertListener>();
const alertClearedListeners = new Set<AlertClearedListener>();

function toWebSocketUrl(apiUrl: string): string {
  const url = new URL(apiUrl);
  url.pathname = '/realtime';
  url.search = '';
  url.hash = '';
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function notify(tables?: LarkTables) {
  for (const listener of listeners) listener(tables);
}

function scheduleReconnect() {
  if ((!listeners.size && !alertListeners.size && !alertClearedListeners.size) || reconnectTimer !== null) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(10_000, reconnectDelay * 2);
}

function connect() {
  if (!listeners.size || !socketUrl || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
  try {
    socket = new WebSocket(socketUrl);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    reconnectDelay = 1000;
    notify();
  };
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(String(event.data));
      if (message.type === 'snapshot') {
        const tables = message.payload?.data?.tables as LarkTables | undefined;
        notify(tables);
      }
      if (message.type === 'desk-alert' && message.alert?.id) {
        for (const listener of alertListeners) listener(message.alert as DeskAlert);
      }
      if (message.type === 'desk-alert-cleared' && message.alertId) {
        for (const listener of alertClearedListeners) listener(String(message.alertId));
      }
    } catch {
      // Ignore malformed frames; the next fallback poll remains authoritative.
    }
  };
  socket.onerror = () => socket?.close();
  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };
}

export function subscribeDashboardRealtime(apiUrl: string | undefined, listener: RealtimeListener): () => void {
  if (!apiUrl || typeof window === 'undefined' || typeof WebSocket === 'undefined') return () => undefined;
  const nextUrl = toWebSocketUrl(apiUrl);
  if (socketUrl !== nextUrl) {
    socket?.close();
    socket = null;
    socketUrl = nextUrl;
  }
  listeners.add(listener);
  connect();

  return () => {
    listeners.delete(listener);
    if (!listeners.size && !alertListeners.size && !alertClearedListeners.size) {
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
      socket?.close();
      socket = null;
    }
  };
}

function subscribeAlerts(apiUrl: string | undefined, onAlert: AlertListener, onCleared: AlertClearedListener): () => void {
  if (!apiUrl || typeof window === 'undefined' || typeof WebSocket === 'undefined') return () => undefined;
  const nextUrl = toWebSocketUrl(apiUrl);
  if (socketUrl !== nextUrl) {
    socket?.close();
    socket = null;
    socketUrl = nextUrl;
  }
  alertListeners.add(onAlert);
  alertClearedListeners.add(onCleared);
  connect();
  return () => {
    alertListeners.delete(onAlert);
    alertClearedListeners.delete(onCleared);
    if (!listeners.size && !alertListeners.size && !alertClearedListeners.size) {
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
      socket?.close();
      socket = null;
    }
  };
}

export function subscribeDeskAlerts(
  apiUrl: string | undefined,
  onAlert: AlertListener,
  onCleared: AlertClearedListener,
): () => void {
  return subscribeAlerts(apiUrl, onAlert, onCleared);
}

export function sendDeskAlert(apiUrl: string | undefined, alert: Omit<DeskAlert, 'id' | 'createdAt'>): boolean {
  if (!apiUrl || !socket || socket.readyState !== WebSocket.OPEN || socketUrl !== toWebSocketUrl(apiUrl)) return false;
  socket.send(JSON.stringify({ type: 'desk-alert', alert }));
  return true;
}

export function clearDeskAlert(apiUrl: string | undefined, alertId: string): boolean {
  if (!apiUrl || !socket || socket.readyState !== WebSocket.OPEN || socketUrl !== toWebSocketUrl(apiUrl)) return false;
  socket.send(JSON.stringify({ type: 'desk-alert-cleared', alertId }));
  return true;
}
