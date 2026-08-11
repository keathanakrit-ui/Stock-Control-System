import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import IssuePage from "./pages/Issue/IssuePage";
import LoginPage from "./pages/Login/LoginPage";
import ProductPage from "./pages/Product/ProductPage";
import ReceivePage from "./pages/Receive/ReceivePage";
import TransactionPage from "./pages/Transaction/TransactionPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/products" element={<ProtectedRoute><ProductPage /></ProtectedRoute>} />
        <Route path="/receive" element={<ProtectedRoute><ReceivePage /></ProtectedRoute>} />
        <Route path="/issue" element={<ProtectedRoute><IssuePage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
