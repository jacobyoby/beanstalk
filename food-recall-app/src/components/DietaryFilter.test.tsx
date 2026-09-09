import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DietaryFilter from "./DietaryFilter";

describe("DietaryFilter", () => {
  it("renders heading", () => {
    render(<DietaryFilter selected={[]} onChange={() => {}} />);
    expect(screen.getByText("Dietary concerns")).toBeTruthy();
  });

  it("renders all 9 FDA major allergens", () => {
    render(<DietaryFilter selected={[]} onChange={() => {}} />);
    expect(screen.getByText("Milk")).toBeTruthy();
    expect(screen.getByText("Eggs")).toBeTruthy();
    expect(screen.getByText("Fish")).toBeTruthy();
    expect(screen.getByText("Crustacean shellfish")).toBeTruthy();
    expect(screen.getByText("Tree nuts")).toBeTruthy();
    expect(screen.getByText("Peanuts")).toBeTruthy();
    expect(screen.getByText("Wheat")).toBeTruthy();
    expect(screen.getByText("Soybeans")).toBeTruthy();
    expect(screen.getByText("Sesame")).toBeTruthy();
  });

  it("renders broader dietary concerns", () => {
    render(<DietaryFilter selected={[]} onChange={() => {}} />);
    expect(screen.getByText("Gluten")).toBeTruthy();
    expect(screen.getByText("Vegan")).toBeTruthy();
    expect(screen.getByText("Vegetarian")).toBeTruthy();
    expect(screen.getByText("Halal")).toBeTruthy();
    expect(screen.getByText("Kosher")).toBeTruthy();
  });

  it("shows checkboxes for each concern", () => {
    render(<DietaryFilter selected={[]} onChange={() => {}} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(14); // 9 allergens + 5 broader
  });

  it("checks selected concerns", () => {
    render(<DietaryFilter selected={["milk", "peanuts"]} onChange={() => {}} />);
    const milkCb = screen.getByLabelText("Milk") as HTMLInputElement;
    const peanutCb = screen.getByLabelText("Peanuts") as HTMLInputElement;
    expect(milkCb.checked).toBe(true);
    expect(peanutCb.checked).toBe(true);
  });

  it("leaves unselected concerns unchecked", () => {
    render(<DietaryFilter selected={[]} onChange={() => {}} />);
    const milkCb = screen.getByLabelText("Milk") as HTMLInputElement;
    expect(milkCb.checked).toBe(false);
  });

  it("calls onChange with added concern when unchecked box clicked", () => {
    const onChange = vi.fn();
    render(<DietaryFilter selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Milk"));
    expect(onChange).toHaveBeenCalledWith(["milk"]);
  });

  it("calls onChange with removed concern when checked box clicked", () => {
    const onChange = vi.fn();
    render(<DietaryFilter selected={["milk", "peanuts"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Milk"));
    expect(onChange).toHaveBeenCalledWith(["peanuts"]);
  });

  it("shows active filter summary when concerns selected", () => {
    render(<DietaryFilter selected={["milk", "eggs"]} onChange={() => {}} />);
    expect(screen.getByText(/Filtering by Milk, Eggs/)).toBeTruthy();
    expect(screen.getByText(/2 concern/)).toBeTruthy();
  });

  it("hides filter summary when no concerns selected", () => {
    render(<DietaryFilter selected={[]} onChange={() => {}} />);
    expect(screen.queryByText(/Filtering by/)).toBeNull();
  });

  it("renders disclaimer text", () => {
    render(<DietaryFilter selected={[]} onChange={() => {}} />);
    expect(screen.getByText(/Absence of a term does not mean allergen-free/)).toBeTruthy();
  });
});
