import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import AccountAccess from "@/components/AccountAccess";

function renderAccountAccess(onCreateAccount = vi.fn(), onSignIn = vi.fn()) {
  render(
    <TooltipProvider>
      <AccountAccess onCreateAccount={onCreateAccount} onSignIn={onSignIn} />
    </TooltipProvider>,
  );
}

function completePersonalPage() {
  fireEvent.change(screen.getByRole("textbox", { name: /username/i }), { target: { value: "Chori_One" } });
  fireEvent.change(screen.getByRole("textbox", { name: /email address/i }), { target: { value: "CHORI@Example.COM " } });
  fireEvent.change(screen.getByRole("textbox", { name: /legal name/i }), { target: { value: "Christian Carrera" } });
  fireEvent.change(screen.getByRole("textbox", { name: /phone number/i }), { target: { value: "2168578164" } });
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
}

describe("AccountAccess registration flow", () => {
  it("shows the required personal information fields in the requested order", () => {
    renderAccountAccess();

    expect(screen.getByRole("heading", { name: "Personal information" })).toBeInTheDocument();

    const labels = screen
      .getAllByText(/Username|Email Address|Legal Name|Artist Name|Phone Number/)
      .map((label) => label.textContent?.replace(/\s+\*/g, "").trim());

    expect(labels).toEqual(["Username", "Email Address", "Legal Name", "Artist Name", "Phone Number"]);
  });

  it("removes manager, publisher, and MLC from account creation", () => {
    renderAccountAccess();
    completePersonalPage();

    expect(screen.getByRole("heading", { name: "Professional information" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Producer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Writer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Artist" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Engineer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Topliner" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manager" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publisher" })).not.toBeInTheDocument();
    expect(screen.queryByText(/mlc number/i)).not.toBeInTheDocument();
  });

  it("exposes focused signup help for artist, PRO, IPI, and publishing fields", () => {
    renderAccountAccess();

    expect(screen.getByRole("button", { name: /artist name help/i })).toHaveAttribute(
      "data-help",
      expect.stringContaining("professionally known as"),
    );

    completePersonalPage();

    expect(screen.getByRole("button", { name: /pro affiliation help/i })).toHaveAttribute(
      "data-help",
      expect.stringContaining("Performance Rights Organization"),
    );
    expect(screen.getByRole("button", { name: /ipi \/ cae number help/i })).toHaveAttribute(
      "data-help",
      expect.stringContaining("unique songwriter/composer ID"),
    );
    expect(screen.getByRole("button", { name: /publishing information help/i })).toHaveAttribute(
      "data-help",
      expect.stringContaining("who controls the publishing side"),
    );

    expect(screen.getByRole("combobox", { name: /pro affiliation/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /publishing information/i })).toBeInTheDocument();
  });

  it("submits normalized email and consent metadata after all pages are valid", async () => {
    const onCreateAccount = vi.fn().mockResolvedValue(undefined);
    renderAccountAccess(onCreateAccount);

    completePersonalPage();
    fireEvent.click(screen.getByRole("button", { name: "Producer" }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.change(screen.getByPlaceholderText("8 characters minimum"), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText("Repeat password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByLabelText(/terms & conditions/i));
    fireEvent.click(screen.getByLabelText(/privacy policy/i));
    fireEvent.click(screen.getAllByRole("button", { name: /create account/i })[1]);

    await waitFor(() => expect(onCreateAccount).toHaveBeenCalledTimes(1));
    const [profile, password] = onCreateAccount.mock.calls[0];

    expect(password).toBe("password123");
    expect(profile.username).toBe("chori_one");
    expect(profile.emailAddress).toBe("chori@example.com");
    expect(profile.roleTags).toBe("Producer");
    expect(profile.termsAcceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(profile.termsVersion).toBe("split-terms-2026-08-12");
    expect(profile.privacyAcknowledgedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(profile.privacyPolicyVersion).toBe("split-privacy-2026-08-12");
  });

  it("moves email confirmation into a dedicated success screen", async () => {
    const onCreateAccount = vi.fn().mockResolvedValue({
      needsEmailConfirmation: true,
      emailAddress: "chori@example.com",
    });
    renderAccountAccess(onCreateAccount);

    completePersonalPage();
    fireEvent.click(screen.getByRole("button", { name: "Producer" }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.change(screen.getByPlaceholderText("8 characters minimum"), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText("Repeat password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByLabelText(/terms & conditions/i));
    fireEvent.click(screen.getByLabelText(/privacy policy/i));
    fireEvent.click(screen.getAllByRole("button", { name: /create account/i })[1]);

    expect(await screen.findByRole("heading", { name: /check your inbox/i })).toBeInTheDocument();
    expect(screen.getByText("chori@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/supabase created the account/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /go to sign in/i }));
    expect(screen.getByRole("heading", { name: /sign in to split/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("chori@example.com")).toBeInTheDocument();
  });
});
