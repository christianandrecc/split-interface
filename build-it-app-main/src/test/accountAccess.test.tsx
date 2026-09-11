import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import AccountAccess from "@/components/AccountAccess";
import { createEmptyProfile } from "@/lib/userProfile";
import { profileSignupMetadata } from "@/lib/profileStorage";
import * as profileStorage from "@/lib/profileStorage";

afterEach(() => vi.restoreAllMocks());

function renderAccountAccess(
  onCreateAccount = vi.fn(),
  onSignIn = vi.fn(),
  props: Partial<ComponentProps<typeof AccountAccess>> = {},
) {
  render(
    <TooltipProvider>
      <AccountAccess onCreateAccount={onCreateAccount} onSignIn={onSignIn} {...props} />
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
  it.each([
    { label: "typed character by character", finalName: "Aurora Music" },
    { label: "replaced after returning to the personal page", finalName: "Northern Lights" },
    { label: "cleared after typing", finalName: "" },
    { label: "replaced with whitespace", finalName: "   " },
    { label: "a one-letter artist name is intentional", finalName: "A" },
    { label: "a separate display name already exists", finalName: "Aurora Music", displayName: "AM" },
  ])("submits the complete artist name when $label", async ({ finalName, displayName }) => {
    const onCreateAccount = vi.fn().mockResolvedValue(undefined);
    renderAccountAccess(onCreateAccount, vi.fn(), {
      initialProfile: displayName ? { ...createEmptyProfile(), displayName } : undefined,
    });
    const artist = screen.getByRole("textbox", { name: /artist name/i });
    for (let length = 1; length <= "Aurora Music".length; length++) {
      fireEvent.change(artist, { target: { value: "Aurora Music".slice(0, length) } });
    }
    completePersonalPage();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.change(screen.getByRole("textbox", { name: /artist name/i }), { target: { value: finalName } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Artist" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByPlaceholderText("8 characters minimum"), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText("Repeat password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByLabelText(/terms & conditions/i));
    fireEvent.click(screen.getByLabelText(/privacy policy/i));
    fireEvent.click(screen.getAllByRole("button", { name: /create account/i })[1]);

    await waitFor(() => expect(onCreateAccount).toHaveBeenCalledTimes(1));
    const [profile] = onCreateAccount.mock.calls[0];
    const expectedName = displayName || finalName.trim() || "chori_one";
    expect(profile.displayName).toBe(expectedName);
    expect(profile.pkaNames).toBe(finalName.trim());
    expect(profileSignupMetadata(profile)).toMatchObject({
      display_name: expectedName,
      stage_name: finalName.trim() || expectedName,
      pka_names: finalName.trim() || null,
      profile_data: { displayName: expectedName, pkaNames: finalName.trim() },
    });
  });

  it("lets an existing account replay the new-user onboarding", () => {
    const onViewOnboardingAgain = vi.fn();
    renderAccountAccess(vi.fn(), vi.fn(), {
      initialProfile: {
        ...createEmptyProfile(),
        username: "chori",
        emailAddress: "chori@example.com",
      },
      onViewOnboardingAgain,
    });

    fireEvent.click(screen.getByRole("button", { name: /view onboarding again/i }));

    expect(onViewOnboardingAgain).toHaveBeenCalledTimes(1);
  });

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

  it("keeps artist and PRO/IPI help without asking for publishing setup", () => {
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
    expect(screen.queryByRole("button", { name: /publishing information help/i })).not.toBeInTheDocument();

    expect(screen.getByRole("combobox", { name: /pro affiliation/i })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /publishing information/i })).not.toBeInTheDocument();
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

  it.each([false, true])("offers confirmation resend without claiming delivery (failure: %s)", async failure => {
    const resend = vi.spyOn(profileStorage, "requestSignupConfirmation");
    if (failure) resend.mockRejectedValue(new Error("Could not request confirmation. Please try again."));
    else resend.mockResolvedValue({ requested: true });
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
    expect(screen.queryByText(/email confirmation sent/i)).not.toBeInTheDocument();
    expect(screen.getByText(/already registered/i)).toBeInTheDocument();
    expect(resend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    expect(await screen.findByRole("button", { name: /resend in \d+s/i })).toBeDisabled();
    expect(resend).toHaveBeenCalledExactlyOnceWith("chori@example.com");
    if (failure) {
      expect(screen.getByRole("alert")).toHaveTextContent(/Could not request confirmation/);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole("status")).toHaveTextContent(/If confirmation is still required/);
    }
    fireEvent.click(screen.getByRole("button", { name: /resend in \d+s/i }));
    expect(resend).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /go to sign in/i }));
    expect(screen.getByRole("heading", { name: /sign in to split/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("chori@example.com")).toBeInTheDocument();
  });
});
