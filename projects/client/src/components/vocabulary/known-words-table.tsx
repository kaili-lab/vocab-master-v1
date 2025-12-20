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

interface VocabularyWord {
  id: number;
  word: string;
  lemma: string;
  addedAt: string;
}

interface VocabularyTableProps {
  words: VocabularyWord[];
  onEdit: (word: VocabularyWord) => void;
  onDelete: (word: VocabularyWord) => void;
}

export function KnownWordsTable({
  words,
  onEdit,
  onDelete,
}: VocabularyTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="font-medium">单词</TableHead>
              <TableHead className="font-medium">添加时间</TableHead>
              <TableHead className="text-center font-medium w-[120px]">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-8 text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              words.map((word) => (
                <TableRow key={word.id} className="hover:bg-secondary/50">
                  <TableCell className="font-medium">{word.word}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {word.addedAt}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onEdit(word)}
                      >
                        <span className="sr-only">编辑</span>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(word)}
                      >
                        <span className="sr-only">删除</span>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
