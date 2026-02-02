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

// Lead-to-Order pages
import Leads from "./pages/LeadToOrder/Leads";
import FollowUp from "./pages/LeadToOrder/FollowUp";
import NewFollowUp from "./pages/LeadToOrder/NewFollowUp";
import CallTracker from "./pages/LeadToOrder/CallTracker";
import NewCallTracker from "./pages/LeadToOrder/NewCallTracker";
import Quotation from "./pages/LeadToOrder/Quotation/Quotation";
import Settings from "./pages/LeadToOrder/Settings";

// O2D pages
import { DashboardView as O2DDashboard } from "./pages/O2D/dashboard-view";
import { OrdersView as O2DOrders } from "./pages/O2D/order-view";
import { PendingVehicles as O2DProcess } from "./pages/O2D/pendding-vehicle";
import EnquiryView from "./pages/O2D/enq-view";

import CustomersPage from "./pages/O2D/CustomersPage";
import FollowUpsPage from "./pages/O2D/FollowUpsPage";

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
            {/* Main Dashboard - Shows O2D, Lead to Order, or Batchcode based on tab param */}
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

            {/* Lead-to-Order Routes */}
            <Route path="/lead-to-order/leads" element={<RouteGuard><Leads /></RouteGuard>} />
            <Route path="/lead-to-order/follow-up" element={<RouteGuard><FollowUp /></RouteGuard>} />
            <Route path="/lead-to-order/follow-up/new" element={<RouteGuard><NewFollowUp /></RouteGuard>} />
            <Route path="/lead-to-order/call-tracker" element={<RouteGuard><CallTracker /></RouteGuard>} />
            <Route path="/lead-to-order/call-tracker/new" element={<RouteGuard><NewCallTracker /></RouteGuard>} />
            <Route path="/lead-to-order/quotation" element={<RouteGuard><Quotation /></RouteGuard>} />
            <Route path="/lead-to-order/settings" element={<RouteGuard><Settings /></RouteGuard>} />

            {/* O2D Routes */}
            <Route path="/o2d/dashboard" element={<RouteGuard><O2DDashboard /></RouteGuard>} />
            <Route path="/o2d/orders" element={<RouteGuard><O2DOrders /></RouteGuard>} />
            <Route path="/o2d/process" element={<RouteGuard><O2DProcess /></RouteGuard>} />
            <Route path="/o2d/enquiry" element={<RouteGuard><EnquiryView /></RouteGuard>} />
            <Route path="/o2d/customers" element={<RouteGuard><CustomersPage /></RouteGuard>} />
            <Route path="/o2d/follow-ups" element={<RouteGuard><FollowUpsPage /></RouteGuard>} />
          </Route>

          {/* Catch all - redirect to login if not authenticated, otherwise home */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </>
  );
}