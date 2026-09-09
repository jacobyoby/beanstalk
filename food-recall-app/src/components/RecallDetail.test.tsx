import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Recall } from "../types/recall";
import RecallDetail from "./RecallDetail";

const makeRecall = (overrides: Partial<Recall> = {}): Recall => ({
  id: "F-001-2026",
  recallNumber: "F-001-2026",
  eventId: "90001",
  productDescription: "Chocolate Bar, 3oz",
  reasonForRecall: "Undeclared milk allergen",
  classification: "Class I",
  status: "Ongoing",
  distributionPattern: "Nationwide",
  recallingFirm: "Test Corp",
  city: "New York",
  state: "NY",
  country: "United States",
  recallInitiationDate: "20260115",
  productType: "Food",
  codeInfo: "Lot 123",
  moreCodeInfo: "",
  voluntaryMandated: "Voluntary: Firm Initiated",
  address1: "",
  address2: "",
  postalCode: "",
  centerClassificationDate: "",
  initialFirmNotification: "",
  productQuantity: "",
  terminationDate: "",
  ...overrides,
});

describe("RecallDetail", () => {
  it("renders product description as heading", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText("Chocolate Bar, 3oz")).toBeTruthy();
  });

  it("renders recall number and event ID", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText(/F-001-2026/)).toBeTruthy();
    expect(screen.getByText(/90001/)).toBeTruthy();
  });

  it("renders classification", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText("Class I")).toBeTruthy();
  });

  it("renders status", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText("Ongoing")).toBeTruthy();
    expect(screen.getByText(/as published by openFDA/i)).toBeTruthy();
  });

  it("renders reason for recall", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText("Undeclared milk allergen")).toBeTruthy();
  });

  it("renders firm and location", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText(/Test Corp/)).toBeTruthy();
    expect(screen.getByText(/New York, NY/)).toBeTruthy();
  });

  it("renders distribution pattern", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText("Nationwide")).toBeTruthy();
  });

  it("renders code info", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText("Lot 123")).toBeTruthy();
  });

  it("renders formatted initiation date", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText(/Jan 15, 2026/)).toBeTruthy();
  });

  it("renders voluntary/mandated", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByText("Voluntary: Firm Initiated")).toBeTruthy();
  });

  it("conditionally renders moreCodeInfo when present", () => {
    render(<RecallDetail recall={makeRecall({ moreCodeInfo: "Extra lots: A, B" })} onClose={() => {}} />);
    expect(screen.getByText(/More Code Info/)).toBeTruthy();
    expect(screen.getByText("Extra lots: A, B")).toBeTruthy();
  });

  it("does not render moreCodeInfo when empty", () => {
    render(<RecallDetail recall={makeRecall({ moreCodeInfo: "" })} onClose={() => {}} />);
    expect(screen.queryByText(/More Code Info/)).toBeNull();
  });

  it("conditionally renders termination date", () => {
    render(<RecallDetail recall={makeRecall({ terminationDate: "20260601" })} onClose={() => {}} />);
    expect(screen.getByText(/Termination Date/)).toBeTruthy();
    expect(screen.getByText(/Jun 1, 2026/)).toBeTruthy();
  });

  it("conditionally renders product quantity", () => {
    render(<RecallDetail recall={makeRecall({ productQuantity: "5,000 units" })} onClose={() => {}} />);
    expect(screen.getByText("5,000 units")).toBeTruthy();
  });

  it("conditionally renders firm address", () => {
    render(<RecallDetail recall={makeRecall({ address1: "123 Main St", postalCode: "10001" })} onClose={() => {}} />);
    expect(screen.getByText(/Firm Address/)).toBeTruthy();
    expect(screen.getByText(/123 Main St/)).toBeTruthy();
  });

  it("calls onClose when Close button clicked", () => {
    const onClose = vi.fn();
    render(<RecallDetail recall={makeRecall()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close recall details"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<RecallDetail recall={makeRecall()} onClose={onClose} />);
    // The backdrop is the first flex-1 div with bg-black/40
    const backdrop = document.querySelector(".bg-black\\/40");
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<RecallDetail recall={makeRecall()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("has dialog role and aria-modal", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("has accessible close button label", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    expect(screen.getByLabelText("Close recall details")).toBeTruthy();
  });

  it("has aria-labelledby linking to heading", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBe("recall-title");
    expect(document.getElementById("recall-title")).toBeTruthy();
  });

  it("renders FDA link with rel=noreferrer", () => {
    render(<RecallDetail recall={makeRecall()} onClose={() => {}} />);
    const link = screen.getByText(/View on FDA/);
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
