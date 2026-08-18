export const selectQuizItems = (items, limit) => {
  const shuffledItems = [...items].sort(() => 0.5 - Math.random());
  return limit === null ? shuffledItems : shuffledItems.slice(0, limit);
};
