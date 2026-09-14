import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "@/components/AppErrorBoundary";

afterEach(() => vi.restoreAllMocks());

describe("app error recovery", () => {
  it("renders the app normally", () => {
    render(<AppErrorBoundary><h1>Your splits</h1></AppErrorBoundary>);
    expect(screen.getByRole("heading", { name: "Your splits" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("contains render failures without exposing the error or automatically reloading", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onReload = vi.fn();
    function BrokenView(): never { throw new Error("Sensitive agreement contents"); }
    render(<AppErrorBoundary onReload={onReload}><BrokenView /></AppErrorBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("Any unsaved edits may be lost");
    expect(screen.queryByText(/Sensitive agreement/)).not.toBeInTheDocument();
    expect(onReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reload SPLIT" }));
    expect(onReload).toHaveBeenCalledOnce();
  });
});
