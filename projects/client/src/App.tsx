import { Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import HomePage from "@/pages/home";
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import ReviewPage from "@/pages/review";
import CheckoutPage from "@/pages/checkout";
import PaymentSuccessPage from "@/pages/payment-success";
import PaymentCancelPage from "@/pages/payment-cancel";
import SubscriptionPage from "@/pages/subscription";
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* 支付相关公开路由（从 Stripe 跳转回来） */}
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment-cancel" element={<PaymentCancelPage />} />

        {/* 受保护的路由 */}
        {/* 受保护的路由 - 统一保护 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/level" element={<VocabLevelSelection />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vocabulary" element={<VocabularyPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
        </Route>

        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
