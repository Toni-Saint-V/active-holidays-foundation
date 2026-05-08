import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { LandingScreen } from "@/screens/landing/LandingScreen";
import { IntakeScreen } from "@/screens/intake/IntakeScreen";
import { ResultScreen } from "@/screens/result/ResultScreen";
import { HumanReviewScreen } from "@/screens/human-review/HumanReviewScreen";
import { NotFoundScreen } from "@/screens/not-found/NotFoundScreen";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<LandingScreen />} />
          <Route path="/intake" element={<IntakeScreen />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/human-review" element={<HumanReviewScreen />} />
          <Route
            path="/insurance-adult"
            element={<Navigate to="/result?case=s5-rf-italy-insurance" replace />}
          />
          <Route
            path="/residency-es"
            element={<Navigate to="/result?case=s4-rf-residency-dnv" replace />}
          />
          <Route path="/documents" element={<Navigate to="/result" replace />} />
          <Route path="/trust" element={<Navigate to="/result" replace />} />
          <Route path="/notifications" element={<Navigate to="/result" replace />} />
          <Route path="/profile" element={<Navigate to="/result" replace />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
