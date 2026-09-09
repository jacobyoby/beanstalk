import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StateFilter from "./StateFilter";

describe("StateFilter", () => {
  it("renders label", () => {
    render(<StateFilter selected="" onChange={() => {}} />);
    expect(screen.getByText("Distribution State")).toBeTruthy();
  });

  it("renders select with All states option", () => {
    render(<StateFilter selected="" onChange={() => {}} />);
    expect(screen.getByText("All states")).toBeTruthy();
  });

  it("renders Nationwide option", () => {
    render(<StateFilter selected="" onChange={() => {}} />);
    expect(screen.getByText("Nationwide")).toBeTruthy();
  });

  it("renders all 50 US states", () => {
    render(<StateFilter selected="" onChange={() => {}} />);
    expect(screen.getByText("CA")).toBeTruthy();
    expect(screen.getByText("NY")).toBeTruthy();
    expect(screen.getByText("TX")).toBeTruthy();
    expect(screen.getByText("WY")).toBeTruthy();
    const options = screen.getAllByRole("option");
    // 50 states + All states + Nationwide = 52
    expect(options.length).toBe(52);
  });

  it("displays current selected value", () => {
    render(<StateFilter selected="CA" onChange={() => {}} />);
    const select = screen.getByLabelText("Distribution State") as HTMLSelectElement;
    expect(select.value).toBe("CA");
  });

  it("calls onChange when selection changes", () => {
    const onChange = vi.fn();
    render(<StateFilter selected="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Distribution State"), { target: { value: "NY" } });
    expect(onChange).toHaveBeenCalledWith("NY");
  });

  it("has accessible label linked to select", () => {
    render(<StateFilter selected="" onChange={() => {}} />);
    expect(screen.getByLabelText("Distribution State")).toBeTruthy();
  });

  it("renders helper text", () => {
    render(<StateFilter selected="" onChange={() => {}} />);
    expect(screen.getByText(/Matches reported distribution_pattern/)).toBeTruthy();
  });
});
