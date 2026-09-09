import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WatchlistPanel from "./WatchlistPanel";

describe("WatchlistPanel", () => {
  it("renders heading", () => {
    render(<WatchlistPanel items={[]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByText("Watchlist")).toBeTruthy();
  });

  it("shows 0 terms count", () => {
    render(<WatchlistPanel items={[]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByText("0 terms")).toBeTruthy();
  });

  it("shows correct term count for 1 item", () => {
    render(<WatchlistPanel items={["milk"]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByText("1 term")).toBeTruthy();
  });

  it("shows correct term count for multiple items", () => {
    render(<WatchlistPanel items={["milk", "peanut"]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByText("2 terms")).toBeTruthy();
  });

  it("shows empty state message when no items", () => {
    render(<WatchlistPanel items={[]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByText(/Add keywords to get alerts/)).toBeTruthy();
  });

  it("hides empty state message when items exist", () => {
    render(<WatchlistPanel items={["milk"]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.queryByText(/Add keywords to get alerts/)).toBeNull();
  });

  it("renders watchlist items", () => {
    render(<WatchlistPanel items={["milk", "peanut"]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByText("milk")).toBeTruthy();
    expect(screen.getByText("peanut")).toBeTruthy();
  });

  it("has accessible input label", () => {
    render(<WatchlistPanel items={[]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByLabelText("Watchlist keyword")).toBeTruthy();
  });

  it("calls onAdd when form submitted with text", () => {
    const onAdd = vi.fn();
    render(<WatchlistPanel items={[]} onAdd={onAdd} onRemove={() => {}} />);
    const input = screen.getByLabelText("Watchlist keyword");
    fireEvent.change(input, { target: { value: "salmonella" } });
    fireEvent.submit(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalledWith("salmonella");
  });

  it("clears input after successful add", () => {
    const onAdd = vi.fn();
    render(<WatchlistPanel items={[]} onAdd={onAdd} onRemove={() => {}} />);
    const input = screen.getByLabelText("Watchlist keyword") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "salmonella" } });
    fireEvent.submit(screen.getByRole("button", { name: "Add" }));
    expect(input.value).toBe("");
  });

  it("does not call onAdd when input is empty", () => {
    const onAdd = vi.fn();
    render(<WatchlistPanel items={[]} onAdd={onAdd} onRemove={() => {}} />);
    fireEvent.submit(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("does not call onAdd when input is whitespace only", () => {
    const onAdd = vi.fn();
    render(<WatchlistPanel items={[]} onAdd={onAdd} onRemove={() => {}} />);
    const input = screen.getByLabelText("Watchlist keyword");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("calls onRemove when remove button clicked", () => {
    const onRemove = vi.fn();
    render(<WatchlistPanel items={["milk", "peanut"]} onAdd={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText("Remove milk"));
    expect(onRemove).toHaveBeenCalledWith("milk");
  });

  it("remove buttons have accessible labels", () => {
    render(<WatchlistPanel items={["milk", "peanut"]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByLabelText("Remove milk")).toBeTruthy();
    expect(screen.getByLabelText("Remove peanut")).toBeTruthy();
  });
});
