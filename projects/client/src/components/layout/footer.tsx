export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-9 h-9 bg-linear-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground text-lg font-bold">
                  V
                </span>
              </div>
              <span className="text-xl font-semibold text-foreground">
                VocabMaster
              </span>
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
              智能英语学习助手，让每一次阅读都成为高效的学习机会
            </p>
          </div>

          {/* Links - Product */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">产品</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  功能特性
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  价格方案
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  常见问题
                </a>
              </li>
            </ul>
          </div>

          {/* Links - Company */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">公司</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#about"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  关于我们
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  联系我们
                </a>
              </li>
              <li>
                <a
                  href="#privacy"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  隐私政策
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} VocabMaster. 让英语学习更高效.</p>
        </div>
      </div>
    </footer>
  );
}
