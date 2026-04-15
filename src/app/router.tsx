import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { LandingScreen } from "@/screens/landing/LandingScreen";
import { IntakeScreen } from "@/screens/intake/IntakeScreen";
import { ResultScreen } from "@/screens/result/ResultScreen";
import { DocumentsScreen } from "@/screens/documents/DocumentsScreen";
import { HumanReviewScreen } from "@/screens/human-review/HumanReviewScreen";
import { TrustScreen } from "@/screens/trust/TrustScreen";
import { NotificationsScreen } from "@/screens/notifications/NotificationsScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<LandingScreen />} />
          <Route path="/intake" element={<IntakeScreen />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/documents" element={<DocumentsScreen />} />
          <Route path="/human-review" element={<HumanReviewScreen />} />
          <Route path="/trust" element={<TrustScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
