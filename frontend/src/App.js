import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { Sidebar } from "./components/layout/Sidebar";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import WorkOrdersPreventive from "./pages/WorkOrdersPreventive";
import WorkOrdersCorrective from "./pages/WorkOrdersCorrective";
import WorkOrderDetail from "./pages/WorkOrderDetail";
import NewWorkOrderPreventive from "./pages/NewWorkOrderPreventive";
import NewWorkOrderCorrective from "./pages/NewWorkOrderCorrective";
import Machines from "./pages/Machines";
import Departments from "./pages/Departments";
import CalendarPage from "./pages/CalendarPage";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";
import MyOrders from "./pages/MyOrders";
import MachineStops from "./pages/MachineStops";
import MachineStarts from "./pages/MachineStarts";

// Protected Route wrapper
const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content lg:ml-64 pt-16 lg:pt-0">
                <div className="p-4 md:p-6 lg:p-8 grid-texture min-h-screen">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

// Public Route wrapper (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/my-orders" element={<MyOrders />} />
                        <Route path="/work-orders/preventive" element={<WorkOrdersPreventive />} />
                        <Route path="/work-orders/preventive/new" element={<NewWorkOrderPreventive />} />
                        <Route path="/work-orders/corrective" element={<WorkOrdersCorrective />} />
                        <Route path="/work-orders/corrective/new" element={<NewWorkOrderCorrective />} />
                        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
                        <Route path="/machines" element={<Machines />} />
                        <Route path="/machine-stops" element={<MachineStops />} />
                        <Route path="/machine-starts" element={<MachineStarts />} />
                        <Route path="/departments" element={<Departments />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/users" element={<Users />} />
                    </Route>

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
            <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
    );
}

export default App;
