import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Lock, Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/api-client";
import { showToastError, showToastSuccess } from "@/utils/toast";

// Schema
const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "密码至少6位").max(20, "密码最多20位"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // 检查 token 是否存在
  useEffect(() => {
    if (!token && !error) {
      showToastError("缺少重置密码令牌，请重新申请");
      setTimeout(() => navigate("/forgot-password"), 2000);
    }
  }, [token, error, navigate]);

  // 如果有错误参数，显示错误信息
  if (error) {
    return (
      <AuthLayout title="链接已失效" subtitle="密码重置链接无效或已过期">
        <div className="space-y-6 text-center">
          <div className="bg-muted/50 rounded-2xl p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              该重置链接已失效，可能的原因：
            </p>
            <ul className="text-sm text-muted-foreground mt-3 space-y-1">
              <li>• 链接已过期（有效期1小时）</li>
              <li>• 链接已被使用</li>
              <li>• 链接格式不正确</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => navigate("/forgot-password")}
            >
              重新申请重置
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              返回登录
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: data.password,
        token: token, // 显式传递 token
      });

      if (result.error) {
        showToastError(result.error.message || "重置失败，请重试");
        return;
      }

      showToastSuccess("密码重置成功！即将跳转到登录页");
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      showToastError("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="重置密码" subtitle="请输入您的新密码">
      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入新密码"
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>确认密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="请再次输入新密码"
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full shadow-md"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "重置中..." : "重置密码"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">
            返回登录
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
