"use client";

import React, { useEffect, useRef, useState } from 'react';

export type Slide = {
  imageUrl: string;
  caption: string;
};

export type RenderConfig = {
  width: number;
  height: number;
  fps: number;
  slideDurationSec: number;
  backgroundMusic: boolean;
  totalDurationSec: number;
};

export function secondsToHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function CanvasRenderer({ slides, config }: { slides: Slide[]; config: RenderConfig }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setElapsedSec(0);
    setDownloadUrl(null);
  }, [slides, config.totalDurationSec]);

  async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
  }

  function drawFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, caption: string) {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, width, height);

    if (img) {
      // Cover with slight Ken Burns zoom
      const aspectCanvas = width / height;
      const aspectImg = img.width / img.height;
      let drawW = width;
      let drawH = height;
      if (aspectImg > aspectCanvas) {
        drawH = height;
        drawW = height * aspectImg;
      } else {
        drawW = width;
        drawH = width / aspectImg;
      }
      const t = (Date.now() % 7000) / 7000; // simple zoom param
      const zoom = 1.04 + 0.02 * Math.sin(t * Math.PI * 2);
      const dw = drawW * zoom;
      const dh = drawH * zoom;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.globalAlpha = 0.98;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.globalAlpha = 1;

      // vignette
      const grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) / 3, width / 2, height / 2, Math.max(width, height) / 1.0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // caption box
    const padding = 24;
    const boxWidth = Math.min(width - padding * 2, 1000);
    const boxX = (width - boxWidth) / 2;
    const boxY = height - 160;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(boxX, boxY, boxWidth, 120);

    // caption text
    ctx.font = '24px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = caption.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const test = current.length ? current + ' ' + w : w;
      if (ctx.measureText(test).width > boxWidth - padding * 2) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    const lineHeight = 30;
    const startY = boxY + 60 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });
  }

  async function handleRecord() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setError(null);
    setDownloadUrl(null);

    const stream = canvas.captureStream(config.fps);

    // audio: procedural background music if enabled
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();
    if (config.backgroundMusic) {
      // simple layered music: bass + lead + noise
      const masterGain = audioContext.createGain();
      masterGain.gain.value = 0.08; // keep quiet

      // bass
      const bass = audioContext.createOscillator();
      bass.type = 'sine';
      const bassGain = audioContext.createGain();
      bassGain.gain.value = 0.6;
      bass.frequency.value = 55; // A1
      bass.connect(bassGain).connect(masterGain);
      bass.start();

      // lead melody with slow LFO
      const lead = audioContext.createOscillator();
      lead.type = 'triangle';
      const leadGain = audioContext.createGain();
      leadGain.gain.value = 0.2;
      lead.frequency.value = 220; // A3
      const lfo = audioContext.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.08; // slow vibrato
      const lfoGain = audioContext.createGain();
      lfoGain.gain.value = 8;
      lfo.connect(lfoGain).connect(lead.frequency as any);
      lead.connect(leadGain).connect(masterGain);
      lead.start();
      lfo.start();

      // gentle noise pad
      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      const noise = audioContext.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = audioContext.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 800;
      const noiseGain = audioContext.createGain();
      noiseGain.gain.value = 0.05;
      noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
      noise.loop = true;
      noise.start();

      masterGain.connect(destination);
    }

    const combined = new MediaStream([
      ...stream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    const recorder = new MediaRecorder(combined, {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2_000_000,
      audioBitsPerSecond: 96_000,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      try {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      } catch (e) {
        setError('Failed to assemble video');
      }
    };

    // drawing loop and slide schedule
    const ctxRaw = canvas.getContext('2d');
    if (!ctxRaw) return;
    const ctx = ctxRaw as CanvasRenderingContext2D;

    let isCancelled = false;
    let currentSlideIndex = 0;
    let currentSlideImg: HTMLImageElement | null = null;

    const slideImages: (HTMLImageElement | null)[] = new Array(slides.length).fill(null);

    // Preload first few
    const preloadCount = Math.min(6, slides.length);
    for (let i = 0; i < preloadCount; i++) {
      try { slideImages[i] = await loadImage(slides[i].imageUrl); } catch {}
    }

    const startTime = performance.now();
    const totalMs = config.totalDurationSec * 1000;
    const slideMs = config.slideDurationSec * 1000;

    currentSlideImg = slideImages[0];

    recorder.start(4_000); // timeslice to avoid huge memory
    setIsRecording(true);

    function loop(now: number) {
      if (isCancelled) return;
      const elapsed = now - startTime;
      setElapsedSec(Math.min(config.totalDurationSec, Math.floor(elapsed / 1000)));

      if (elapsed >= totalMs) {
        setIsRecording(false);
        recorder.stop();
        audioContext.close();
        return;
      }

      // compute slide index
      const slideIndex = Math.floor(elapsed / slideMs) % slides.length;
      if (slideIndex !== currentSlideIndex) {
        currentSlideIndex = slideIndex;
        currentSlideImg = slideImages[slideIndex];
        // kick off preload next
        const nextIndex = (slideIndex + 3) % slides.length;
        if (!slideImages[nextIndex]) {
          loadImage(slides[nextIndex].imageUrl)
            .then((img) => (slideImages[nextIndex] = img))
            .catch(() => {});
        }
      }

      drawFrame(ctx, currentSlideImg, slides[slideIndex]?.caption ?? '');
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

    return () => {
      isCancelled = true;
      if (recorder.state !== 'inactive') recorder.stop();
      audioContext.close();
      setIsRecording(false);
    };
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-zinc-400">Elapsed: {secondsToHMS(elapsedSec)} / {secondsToHMS(config.totalDurationSec)}</div>
        <div className="space-x-2">
          <button disabled={isRecording || slides.length === 0} onClick={handleRecord} className="btn btn-primary">Start Render</button>
        </div>
      </div>
      <canvas ref={canvasRef} width={config.width} height={config.height} className="w-full rounded-md border border-zinc-800" />
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      {downloadUrl && (
        <div className="mt-3 flex items-center gap-3">
          <a className="btn btn-outline" href={downloadUrl} download={`video-${Date.now()}.webm`}>Download Video</a>
          <span className="text-xs text-zinc-400">Format: WebM (VP9 + Opus)</span>
        </div>
      )}
      <p className="text-xs text-zinc-500 mt-3">Note: Long renders can be large files. Keep the tab focused for best results.</p>
    </div>
  );
}
