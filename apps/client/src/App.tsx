import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Overview from "@/pages/Overview";
import Queues from "@/pages/Queues";
import QueueDetail from "@/pages/QueueDetail";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Workers from "@/pages/Workers";
import Login from "@/pages/Login";

function ProtectedLayout() {
  const { authEnabled, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (authEnabled && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<Overview />} />
          <Route path="queues" element={<Queues />} />
          <Route path="queues/:name" element={<QueueDetail />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:queueName/:jobId" element={<JobDetail />} />
          <Route path="workers" element={<Workers />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
