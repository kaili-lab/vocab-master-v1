import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signIn } from "@/lib/api-client";
import { showToastError, showToastSuccess } from "@/utils/toast";

const emailLoginSchema = z.object({
  email: z.string().min(1, "请输入邮箱").email("请输入正确的邮箱格式"),
  password: z.string().min(6, "密码至少6位"),
});

type EmailLoginForm = z.infer<typeof emailLoginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<EmailLoginForm>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: EmailLoginForm) => {
    setIsSubmitting(true);
    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: true,
      });

      if (result.error) {
        showToastError(result.error.message || "邮箱或密码错误");
        return;
      }

      showToastSuccess("登录成功，欢迎回来！");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch {
      showToastError("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="欢迎回来" subtitle="继续你的英语学习之旅">
      <div className="space-y-6">
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
                        placeholder="请输入邮箱"
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入密码"
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

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                忘记密码？
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full shadow-md"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "登录中..." : "登录"}
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
