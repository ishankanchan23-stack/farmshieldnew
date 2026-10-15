import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "./app/auth";
import App from "./App";
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
