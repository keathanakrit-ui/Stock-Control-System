import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import IssuePage from "./pages/Issue/IssuePage";
import LoginPage from "./pages/Login/LoginPage";
import ProductPage from "./pages/Product/ProductPage";
import ReceivePage from "./pages/Receive/ReceivePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/products" element={<ProductPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/issue" element={<IssuePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
