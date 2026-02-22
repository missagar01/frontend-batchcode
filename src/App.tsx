import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteGuard from "./components/RouteGuard";
import PublicRoute from "./components/PublicRoute";
import Login from "./pages/Login";
import Home from "./pages/Dashboard/Home";
import Calendar from "./pages/Calendar";
import Blank from "./pages/Blank";
import UserProfiles from "./pages/UserProfiles";

// BatchCode pages
import HotCoil from "./pages/BatchCode/HotCoil";
import QCLab from "./pages/BatchCode/QC-Lab";
import SMSRegister from "./pages/BatchCode/SMSRegister";
import Recoiler from "./pages/BatchCode/Recoiler";
import PipeMill from "./pages/BatchCode/PipeMill";
import Laddel from "./pages/BatchCode/Laddel";
import Tundis from "./pages/BatchCode/Tundis";


export default function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* Public routes - Login page */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Main Dashboard */}
            <Route path="/" element={<RouteGuard><Home /></RouteGuard>} />
            <Route path="/dashboard" element={<RouteGuard><Home /></RouteGuard>} />
            <Route path="/profile" element={<RouteGuard><UserProfiles /></RouteGuard>} />
            <Route path="/calendar" element={<RouteGuard><Calendar /></RouteGuard>} />
            <Route path="/blank" element={<RouteGuard><Blank /></RouteGuard>} />

            {/* BatchCode Routes */}
            <Route path="/batchcode/hot-coil" element={<RouteGuard><HotCoil /></RouteGuard>} />
            <Route path="/batchcode/qc-lab" element={<RouteGuard><QCLab /></RouteGuard>} />
            <Route path="/batchcode/sms-register" element={<RouteGuard><SMSRegister /></RouteGuard>} />
            <Route path="/batchcode/recoiler" element={<RouteGuard><Recoiler /></RouteGuard>} />
            <Route path="/batchcode/pipe-mill" element={<RouteGuard><PipeMill /></RouteGuard>} />
            <Route path="/batchcode/laddel" element={<RouteGuard><Laddel /></RouteGuard>} />
            <Route path="/batchcode/tundis" element={<RouteGuard><Tundis /></RouteGuard>} />
          </Route>

          {/* Catch all - redirect to login if not authenticated, otherwise home */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </>
  );
}