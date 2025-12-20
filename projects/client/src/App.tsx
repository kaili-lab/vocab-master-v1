import { Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import HomePage from "@/pages/home";
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ReviewPage from "@/pages/review";
import { ProtectedRoute } from "@/components/auth/protected-route";
import VocabLevelSelection from "@/pages/vocab-level";
import VocabularyPage from "@/pages/vocabulary";
import ErrorFallback from "@/components/ui/error-fallback";

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Routes>
        {/* 公开路由 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 受保护的路由 */}
        {/* 受保护的路由 - 统一保护 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/level" element={<VocabLevelSelection />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vocabulary" element={<VocabularyPage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Route>

        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
