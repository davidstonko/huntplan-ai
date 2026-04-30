/**
 * @file forumService.ts
 * @description Forum service for MDHuntFishOutdoors.
 * Provides typed wrappers around forum API endpoints.
 * Includes error handling and offline-first fallback to AsyncStorage.
 *
 * Features:
 * - Get forum categories
 * - Fetch paginated posts
 * - Get post details with replies
 * - Create new posts
 * - Reply to posts
 *
 * @module Services
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

// ── Types ──────────────────────────────────────────────────────

export interface ForumCategory {
  id: string;
  name: string;
  icon?: string;
  postCount: number;
}

export interface ForumReply {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  replyCount: number;
  replies?: ForumReply[];
}

// ── Helper: Get Auth Token ──────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    if (__DEV__) console.warn('[ForumService] Failed to get auth token:', error);
    return null;
  }
}

/**
 * Build authorization headers with Bearer token
 * Falls back to no auth if token unavailable
 */
async function getHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// ── Main Service ───────────────────────────────────────────

export const forumService = {
  /**
   * Get all forum categories
   * Tries API first, falls back to AsyncStorage cache on failure
   */
  async getCategories(): Promise<ForumCategory[]> {
    try {
      const headers = await getHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/categories`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const categories = data.categories || [];

      // Cache success to AsyncStorage
      try {
        await AsyncStorage.setItem(
          'forum_categories_cache',
          JSON.stringify({ data: categories, timestamp: Date.now() })
        );
      } catch (cacheError) {
        if (__DEV__) console.warn('[ForumService] Failed to cache categories:', cacheError);
      }

      return categories;
    } catch (error) {
      if (__DEV__) console.warn('[ForumService] Failed to fetch categories:', error);

      // Fall back to cached data
      try {
        const cached = await AsyncStorage.getItem('forum_categories_cache');
        if (cached) {
          const { data } = JSON.parse(cached);
          if (__DEV__) console.log('[ForumService] Using cached categories');
          return data;
        }
      } catch (cacheError) {
        if (__DEV__) console.warn('[ForumService] Failed to read cached categories:', cacheError);
      }

      // Return empty array on failure (don't crash)
      return [];
    }
  },

  /**
   * Get paginated forum posts
   * Optional category filter and pagination
   */
  async getPosts(
    categoryId?: string,
    page: number = 1
  ): Promise<{ posts: ForumPost[]; total: number }> {
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (categoryId) {
        params.append('category', categoryId);
      }

      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/posts?${params}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const result = {
        posts: data.posts || [],
        total: data.total || 0,
      };

      // Cache success
      try {
        const cacheKey = categoryId
          ? `forum_posts_${categoryId}_${page}`
          : `forum_posts_all_${page}`;
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ data: result, timestamp: Date.now() })
        );
      } catch (cacheError) {
        if (__DEV__) console.warn('[ForumService] Failed to cache posts:', cacheError);
      }

      return result;
    } catch (error) {
      if (__DEV__) console.warn('[ForumService] Failed to fetch posts:', error);

      // Fall back to cached data
      try {
        const cacheKey = categoryId
          ? `forum_posts_${categoryId}_${page}`
          : `forum_posts_all_${page}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          if (__DEV__) console.log('[ForumService] Using cached posts');
          return data;
        }
      } catch (cacheError) {
        if (__DEV__) console.warn('[ForumService] Failed to read cached posts:', cacheError);
      }

      return { posts: [], total: 0 };
    }
  },

  /**
   * Get single post with full details and replies
   */
  async getPost(postId: string): Promise<ForumPost | null> {
    try {
      const headers = await getHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/posts/${postId}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const post = data.post || null;

      // Cache success
      if (post) {
        try {
          await AsyncStorage.setItem(
            `forum_post_${postId}`,
            JSON.stringify({ data: post, timestamp: Date.now() })
          );
        } catch (cacheError) {
          if (__DEV__) console.warn('[ForumService] Failed to cache post:', cacheError);
        }
      }

      return post;
    } catch (error) {
      if (__DEV__) console.warn('[ForumService] Failed to fetch post:', error);

      // Fall back to cached data
      try {
        const cached = await AsyncStorage.getItem(`forum_post_${postId}`);
        if (cached) {
          const { data } = JSON.parse(cached);
          if (__DEV__) console.log('[ForumService] Using cached post');
          return data;
        }
      } catch (cacheError) {
        if (__DEV__) console.warn('[ForumService] Failed to read cached post:', cacheError);
      }

      return null;
    }
  },

  /**
   * Create a new forum post
   */
  async createPost(
    title: string,
    body: string,
    categoryId: string
  ): Promise<ForumPost | null> {
    try {
      const headers = await getHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/posts`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ title, body, category_id: categoryId }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const newPost = data.post || null;

      if (__DEV__) console.log('[ForumService] Post created successfully');

      return newPost;
    } catch (error) {
      if (__DEV__) console.warn('[ForumService] Failed to create post:', error);
      return null;
    }
  },

  /**
   * Reply to a forum post
   */
  async replyToPost(postId: string, body: string): Promise<ForumReply | null> {
    try {
      const headers = await getHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/posts/${postId}/reply`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ body }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const newReply = data.reply || null;

      if (__DEV__) console.log('[ForumService] Reply posted successfully');

      return newReply;
    } catch (error) {
      if (__DEV__) console.warn('[ForumService] Failed to reply to post:', error);
      return null;
    }
  },
};

export default forumService;
