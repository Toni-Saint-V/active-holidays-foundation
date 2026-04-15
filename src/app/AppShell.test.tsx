import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/app/AppShell";

describe("AppShell", () => {
  it("renders shell heading", () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByText("Foundation Scaffold")).toBeInTheDocument();
  });
});
