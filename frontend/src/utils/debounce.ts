// 简单防抖
export function debounce<F extends (...args: never[]) => void>(fn: F, wait = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<F>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
