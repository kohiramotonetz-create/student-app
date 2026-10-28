export const KANJI_LOGICAL_SIDE = 270;

export const getKanjiCharacters = (answer) => {
  const text = String(answer || '');
  return [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(text)]
    .map(({ segment }) => segment);
};

export const getEmptyKanjiFrames = (frames, count) => Array.from({ length: count }, (_, index) => index)
  .filter((index) => !frames[index]?.some((stroke) => stroke.length > 0));

export const getKanjiPoint = (event, rect) => ({
  x: (event.clientX - rect.left) * KANJI_LOGICAL_SIDE / rect.width,
  y: (event.clientY - rect.top) * KANJI_LOGICAL_SIDE / rect.height
});

export const isInsideKanjiFrame = ({ x, y }) => Number.isFinite(x) && Number.isFinite(y)
  && x >= 0 && y >= 0 && x <= KANJI_LOGICAL_SIDE && y <= KANJI_LOGICAL_SIDE;

// Keep the existing recognition guide and one request per question. Frame index,
// rather than writing time, determines character order. Guides are CSS only.
export const formatKanjiInk = (frames, count) => {
  const side = Math.min(KANJI_LOGICAL_SIDE, 480 / count);
  const scale = side / KANJI_LOGICAL_SIDE;
  return frames.slice(0, count).flatMap((strokes, index) => strokes.map((stroke) => [
    stroke.map(({ x }) => Math.round(x * scale + (270 - side) / 2)),
    stroke.map(({ y }) => Math.round(y * scale + index * side)),
    []
  ]));
};

export const getKanjiCandidates = (data) => {
  const candidates = data?.[0] === 'SUCCESS' ? data?.[1]?.[0]?.[1] : null;
  if (!Array.isArray(candidates) || !candidates.length
    || candidates.some((candidate) => typeof candidate !== 'string' || !candidate)) {
    throw new Error('Invalid handwriting recognition response');
  }
  return candidates;
};
