import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AdminRoute from "./components/AdminRoute";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import WelcomeBanner from "./components/WelcomeBanner";
import EventsPage from "./pages/EventsPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import UsersPage from "./pages/UsersPage";

function MainLayout() {
  return (
    <>
      <Navbar />
      <div className="container">
        <WelcomeBanner />
        <Outlet />
      </div>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventsPage />} />
          <Route
            path="/users"
            element={
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
