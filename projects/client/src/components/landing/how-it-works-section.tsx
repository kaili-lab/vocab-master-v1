export function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "选择你的词汇水平",
      description: "初中/高中/四级/六级/考研/托福，系统智能匹配你的学习需求",
    },
    {
      number: "2",
      title: "粘贴英文材料",
      description: "文章、新闻、论文、小说...任何你想阅读的英文内容",
    },
    {
      number: "3",
      title: "开始学习并复习",
      description: "AI 解释生词含义，智能安排复习，让单词真正记住",
    },
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            简单三步，开始学习
          </h2>
          <p className="text-lg text-muted-foreground">
            上手即用，无需复杂操作
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto space-y-8 lg:space-y-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6 group"
            >
              {/* Step Number */}
              <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-linear-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                {step.number}
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
