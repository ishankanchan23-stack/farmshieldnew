import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../lib/api";
import { Farms } from "./Farms";

vi.mock("../lib/api", () => ({
  apiClient: {
    farms: vi.fn(),
    crops: vi.fn(),
    createFarm: vi.fn(),
    updateFarm: vi.fn(),
    deleteFarm: vi.fn(),
    createCrop: vi.fn(),
  },
  errorMessage: (error: unknown) => error instanceof Error ? error.message : "Request failed",
}));

const mockedApi = vi.mocked(apiClient);

function setGeolocation(getCurrentPosition: Geolocation["getCurrentPosition"]) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
}

describe("My Farms location flow", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(mockedApi.farms).mockResolvedValue([]);
    vi.mocked(mockedApi.crops).mockResolvedValue([]);
    vi.mocked(mockedApi.createFarm).mockResolvedValue({
      id: "farm-1",
      name: "South Field",
      location: "",
      latitude: -12.75,
      longitude: 145.25,
    });
  });

  it("fills current coordinates once on entry and does not replace manual edits", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 37.421998, longitude: -122.084 } } as GeolocationPosition);
    });
    setGeolocation(getCurrentPosition);
    const view = render(<Farms />);

    const latitude = await screen.findByLabelText("Latitude");
    const longitude = screen.getByLabelText("Longitude");
    await waitFor(() => expect(latitude).toHaveValue(37.421998));
    expect(longitude).toHaveValue(-122.084);
    expect(await screen.findByRole("status", { name: "" })).toHaveTextContent("Current location detected");

    fireEvent.change(latitude, { target: { value: "12.5" } });
    view.rerender(<Farms />);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(latitude).toHaveValue(12.5);
  });

  it("shows permission errors and sends manually entered coordinates on submit", async () => {
    setGeolocation(vi.fn((_success: PositionCallback, failure: PositionErrorCallback) => {
      failure({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    }));
    render(<Farms />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Location permission was denied");
    fireEvent.change(screen.getByLabelText("Farm name"), { target: { value: "South Field" } });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-12.75" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "145.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Add farm" }));

    await waitFor(() => expect(mockedApi.createFarm).toHaveBeenCalledWith({
      name: "South Field",
      location: "",
      latitude: -12.75,
      longitude: 145.25,
    }));
  });
});
