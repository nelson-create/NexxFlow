export type Role = 'ADMIN' | 'TEAM_MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface GallerySummary {
  id: string;
  slug: string;
  publishedAt: string | null;
}

export interface EventItem {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  createdById: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
  members: Member[];
  coverUrl: string | null;
  _count: { photos: number; selected: number };
  gallery: GallerySummary | null;
}

export interface Photo {
  id: string;
  eventId: string;
  uploadedById: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
  selected: boolean;
  createdAt: string;
  uploadedBy: Member;
}

export interface PublicPhoto {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  originalName: string;
  createdAt: string;
}

export interface PublicGalleryData {
  gallery: {
    id: string;
    slug: string;
    eventName: string;
    description: string | null;
    publishedAt: string;
  };
  photos: PublicPhoto[];
}
