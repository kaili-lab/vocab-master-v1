import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { apiClient, authClient, signUp } from "@/lib/api-client";
import { showToastError, showToastSuccess } from "@/utils/toast";

// 手机号注册 Schema
const phoneRegisterSchema = z.object({
  username: z
    .string()
    .min(2, "用户名至少2个字符")
    .max(20, "用户名最多20个字符")
    .regex(
      /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
      "用户名只能包含字母、数字、下划线和中文"
    ),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
  smsCode: z
    .string()
    .length(6, "验证码必须是6位数字")
    .regex(/^\d+$/, "验证码只能是数字"),
  email: z.string().email("请输入正确的邮箱格式").optional().or(z.literal("")),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: "请先阅读并同意用户协议和隐私政策",
  }),
});

// 邮箱注册 Schema
const emailRegisterSchema = z
  .object({
    username: z
      .string()
      .min(2, "用户名至少2个字符")
      .max(20, "用户名最多20个字符")
      .regex(
        /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
        "用户名只能包含字母、数字、下划线和中文"
      ),
    email: z.string().min(1, "请输入邮箱").email("请输入正确的邮箱格式"),
    password: z.string().min(6, "密码至少6位").max(20, "密码最多20位"),
    confirmPassword: z.string().min(6, "密码至少6位"),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: "请先阅读并同意用户协议和隐私政策",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type PhoneRegisterForm = z.infer<typeof phoneRegisterSchema>;
type EmailRegisterForm = z.infer<typeof emailRegisterSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("phone");
  const [countdown, setCountdown] = useState(0);
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const navigate = useNavigate();

  // 手机号注册表单
  const phoneForm = useForm<PhoneRegisterForm>({
    resolver: zodResolver(phoneRegisterSchema),
    defaultValues: {
      username: "",
      phone: "",
      smsCode: "",
      email: "",
      agreeTerms: false,
    },
  });

  // 邮箱注册表单
  const emailForm = useForm<EmailRegisterForm>({
    resolver: zodResolver(emailRegisterSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
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

  const onPhoneSubmit = async (formData: PhoneRegisterForm) => {
    setIsPhoneSubmitting(true);
    try {
      // 步骤1：验证手机号
      // 🆕 传入 name 字段，用于后端区分注册/登录场景
      const { error } = await authClient.phoneNumber.verify({
        phoneNumber: formData.phone,
        code: formData.smsCode,
        disableSession: false, // false表示自动创建 session
        name: formData.username, // 🆕 传入用户名，标识这是注册场景
      } as any); // 使用 as any 避免 TypeScript 类型检查

      if (error) {
        showToastError(error.message || "验证失败，请稍后重试");
        return;
      }

      showToastSuccess("验证成功，等待完成注册！");

      // 步骤2：完成注册信息（用户名、邮箱）
      const updateRes = await apiClient.api.auth[
        "complete-registration"
      ].$patch({
        json: {
          name: formData.username,
          email: formData.email || undefined,
        },
      });

      // 先解析 JSON
      const updateData = await updateRes.json();

      // 再检查状态
      if (!updateRes.ok) {
        const errorMsg =
          "error" in updateData ? updateData.error : "设置用户信息失败";
        showToastError(errorMsg);
        return;
      }

      showToastSuccess("注册成功！");

      // 注册成功后跳转到首页
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch {
      showToastError("网络错误，请稍后重试");
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const onEmailSubmit = async (formData: EmailRegisterForm) => {
    setIsEmailSubmitting(true);
    try {
      // 使用 Better Auth 的邮箱注册
      const { error } = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.username,
        // 作为用户点击验证链接后，重定向的URL
        // 这个配置会自动根据当前环境生成正确的 URL，如果是生产环境，会自动生成https的URL
        callbackURL: window.location.origin + "/login", // 验证后重定向到前端登录页
      });

      if (error) {
        showToastError(error.message || "注册失败，请稍后重试");
        return;
      }

      showToastSuccess("注册成功！请查收邮件并点击验证链接完成注册。", 5000);

      // 注册成功后跳转到登录页（提示用户验证邮箱）
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch {
      showToastError("网络错误，请稍后重试");
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  return (
    <AuthLayout title="创建账号" subtitle="开启你的智能英语学习之旅">
      <div className="space-y-6">
        {/* 第三方注册 */}
        {/* <SocialLogin mode="register" /> */}

        {/* 分割线 */}
        {/* <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-muted-foreground">
              或使用以下方式注册
            </span>
          </div>
        </div> */}

        {/* 注册表单 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone">手机号注册</TabsTrigger>
            <TabsTrigger value="email">邮箱注册</TabsTrigger>
          </TabsList>

          {/* 手机号注册 */}
          <TabsContent value="phone" className="mt-6">
            <Form {...phoneForm}>
              <form
                onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
                className="space-y-4"
              >
                {/* 用户名 */}
                <FormField
                  control={phoneForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="请输入用户名"
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 手机号 */}
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

                {/* 验证码 */}
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

                {/* 邮箱 */}
                <FormField
                  control={phoneForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱（可选）</FormLabel>
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

                {/* 用户协议 */}
                <FormField
                  control={phoneForm.control}
                  name="agreeTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          我已阅读并同意
                          <Link
                            to="/terms"
                            className="text-primary hover:underline mx-1"
                          >
                            用户协议
                          </Link>
                          和
                          <Link
                            to="/privacy"
                            className="text-primary hover:underline ml-1"
                          >
                            隐私政策
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                {/* 注册按钮 */}
                <Button
                  type="submit"
                  className="w-full shadow-md"
                  size="lg"
                  disabled={isPhoneSubmitting}
                >
                  {isPhoneSubmitting ? "注册中..." : "注册"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* 邮箱注册 */}
          <TabsContent value="email" className="mt-6">
            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                className="space-y-4"
              >
                {/* 用户名 */}
                <FormField
                  control={emailForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="请输入用户名"
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 邮箱 */}
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

                {/* 密码 */}
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
                            placeholder="请输入密码（至少6位）"
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

                {/* 确认密码 */}
                <FormField
                  control={emailForm.control}
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
                            placeholder="请再次输入密码"
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

                {/* 用户协议 */}
                <FormField
                  control={emailForm.control}
                  name="agreeTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          我已阅读并同意
                          <Link
                            to="/terms"
                            className="text-primary hover:underline mx-1"
                          >
                            用户协议
                          </Link>
                          和
                          <Link
                            to="/privacy"
                            className="text-primary hover:underline ml-1"
                          >
                            隐私政策
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                {/* 注册按钮 */}
                <Button
                  type="submit"
                  className="w-full shadow-md"
                  size="lg"
                  disabled={isEmailSubmitting}
                >
                  {isEmailSubmitting ? "注册中..." : "注册"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {/* 登录链接 */}
        <p className="text-center text-sm text-muted-foreground">
          已有账号？
          <Link to="/login" className="text-primary hover:underline ml-1">
            立即登录
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
