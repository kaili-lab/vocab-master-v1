import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span>AI 驱动的智能学习</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
          只学你
          <br />
          <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            真正需要
          </span>
          的单词
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          基于你的词汇量智能识别生词，AI 提供上下文精准解释，
          <br className="hidden md:block" />
          让每一次阅读都成为高效的学习机会
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-shadow group"
          >
            免费开始使用
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button size="lg" variant="outline">
            了解更多
          </Button>
        </div>

        {/* Social Proof (Optional) */}
        <div className="mt-12 text-sm text-muted-foreground">
          <p>
            已有 <span className="font-semibold text-foreground">10,000+</span>{" "}
            用户选择我们
          </p>
        </div>
      </div>
    </section>
  );
}
