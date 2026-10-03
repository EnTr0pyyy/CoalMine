import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import { useAuth } from './hooks/useAuth.js';
import { ROLES, hasAdminAccess } from './utils/roles.js';
import Login from './pages/auth/Login.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import FlagsList from './pages/flags/FlagsList.jsx';
import NewFlag from './pages/flags/NewFlag.jsx';
import FlagDetails from './pages/flags/FlagDetails.jsx';
import ResponsesList from './pages/responses/ResponsesList.jsx';
import ResponseDetails from './pages/responses/ResponseDetails.jsx';
import AuditTrail from './pages/audit/AuditTrail.jsx';
import MinesList from './pages/mines/MinesList.jsx';
import MineDetails from './pages/mines/MineDetails.jsx';
import ComplianceList from './pages/compliance/ComplianceList.jsx';
import ComplianceDetails from './pages/compliance/ComplianceDetails.jsx';
import InspectionsList from './pages/inspections/InspectionsList.jsx';
import NewInspection from './pages/inspections/NewInspection.jsx';
import InspectionDetails from './pages/inspections/InspectionDetails.jsx';
import CorrectiveActionsList from './pages/correctiveActions/CorrectiveActionsList.jsx';
import CorrectiveActionDetails from './pages/correctiveActions/CorrectiveActionDetails.jsx';
import RiskIntelligence from './pages/risk/RiskIntelligence.jsx';
import RiskMap from './pages/risk/RiskMap.jsx';
import NotificationsCenter from './pages/notifications/NotificationsCenter.jsx';
import ContractorsList from './pages/contractors/ContractorsList.jsx';
import ContractorDetails from './pages/contractors/ContractorDetails.jsx';
import ContractorDashboard from './pages/contractor/ContractorDashboard.jsx';
import MyProjects from './pages/contractor/MyProjects.jsx';
import MyReports from './pages/contractor/MyReports.jsx';
import Attendance from './pages/contractor/Attendance.jsx';
import SafetyRequirements from './pages/contractor/SafetyRequirements.jsx';
import AssignedActions from './pages/contractor/AssignedActions.jsx';
import ContractorDocuments from './pages/contractor/ContractorDocuments.jsx';
import RiskNotifications from './pages/contractor/RiskNotifications.jsx';
import Performance from './pages/contractor/Performance.jsx';
import DocumentIntelligence from './pages/documents/DocumentIntelligence.jsx';
import AICopilot from './pages/copilot/AICopilot.jsx';
import Reports from './pages/reports/Reports.jsx';
import WordCloudTopics from './pages/topics/WordCloudTopics.jsx';
import ParliamentaryInquiries from './pages/parliamentary/ParliamentaryInquiries.jsx';
import FieldReporting from './pages/field/FieldReporting.jsx';
import Settings from './pages/settings/Settings.jsx';
import NoticeBoard from './pages/notices/NoticeBoard.jsx';
import PlatformOverview from './pages/platform/PlatformOverview.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={[ROLES.CORPORATE_ADMIN, ROLES.MINE_MANAGER]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/flags" element={<FlagsList />} />
        <Route path="/flags/new" element={<NewFlag />} />
        <Route path="/flags/:id" element={<FlagDetails />} />
        <Route path="/responses" element={<ResponsesList />} />
        <Route path="/responses/:id" element={<ResponseDetails />} />
        <Route path="/audit-logs" element={<AuditTrail />} />

        <Route path="/mines" element={<MinesList />} />
        <Route path="/mines/:id" element={<MineDetails />} />
        <Route path="/compliance" element={<ComplianceList />} />
        <Route path="/compliance/:id" element={<ComplianceDetails />} />
        <Route path="/inspections" element={<InspectionsList />} />
        <Route path="/inspections/new" element={<NewInspection />} />
        <Route path="/inspections/:id" element={<InspectionDetails />} />
        <Route path="/corrective-actions" element={<CorrectiveActionsList />} />
        <Route path="/corrective-actions/:id" element={<CorrectiveActionDetails />} />

        <Route path="/risk" element={<RiskIntelligence />} />
        <Route path="/risk/map" element={<RiskMap />} />
        <Route path="/notifications" element={<NotificationsCenter />} />

        <Route path="/contractors" element={<ContractorsList />} />
        <Route path="/contractors/:id" element={<ContractorDetails />} />
        <Route path="/contractor/dashboard" element={<ContractorDashboard />} />
        <Route path="/contractor/projects" element={<MyProjects />} />
        <Route path="/contractor/reports" element={<MyReports />} />
        <Route path="/contractor/attendance" element={<Attendance />} />
        <Route path="/contractor/safety" element={<SafetyRequirements />} />
        <Route path="/contractor/actions" element={<AssignedActions />} />
        <Route path="/contractor/documents" element={<ContractorDocuments />} />
        <Route path="/contractor/risk" element={<RiskNotifications />} />
        <Route path="/contractor/performance" element={<Performance />} />

        <Route path="/documents" element={<DocumentIntelligence />} />
        <Route path="/copilot" element={<AICopilot />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/topics" element={<WordCloudTopics />} />
        <Route path="/parliamentary" element={<ParliamentaryInquiries />} />
        <Route path="/field" element={<FieldReporting />} />
        <Route path="/notices" element={<NoticeBoard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/platform" element={<PlatformOverview />} />
      </Route>

      <Route path="/" element={<RoleBasedHomeRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RoleBasedHomeRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === ROLES.CONTRACTOR) return <Navigate to="/contractor/dashboard" replace />;
  if (hasAdminAccess(user) || user?.role === ROLES.MINE_MANAGER) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/mines" replace />;
}
