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
import { Textarea } from "@/components/ui/textarea";

interface LearningWord {
  id: number;
  word: string;
  meaningText: string;
  pos: string | null;
  addedAt: string;
  repetitions: number;
  totalReviews: number;
}

interface EditLearningWordDialogProps {
  open: boolean;
  word: LearningWord | null;
  onOpenChange: (open: boolean) => void;
  onSave: (word: LearningWord) => void | Promise<void>;
  onAdd?: (
    word: string,
    meaningText: string,
    pos?: string
  ) => void | Promise<void>;
}

export function EditLearningWordDialog({
  open,
  word,
  onOpenChange,
  onSave,
  onAdd,
}: EditLearningWordDialogProps) {
  const [editedWord, setEditedWord] = useState<string>("");
  const [editedMeaning, setEditedMeaning] = useState<string>("");
  const [editedPos, setEditedPos] = useState<string>("");

  const isAddMode = !word;

  useEffect(() => {
    if (word) {
      setEditedWord(word.word);
      setEditedMeaning(word.meaningText);
      setEditedPos(word.pos || "");
    } else {
      // 新增模式，清空表单
      setEditedWord("");
      setEditedMeaning("");
      setEditedPos("");
    }
  }, [word, open]);

  const handleSave = () => {
    if (!editedWord.trim() || !editedMeaning.trim()) return;

    if (isAddMode && onAdd) {
      // 新增模式
      onAdd(
        editedWord.trim(),
        editedMeaning.trim(),
        editedPos.trim() || undefined
      );
      setEditedWord("");
      setEditedMeaning("");
      setEditedPos("");
      onOpenChange(false);
    } else if (word) {
      // 编辑模式
      onSave({
        ...word,
        word: editedWord.trim(),
        meaningText: editedMeaning.trim(),
        pos: editedPos.trim() || null,
      });
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setEditedWord("");
    setEditedMeaning("");
    setEditedPos("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isAddMode ? "添加学习单词" : "编辑学习单词"}
          </DialogTitle>
          <DialogDescription>
            {isAddMode
              ? "添加新的单词到学习列表"
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
                if (e.key === "Enter" && e.ctrlKey) {
                  handleSave();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meaning">含义</Label>
            <Textarea
              id="meaning"
              value={editedMeaning}
              onChange={(e) => setEditedMeaning(e.target.value)}
              placeholder="例如：奔跑；跑步"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos">
              词性 <span className="text-muted-foreground text-sm">(选填)</span>
            </Label>
            <Input
              id="pos"
              value={editedPos}
              onChange={(e) => setEditedPos(e.target.value)}
              placeholder="例如：v. / n. / adj."
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
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
          <Button
            onClick={handleSave}
            disabled={!editedWord.trim() || !editedMeaning.trim()}
          >
            {isAddMode ? "添加" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
