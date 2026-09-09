import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDarkMode } from "./useDarkMode";

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
};

describe("useDarkMode", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to false when no stored preference and OS is light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(false);
  });

  it("defaults to true when OS prefers dark", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(true);
  });

  it("uses stored preference over OS setting", () => {
    localStorage.setItem("ponder_dark_mode", "true");
    mockMatchMedia(false);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(true);
  });

  it("toggle flips dark state", () => {
    localStorage.setItem("ponder_dark_mode", "false");
    mockMatchMedia(false);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.dark).toBe(false);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.dark).toBe(true);
  });

  it("adds dark class to document element when dark", () => {
    localStorage.setItem("ponder_dark_mode", "true");
    mockMatchMedia(true);
    renderHook(() => useDarkMode());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when light", () => {
    localStorage.setItem("ponder_dark_mode", "false");
    mockMatchMedia(false);
    renderHook(() => useDarkMode());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists preference to localStorage on toggle", () => {
    localStorage.setItem("ponder_dark_mode", "false");
    mockMatchMedia(false);
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current.toggle();
    });
    expect(localStorage.getItem("ponder_dark_mode")).toBe("true");
  });
});
