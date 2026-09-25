// Trailing-edge debounce with cancel() and flush() so pending edits are never lost.
export function debounce(fn, wait) {
  let timer = null;
  let lastArgs = null;

  const debounced = (...args) => {
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const args2 = lastArgs;
      lastArgs = null;
      fn(...args2);
    }, wait);
  };

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  debounced.flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    const args = lastArgs;
    lastArgs = null;
    fn(...args);
  };

  return debounced;
}
