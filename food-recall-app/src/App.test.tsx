import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import App from "./App";

// Mock API
vi.mock("./lib/api", () => ({
  fetchRecalls: vi.fn().mockResolvedValue({ recalls: [], total: 0, error: null, isStale: false, isDemo: false }),
  getLastSynced: vi.fn().mockReturnValue(new Date().toISOString()),
}));

vi.mock("./lib/events", () => ({
  fetchAdverseEvents: vi.fn().mockResolvedValue({ events: [], total: 0, error: null, isStale: false, isDemo: false }),
  getEventLastSynced: vi.fn().mockReturnValue(null),
  eventSearchText: vi.fn().mockReturnValue(""),
}));

// Mock notifications module (we spy on individual exports)
const mockRequestPermission = vi.fn();
vi.mock("./lib/notifications", () => ({
  requestNotificationPermission: (...args: unknown[]) => mockRequestPermission(...args),
  sendNotification: vi.fn(),
  getPermissionStatus: () => mockGetPermissionStatus(),
}));

let mockGetPermissionStatus: () => string = () => "default";

const mockNotificationAPI = (permission: string) => {
  const mock = vi.fn() as any;
  mock.permission = permission;
  mock.requestPermission = vi.fn().mockResolvedValue(permission);
  vi.stubGlobal("Notification", mock);
};

const removeNotificationAPI = () => {
  vi.unstubAllGlobals();
};

describe("App notification integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetPermissionStatus = () => "default";
    // jsdom does not implement matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    removeNotificationAPI();
  });

  it("initializes notificationsEnabled as false when permission is not granted", () => {
    removeNotificationAPI();
    render(<App />);
    // Button should appear because notifications are not enabled and permission is not denied
    expect(screen.getByRole("button", { name: /enable browser alert/i })).toBeInTheDocument();
  });

  it("initializes notificationsEnabled as true when permission is granted and localStorage preference is set", async () => {
    mockNotificationAPI("granted");
    mockGetPermissionStatus = () => "granted";
    localStorage.setItem("notificationsEnabled", "true");
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/alerts on/i)).toBeInTheDocument();
    });
    // Enable Alerts button should NOT be present
    expect(screen.queryByRole("button", { name: /enable browser alert/i })).not.toBeInTheDocument();
  });

  it("initializes notificationsEnabled as false when permission is granted but localStorage preference is not set", () => {
    mockNotificationAPI("granted");
    mockGetPermissionStatus = () => "granted";
    // localStorage has no notificationsEnabled key
    render(<App />);
    expect(screen.getByRole("button", { name: /enable browser alert/i })).toBeInTheDocument();
  });

  it("hides Enable Alerts button when permission is denied", () => {
    mockNotificationAPI("denied");
    mockGetPermissionStatus = () => "denied";
    render(<App />);
    expect(screen.queryByRole("button", { name: /enable browser alert/i })).not.toBeInTheDocument();
  });

  it("clicking Enable Alerts calls requestNotificationPermission", async () => {
    mockNotificationAPI("default");
    mockGetPermissionStatus = () => "default";
    mockRequestPermission.mockResolvedValue(true);
    render(<App />);

    const button = await screen.findByRole("button", { name: /enable browser alert/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  it("updates state to enabled after permission is granted", async () => {
    mockNotificationAPI("default");
    mockGetPermissionStatus = () => "default";
    mockRequestPermission.mockResolvedValue(true);
    render(<App />);

    const button = await screen.findByRole("button", { name: /enable browser alert/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/alerts on/i)).toBeInTheDocument();
    });
  });

  it("persists preference to localStorage after enabling", async () => {
    mockNotificationAPI("default");
    mockGetPermissionStatus = () => "default";
    mockRequestPermission.mockResolvedValue(true);
    render(<App />);

    const button = await screen.findByRole("button", { name: /enable browser alert/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(localStorage.getItem("notificationsEnabled")).toBe("true");
    });
  });

  it("remains disabled if permission is denied after clicking Enable Alerts", async () => {
    mockNotificationAPI("default");
    mockGetPermissionStatus = () => "default";
    mockRequestPermission.mockResolvedValue(false);
    render(<App />);

    const button = await screen.findByRole("button", { name: /enable browser alert/i });
    fireEvent.click(button);

    // Wait a tick for the async handler
    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled();
    });
    // Button should still be visible (state is false)
    expect(screen.getByRole("button", { name: /enable browser alert/i })).toBeInTheDocument();
  });
});
