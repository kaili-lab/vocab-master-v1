import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { Mail, ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/api-client";
import { showToastError, showToastSuccess } from "@/utils/toast";

// Schema
const forgotPasswordSchema = z.object({
  email: z.string().min(1, "请输入邮箱").email("请输入正确的邮箱格式"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true);
    try {
      const result = await authClient.forgetPassword({
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (result.error) {
        showToastError(result.error.message || "发送失败，请稍后重试");
        return;
      }

      setEmailSent(true);
      showToastSuccess("重置邮件已发送，请查收邮箱");
    } catch {
      showToastError("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 如果邮件已发送，显示成功提示
  if (emailSent) {
    return (
      <AuthLayout title="邮件已发送" subtitle="请查收您的邮箱">
        <div className="space-y-6 text-center">
          <div className="bg-muted/50 rounded-2xl p-6">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              我们已将密码重置链接发送到您的邮箱
              <span className="text-foreground font-medium">
                {" "}
                {form.getValues("email")}
              </span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              请在1小时内点击链接完成密码重置
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              返回登录
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setEmailSent(false)}
            >
              重新发送
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // 表单界面
  return (
    <AuthLayout title="忘记密码" subtitle="输入您的邮箱，我们将发送重置链接">
      <div className="space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回登录
        </Link>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="请输入您的注册邮箱"
                        className="pl-10"
                      />
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
              {isSubmitting ? "发送中..." : "发送重置邮件"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          还没有账号？
          <Link to="/register" className="text-primary hover:underline ml-1">
            立即注册
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

