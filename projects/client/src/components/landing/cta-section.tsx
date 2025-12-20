import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="py-24 bg-linear-to-br from-primary/5 via-primary/10 to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            准备好提升你的词汇量了吗？
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10">
            免费注册，立即开始智能学习
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="shadow-2xl hover:shadow-3xl transition-shadow group text-base sm:text-lg px-8 py-6"
          >
            免费开始使用
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
