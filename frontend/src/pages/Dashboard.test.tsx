import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../lib/api";
import { Dashboard } from "./Dashboard";

vi.mock("../lib/api", () => ({
  apiClient: {
    overview: vi.fn(),
    trends: vi.fn(),
    download: vi.fn(),
  },
  errorMessage: vi.fn(),
}));

vi.mock("../components/ScanThumbnail", () => ({
  ScanThumbnail: () => <span aria-hidden="true" />,
}));

describe("dashboard scan reports", () => {
  beforeEach(() => {
    vi.mocked(apiClient.overview).mockResolvedValue({
      total_scans: 1,
      healthy: 0,
      disease_detections: 0,
      uncertain: 0,
      unavailable: 1,
      crop_distribution: [],
      disease_distribution: [],
      recent_scans: [{
        id: "12345678-abcd",
        farm_id: null,
        crop: "Tomato",
        predicted_class: null,
        confidence: null,
        status: "unavailable",
        model_name: "unavailable",
        warning: "AI model unavailable — demo mode is active.",
        image_url: "/api/v1/scans/12345678-abcd/image",
        created_at: "2026-10-23T00:00:00Z",
        disease: null,
      }],
    });
    vi.mocked(apiClient.trends).mockResolvedValue([]);
  });

  it("shows scan status and downloads its PDF report", async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByText("AI model unavailable — demo mode is active.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Download report for Tomato scan" }));

    await waitFor(() => {
      expect(apiClient.download).toHaveBeenCalledWith(
        "/api/v1/reports/scans/12345678-abcd/pdf",
        "farmshield-scan-12345678.pdf",
      );
    });
  });
});
