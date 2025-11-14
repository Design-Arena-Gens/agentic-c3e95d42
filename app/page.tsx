"use client";

import { useEffect, useMemo, useState } from 'react';
import CanvasRenderer, { type Slide, type RenderConfig } from '@/components/CanvasRenderer';
import { searchWikimediaImages } from '@/lib/wikimedia';
import { generateOutline, sectionsToSlides } from '@/lib/script';

export default function Page() {
  const [topic, setTopic] = useState('Deep Learning');
  const [minutes, setMinutes] = useState(30);
  const [queryImages, setQueryImages] = useState('Deep Learning technology');
  const [isFetching, setIsFetching] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [script, setScript] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [slideDurationSec, setSlideDurationSec] = useState(8);
  const [bgMusic, setBgMusic] = useState(true);

  const totalSlidesNeeded = useMemo(() => {
    const totalSec = minutes * 60;
    return Math.ceil(totalSec / slideDurationSec);
  }, [minutes, slideDurationSec]);

  const config: RenderConfig = useMemo(
    () => ({ width: 1280, height: 720, fps: 24, slideDurationSec, backgroundMusic: bgMusic, totalDurationSec: minutes * 60 }),
    [minutes, slideDurationSec, bgMusic]
  );

  useEffect(() => {
    // init default script
    const sections = generateOutline(topic, minutes);
    const s = sections.map((sec) => `# ${sec.heading}\n\n${sec.text}`).join('\n\n');
    setScript(s);
  }, [topic, minutes]);

  function regenerateScript() {
    const sections = generateOutline(topic, minutes);
    const s = sections.map((sec) => `# ${sec.heading}\n\n${sec.text}`).join('\n\n');
    setScript(s);
  }

  async function fetchImages() {
    try {
      setIsFetching(true);
      const results = await searchWikimediaImages(queryImages, Math.max(60, totalSlidesNeeded + 10));
      setImages(results.map((r) => r.imageUrl));
    } catch (e) {
      console.error(e);
      alert('Failed to fetch images. Try another query.');
    } finally {
      setIsFetching(false);
    }
  }

  function buildSlides() {
    // turn script into captions
    const sections = script
      .split(/\n\n+/)
      .map((blk) => blk.trim())
      .filter(Boolean);

    const parsed = sections.flatMap((blk) => {
      const [first, ...rest] = blk.split('\n');
      const heading = first.replace(/^#+\s*/, '') || topic;
      const text = rest.join(' ');
      return [{ heading, text }];
    });

    const baseSlides = sectionsToSlides(parsed);

    // bind images cyclically
    const selectedImages = images.length ? images : [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Golde33443.jpg/640px-Golde33443.jpg',
    ];

    const needed = totalSlidesNeeded;
    const out: Slide[] = [];
    for (let i = 0; i < needed; i++) {
      const cap = baseSlides[i % baseSlides.length]?.caption ?? topic;
      const img = selectedImages[i % selectedImages.length];
      out.push({ imageUrl: img, caption: cap });
    }
    setSlides(out);
  }

  return (
    <main className="grid gap-6">
      <section className="card p-4 grid gap-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Topic</label>
            <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div>
            <label className="label">Target Duration (minutes)</label>
            <input type="number" min={30} max={60} className="input" value={minutes} onChange={(e) => setMinutes(Math.min(60, Math.max(30, Number(e.target.value)||0)))} />
          </div>
          <div>
            <label className="label">Slide Duration (seconds)</label>
            <input type="number" min={5} max={20} className="input" value={slideDurationSec} onChange={(e) => setSlideDurationSec(Math.min(20, Math.max(5, Number(e.target.value)||0)))} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-outline" onClick={regenerateScript}>Regenerate Script</button>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={bgMusic} onChange={(e) => setBgMusic(e.target.checked)} />
            Background music
          </label>
        </div>
      </section>

      <section className="card p-4 grid gap-4">
        <div>
          <label className="label">Script</label>
          <textarea className="input h-56" value={script} onChange={(e) => setScript(e.target.value)} />
          <p className="text-xs text-zinc-500 mt-1">Tip: Paste any long-form script. We&apos;ll convert it to captioned slides.</p>
        </div>
      </section>

      <section className="card p-4 grid gap-4">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="label">Image Search (Wikimedia Commons)</label>
            <input className="input" value={queryImages} onChange={(e) => setQueryImages(e.target.value)} />
          </div>
          <div>
            <button disabled={isFetching} className="btn btn-primary w-full" onClick={fetchImages}>{isFetching ? 'Fetching?' : 'Fetch Images'}</button>
          </div>
        </div>
        {!!images.length && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto">
            {images.slice(0, 24).map((src, i) => (
              <img key={i} src={src} alt="Selected visual" className="w-full h-24 object-cover rounded-md border border-zinc-800" />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>Images loaded: {images.length}</span>
          <span>Slides needed: {totalSlidesNeeded}</span>
        </div>
        <div>
          <button className="btn btn-outline" onClick={buildSlides}>Build Slides</button>
        </div>
      </section>

      <section className="grid gap-3">
        <CanvasRenderer
          slides={slides}
          config={config}
        />
      </section>
    </main>
  );
}
