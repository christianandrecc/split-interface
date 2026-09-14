import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AccountClosureRequest from "@/components/AccountClosureRequest";

afterEach(cleanup);

describe("manual account closure", () => {
  it("explains review and preservation before offering an email request", () => {
    render(<AccountClosureRequest />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request account closure" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Request account closure");
    expect(screen.getByText(/Your account stays active/)).toBeInTheDocument();
    expect(screen.getByText(/Signed agreements, signatures/)).toBeInTheDocument();
    const url = new URL(screen.getByRole("link", { name: "Open email" }).getAttribute("href")!);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("xtiancarrera@gmail.com");
    expect(url.searchParams.get("subject")).toBe("SPLIT account closure request");
    expect(url.searchParams.get("body")).toContain("before making any changes");
    expect([...url.searchParams.keys()]).toEqual(["subject", "body"]);
    expect(screen.getByRole("link", { name: "xtiancarrera@gmail.com" })).toHaveAttribute("href", url.href);
  });

  it("cancels without claiming an email was sent or an account was closed", () => {
    render(<AccountClosureRequest />);
    fireEvent.click(screen.getByRole("button", { name: "Request account closure" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
