import type { PublicGalleryData } from './types';

// Verified gallery payloads are kept per-tab so a refresh doesn't ask for the PIN again.
const key = (slug: string) => `gallery:${slug}`;

export const loadGalleryAccess = (slug: string): PublicGalleryData | null => {
  try {
    const raw = sessionStorage.getItem(key(slug));
    const parsed = raw ? (JSON.parse(raw) as PublicGalleryData) : null;
    return parsed?.gallery?.slug === slug ? parsed : null;
  } catch {
    return null;
  }
};

export const saveGalleryAccess = (data: PublicGalleryData) => {
  try {
    sessionStorage.setItem(key(data.gallery.slug), JSON.stringify(data));
  } catch {
    // Storage may be unavailable (private mode); access just won't persist across refreshes.
  }
};

export const clearGalleryAccess = (slug: string) => {
  try {
    sessionStorage.removeItem(key(slug));
  } catch {
    // ignore
  }
};

/** Accepts a bare slug or a full gallery URL and returns the slug. */
export const parseGallerySlug = (input: string) => {
  const value = input.trim();
  const match = value.match(/\/gallery\/([^/?#\s]+)/);
  return (match ? match[1] : value).replace(/^\/+|\/+$/g, '');
};

/** Cloudinary can resize on the fly; other storage providers get the original. */
export const sizedUrl = (url: string, width: number) =>
  url.includes('res.cloudinary.com') && url.includes('/upload/') ? url.replace('/upload/', `/upload/c_limit,w_${width},q_auto,f_auto/`) : url;
