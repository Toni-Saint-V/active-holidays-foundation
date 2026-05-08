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
        { to: "/human-review", label: "Проверка", icon: Briefcase }
      ];
    `);

    expect(navPaths).toEqual(["/", "/human-review"]);
  });

  it("reports non-M1 exposure without blocking current gaps", () => {
    const report = auditM1Scope({
      routerSource: `
        <Routes>
          <Route index element={<Landing />} />
          <Route path="/intake" element={<Intake />} />
          <Route path="/result" element={<Result />} />
          <Route path="/human-review" element={<Review />} />
          <Route path="/legacy-lab" element={<LegacyLab />} />
          <Route path="/experimental" element={<Experiment />} />
        </Routes>
      `,
      appShellSource: `
        const navItems = [
          { to: "/", label: "Главная", icon: Home },
          { to: "/legacy-lab", label: "Лаб", icon: UserCircle2 }
        ];
      `
    });

    expect(report.missingAllowedRoutes).toEqual([]);
    expect(report.registeredNonM1Routes).toEqual(["/experimental", "/legacy-lab"]);
    expect(report.visibleNonM1Routes).toEqual(["/legacy-lab"]);
    expect(report.unknownRoutes).toEqual(["/experimental", "/legacy-lab"]);
  });

  it("treats M1-only nav entries as clean visible scope", () => {
    const report = auditM1Scope({
      routerSource: `
        <Routes>
          <Route index element={<Landing />} />
          <Route path="/intake" element={<Intake />} />
          <Route path="/result" element={<Result />} />
          <Route path="/human-review" element={<Review />} />
          <Route path="/legacy-lab" element={<LegacyLab />} />
        </Routes>
      `,
      appShellSource: `
        const navItems = [
          { to: "/", label: "Главная", icon: Home },
          { to: "/intake", label: "Анкета", icon: Compass },
          { to: "/result", label: "Вердикт", icon: ShieldCheck },
          { to: "/human-review", label: "Проверка", icon: Briefcase }
        ];
      `
    });

    expect(report.visibleNonM1Routes).toEqual([]);
  });
});
