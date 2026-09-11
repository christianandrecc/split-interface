import { useLayoutEffect, useRef } from "react";

const ENTRANCES = {
  page: {
    from: { opacity: 0.65, transform: "translateY(4px)" },
    to: { opacity: 1, transform: "translateY(0)" },
    duration: 160,
  },
  preview: {
    from: { opacity: 0.3, transform: "translateX(18px) scale(0.995)" },
    to: { opacity: 1, transform: "translateX(0) scale(1)" },
    duration: 220,
  },
  back: {
    from: { opacity: 0.5, transform: "translateX(-12px)" },
    to: { opacity: 1, transform: "translateX(0)" },
    duration: 180,
  },
};

export type ContentEntrance = keyof typeof ENTRANCES;

// Animate a view change without remounting its forms or replaying on data refresh.
export function useContentEntrance<T extends HTMLElement>(viewKey: string, entrance: ContentEntrance = "page") {
  const ref = useRef<T>(null);
  const previousKey = useRef(viewKey);

  useLayoutEffect(() => {
    if (previousKey.current === viewKey) return;
    previousKey.current = viewKey;
    const element = ref.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element?.animate || preference.matches) return;

    const { from, to, duration } = ENTRANCES[entrance];
    const animation = element.animate([from, to], { duration, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    const stopMotion = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener("change", stopMotion);
    return () => {
      animation.cancel();
      preference.removeEventListener("change", stopMotion);
    };
  }, [viewKey, entrance]);

  return ref;
}
