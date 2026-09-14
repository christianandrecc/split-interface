import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import AccountAccess from "@/components/AccountAccess";
import { createEmptyProfile } from "@/lib/userProfile";
import { profileSignupMetadata } from "@/lib/profileStorage";
import * as profileStorage from "@/lib/profileStorage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.history.replaceState({}, "", "/");
});

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

  it("keeps onboarding replay out of account setup", () => {
    renderAccountAccess(vi.fn(), vi.fn(), {
      initialProfile: {
        ...createEmptyProfile(),
        username: "chori",
        emailAddress: "chori@example.com",
      },
    });

    expect(screen.queryByRole("button", { name: /view onboarding again/i })).not.toBeInTheDocument();
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

describe("password recovery request UI", () => {
  function openResetForm() {
    renderAccountAccess();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    fireEvent.change(screen.getByRole("textbox", { name: /email address/i }), { target: { value: "Test@Example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(screen.getByDisplayValue("test@example.test")).toBeInTheDocument();
  }

  it.each([false, true])("keeps request failures distinct from conditional success (failure: %s)", async failure => {
    const request = vi.spyOn(profileStorage, "requestSupabasePasswordReset");
    if (failure) request.mockRejectedValue(new Error("Password reset email delivery is unavailable."));
    else request.mockResolvedValue({ requested: true });
    openResetForm();
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Email" }));
    expect(await screen.findByRole("button", { name: /request again in \d+s/i })).toBeDisabled();
    expect(request).toHaveBeenCalledExactlyOnceWith("test@example.test");
    if (failure) {
      expect(screen.getByRole("alert")).toHaveTextContent("delivery is unavailable");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole("status")).toHaveTextContent(/If an account can receive/);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });

  it("blocks duplicate submissions during a request and its cooldown, then allows retry", async () => {
    vi.useFakeTimers();
    let finish!: (result: { requested: boolean }) => void;
    const request = vi.spyOn(profileStorage, "requestSupabasePasswordReset")
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValue({ requested: true });
    openResetForm();
    const form = screen.getByRole("button", { name: "Send Reset Email" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Requesting..." })).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => finish({ requested: true }));
    fireEvent.submit(form);
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("button", { name: "Send Reset Email" })).toBeEnabled();
    await act(async () => fireEvent.submit(form));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not put a late request error onto the sign-in form", async () => {
    let reject!: (error: Error) => void;
    vi.spyOn(profileStorage, "requestSupabasePasswordReset").mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    openResetForm();
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Email" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to Sign In" }));
    await act(async () => reject(new Error("Request failed")));
    expect(screen.getByRole("heading", { name: "Sign in to SPLIT" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not open a password form just because a URL says recovery", () => {
    window.history.replaceState({}, "", "/?type=recovery");
    renderAccountAccess();
    expect(screen.getByRole("heading", { name: "Personal information" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Create a new password" })).not.toBeInTheDocument();
  });

  it("only completes a verified recovery after the password update succeeds", async () => {
    const update = vi.spyOn(profileStorage, "updateSupabasePassword")
      .mockRejectedValueOnce(new Error("Session expired. Please request a new reset link."))
      .mockResolvedValueOnce(undefined);
    const complete = vi.fn();
    renderAccountAccess(vi.fn(), vi.fn(), { forcePasswordReset: true, onPasswordResetComplete: complete });
    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: "New-test-password" } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password/), { target: { value: "New-test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Session expired");
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledTimes(2);
  });
});
