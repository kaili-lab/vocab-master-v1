import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";

// TODO
export function UploadTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-border rounded-xl p-8 lg:p-12 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".txt,.pdf,.doc,.docx"
          onChange={handleFileChange}
        />

        {!selectedFile ? (
          <>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              上传文件
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              支持 TXT, PDF, DOC, DOCX 格式，最大 10MB
            </p>
            <label htmlFor="file-upload">
              <Button asChild>
                <span className="cursor-pointer">选择文件</span>
              </Button>
            </label>
          </>
        ) : (
          <div className="flex items-center justify-between bg-muted rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      {selectedFile && (
        <div className="flex justify-end">
          <Button className="shadow-md">开始分析</Button>
        </div>
      )}
    </div>
  );
}
