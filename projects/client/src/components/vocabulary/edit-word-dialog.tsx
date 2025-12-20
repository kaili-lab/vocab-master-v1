import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VocabularyWord {
  id: number;
  word: string;
  lemma: string;
  addedAt: string;
}

interface EditWordDialogProps {
  open: boolean;
  word: VocabularyWord | null;
  onOpenChange: (open: boolean) => void;
  onSave: (word: VocabularyWord) => void;
  onAdd?: (word: string, lemma: string) => void;
}

export function EditWordDialog({
  open,
  word,
  onOpenChange,
  onSave,
  onAdd,
}: EditWordDialogProps) {
  const [editedWord, setEditedWord] = useState<string>("");
  const [editedLemma, setEditedLemma] = useState<string>("");

  const isAddMode = !word;

  useEffect(() => {
    if (word) {
      setEditedWord(word.word);
      setEditedLemma(word.lemma);
    } else {
      // 新增模式，清空表单
      setEditedWord("");
      setEditedLemma("");
    }
  }, [word, open]);

  const handleSave = () => {
    if (!editedWord.trim()) return;

    if (isAddMode && onAdd) {
      // 新增模式
      onAdd(editedWord.trim(), editedLemma.trim() || editedWord.trim());
      setEditedWord("");
      setEditedLemma("");
      onOpenChange(false);
    } else if (word) {
      // 编辑模式
      onSave({
        ...word,
        word: editedWord.trim(),
        lemma: editedLemma.trim() || editedWord.trim(),
      });
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setEditedWord("");
    setEditedLemma("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAddMode ? "添加单词" : "编辑单词"}</DialogTitle>
          <DialogDescription>
            {isAddMode
              ? "添加新的已认知单词到词汇库"
              : "修改单词信息后点击保存按钮"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="word">单词</Label>
            <Input
              id="word"
              value={editedWord}
              onChange={(e) => setEditedWord(e.target.value)}
              placeholder="例如：running"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lemma">
              词根 <span className="text-muted-foreground text-sm">(选填)</span>
            </Label>
            <Input
              id="lemma"
              value={editedLemma}
              onChange={(e) => setEditedLemma(e.target.value)}
              placeholder="例如：run (为空则使用单词本身)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
          {!isAddMode && (
            <div className="space-y-2">
              <Label htmlFor="addedAt">添加时间</Label>
              <Input
                id="addedAt"
                value={word?.addedAt || ""}
                placeholder="添加时间"
                disabled
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!editedWord.trim()}>
            {isAddMode ? "添加" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
