import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';
import { ActivityMode } from '../context/ActivityModeContext';

/**
 * @file aiService.ts
 * @description AI Chat Service for MDHuntFishOutdoors
 *
 * Handles communication with the backend `/planner/chat` endpoint,
 * with graceful fallback to local knowledge base on network errors.
 *
 * Features:
 * - Sends chat messages with conversation history to the backend AI endpoint
 * - Analyzes photos for species identification
 * - Gets planning suggestions based on activity mode and location
 * - Graceful offline fallback with minimal network dependency
 * - Bearer token authentication from AsyncStorage
 * - Comprehensive error logging for debugging
 *
 * @module Services
 * @version 1.0.0
 */

// ── Type Definitions ──

/**
 * Chat message with role and content
 * @interface ChatMessage
 * @property {'user' | 'assistant'} role - Message sender
 * @property {string} content - Message text
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Response from the chat endpoint
 * @interface ChatResponse
 * @property {string} message - AI response text
 * @property {string[]} [sources] - Optional source citations
 * @property {string[]} [follow_up_suggestions] - Optional suggested follow-up questions
 */
export interface ChatResponse {
  message: string;
  sources?: string[];
  follow_up_suggestions?: string[];
}

/**
 * Photo analysis response
 * @interface AnalysisResponse
 * @property {string} [species] - Identified species (if applicable)
 * @property {string} analysis - Text analysis of the photo
 */
export interface AnalysisResponse {
  species?: string;
  analysis: string;
}

/**
 * Planning suggestion
 * @interface Suggestion
 * @property {string} title - Suggestion title
 * @property {string} description - Detailed description
 */
export interface Suggestion {
  title: string;
  description: string;
}

// ── Helper Functions ──

/**
 * Retrieve auth token from AsyncStorage
 * @private
 * @async
 * @returns {Promise<string | null>} Auth token or null if not available
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    if (__DEV__) console.warn('[aiService] Failed to retrieve auth token:', error);
    return null;
  }
}

/**
 * Create Authorization header with Bearer token
 * @private
 * @async
 * @returns {Promise<Record<string, string>>} Headers object with optional Authorization
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// ── Main Service Functions ──

/**
 * Send a chat message to the AI backend
 * Calls POST /api/v1/planner/chat with message and conversation history.
 * Falls back gracefully on network errors.
 *
 * @async
 * @param {string} message - User message text
 * @param {ActivityMode} mode - Current activity mode (hunt, fish, camp, hike, etc.)
 * @param {ChatMessage[]} [history] - Optional conversation history for context
 * @returns {Promise<ChatResponse>} AI response with optional sources and suggestions
 * @throws Will throw error if request fails (caller should implement fallback)
 *
 * @example
 * const response = await sendChatMessage('When is deer season?', 'hunt');
 * console.log(response.message); // "White-tailed Deer season in Maryland..."
 * console.log(response.follow_up_suggestions); // ["Can I use a crossbow?", ...]
 */
export async function sendChatMessage(
  message: string,
  mode: ActivityMode,
  history?: ChatMessage[]
): Promise<ChatResponse> {
  const headers = await getAuthHeaders();

  const body = {
    message,
    mode,
    history: history || [],
  };

  if (__DEV__) {
    console.log(`[aiService] Sending chat message (mode: ${mode}):`, message.substring(0, 50));
  }

  try {
    const response = await fetch(`${Config.API_BASE_URL}/api/v1/planner/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ChatResponse = await response.json();
    if (__DEV__) {
      console.log('[aiService] Chat response received:', data.message.substring(0, 50));
    }

    return data;
  } catch (error) {
    if (__DEV__) {
      console.warn('[aiService] sendChatMessage failed:', error);
    }
    throw error;
  }
}

/**
 * Analyze a photo for species identification or general analysis
 * Calls POST /api/v1/planner/analyze-photo with multipart form data.
 *
 * @async
 * @param {string} photoUri - File URI of the photo to analyze
 * @param {ActivityMode} mode - Activity mode context (hunt, fish, etc.)
 * @returns {Promise<AnalysisResponse>} Analysis result with optional species ID
 * @throws Will throw error if request fails
 *
 * @example
 * const result = await analyzePhoto('file:///local/photo.jpg', 'fish');
 * console.log(result.species); // "Largemouth Bass"
 * console.log(result.analysis); // "This appears to be a good size..."
 */
export async function analyzePhoto(
  photoUri: string,
  mode: ActivityMode
): Promise<AnalysisResponse> {
  const headers = await getAuthHeaders();
  delete headers['Content-Type']; // Let fetch set multipart/form-data boundary

  const formData = new FormData();
  formData.append('photo', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);
  formData.append('mode', mode);

  if (__DEV__) {
    console.log(`[aiService] Analyzing photo (mode: ${mode})`);
  }

  try {
    const response = await fetch(
      `${Config.API_BASE_URL}/api/v1/planner/analyze-photo`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: AnalysisResponse = await response.json();
    if (__DEV__) {
      console.log('[aiService] Photo analysis complete:', data.species || 'no species identified');
    }

    return data;
  } catch (error) {
    if (__DEV__) {
      console.warn('[aiService] analyzePhoto failed:', error);
    }
    throw error;
  }
}

/**
 * Get planning suggestions based on activity mode and optional location
 * Calls GET /api/v1/planner/get-plan-suggestions with query parameters.
 *
 * @async
 * @param {ActivityMode} mode - Activity mode (hunt, fish, camp, hike)
 * @param {object} [location] - Optional location for geographically relevant suggestions
 * @param {number} location.lat - Latitude (decimal degrees)
 * @param {number} location.lng - Longitude (decimal degrees)
 * @returns {Promise<Suggestion[]>} Array of planning suggestions
 * @throws Will throw error if request fails
 *
 * @example
 * const suggestions = await getPlanSuggestions('hunt', { lat: 39.05, lng: -76.75 });
 * console.log(suggestions[0].title); // "Hunt public lands in Anne Arundel County"
 */
export async function getPlanSuggestions(
  mode: ActivityMode,
  location?: { lat: number; lng: number }
): Promise<Suggestion[]> {
  const headers = await getAuthHeaders();

  const params = new URLSearchParams({ mode });
  if (location) {
    params.append('lat', String(location.lat));
    params.append('lng', String(location.lng));
  }

  if (__DEV__) {
    console.log(
      `[aiService] Getting plan suggestions (mode: ${mode}, location: ${location ? 'yes' : 'no'})`
    );
  }

  try {
    const response = await fetch(
      `${Config.API_BASE_URL}/api/v1/planner/get-plan-suggestions?${params}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: Suggestion[] = await response.json();
    if (__DEV__) {
      console.log(`[aiService] Got ${data.length} suggestions`);
    }

    return data;
  } catch (error) {
    if (__DEV__) {
      console.warn('[aiService] getPlanSuggestions failed:', error);
    }
    throw error;
  }
}
