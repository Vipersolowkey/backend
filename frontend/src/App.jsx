import { Navigate, Route, Routes } from "react-router-dom";

import AlertsPage from "./pages/AlertsPage";
import CalendarPage from "./pages/CalendarPage";
import CompetitorsPage from "./pages/CompetitorsPage";
import GuestsPage from "./pages/GuestsPage";
import OverviewPage from "./pages/OverviewPage";
import ReportsPage from "./pages/ReportsPage";
import SalesAIPage from "./pages/SalesAIPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/overview" replace />} />
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/guests" element={<GuestsPage />} />
      <Route path="/sales-ai" element={<SalesAIPage />} />
      <Route path="/competitors" element={<CompetitorsPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
    </Routes>
  );
}
