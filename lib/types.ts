export const BOOKMARK_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
] as const;

export type BookmarkColor = (typeof BOOKMARK_COLORS)[number];

export interface Space {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface PinnedView {
  id: string;
  spaceId: string;
  name: string;
  searchQuery: string;
  tag: string;
  sortKey: "newest" | "oldest" | "title";
  createdAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  color?: BookmarkColor;
  createdAt: string;
  spaceId?: string;
  preview?: {
    faviconUrl: string | null;
    siteName: string | null;
    ogImageUrl: string | null;
    previewTitle: string | null;
    previewDescription: string | null;
    lastFetchedAt: number | null;
  };
}
