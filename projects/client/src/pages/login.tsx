import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AuthLayout } from "@/components/auth/auth-layout";
// import { SocialLogin } from "@/components/auth/social-login";
import { PhoneInput } from "@/components/auth/phone-input";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { authClient, signIn } from "@/lib/api-client";
import { showToastError, showToastSuccess } from "@/utils/toast";

// 手机号登录 Schema
const phoneLoginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
  smsCode: z
    .string()
    .length(6, "验证码必须是6位数字")
    .regex(/^\d+$/, "验证码只能是数字"),
});

// 邮箱登录 Schema
const emailLoginSchema = z.object({
  email: z.string().min(1, "请输入邮箱").email("请输入正确的邮箱格式"),
  password: z.string().min(6, "密码至少6位"),
});

type PhoneLoginForm = z.infer<typeof phoneLoginSchema>;
type EmailLoginForm = z.infer<typeof emailLoginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("phone");
  const [countdown, setCountdown] = useState(0);
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const navigate = useNavigate();

  // 手机号登录表单
  const phoneForm = useForm<PhoneLoginForm>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: {
      phone: "",
      smsCode: "",
    },
  });

  // 邮箱登录表单
  const emailForm = useForm<EmailLoginForm>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSendSMS = async () => {
    const phone = phoneForm.getValues("phone");
    const result = z
      .string()
      .regex(/^1[3-9]\d{9}$/)
      .safeParse(phone);

    if (!result.success) {
      phoneForm.setError("phone", { message: "请输入正确的手机号" });
      return;
    }

    try {
      const { error } = await authClient.phoneNumber.sendOtp({
        phoneNumber: phone,
      });

      if (error) {
        showToastError(error.message || "验证码发送失败");
        return;
      }

      showToastSuccess("验证码已发送到您的手机");

      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      showToastError("网络错误，请稍后重试");
    }
  };

  const onPhoneSubmit = async (formData: PhoneLoginForm) => {
    setIsPhoneSubmitting(true);
    try {
      const { error } = await authClient.phoneNumber.verify({
        phoneNumber: formData.phone,
        code: formData.smsCode,
        disableSession: false, // false表示自动创建 session
      });

      if (error) {
        showToastError(error.message || "登录失败，请稍后重试", 1000);
        return;
      }

      // await res.json();

      showToastSuccess("登录成功，欢迎回来！");

      // 登录成功后跳转到首页
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch {
      showToastError("网络错误，请稍后重试");
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const onEmailSubmit = async (data: EmailLoginForm) => {
    setIsEmailSubmitting(true);
    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: true, // 默认保持长时间登录
      });

      if (result.error) {
        showToastError(result.error.message || "邮箱或密码错误");
        return;
      }

      showToastSuccess("登录成功，欢迎回来！");

      // 登录成功后跳转到首页
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch {
      showToastError("网络错误，请稍后重试");
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  return (
    <AuthLayout title="欢迎回来" subtitle="继续你的英语学习之旅">
      <div className="space-y-6">
        {/* 第三方登录 */}
        {/* <SocialLogin /> */}

        {/* 分割线 */}
        {/* <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-muted-foreground">
              或使用以下方式登录
            </span>
          </div>
        </div> */}

        {/* 登录表单 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone">手机号登录</TabsTrigger>
            <TabsTrigger value="email">邮箱登录</TabsTrigger>
          </TabsList>

          {/* 手机号登录 */}
          <TabsContent value="phone" className="mt-6">
            <Form {...phoneForm}>
              <form
                onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="请输入手机号"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={phoneForm.control}
                  name="smsCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>验证码</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="请输入验证码"
                            maxLength={6}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendSMS}
                          disabled={countdown > 0}
                          className="whitespace-nowrap min-w-[100px]"
                        >
                          {countdown > 0 ? `${countdown}s` : "获取验证码"}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full shadow-md"
                  size="lg"
                  disabled={isPhoneSubmitting}
                >
                  {isPhoneSubmitting ? "登录中..." : "登录"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* 邮箱登录 */}
          <TabsContent value="email" className="mt-6">
            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={emailForm.control}
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
                  control={emailForm.control}
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
                  disabled={isEmailSubmitting}
                >
                  {isEmailSubmitting ? "登录中..." : "登录"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {/* 注册链接 */}
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
