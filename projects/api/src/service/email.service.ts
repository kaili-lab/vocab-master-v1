import { Resend } from "resend";

/**
 * 邮件发送服务
 * 使用 Resend API 发送邮件
 */
export class EmailService {
  private resend: Resend;
  private fromEmail = "noreply@kaili.dev";

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  /**
   * 发送邮箱验证邮件
   * @param to - 收件人邮箱
   * @param userName - 用户名
   * @param verificationUrl - 验证链接
   */
  async sendVerificationEmail(
    to: string,
    userName: string,
    verificationUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: to,
        subject: "验证您的 Vocab Master 账号",
        text: `您好 ${userName}，

感谢您注册 Vocab Master！

请点击以下链接验证您的邮箱地址：

${verificationUrl}

此链接将在 24 小时后失效。

如果您没有注册 Vocab Master 账号，请忽略此邮件。

---
Vocab Master 团队`,
      });

      if (error) {
        console.error("❌ [EmailService] 发送验证邮件失败:", error);
        return { success: false, error: error.message };
      }

      console.log("✅ [EmailService] 验证邮件发送成功:", data?.id);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "未知错误";
      console.error("❌ [EmailService] 发送邮件异常:", error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 发送密码重置邮件
   * @param to - 收件人邮箱
   * @param userName - 用户名
   * @param resetUrl - 重置密码链接
   */
  async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: to,
        subject: "重置您的 Vocab Master 密码",
        text: `您好 ${userName}，

我们收到了您重置密码的请求。

请点击以下链接重置您的密码：

${resetUrl}

此链接将在 1 小时后失效。

如果您没有请求重置密码，请忽略此邮件，您的密码将保持不变。

---
Vocab Master 团队`,
      });

      if (error) {
        console.error("❌ [EmailService] 发送重置密码邮件失败:", error);
        return { success: false, error: error.message };
      }

      console.log("✅ [EmailService] 重置密码邮件发送成功:", data?.id);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "未知错误";
      console.error("❌ [EmailService] 发送邮件异常:", error);
      return { success: false, error: errorMessage };
    }
  }
}

