import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // 添加这行
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 添加这行
  ],
  resolve: {
    alias: {
      // 设置路径别名,将 @ 映射到项目的 src 目录，这样你就可以用 @ 来代替相对路径
      // 在深层嵌套的组件中导入
      // import Button from '../../../components/ui/Button';
      // 使用 @ 别名，无论文件层级多深都很清晰
      // import Button from '@/components/ui/Button';
      "@": path.resolve(__dirname, "src"),
    },
  },
});
