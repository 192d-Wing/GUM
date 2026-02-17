import { render, screen } from "@testing-library/react";
import ForbiddenPage from "../ForbiddenPage";

describe("ForbiddenPage", () => {
  it("renders 403 heading", () => {
    render(<ForbiddenPage />);
    expect(screen.getByText("403")).toBeInTheDocument();
  });

  it("shows permission denied message", () => {
    render(<ForbiddenPage />);
    expect(
      screen.getByText(/You don't have permission to view this page/),
    ).toBeInTheDocument();
  });

  it("has link back to fleet overview", () => {
    render(<ForbiddenPage />);
    const link = screen.getByText("Return to fleet overview");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });
});
