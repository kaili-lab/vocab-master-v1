import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface VocabularyToolbarProps {
  searchQuery: string;
  sortOrder: string;
  onSearchChange: (query: string) => void;
  onSortOrderChange: (value: string) => void;
  onAddWord: () => void;
}

export function VocabularyToolbar({
  searchQuery,
  sortOrder,
  onSearchChange,
  onSortOrderChange,
  onAddWord,
}: VocabularyToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
      <div className="flex-1 sm:max-w-md relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索单词..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={sortOrder} onValueChange={onSortOrderChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="排序方式" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">最新添加</SelectItem>
          <SelectItem value="asc">最早添加</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={onAddWord} className="font-medium w-full sm:w-auto">
        + 新增单词
      </Button>
    </div>
  );
}
