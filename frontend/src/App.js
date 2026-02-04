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

// Role-based route protection
const RoleRoute = ({ allowedRoles, children }) => {
    const { user } = useAuth();
    
    // Si no hay roles definidos o el usuario tiene un rol permitido
    if (!allowedRoles || allowedRoles.includes(user?.role)) {
        return children;
    }
    
    // Encargado de línea redirige a correctivos
    if (user?.role === 'encargado_linea') {
        return <Navigate to="/work-orders/corrective" replace />;
    }
    
    return <Navigate to="/dashboard" replace />;
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
        // Encargado de línea va directo a correctivos
        if (user.role === 'encargado_linea') {
            return <Navigate to="/work-orders/corrective" replace />;
        }
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
                        <Route path="/dashboard" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><Dashboard /></RoleRoute>} />
                        <Route path="/my-orders" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><MyOrders /></RoleRoute>} />
                        <Route path="/work-orders/preventive" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><WorkOrdersPreventive /></RoleRoute>} />
                        <Route path="/work-orders/preventive/new" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><NewWorkOrderPreventive /></RoleRoute>} />
                        <Route path="/work-orders/corrective" element={<WorkOrdersCorrective />} />
                        <Route path="/work-orders/corrective/new" element={<NewWorkOrderCorrective />} />
                        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
                        <Route path="/machines" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><Machines /></RoleRoute>} />
                        <Route path="/machine-stops" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><MachineStops /></RoleRoute>} />
                        <Route path="/machine-starts" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><MachineStarts /></RoleRoute>} />
                        <Route path="/departments" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><Departments /></RoleRoute>} />
                        <Route path="/calendar" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><CalendarPage /></RoleRoute>} />
                        <Route path="/analytics" element={<RoleRoute allowedRoles={['admin', 'supervisor', 'tecnico']}><Analytics /></RoleRoute>} />
                        <Route path="/users" element={<RoleRoute allowedRoles={['admin', 'supervisor']}><Users /></RoleRoute>} />
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
