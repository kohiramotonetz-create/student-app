const CHARACTER_GROUP_PADDING = 18;
const VERTICAL_LAYOUT_RATIO = 1.15;

const createBounds = (stroke) => {
  const xs = stroke.map((point) => point.x);
  const ys = stroke.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
};

const mergeBounds = (boundsList) => ({
  minX: Math.min(...boundsList.map((bounds) => bounds.minX)),
  maxX: Math.max(...boundsList.map((bounds) => bounds.maxX)),
  minY: Math.min(...boundsList.map((bounds) => bounds.minY)),
  maxY: Math.max(...boundsList.map((bounds) => bounds.maxY))
});

const intersectsWithPadding = (left, right, padding = CHARACTER_GROUP_PADDING) => !(
  left.maxX + padding < right.minX
  || right.maxX + padding < left.minX
  || left.maxY + padding < right.minY
  || right.maxY + padding < left.minY
);

const sortBySpatialOrder = (groups) => {
  if (groups.length <= 1) return groups;

  const centerXs = groups.map(({ bounds }) => (bounds.minX + bounds.maxX) / 2);
  const centerYs = groups.map(({ bounds }) => (bounds.minY + bounds.maxY) / 2);
  const rangeX = Math.max(...centerXs) - Math.min(...centerXs);
  const rangeY = Math.max(...centerYs) - Math.min(...centerYs);
  const isVerticalLayout = rangeY > rangeX * VERTICAL_LAYOUT_RATIO;

  return [...groups].sort((left, right) => {
    const leftCenterX = (left.bounds.minX + left.bounds.maxX) / 2;
    const rightCenterX = (right.bounds.minX + right.bounds.maxX) / 2;
    const leftCenterY = (left.bounds.minY + left.bounds.maxY) / 2;
    const rightCenterY = (right.bounds.minY + right.bounds.maxY) / 2;

    if (isVerticalLayout) {
      if (leftCenterY !== rightCenterY) return leftCenterY - rightCenterY;
      return leftCenterX - rightCenterX;
    }

    if (leftCenterX !== rightCenterX) return leftCenterX - rightCenterX;
    return leftCenterY - rightCenterY;
  });
};

export const reorderStrokesForKanjiRecognition = (strokes) => {
  if (strokes.length <= 1) return strokes;

  const decoratedStrokes = strokes.map((stroke, index) => ({
    stroke,
    index,
    bounds: createBounds(stroke)
  }));

  const visited = new Set();
  const groups = [];

  for (let i = 0; i < decoratedStrokes.length; i += 1) {
    if (visited.has(i)) continue;

    const queue = [i];
    const groupItems = [];
    visited.add(i);

    while (queue.length > 0) {
      const currentIndex = queue.shift();
      const currentItem = decoratedStrokes[currentIndex];
      groupItems.push(currentItem);

      for (let j = 0; j < decoratedStrokes.length; j += 1) {
        if (visited.has(j)) continue;
        if (!intersectsWithPadding(currentItem.bounds, decoratedStrokes[j].bounds)) continue;
        visited.add(j);
        queue.push(j);
      }
    }

    groupItems.sort((left, right) => left.index - right.index);
    groups.push({
      bounds: mergeBounds(groupItems.map(({ bounds }) => bounds)),
      strokes: groupItems.map(({ stroke }) => stroke)
    });
  }

  return sortBySpatialOrder(groups).flatMap(({ strokes: groupStrokes }) => groupStrokes);
};

