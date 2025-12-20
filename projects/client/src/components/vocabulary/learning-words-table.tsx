import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface LearningWord {
  id: number;
  word: string;
  meaningText: string;
  pos: string | null;
  addedAt: string;
  repetitions: number;
  totalReviews: number;
}

interface LearningWordsTableProps {
  words: LearningWord[];
  onEdit: (word: LearningWord) => void;
  onDelete: (word: LearningWord) => void;
}

export function LearningWordsTable({
  words,
  onEdit,
  onDelete,
}: LearningWordsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">单词</TableHead>
            <TableHead className="w-[100px]">词性</TableHead>
            <TableHead>含义</TableHead>
            <TableHead className="w-[100px] text-center">复习次数</TableHead>
            <TableHead className="w-[180px]">添加时间</TableHead>
            <TableHead className="w-[120px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {words.map((word) => (
            <TableRow key={word.id}>
              <TableCell className="font-medium">{word.word}</TableCell>
              <TableCell className="text-muted-foreground">
                {word.pos || "-"}
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {word.meaningText}
              </TableCell>
              <TableCell className="text-center">
                {word.totalReviews > 0 ? (
                  <span className="text-sm">
                    {word.totalReviews}次 ({word.repetitions}连对)
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">未复习</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {word.addedAt}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(word)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(word)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
