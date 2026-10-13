import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import AdminDashboard from "../pages/admin/AdminDashboard";
import Users from "../pages/admin/Users";

import Analytics from "../pages/analytics/Analytics";

import CreateIncident from "../pages/incidents/CreateIncident";
import IncidentDetails from "../pages/incidents/IncidentDetails";
import IncidentList from "../pages/incidents/IncidentList";

import Notifications from "../pages/notifications/Notifications";
import SLAPolicies from "../pages/sla/SLAPolicies";
import Teams from "../pages/teams/Teams";

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/teams" element={<Teams />} />

        {/* Analytics */}
        <Route path="/analytics" element={<Analytics />} />

        {/* Incidents */}
        <Route path="/incidents" element={<IncidentList />} />
        <Route
          path="/incidents/create"
          element={<CreateIncident />}
        />
        <Route
          path="/incidents/:incidentId"
          element={<IncidentDetails />}
        />

        {/* Notifications and SLA */}
        <Route
          path="/notifications"
          element={<Notifications />}
        />
        <Route path="/sla" element={<SLAPolicies />} />
      </Route>

      {/* Default route */}
      <Route
        path="/"
        element={<Navigate to="/register" replace />}
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/register" replace />}
      />
    </Routes>
  );
}

export default AppRoutes;

