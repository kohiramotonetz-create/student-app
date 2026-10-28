import { useEffect, useLayoutEffect, useRef } from 'react';
import { getKanjiPoint, isInsideKanjiFrame, KANJI_LOGICAL_SIDE } from '../utils/kanjiWriting';

// The existing canvas/stroke input, repeated once per character. Stored points
// remain in 270px logical coordinates; DPR affects the bitmap only.
function paint(canvas, strokes) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(width / KANJI_LOGICAL_SIDE, 0, 0, height / KANJI_LOGICAL_SIDE, 0, 0);
  ctx.clearRect(0, 0, KANJI_LOGICAL_SIDE, KANJI_LOGICAL_SIDE);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#333';
  ctx.fillStyle = '#333';
  for (const stroke of strokes || []) {
    if (!stroke.length) continue;
    ctx.beginPath();
    if (stroke.length === 1) {
      ctx.arc(stroke[0].x, stroke[0].y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach(({ x, y }) => ctx.lineTo(x, y));
      ctx.stroke();
    }
  }
}

export default function KanjiWritingCanvas({ characters, strokes, setStrokes, disabled }) {
  const canvases = useRef(new Map());
  const ink = useRef([]);
  const active = useRef(null);

  useLayoutEffect(() => {
    ink.current = strokes;
    if (!strokes.length || disabled) active.current = null;
    canvases.current.forEach((canvas, index) => paint(canvas, strokes[index]));
  }, [strokes, disabled]);

  useEffect(() => {
    const repaint = () => canvases.current.forEach((canvas, index) => paint(canvas, ink.current[index]));
    const observer = new ResizeObserver(repaint);
    canvases.current.forEach((canvas) => observer.observe(canvas));
    window.addEventListener('resize', repaint);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', repaint);
      active.current = null;
    };
  }, [characters.length]);

  const finish = (event) => {
    if (active.current?.pointerId !== event.pointerId) return;
    active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const start = (event, frame) => {
    if (disabled || active.current || !event.isPrimary || event.button !== 0) return;
    const point = getKanjiPoint(event, event.currentTarget.getBoundingClientRect());
    if (!isInsideKanjiFrame(point)) return;
    const next = Array.from({ length: characters.length }, (_, index) => ink.current[index] || []);
    next[frame] = [...next[frame], [point]];
    active.current = { frame, pointerId: event.pointerId };
    ink.current = next;
    setStrokes(next);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event, frame) => {
    if (disabled || active.current?.pointerId !== event.pointerId || active.current.frame !== frame) return;
    const point = getKanjiPoint(event, event.currentTarget.getBoundingClientRect());
    if (!isInsideKanjiFrame(point)) { finish(event); return; }
    const next = ink.current.map((list, index) => index === frame
      ? list.map((stroke, strokeIndex) => strokeIndex === list.length - 1 ? [...stroke, point] : stroke)
      : list);
    ink.current = next;
    setStrokes(next);
  };

  return <div className="kanji-writing-frames" aria-label={`${characters.length}文字の解答欄`}>
    {characters.map((_, index) => <div className="kanji-writing-frame" key={index}>
      <span className="kanji-writing-frame__number" aria-hidden="true">{index + 1}</span>
      <canvas width="270" height="270" aria-label={`${index + 1}文字目の手書き欄`}
        ref={(canvas) => { if (canvas) canvases.current.set(index, canvas); else canvases.current.delete(index); }}
        onPointerDown={(event) => start(event, index)}
        onPointerMove={(event) => move(event, index)}
        onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onPointerLeave={finish}
      />
    </div>)}
  </div>;
}
