import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApiService } from '../services/api';

export type ProfileMediaType = 'posts' | 'likes' | 'reposts';

export interface ProfileMediaItem {
  postId: string;
  mediaIndex: number;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  createdAt?: string;
  contentSnippet?: string;
}

interface Pagination {
  hasNextPage?: boolean;
  nextPage?: number;
  page?: number;
}

interface UseProfileMediaFeedOptions {
  userId?: string | null;
  type: ProfileMediaType;
  pageSize?: number;
  enabled?: boolean;
}

export const useProfileMediaFeed = ({
  userId,
  type,
  pageSize = 24,
  enabled = true,
}: UseProfileMediaFeedOptions) => {
  const { get } = useApiService();
  const [items, setItems] = useState<ProfileMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const endpoint = useMemo(() => {
    if (!userId) return null;
    switch (type) {
      case 'likes':
        return `/users/${userId}/likes`;
      case 'reposts':
        return `/users/${userId}/reposts`;
      default:
        return `/users/${userId}/posts`;
    }
  }, [type, userId]);

  useEffect(() => {
    if (!enabled || !endpoint) {
      setItems([]);
      setHasNextPage(true);
      setPage(1);
    }
  }, [enabled, endpoint]);

  const normalizeResponse = useCallback(
    (response: any): ProfileMediaItem[] => {
      if (!response) return [];

      const rawPosts =
        response.posts ||
        response.media ||
        response.items ||
        response.data ||
        [];

      const normalized: ProfileMediaItem[] = [];

      rawPosts.forEach((entry: any) => {
        const post = entry.post || entry;
        if (!post) {
          return;
        }

        const mediaArray = post.media || [];
        mediaArray.forEach((media: any, index: number) => {
          if (!media) return;
          const url = media.thumbnailUrl || media.url || media.source;
          if (!url) return;
          normalized.push({
            postId: post._id || post.id || entry._id || entry.id || '',
            mediaIndex: index,
            type:
              media.type === 'video' || media.mediaType === 'video'
                ? 'video'
                : 'image',
            url,
            thumbnailUrl: media.thumbnailUrl || media.previewUrl || url,
            createdAt:
              media.createdAt || post.createdAt || entry.createdAt || '',
            contentSnippet:
              post.content || entry.content || post.caption || undefined,
          });
        });
      });

      return normalized;
    },
    []
  );

  const fetchPage = useCallback(
    async (targetPage: number, append = false) => {
      if (!endpoint || !enabled) return;

      try {
        setError(null);
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const delimiter = endpoint.includes('?') ? '&' : '?';
        const url = `${endpoint}${delimiter}page=${targetPage}&limit=${pageSize}`;
        const response = await get(url);

        if (!mountedRef.current) return;

        const normalizedItems = normalizeResponse(response);
        const pagination: Pagination = response?.pagination || {};

        setItems(prev =>
          append ? [...prev, ...normalizedItems] : normalizedItems
        );
        setHasNextPage(
          pagination.hasNextPage ??
            (normalizedItems.length >= pageSize && normalizedItems.length > 0)
        );
        setPage(targetPage);
      } catch (err: any) {
        if (!mountedRef.current) return;
        setError(err?.message || 'Failed to load media');
        if (!append) {
          setItems([]);
        }
        setHasNextPage(false);
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [endpoint, enabled, get, normalizeResponse, pageSize]
  );

  const refresh = useCallback(() => {
    if (!endpoint || !enabled) return;
    fetchPage(1, false);
  }, [endpoint, enabled, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || loading || loadingMore) return;
    fetchPage(page + 1, true);
  }, [fetchPage, hasNextPage, loading, loadingMore, page]);

  useEffect(() => {
    if (endpoint && enabled) {
      fetchPage(1, false);
    }
  }, [endpoint, enabled, fetchPage]);

  return {
    items,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
    hasNextPage,
  };
};

