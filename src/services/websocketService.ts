/**
 * WebSocket Service — Real-time Deer Camp Collaboration
 *
 * Manages WebSocket connections to the backend for live camp updates.
 * Handles:
 * - Connection lifecycle (connect, reconnect, disconnect)
 * - Member presence (online/offline indicators)
 * - Real-time annotation sync (pin drops, routes, areas)
 * - Photo upload notifications
 * - Optional live location sharing
 *
 * Falls back to REST polling if WebSocket is unavailable.
 *
 * Usage:
 *   const ws = new CampWebSocket(campId, token);
 *   ws.onAnnotationAdd = (data) => { ... };
 *   ws.connect();
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

// ── Types ──────────────────────────────────────────────────────

export interface OnlineMember {
  user_id: string;
  username: string;
  color: string;
  connected_at: string;
}

export interface AnnotationEvent {
  type: 'annotation_add' | 'annotation_update' | 'annotation_delete';
  annotation_id: string;
  annotation_type?: string;
  annotation?: Record<string, any>;
  user_id: string;
  username: string;
  color?: string;
  timestamp: string;
}

export interface PhotoEvent {
  type: 'photo_added';
  photo_id: string;
  image_url: string;
  thumbnail_url?: string;
  lat: number;
  lng: number;
  caption?: string;
  user_id: string;
  username: string;
  color: string;
  timestamp: string;
}

export interface LocationEvent {
  type: 'location_update';
  user_id: string;
  username: string;
  color: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface PresenceEvent {
  type: 'member_online' | 'member_offline';
  user_id: string;
  username: string;
  online_members: OnlineMember[];
}

export type CampEvent = AnnotationEvent | PhotoEvent | LocationEvent | PresenceEvent;

// ── WebSocket Client ───────────────────────────────────────────

export class CampWebSocket {
  private ws: WebSocket | null = null;
  private campId: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // ms, doubles each attempt
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isManualDisconnect = false;

  // Event callbacks — set these before calling connect()
  public onConnected: ((members: OnlineMember[]) => void) | null = null;
  public onDisconnected: (() => void) | null = null;
  public onMemberOnline: ((event: PresenceEvent) => void) | null = null;
  public onMemberOffline: ((event: PresenceEvent) => void) | null = null;
  public onAnnotationAdd: ((event: AnnotationEvent) => void) | null = null;
  public onAnnotationUpdate: ((event: AnnotationEvent) => void) | null = null;
  public onAnnotationDelete: ((event: AnnotationEvent) => void) | null = null;
  public onPhotoAdded: ((event: PhotoEvent) => void) | null = null;
  public onLocationUpdate: ((event: LocationEvent) => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  constructor(campId: string, token: string) {
    this.campId = campId;
    this.token = token;
  }

  /**
   * Connect to the camp WebSocket.
   * Automatically handles authentication via JWT query param.
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (__DEV__) console.log('[WS] Already connected');
      return;
    }

    this.isManualDisconnect = false;
    const url = `${Config.WS_BASE_URL}/ws/camps/${this.campId}?token=${this.token}`;

    if (__DEV__) console.log(`[WS] Connecting to camp ${this.campId}...`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (__DEV__) console.log(`[WS] Connected to camp ${this.campId}`);
      this.reconnectAttempts = 0;
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (err) {
        if (__DEV__) console.warn('[WS] Failed to parse message:', event.data);
      }
    };

    this.ws.onerror = (event) => {
      if (__DEV__) console.error('[WS] Error:', event);
      this.onError?.('WebSocket connection error');
    };

    this.ws.onclose = (event) => {
      if (__DEV__) console.log(`[WS] Disconnected (code: ${event.code}, reason: ${event.reason})`);
      this.stopPingInterval();
      this.onDisconnected?.();

      if (!this.isManualDisconnect && event.code !== 4001 && event.code !== 4003) {
        this.attemptReconnect();
      }
    };
  }

  /**
   * Gracefully disconnect from the camp.
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close(1000, 'User left camp');
      this.ws = null;
    }
  }

  /**
   * Check if the WebSocket is currently connected.
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Send Methods ─────────────────────────────────────────────

  /**
   * Send a new annotation to the camp (real-time broadcast).
   */
  sendAnnotationAdd(annotation: Record<string, any>): void {
    this.send({
      type: 'annotation_add',
      annotation,
    });
  }

  /**
   * Send an annotation update.
   */
  sendAnnotationUpdate(annotationId: string, annotation: Record<string, any>): void {
    this.send({
      type: 'annotation_update',
      annotation_id: annotationId,
      annotation,
    });
  }

  /**
   * Send an annotation delete.
   */
  sendAnnotationDelete(annotationId: string): void {
    this.send({
      type: 'annotation_delete',
      annotation_id: annotationId,
    });
  }

  /**
   * Notify camp that a photo was uploaded.
   */
  sendPhotoAdded(photo: {
    photo_id: string;
    image_url: string;
    thumbnail_url?: string;
    lat: number;
    lng: number;
    caption?: string;
  }): void {
    this.send({
      type: 'photo_added',
      ...photo,
    });
  }

  /**
   * Share current location with camp members (opt-in).
   */
  sendLocationUpdate(lat: number, lng: number, heading?: number, speed?: number): void {
    this.send({
      type: 'location_update',
      lat,
      lng,
      heading,
      speed,
    });
  }

  // ── Internal Methods ─────────────────────────────────────────

  private send(data: Record<string, any>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      if (__DEV__) console.warn('[WS] Cannot send — not connected');
      return;
    }
    this.ws.send(JSON.stringify(data));
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'connection_established':
        if (__DEV__) console.log(`[WS] Connected with ${data.online_members?.length || 0} members online`);
        this.onConnected?.(data.online_members || []);
        break;

      case 'member_online':
        this.onMemberOnline?.(data as PresenceEvent);
        break;

      case 'member_offline':
        this.onMemberOffline?.(data as PresenceEvent);
        break;

      case 'annotation_add':
        this.onAnnotationAdd?.(data as AnnotationEvent);
        break;

      case 'annotation_update':
        this.onAnnotationUpdate?.(data as AnnotationEvent);
        break;

      case 'annotation_delete':
        this.onAnnotationDelete?.(data as AnnotationEvent);
        break;

      case 'photo_added':
        this.onPhotoAdded?.(data as PhotoEvent);
        break;

      case 'location_update':
        this.onLocationUpdate?.(data as LocationEvent);
        break;

      case 'pong':
        // Keep-alive response — no action needed
        break;

      case 'error':
        if (__DEV__) console.error('[WS] Server error:', data.message);
        this.onError?.(data.message);
        break;

      default:
        if (__DEV__) console.log('[WS] Unknown message type:', data.type);
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (__DEV__) console.log('[WS] Max reconnect attempts reached — falling back to polling');
      this.onError?.('Connection lost. Using offline mode.');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    if (__DEV__) console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// ── Helper: Get token and create WebSocket ─────────────────────

/**
 * Create a CampWebSocket with the stored JWT token.
 * Returns null if no token is available.
 */
export async function createCampWebSocket(campId: string): Promise<CampWebSocket | null> {
  try {
    const token = await AsyncStorage.getItem('jwt_token');
    if (!token) {
      if (__DEV__) console.warn('[WS] No JWT token found — cannot connect');
      return null;
    }
    return new CampWebSocket(campId, token);
  } catch (err) {
    if (__DEV__) console.error('[WS] Error creating WebSocket:', err);
    return null;
  }
}

// ── REST Fallback: Check online members ────────────────────────

/**
 * REST fallback to check who's online in a camp.
 * Use when WebSocket is unavailable.
 */
export async function getOnlineMembers(campId: string): Promise<OnlineMember[]> {
  try {
    const response = await fetch(`${Config.API_BASE_URL}/ws/camps/${campId}/online`);
    const data = await response.json();
    return data.members || [];
  } catch (error) {
    if (__DEV__) console.error('[WS] Failed to fetch online members:', error);
    return [];
  }
}
