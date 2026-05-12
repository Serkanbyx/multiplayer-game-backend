export const flipAnimate = (el: HTMLElement, prevRect: DOMRect, durationMs = 300): void => {
  const next = el.getBoundingClientRect();
  const dx = prevRect.left - next.left;
  const dy = prevRect.top - next.top;
  el.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
    { duration: durationMs, easing: 'ease-out' },
  );
};
