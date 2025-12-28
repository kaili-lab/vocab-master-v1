-- ============================================
-- 配额配置初始化脚本
-- ============================================
-- 用途：初始化 quota_configs 表，为不同订阅等级设置配额限制
--
-- 使用方法：
-- 1. 打开 Neon Dashboard → SQL Editor
-- 2. 粘贴此文件内容
-- 3. 点击 Run 执行
--
-- 注意：
-- - 使用 ON CONFLICT DO UPDATE 确保配置始终是最新的
-- - 在数据库迁移后执行（确保 quota_configs 表已创建）
-- ============================================

-- 插入或更新配额配置
INSERT INTO quota_configs (tier, daily_articles_limit, max_article_words, new_user_bonus_limit)
VALUES
  -- 免费版：每日 2 篇，每篇最多 1,000 词
  ('free', 2, 1000, 0),
  
  -- 专业版：每日 50 篇，每篇最多 5,000 词
  ('premium', 50, 5000, 0)
ON CONFLICT (tier) 
DO UPDATE SET
  daily_articles_limit = EXCLUDED.daily_articles_limit,
  max_article_words = EXCLUDED.max_article_words,
  new_user_bonus_limit = EXCLUDED.new_user_bonus_limit,
  updated_at = NOW();

-- 验证结果
SELECT 
  tier AS "订阅等级",
  daily_articles_limit AS "每日文章分析次数",
  max_article_words AS "单篇文章最大词数",
  created_at AS "创建时间"
FROM quota_configs
ORDER BY 
  CASE tier
    WHEN 'free' THEN 1
    WHEN 'premium' THEN 2
  END;

