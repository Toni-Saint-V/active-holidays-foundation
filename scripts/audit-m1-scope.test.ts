import { describe, expect, it } from "vitest";
import {
  auditM1Scope,
  collectNavItemPaths,
  collectRoutePaths
} from "./audit-m1-scope";

describe("audit-m1-scope", () => {
  it("collects registered router paths without wildcard fallback", () => {
    const routes = collectRoutePaths(`
      <Routes>
        <Route index element={<Landing />} />
        <Route path="/intake" element={<Intake />} />
        <Route path="/result" element={<Result />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    `);

    expect(routes).toEqual(["/", "/intake", "/result"]);
  });

  it("collects visible nav paths from navItems", () => {
    const navPaths = collectNavItemPaths(`
      const navItems = [
        { to: "/", label: "Главная", icon: Home },
        { to: "/documents", label: "Документы", icon: FileText }
      ];
    `);

    expect(navPaths).toEqual(["/", "/documents"]);
  });

  it("reports non-M1 exposure without blocking current gaps", () => {
    const report = auditM1Scope({
      routerSource: `
        <Routes>
          <Route index element={<Landing />} />
          <Route path="/intake" element={<Intake />} />
          <Route path="/result" element={<Result />} />
          <Route path="/human-review" element={<Review />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/experimental" element={<Experiment />} />
        </Routes>
      `,
      appShellSource: `
        const navItems = [
          { to: "/", label: "Главная", icon: Home },
          { to: "/profile", label: "Профиль", icon: UserCircle2 }
        ];
      `
    });

    expect(report.missingAllowedRoutes).toEqual([]);
    expect(report.registeredNonM1Routes).toEqual(["/experimental", "/profile"]);
    expect(report.visibleNonM1Routes).toEqual(["/profile"]);
    expect(report.unknownRoutes).toEqual(["/experimental"]);
  });
});
