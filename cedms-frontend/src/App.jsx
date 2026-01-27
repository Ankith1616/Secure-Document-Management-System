import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/signup";
import Register from "./pages/Register";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AccessDenied from "./pages/AccessDenied";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import UploadDocument from "./pages/UploadDocument";
import ViewDocuments from "./pages/ViewDocument";
import Navbar from "./components/Navbar";
import { DocumentProvider } from "./context/DocumentContext";
import OtpVerification from "./pages/OtpVerification";
import { AuditProvider } from "./context/AuditContext";
import AuditLogs from "./pages/AuditLogs";


function App() {
  return (
    <AuthProvider>
      <AuditProvider>
      <DocumentProvider>
        <BrowserRouter>
          <Navbar />
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/otp" element={<OtpVerification />} />


          <Route
            path="/employee"
            element={
              <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={["MANAGER"]}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
          path="/audit"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
          path="/upload"
          element={
            <ProtectedRoute allowedRoles={["EMPLOYEE","MANAGER", "ADMIN"]}>
              <UploadDocument />
            </ProtectedRoute>
          }
        />
        <Route
        path="/documents"
        element={
          <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
            <ViewDocuments />
          </ProtectedRoute>
        }
      />

          <Route path="/access-denied" element={<AccessDenied />} />

        </Routes>
      </BrowserRouter>
    </DocumentProvider>
    </AuditProvider>
    </AuthProvider>
  );
}

export default App;
