export type WikimediaImage = {
  title: string;
  imageUrl: string;
  thumbUrl: string;
  description?: string;
};

// Fetch images from Wikimedia Commons via the public API (no key required)
// We query for files with images and return urls
export async function searchWikimediaImages(query: string, limit = 50): Promise<WikimediaImage[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrlimit: String(limit),
    gsrsearch: `${query} filetype:bitmap`,
    prop: 'imageinfo|info',
    iiprop: 'url',
    format: 'json',
    origin: '*',
  });

  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch from Wikimedia');
  const data = await res.json();

  const pages = data?.query?.pages ?? {};
  const items: WikimediaImage[] = Object.values(pages).flatMap((p: any) => {
    const info = p?.imageinfo?.[0];
    if (!info?.url) return [];
    return [
      {
        title: p.title,
        imageUrl: info.url,
        thumbUrl: info.url,
        description: p?.title,
      },
    ];
  });

  // filter obvious non-photo formats by extension
  const filtered = items.filter((it) => /\.(jpg|jpeg|png|webp)$/i.test(it.imageUrl));
  return filtered;
}
