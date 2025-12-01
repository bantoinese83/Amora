import { useRef, useEffect, RefObject } from 'react';

export function useAutoScroll<T>(trigger: T): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [trigger]);

  return ref;
}
