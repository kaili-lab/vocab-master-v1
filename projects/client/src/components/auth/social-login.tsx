// import { Button } from "@/components/ui/button";
// import { Github } from "lucide-react";
// import { SiWechat } from "react-icons/si"; // 需要安装 react-icons

// interface SocialLoginProps {
//   mode?: "login" | "register";
// }

// export function SocialLogin({ mode = "login" }: SocialLoginProps) {
//   const actionText = mode === "login" ? "登录" : "注册";

//   const handleGithubAuth = () => {
//     console.log("GitHub 授权登录");
//   };

//   const handleWechatAuth = () => {
//     console.log("微信扫码登录");
//   };

//   return (
//     <div className="grid grid-cols-2 gap-3">
//       {/* GitHub 登录 */}
//       <Button variant="outline" onClick={handleGithubAuth} className="w-full">
//         <Github className="mr-2 h-4 w-4" />
//         GitHub {actionText}
//       </Button>

//       {/* 微信登录 */}
//       <Button variant="outline" onClick={handleWechatAuth} className="w-full">
//         <SiWechat className="mr-2 h-4 w-4" />
//         微信{actionText}
//       </Button>
//     </div>
//   );
// }
