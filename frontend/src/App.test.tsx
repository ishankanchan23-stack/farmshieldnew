import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import axios, { AxiosError } from "axios";
import { AuthProvider } from "./app/auth";
import App from "./App";
import { errorMessage } from "./lib/api";
import { getCurrentLocation } from "./utils/geolocation";
import { validateImageFile } from "./utils/scanner-validation";

function renderApp(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
}

describe("FarmShield routes", () => {
  it("renders the public landing page", () => {
    renderApp("/");
    expect(screen.getByRole("heading", { name: /a clearer view of your crop’s health/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /analyze your crop/i })).toHaveAttribute("href", "/register");
  });

  it("redirects private pages to sign in when unauthenticated", async () => {
    renderApp("/app/dashboard");
    expect(await screen.findByRole("heading", { name: /sign in to farmshield/i })).toBeInTheDocument();
  });
});

describe("scanner upload validation", () => {
  it("accepts a supported image within the configured client limit", () => {
    expect(validateImageFile(new File(["pixels"], "leaf.webp", { type: "image/webp" }))).toBeNull();
  });

  it("rejects unsupported image formats", () => {
    expect(validateImageFile(new File(["text"], "leaf.svg", { type: "image/svg+xml" }))).toMatch(/JPEG, PNG, or WEBP/);
  });
});

describe("API errors", () => {
  it("explains that the backend must be running when the connection fails", () => {
    expect(errorMessage(new AxiosError("Network Error"))).toBe(
      "Cannot connect to the FarmShield API. Start the backend and check VITE_API_URL.",
    );
  });

  describe("current location", () => {
    it("returns the browser's actual coordinates", async () => {
      const geolocation = {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({ coords: { latitude: 37.421998, longitude: -122.084 } } as GeolocationPosition);
        }),
      };
      await expect(getCurrentLocation(geolocation)).resolves.toEqual({ latitude: 37.421998, longitude: -122.084 });
      expect(geolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    });

    it.each([
      [1, "Location permission was denied."],
      [2, "Your current location is unavailable."],
      [3, "Location request timed out."],
    ])("explains geolocation error code %i", async (code, message) => {
      const geolocation = {
        getCurrentPosition: vi.fn((_success: PositionCallback, failure: PositionErrorCallback) => {
          failure({ code, message: "browser location error", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        }),
      };
      await expect(getCurrentLocation(geolocation)).rejects.toThrow(message);
    });

    it("explains when geolocation is unavailable", async () => {
      await expect(getCurrentLocation(undefined)).rejects.toThrow("Location services are unavailable");
    });
  });

  it("shows backend validation details", () => {
    const error = new AxiosError("Request failed");
    error.response = {
      data: { detail: [{ loc: ["body", "email"], msg: "Enter a valid email address." }] },
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    };
    expect(errorMessage(error)).toBe("email: Enter a valid email address.");
  });
});
