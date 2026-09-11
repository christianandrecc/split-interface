import { useEffect, useRef } from "react";

// Animate a view change without remounting its forms or replaying on data refresh.
export function useContentEntrance<T extends HTMLElement>(viewKey: string) {
  const ref = useRef<T>(null);
  const previousKey = useRef(viewKey);

  useEffect(() => {
    if (previousKey.current === viewKey) return;
    previousKey.current = viewKey;
    const element = ref.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element?.animate || preference.matches) return;

    const animation = element.animate(
      [{ opacity: 0.65, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 160, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    const stopMotion = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener("change", stopMotion);
    return () => {
      animation.cancel();
      preference.removeEventListener("change", stopMotion);
    };
  }, [viewKey]);

  return ref;
}
