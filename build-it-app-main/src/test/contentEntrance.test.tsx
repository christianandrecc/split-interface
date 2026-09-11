import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useContentEntrance } from "@/hooks/use-content-entrance";

function View({ viewKey, value = "unchanged" }: { viewKey: string; value?: string }) {
  const ref = useContentEntrance<HTMLDivElement>(viewKey);
  return <div ref={ref}><input aria-label="Draft" defaultValue="" /><span>{value}</span></div>;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockMotion(reduced = false) {
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
  const listeners = new Set<() => void>();
  const preference = { matches: reduced, addEventListener: (_: string, listener: () => void) => listeners.add(listener), removeEventListener: (_: string, listener: () => void) => listeners.delete(listener) };
  vi.spyOn(window, "matchMedia").mockReturnValue(preference as unknown as MediaQueryList);
  return { animate, cancel, preference, listeners, restore: () => {
    if (original) Object.defineProperty(HTMLElement.prototype, "animate", original);
    else Reflect.deleteProperty(HTMLElement.prototype, "animate");
  } };
}

describe("content motion", () => {
  it("animates only view changes, preserving the draft and focus", () => {
    const motion = mockMotion();
    try {
      const { rerender, unmount } = render(<View viewKey="all" />);
      const draft = screen.getByLabelText("Draft");
      draft.focus(); fireEvent.change(draft, { target: { value: "Keep my work" } });
      rerender(<View viewKey="all" value="fresh data" />);
      expect(motion.animate).not.toHaveBeenCalled();
      rerender(<View viewKey="signed" />);
      expect(motion.animate).toHaveBeenCalledOnce();
      expect(motion.animate).toHaveBeenCalledWith(expect.any(Array), { duration: 160, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
      expect(screen.getByLabelText("Draft")).toBe(draft);
      expect(draft).toHaveValue("Keep my work"); expect(draft).toHaveFocus();
      rerender(<View viewKey="drafts" />);
      expect(motion.cancel).toHaveBeenCalledOnce();
      unmount();
      expect(motion.cancel).toHaveBeenCalledTimes(2);
      expect(motion.listeners.size).toBe(0);
    } finally { motion.restore(); }
  });
  it("does not animate when reduced motion is requested", () => {
    const motion = mockMotion(true);
    try {
      const { rerender } = render(<View viewKey="all" />);
      rerender(<View viewKey="signed" />);
      expect(motion.animate).not.toHaveBeenCalled();
    } finally { motion.restore(); }
  });
  it("cancels active motion when the system preference changes", () => {
    const motion = mockMotion();
    try {
      const { rerender } = render(<View viewKey="all" />);
      rerender(<View viewKey="signed" />);
      motion.preference.matches = true;
      motion.listeners.forEach((listener) => listener());
      expect(motion.cancel).toHaveBeenCalledOnce();
    } finally { motion.restore(); }
  });
  it("still renders in browsers without the animation API", () => {
    const { rerender } = render(<View viewKey="all" />);
    rerender(<View viewKey="signed" value="Signed records" />);
    expect(screen.getByText("Signed records")).toBeInTheDocument();
  });
});
