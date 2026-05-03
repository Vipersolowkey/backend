import { Navigate, Route, Routes } from "react-router-dom";

import GuestAppLayout from "./components/guestapp/GuestAppLayout";
import AlertsPage from "./pages/AlertsPage";
import CalendarPage from "./pages/CalendarPage";
import CompetitorsPage from "./pages/CompetitorsPage";
import InsightsRankingsPage from "./pages/InsightsRankingsPage";
import GuestAppDine from "./pages/guestapp/GuestAppDine";
import GuestAppHome from "./pages/guestapp/GuestAppHome";
import GuestAppMe from "./pages/guestapp/GuestAppMe";
import GuestAppOffers from "./pages/guestapp/GuestAppOffers";
import GuestsPage from "./pages/GuestsPage";
import OverviewPage from "./pages/OverviewPage";
import OwnerGuestAppPulsePage from "./pages/OwnerGuestAppPulsePage";
import ReportsPage from "./pages/ReportsPage";
import RoomHousekeepingBoardPage from "./pages/RoomHousekeepingBoardPage";
import SalesAIPage from "./pages/SalesAIPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/overview" replace />} />
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/operations/rooms" element={<RoomHousekeepingBoardPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/guests" element={<GuestsPage />} />
      <Route path="/sales-ai" element={<SalesAIPage />} />
      <Route path="/competitors" element={<CompetitorsPage />} />
      <Route path="/insights-rankings" element={<InsightsRankingsPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="/owner-guest-pulse" element={<OwnerGuestAppPulsePage />} />
      <Route path="/guest-app" element={<GuestAppLayout />}>
        <Route index element={<GuestAppHome />} />
        <Route path="rooms" element={<Navigate to="/operations/rooms" replace />} />
        <Route path="offers" element={<GuestAppOffers />} />
        <Route path="dine" element={<GuestAppDine />} />
        <Route path="me" element={<GuestAppMe />} />
      </Route>
    </Routes>
  );
}
