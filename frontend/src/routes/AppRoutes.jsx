import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { RegisterPage } from "../pages/RegisterPage.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { ProductsPage } from "../pages/ProductsPage.jsx";
import { SuppliersPage } from "../pages/SuppliersPage.jsx";
import { CustomersPage } from "../pages/CustomersPage.jsx";
import { InventoryPage } from "../pages/InventoryPage.jsx";
import { MobileUnitsPage } from "../pages/MobileUnitsPage.jsx";
import { SalesPage } from "../pages/SalesPage.jsx";
import { ReportsPage } from "../pages/ReportsPage.jsx";
import { FinancePage } from "../pages/FinancePage.jsx";
import { PurchaseOrdersPage } from "../pages/PurchaseOrdersPage.jsx";
import { RepairsPage } from "../pages/RepairsPage.jsx";
import { ReturnsPage } from "../pages/ReturnsPage.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

export const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="mobile-units" element={<MobileUnitsPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="repairs" element={<RepairsPage />} />
        <Route path="returns" element={<ReturnsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
