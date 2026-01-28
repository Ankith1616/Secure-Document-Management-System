import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AuditLogs from './pages/AuditLogs';
import DeletedHistory from './pages/DeletedHistory';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { useAuth } from './context/AuthContext';

const AdminRoute = ({ children }) => {
    const { isAdmin, loading } = useAuth();
    if (loading) return null;
    return isAdmin() ? children : <Navigate to="/dashboard" replace />;
};

const ManagerRoute = ({ children }) => {
    const { isManagerOrAdmin, loading } = useAuth();
    if (loading) return null;
    return isManagerOrAdmin() ? children : <Navigate to="/dashboard" replace />;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/audit-logs"
                        element={
                            <ProtectedRoute>
                                <AdminRoute>
                                    <AuditLogs />
                                </AdminRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/deleted-history"
                        element={
                            <ProtectedRoute>
                                <ManagerRoute>
                                    <DeletedHistory />
                                </ManagerRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
