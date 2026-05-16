import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Overview from "@/pages/Overview";
import Queues from "@/pages/Queues";
import QueueDetail from "@/pages/QueueDetail";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Workers from "@/pages/Workers";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="queues" element={<Queues />} />
        <Route path="queues/:name" element={<QueueDetail />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:queueName/:jobId" element={<JobDetail />} />
        <Route path="workers" element={<Workers />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
