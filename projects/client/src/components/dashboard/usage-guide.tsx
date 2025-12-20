import { Sparkles, FileText, Lightbulb, CheckCircle } from "lucide-react";

export default function UsageGuide() {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-8 flex flex-col items-center justify-center text-center">
      {/* 图标 */}
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Sparkles className="w-12 h-12 text-primary" />
      </div>

      {/* 标题和描述 */}
      <h3 className="text-2xl font-bold text-foreground mb-3">
        开始您的智能阅读
      </h3>
      <p className="text-muted-foreground mb-8 max-w-md leading-relaxed">
        粘贴英文文章，AI 将帮您识别陌生词汇并提供基于上下文的精准解释
      </p>

      {/* 使用步骤 */}
      <div className="space-y-4 w-full max-w-md">
        <div className="flex items-start gap-4 text-left bg-muted/60 backdrop-blur-sm p-5 rounded-xl hover:bg-muted/80 transition-colors">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm">
            1
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              粘贴文章
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              在左侧输入框粘贴您要阅读的英文内容
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 text-left bg-muted/60 backdrop-blur-sm p-5 rounded-xl hover:bg-muted/80 transition-colors">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm">
            2
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI 识别词汇
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              系统自动识别可能的陌生词汇，您可以自由添加或删除
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 text-left bg-muted/60 backdrop-blur-sm p-5 rounded-xl hover:bg-muted/80 transition-colors">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm">
            3
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              自定义词汇管理
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              手动添加陌生词或标记已认识词汇，下次分析时自动过滤，提升效率
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 text-left bg-muted/60 backdrop-blur-sm p-5 rounded-xl hover:bg-muted/80 transition-colors">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm">
            4
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              获取智能解释
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI 结合文章上下文，为每个词汇提供精准释义
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
