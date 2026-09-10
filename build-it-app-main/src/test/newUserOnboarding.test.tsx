import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewUserOnboarding from "@/components/NewUserOnboarding";

describe("NewUserOnboarding", () => {
  it("moves through the six onboarding cards and completes", () => {
    const onComplete = vi.fn();
    render(<NewUserOnboarding onComplete={onComplete} />);

    expect(screen.getByRole("heading", { name: "Start a SPLIT" })).toBeInTheDocument();
    expect(screen.getByText("1 of 6")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Invite collaborators" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Everyone has a say" })).toBeInTheDocument();
    expect(screen.getByText("3 of 6")).toBeInTheDocument();
    expect(screen.getByText("Suggest a different split, talk it through, and approve the same version together. Signing comes next.")).toBeInTheDocument();

    const counterIllustration = screen.getByTestId("counter-illustration");
    expect(within(counterIllustration).getAllByText("50%")).toHaveLength(2);
    expect(within(counterIllustration).getByText("60%")).toBeInTheDocument();
    expect(within(counterIllustration).getByText("40%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Find it later" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enter SPLIT" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("lets users skip the onboarding", () => {
    const onComplete = vi.fn();
    render(<NewUserOnboarding onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("shows a sample work and lets optional context be collapsed without leaving the tour", () => {
    const onComplete = vi.fn();
    render(<NewUserOnboarding onComplete={onComplete} />);
    const preview = within(screen.getByTestId("work-creation-preview"));

    expect(preview.getByText("Midnight Drive")).toBeInTheDocument();
    expect(preview.getByText("Carter Lane")).toBeInTheDocument();
    expect(preview.getByLabelText("From your signed-in profile")).toBeInTheDocument();
    expect(preview.getByText("Sep 5, 2026")).toBeInTheDocument();
    expect(preview.getByRole("region", { name: "Optional work details" })).toBeVisible();
    const toggle = preview.getByRole("button", { name: "Optional details" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(preview.queryByRole("region", { name: "Optional work details" })).not.toBeInTheDocument();
    expect(preview.getByText("Start with the basics. Extra context can wait.")).toBeVisible();
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(toggle);

    expect(preview.getByText("Friday session with Mina.")).toBeVisible();
    expect(preview.getByText("Midnight Drive (demo)")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start a SPLIT" })).toBeInTheDocument();
  });

  it("previews an approval without treating it as a signed or locked SPLIT", () => {
    const onComplete = vi.fn();
    render(<NewUserOnboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: "Show onboarding step 3: Everyone has a say" }));

    const discussion = within(screen.getByTestId("counter-discussion"));
    expect(discussion.getByText("Private")).toBeInTheDocument();
    expect(discussion.getByText("Mina approved v2. Your review is next.")).toBeInTheDocument();
    expect(discussion.getByText("Review the updated shares together. You decide what to approve.")).toBeInTheDocument();
    fireEvent.click(discussion.getByRole("button", { name: "Preview approving this counter" }));

    expect(discussion.getByRole("status")).toHaveTextContent("Both approved");
    expect(discussion.getByText("2 of 2 approvals. Ready for signatures.")).toBeInTheDocument();
    expect(screen.queryByText("Signed and locked")).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(discussion.getByRole("button", { name: "Replay approval preview" }));
    expect(discussion.getByRole("button", { name: "Preview approving this counter" })).toBeInTheDocument();
    expect(discussion.queryByRole("status")).not.toBeInTheDocument();
  });

  it("previews the final signature and locked record without completing onboarding", () => {
    const onComplete = vi.fn();
    render(<NewUserOnboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: "Show onboarding step 5: Sign together" }));

    const preview = within(screen.getByTestId("signing-preview"));
    expect(preview.getByText("1 of 2")).toBeInTheDocument();
    expect(preview.getByText("60%")).toBeInTheDocument();
    expect(preview.getByText("40%")).toBeInTheDocument();
    expect(preview.getByText("Awaiting your signature")).toBeInTheDocument();

    fireEvent.click(preview.getByRole("button", { name: "Preview signing this SPLIT" }));

    expect(preview.getByText("2 of 2")).toBeInTheDocument();
    expect(preview.getByText("Signed at 2:15 PM")).toBeInTheDocument();
    expect(preview.getByRole("status")).toHaveTextContent("Signed and locked");
    expect(preview.getByText("Final record. No changes after locking.")).toBeInTheDocument();
    expect(preview.queryByRole("button", { name: "Preview signing this SPLIT" })).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(preview.getByRole("button", { name: "Replay signing preview" }));

    expect(preview.getByText("1 of 2")).toBeInTheDocument();
    expect(preview.getByRole("button", { name: "Preview signing this SPLIT" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign together" })).toBeInTheDocument();
  });

  it("keeps one fixed onboarding window and card rail while slides change", () => {
    render(<NewUserOnboarding onComplete={vi.fn()} />);

    const onboardingWindow = screen.getByTestId("onboarding-window");
    const cardRail = screen.getByTestId("onboarding-card-rail");
    const windowClasses = onboardingWindow.className;
    const railClasses = cardRail.className;

    expect(windowClasses).toContain("h-[1000px]");
    expect(windowClasses).toContain("max-[359px]:h-[1140px]");
    expect(windowClasses).toContain("sm:h-[850px]");
    expect(windowClasses).toContain("lg:h-[736px]");
    expect(windowClasses).toContain("grid-rows-[minmax(0,1fr)_198px]");
    expect(railClasses).toContain("h-[198px]");

    fireEvent.click(screen.getByRole("button", { name: "Show onboarding step 3: Everyone has a say" }));

    expect(screen.getByTestId("counter-story")).toBeInTheDocument();
    expect(onboardingWindow.className).toBe(windowClasses);
    expect(cardRail.className).toBe(railClasses);

    fireEvent.click(screen.getByRole("button", { name: "Show onboarding step 4: Review in Messages" }));

    expect(screen.getByRole("heading", { name: "Review in Messages" })).toBeInTheDocument();
    expect(screen.getByText("Midnight Drive room")).toBeInTheDocument();
    expect(screen.getByText("Counter proposal")).toBeInTheDocument();
    expect(screen.getByText("Message collaborators...")).toBeInTheDocument();
    expect(onboardingWindow.className).toBe(windowClasses);
    expect(cardRail.className).toBe(railClasses);
  });
});
