import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import IssuePage from "./pages/Issue/IssuePage";
import LoginPage from "./pages/Login/LoginPage";
import ProductPage from "./pages/Product/ProductPage";
import ReceivePage from "./pages/Receive/ReceivePage";
import TransactionPage from "./pages/Transaction/TransactionPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotificationMonitoringPage from "./pages/NotificationMonitoring/NotificationMonitoringPage";
import AddUserPage from "./pages/UserManagement/AddUserPage";
import ForgotPasswordPage from "./pages/Login/ForgotPasswordPage";
import ResetPasswordPage from "./pages/Login/ResetPasswordPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/products" element={<ProtectedRoute><ProductPage /></ProtectedRoute>} />
        <Route path="/receive" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "STORE"]}><ReceivePage /></ProtectedRoute>} />
        <Route path="/issue" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "STORE", "USER"]}><IssuePage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionPage /></ProtectedRoute>} />
        <Route path="/notification-monitoring" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}><NotificationMonitoringPage /></ProtectedRoute>} />
        <Route path="/users/add" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><AddUserPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
