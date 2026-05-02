/**
 * Camp Sync Service — Real-time Deer Camp Synchronization
 *
 * Bridges WebSocket client with DeerCamp context for offline-first sync.
 * Manages:
 * - WebSocket connection lifecycle (connect/disconnect)
 * - Real-time event handling (annotations, photos, member presence)
 * - Offline queue for local changes
 * - REST fallback polling when WebSocket unavailable
 * - Periodic sync with backend
 *
 * Usage:
 *   const manager = new CampSyncManager();
 *   manager.onAnnotationAdd = (data) => { ... };
 *   await manager.connect(campId);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CampWebSocket, createCampWebSocket, AnnotationEvent, PhotoEvent, PresenceEvent, ChatMessageEvent, TypingEvent, ChatReactionEvent, ChatDeleteEvent } from './websocketService';
import { SharedAnnotation, CampPhoto } from '../types/deercamp';
import Config from '../config';

// ── Types ──────────────────────────────────────────────────────

export interface OfflineQueueItem {
  id: string;
  type: 'annotation_add' | 'annotation_delete' | 'photo_add' | 'location_update';
  campId: string;
  data: any;
  createdAt: string;
  retryCount: number;
}

export interface SyncState {
  isConnected: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
  onlineMemberCount: number;
}

// ── CampSyncManager ────────────────────────────────────────────

export class CampSyncManager {
  private ws: CampWebSocket | null = null;
  private campId: string = '';
  private isConnecting = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private pollIntervalMs = 30000; // 30 seconds
  private offlineQueue: OfflineQueueItem[] = [];
  private lastSyncedAt: string | null = null;
  private onlineMemberCount = 0;

  // Event callbacks for DeerCampContext to subscribe to
  public onAnnotationAdd: ((event: AnnotationEvent, annotation: SharedAnnotation) => void) | null = null;
  public onAnnotationUpdate: ((event: AnnotationEvent, annotation: SharedAnnotation) => void) | null = null;
  public onAnnotationDelete: ((annotationId: string) => void) | null = null;
  public onPhotoAdded: ((event: PhotoEvent, photo: CampPhoto) => void) | null = null;
  public onMemberOnline: ((event: PresenceEvent) => void) | null = null;
  public onMemberOffline: ((event: PresenceEvent) => void) | null = null;
  public onChatMessage: ((event: ChatMessageEvent) => void) | null = null;
  public onTyping: ((event: TypingEvent) => void) | null = null;
  public onChatReaction: ((event: ChatReactionEvent) => void) | null = null;
  public onChatDelete: ((event: ChatDeleteEvent) => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onSyncStateChanged: ((state: SyncState) => void) | null = null;

  /**
   * Connect to WebSocket for a specific camp.
   * Loads offline queue and attempts WebSocket connection.
   * Falls back to polling if WebSocket unavailable.
   */
  async connect(campId: string): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.isConnected)) {
      if (__DEV__) console.log(`[CampSync] Already connected to camp ${campId}`);
      return;
    }

    this.isConnecting = true;
    this.campId = campId;

    try {
      // Load offline queue from storage
      await this.loadOfflineQueue();

      // Attempt WebSocket connection
      this.ws = await createCampWebSocket(campId);

      if (this.ws) {
        this.setupWebSocketHandlers();
        this.ws.connect();
      } else {
        if (__DEV__) console.warn('[CampSync] Failed to create WebSocket — falling back to polling');
        this.startPolling();
      }
    } catch (err) {
      if (__DEV__) console.error('[CampSync] Error connecting:', err);
      this.onError?.('Failed to connect to camp');
      this.startPolling(); // Fallback to polling
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from the camp and stop polling.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
    this.stopPolling();
    this.campId = '';
    this.notifySyncStateChanged();
  }

  /**
   * Check if WebSocket is currently connected.
   */
  get isConnected(): boolean {
    return this.ws?.isConnected ?? false;
  }

  /**
   * Get current sync state.
   */
  getSyncState(): SyncState {
    return {
      isConnected: this.isConnected,
      lastSyncedAt: this.lastSyncedAt,
      pendingChanges: this.offlineQueue.length,
      onlineMemberCount: this.onlineMemberCount,
    };
  }

  // ── Send Methods ─────────────────────────────────────────────

  /**
   * Send annotation add to server (real-time or queued if offline).
   */
  async sendAnnotationAdd(annotation: SharedAnnotation): Promise<void> {
    if (this.ws?.isConnected) {
      this.ws.sendAnnotationAdd({
        id: annotation.id,
        type: annotation.type,
        data: annotation.data,
      });
    } else {
      await this.queueChange('annotation_add', annotation);
    }
  }

  /**
   * Send annotation delete to server (real-time or queued if offline).
   */
  async sendAnnotationDelete(annotationId: string): Promise<void> {
    if (this.ws?.isConnected) {
      this.ws.sendAnnotationDelete(annotationId);
    } else {
      await this.queueChange('annotation_delete', { id: annotationId });
    }
  }

  /**
   * Send photo added to server (real-time or queued if offline).
   */
  async sendPhotoAdded(photo: CampPhoto): Promise<void> {
    if (this.ws?.isConnected) {
      this.ws.sendPhotoAdded({
        photo_id: photo.id,
        image_url: photo.imageUri,
        lat: photo.lat,
        lng: photo.lng,
        caption: photo.caption,
      });
    } else {
      await this.queueChange('photo_add', photo);
    }
  }

  /**
   * Send a chat message to the camp (real-time only — no offline queue for chat).
   * Returns true if sent, false if offline.
   */
  sendChatMessage(text: string): boolean {
    if (this.ws?.isConnected) {
      this.ws.sendChatMessage(text);
      return true;
    }
    return false;
  }

  /**
   * Send typing indicator.
   */
  sendTyping(): void {
    if (this.ws?.isConnected) {
      this.ws.sendTyping();
    }
  }

  /**
   * Send a reaction to a message.
   */
  sendChatReaction(messageId: string, emoji: string): void {
    if (this.ws?.isConnected) {
      this.ws.sendChatReaction(messageId, emoji);
    }
  }

  /**
   * Delete a chat message (sender only).
   */
  sendChatDelete(messageId: string): void {
    if (this.ws?.isConnected) {
      this.ws.sendChatDelete(messageId);
    }
  }

  /**
   * Send location update (opt-in, real-time only).
   */
  sendLocationUpdate(lat: number, lng: number, heading?: number, speed?: number): void {
    if (this.ws?.isConnected) {
      this.ws.sendLocationUpdate(lat, lng, heading, speed);
    }
  }

  /**
   * Manually trigger sync with backend (fallback to polling, or immediate REST call).
   */
  async syncNow(): Promise<void> {
    if (!this.campId) {
      if (__DEV__) console.warn('[CampSync] No camp ID set');
      return;
    }

    try {
      // Call sync endpoint with last_synced timestamp
      const response = await fetch(`${Config.API_BASE_URL}/deercamp/camps/${this.campId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await this.getToken()}`,
        },
        body: JSON.stringify({
          last_synced: this.lastSyncedAt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const syncData = await response.json();
      this.processSyncResponse(syncData);

      // Replay offline queue after successful sync
      if (this.offlineQueue.length > 0) {
        await this.replayOfflineQueue();
      }

      this.lastSyncedAt = syncData.synced_at;
      this.notifySyncStateChanged();
    } catch (err) {
      if (__DEV__) console.error('[CampSync] Sync error:', err);
      this.onError?.('Failed to sync camp data');
    }
  }

  // ── Internal Methods ────────────────────────────────────────

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onConnected = (onlineMembers) => {
      if (__DEV__) console.log(`[CampSync] Connected with ${onlineMembers?.length || 0} online members`);
      this.onlineMemberCount = onlineMembers?.length || 0;
      this.stopPolling(); // Stop polling since WebSocket is now active
      this.notifySyncStateChanged();

      // Perform full sync on connection
      this.syncNow().catch((err) => { if (__DEV__) console.warn('[CampSync]', err); });
    };

    this.ws.onDisconnected = () => {
      if (__DEV__) console.log('[CampSync] WebSocket disconnected');
      this.notifySyncStateChanged();
      this.startPolling(); // Fall back to polling
    };

    this.ws.onAnnotationAdd = (event) => {
      const annotation: SharedAnnotation = {
        id: event.annotation_id,
        type: event.annotation_type as 'waypoint' | 'route' | 'area' | 'note' | 'track',
        createdBy: event.user_id,
        createdAt: event.timestamp,
        data: (event.annotation || {}) as any,
      };
      this.onAnnotationAdd?.(event, annotation);
    };

    this.ws.onAnnotationUpdate = (event) => {
      const annotation: SharedAnnotation = {
        id: event.annotation_id,
        type: event.annotation_type as 'waypoint' | 'route' | 'area' | 'note' | 'track',
        createdBy: event.user_id,
        createdAt: event.timestamp,
        data: (event.annotation || {}) as any,
      };
      this.onAnnotationUpdate?.(event, annotation);
    };

    this.ws.onAnnotationDelete = (event) => {
      this.onAnnotationDelete?.(event.annotation_id);
    };

    this.ws.onPhotoAdded = (event) => {
      const photo: CampPhoto = {
        id: event.photo_id,
        uploadedBy: event.user_id,
        uploadedAt: event.timestamp,
        imageUri: event.image_url,
        lat: event.lat,
        lng: event.lng,
        caption: event.caption,
      };
      this.onPhotoAdded?.(event, photo);
    };

    this.ws.onChatMessage = (event) => {
      this.onChatMessage?.(event);
    };

    this.ws.onTyping = (event) => {
      this.onTyping?.(event);
    };

    this.ws.onChatReaction = (event) => {
      this.onChatReaction?.(event);
    };

    this.ws.onChatDelete = (event) => {
      this.onChatDelete?.(event);
    };

    this.ws.onMemberOnline = (event) => {
      this.onlineMemberCount = event.online_members?.length || 0;
      this.onMemberOnline?.(event);
      this.notifySyncStateChanged();
    };

    this.ws.onMemberOffline = (event) => {
      this.onlineMemberCount = event.online_members?.length || 0;
      this.onMemberOffline?.(event);
      this.notifySyncStateChanged();
    };

    this.ws.onError = (error) => {
      this.onError?.(error);
    };
  }

  private startPolling(): void {
    if (this.pollInterval) return;

    if (__DEV__) console.log('[CampSync] Starting polling fallback (30s interval)');
    this.pollInterval = setInterval(() => {
      this.syncNow().catch((err) => { if (__DEV__) console.warn('[CampSync]', err); });
    }, this.pollIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async queueChange(type: OfflineQueueItem['type'], data: any): Promise<void> {
    const item: OfflineQueueItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type,
      campId: this.campId,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    this.offlineQueue.push(item);
    await this.saveOfflineQueue();
    this.notifySyncStateChanged();
    if (__DEV__) console.log(`[CampSync] Queued ${type} (${this.offlineQueue.length} pending)`);
  }

  private async replayOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    if (__DEV__) console.log(`[CampSync] Replaying ${this.offlineQueue.length} offline changes...`);

    const itemsToReplay = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of itemsToReplay) {
      try {
        switch (item.type) {
          case 'annotation_add':
            if (this.ws?.isConnected) {
              this.ws.sendAnnotationAdd(item.data);
            } else {
              this.offlineQueue.push(item); // Re-queue if connection dropped
            }
            break;

          case 'annotation_delete':
            if (this.ws?.isConnected) {
              this.ws.sendAnnotationDelete(item.data.id);
            } else {
              this.offlineQueue.push(item);
            }
            break;

          case 'photo_add':
            if (this.ws?.isConnected) {
              this.ws.sendPhotoAdded(item.data);
            } else {
              this.offlineQueue.push(item);
            }
            break;

          case 'location_update':
            if (this.ws?.isConnected) {
              this.ws.sendLocationUpdate(item.data.lat, item.data.lng, item.data.heading, item.data.speed);
            }
            break;
        }
      } catch (err) {
        if (__DEV__) console.error(`[CampSync] Failed to replay item ${item.id}:`, err);
        item.retryCount++;
        if (item.retryCount < 3) {
          this.offlineQueue.push(item); // Retry up to 3 times
        }
      }
    }

    await this.saveOfflineQueue();
    this.notifySyncStateChanged();
  }

  private processSyncResponse(syncData: any): void {
    // Process new annotations
    if (syncData.new_annotations && Array.isArray(syncData.new_annotations)) {
      syncData.new_annotations.forEach((annot: any) => {
        const annotation: SharedAnnotation = {
          id: annot.id,
          type: annot.type as 'waypoint' | 'route' | 'area' | 'note' | 'track',
          createdBy: annot.created_by,
          createdAt: annot.created_at,
          data: annot.data as any,
        };
        // Emit as if it came from WebSocket
        this.onAnnotationAdd?.(
          {
            type: 'annotation_add',
            annotation_id: annot.id,
            annotation_type: annot.type,
            annotation: annot.data,
            user_id: annot.created_by,
            username: '', // Username not in sync response
            timestamp: annot.created_at,
          },
          annotation
        );
      });
    }

    // Process new photos
    if (syncData.new_photos && Array.isArray(syncData.new_photos)) {
      syncData.new_photos.forEach((photo: any) => {
        const campPhoto: CampPhoto = {
          id: photo.id,
          uploadedBy: photo.uploaded_by,
          uploadedAt: photo.uploaded_at,
          imageUri: photo.image_key,
          lat: photo.lat,
          lng: photo.lng,
          caption: photo.caption,
        };
        this.onPhotoAdded?.(
          {
            type: 'photo_added',
            photo_id: photo.id,
            image_url: photo.image_key,
            lat: photo.lat,
            lng: photo.lng,
            caption: photo.caption,
            user_id: photo.uploaded_by,
            username: '',
            color: '',
            timestamp: photo.uploaded_at,
          },
          campPhoto
        );
      });
    }

    // Process activity feed (optional, for UI updates)
    if (syncData.new_activity && Array.isArray(syncData.new_activity)) {
      // Activity feed is handled locally by DeerCampContext
      // This data can be used to update timestamps or log sync events
      if (__DEV__) console.log(`[CampSync] Synced ${syncData.new_activity.length} activity items`);
    }
  }

  private notifySyncStateChanged(): void {
    this.onSyncStateChanged?.(this.getSyncState());
  }

  private async getToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');
    return token || '';
  }

  private async saveOfflineQueue(): Promise<void> {
    try {
      const key = `@offline_queue_${this.campId}`;
      await AsyncStorage.setItem(key, JSON.stringify(this.offlineQueue));
    } catch (err) {
      if (__DEV__) console.error('[CampSync] Failed to save offline queue:', err);
    }
  }

  private async loadOfflineQueue(): Promise<void> {
    try {
      const key = `@offline_queue_${this.campId}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
        if (__DEV__) console.log(`[CampSync] Loaded ${this.offlineQueue.length} offline changes`);
      }
    } catch (err) {
      if (__DEV__) console.error('[CampSync] Failed to load offline queue:', err);
      this.offlineQueue = [];
    }
  }
}

// ── Singleton Instance ─────────────────────────────────────────

let syncManagerInstance: CampSyncManager | null = null;

export function getSyncManager(): CampSyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new CampSyncManager();
  }
  return syncManagerInstance;
}

export function resetSyncManager(): void {
  if (syncManagerInstance) {
    syncManagerInstance.disconnect();
  }
  syncManagerInstance = null;
}

// ────────────────────────────────────────────────────────────────────────────
// 2026-04-26 (fork merge): REST-API sync functions appended below.
// These are imported by V2.3 DeerCampContext and operate independently of
// the CampSyncManager class above (which handles WebSocket real-time chat).
// Source: huntplan-ai mobile/src/services/campSyncService.ts.
// ────────────────────────────────────────────────────────────────────────────

import AsyncStorage_v23 from '@react-native-async-storage/async-storage';
import { createAuthenticatedClient } from './authService';

const SYNC_TIMESTAMP_KEY = '@camp_sync_timestamps';
const PENDING_QUEUE_KEY = '@camp_pending_queue';

const restApi = createAuthenticatedClient();

interface PendingAction {
  id: string;
  campId: string;
  type: 'add_annotation' | 'remove_annotation' | 'add_photo' | 'remove_photo';
  payload: Record<string, unknown>;
  createdAt: string;
}

interface SyncResult {
  success: boolean;
  newAnnotations: number;
  newPhotos: number;
  newActivity: number;
  errors: string[];
}

export async function createCampRemote(
  name: string,
  centerLat: number,
  centerLng: number,
  linkedLandId?: string,
): Promise<{ id: string; invite_code: string } | null> {
  try {
    const response = await restApi.post('/deercamp/camps', {
      name,
      center_lat: centerLat,
      center_lng: centerLng,
      linked_land_id: linkedLandId,
    });
    return response.data;
  } catch (error) {
    if (__DEV__) console.warn('[CampSync] Create camp failed:', error);
    return null;
  }
}

export async function joinCampRemote(
  inviteCode: string,
  username?: string,
): Promise<{ camp_id: string; camp_name: string } | null> {
  try {
    const response = await restApi.post('/deercamp/camps/join', {
      invite_code: inviteCode,
      username,
    });
    return response.data;
  } catch (error) {
    if (__DEV__) console.warn('[CampSync] Join camp failed:', error);
    return null;
  }
}

export async function fetchCampRemote(campId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await restApi.get(`/deercamp/camps/${campId}`);
    return response.data;
  } catch (error) {
    if (__DEV__) console.warn('[CampSync] Fetch camp failed:', error);
    return null;
  }
}

export async function deleteCampRemote(campId: string): Promise<boolean> {
  try {
    await restApi.delete(`/deercamp/camps/${campId}`);
    return true;
  } catch {
    return false;
  }
}

export async function syncCamp(campId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false, newAnnotations: 0, newPhotos: 0, newActivity: 0, errors: [],
  };
  try {
    const ts = await _getSyncTimestamps();
    const lastSynced = ts[campId] || null;
    const response = await restApi.post(`/deercamp/camps/${campId}/sync`, { last_synced: lastSynced });
    const data = response.data;
    result.newAnnotations = data.new_annotations?.length || 0;
    result.newPhotos = data.new_photos?.length || 0;
    result.newActivity = data.new_activity?.length || 0;
    result.success = true;
    ts[campId] = data.synced_at;
    await AsyncStorage_v23.setItem(SYNC_TIMESTAMP_KEY, JSON.stringify(ts));
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

export async function queueAction(action: Omit<PendingAction, 'id' | 'createdAt'>): Promise<void> {
  const queue = await _getPendingQueue();
  queue.push({
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage_v23.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
}

export async function getPendingCount(): Promise<number> {
  const queue = await _getPendingQueue();
  return queue.length;
}

async function _getPendingQueue(): Promise<PendingAction[]> {
  try {
    const json = await AsyncStorage_v23.getItem(PENDING_QUEUE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    if (__DEV__) console.error('[campSync] Failed to parse pending queue:', error);
    return [];
  }
}

async function _getSyncTimestamps(): Promise<Record<string, string>> {
  try {
    const json = await AsyncStorage_v23.getItem(SYNC_TIMESTAMP_KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    if (__DEV__) console.error('[campSync] Failed to parse sync timestamps:', error);
    return {};
  }
}
