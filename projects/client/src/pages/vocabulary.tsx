import { useState, useEffect, useMemo, useCallback } from "react";
import { DashboardNavbar } from "@/components/layout/dashboard-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Archive, Loader2 } from "lucide-react";
import { showToastInfo, showToastSuccess, showToastError } from "@/utils/toast";
import { VocabularyToolbar } from "@/components/vocabulary/vocabulary-toolbar";
import { KnownWordsTable } from "@/components/vocabulary/known-words-table";
import { LearningWordsTable } from "@/components/vocabulary/learning-words-table";
import { VocabularyPagination } from "@/components/vocabulary/vocabulary-pagination";
import { EditWordDialog } from "@/components/vocabulary/edit-word-dialog";
import { EditLearningWordDialog } from "@/components/vocabulary/edit-learning-word-dialog";
import { DeleteConfirmDialog } from "@/components/vocabulary/delete-confirm-dialog";
import { apiClient } from "@/lib/api-client";
import { extractApiData, getErrorMessage } from "@/utils/api-helpers";
import type {
  GetKnownWordsListResponse,
  KnownWordItem,
  AddKnownWordResponse,
  UpdateKnownWordResponse,
} from "../../../api/src/route/user-known-words.route";
import type {
  GetLearningWordsListResponse,
  LearningWordItem,
  AddLearningWordResponse,
  UpdateLearningWordResponse,
} from "../../../api/src/route/user-learned-meanings.route";

interface VocabularyWord {
  id: number;
  word: string;
  lemma: string;
  addedAt: string;
}

interface LearningWord {
  id: number;
  word: string;
  meaningText: string;
  pos: string | null;
  addedAt: string;
  repetitions: number;
  totalReviews: number;
}

export default function VocabularyPage() {
  const [activeTab, setActiveTab] = useState<"known" | "learning">("known");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc: 最新优先, asc: 最早优先

  // Known words states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wordToDelete, setWordToDelete] = useState<VocabularyWord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);

  // Learning words states
  const [learningDialogOpen, setLearningDialogOpen] = useState(false);
  const [editingLearningWord, setEditingLearningWord] =
    useState<LearningWord | null>(null);
  const [learningDeleteDialogOpen, setLearningDeleteDialogOpen] =
    useState(false);
  const [learningWordToDelete, setLearningWordToDelete] =
    useState<LearningWord | null>(null);
  const [learningCurrentPage, setLearningCurrentPage] = useState(1);
  const [isLoadingLearning, setIsLoadingLearning] = useState(true);
  const [allLearningWords, setAllLearningWords] = useState<LearningWord[]>([]);

  const loadWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await extractApiData<GetKnownWordsListResponse>(
        apiClient.api["known-words"].list.$get({
          query: { sort: sortOrder },
        })
      );

      const words = data.words.map((word: KnownWordItem) => ({
        id: word.id,
        word: word.word,
        lemma: word.lemma,
        addedAt: new Date(word.createdAt).toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setAllWords(words);
    } catch (error) {
      console.error("加载失败:", getErrorMessage(error));
      showToastError("加载词汇列表失败");
    } finally {
      setIsLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const loadLearningWords = useCallback(async () => {
    setIsLoadingLearning(true);
    try {
      const data = await extractApiData<GetLearningWordsListResponse>(
        apiClient.api["learning-words"].list.$get({
          query: { sort: sortOrder },
        })
      );

      const words = data.words.map((word: LearningWordItem) => ({
        id: word.id,
        word: word.word,
        meaningText: word.meaningText,
        pos: word.pos,
        repetitions: word.repetitions,
        totalReviews: word.totalReviews,
        addedAt: new Date(word.createdAt).toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setAllLearningWords(words);
    } catch (error) {
      console.error("加载失败:", getErrorMessage(error));
      showToastError("加载学习单词列表失败");
    } finally {
      setIsLoadingLearning(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    loadLearningWords();
  }, [loadLearningWords]);

  const filteredWords = useMemo(() => {
    let result = [...allWords];

    // 应用搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (word) =>
          word.word.toLowerCase().includes(query) ||
          word.lemma.toLowerCase().includes(query)
      );
    }

    // 后端已经按照 sortOrder 排序，这里不需要再排序
    return result;
  }, [allWords, searchQuery]);

  const itemsPerPage = 10;
  const totalItems = filteredWords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const currentWords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredWords.slice(start, end);
  }, [filteredWords, currentPage, itemsPerPage]);

  const filteredLearningWords = useMemo(() => {
    let result = [...allLearningWords];

    // 应用搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (word) =>
          word.word.toLowerCase().includes(query) ||
          word.meaningText.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allLearningWords, searchQuery]);

  const learningTotalItems = filteredLearningWords.length;
  const learningTotalPages = Math.ceil(learningTotalItems / itemsPerPage);

  const currentLearningWords = useMemo(() => {
    const start = (learningCurrentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredLearningWords.slice(start, end);
  }, [filteredLearningWords, learningCurrentPage, itemsPerPage]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setLearningCurrentPage(1);
  };

  const handleSortOrderChange = (value: string) => {
    setSortOrder(value);
    setCurrentPage(1);
    // sortOrder 变化会触发 useEffect 重新加载数据
  };

  const handleAddWord = () => {
    setEditingWord(null); // 新增模式：word 为 null
    setDialogOpen(true);
  };

  const handleConfirmAdd = async (word: string, lemma: string) => {
    try {
      const data = await extractApiData<AddKnownWordResponse>(
        apiClient.api["known-words"].add.$post({
          json: { word, lemma: lemma || undefined },
        })
      );

      if (data.alreadyExists) {
        showToastInfo("该词汇已在已认知列表中");
        return;
      }

      // 重新加载词汇列表
      await loadWords();
      showToastSuccess(`成功添加单词 "${word}"`);
    } catch (error) {
      showToastError(getErrorMessage(error, "添加单词失败"));
    }
  };

  const handleEditWord = (word: VocabularyWord) => {
    setEditingWord(word); // 编辑模式：word 不为 null
    setDialogOpen(true);
  };

  const handleSaveEdit = async (word: VocabularyWord) => {
    try {
      await extractApiData<UpdateKnownWordResponse>(
        apiClient.api["known-words"].update.$put({
          json: {
            id: word.id,
            word: word.word,
            lemma: word.lemma || undefined,
          },
        })
      );

      // 更新本地状态
      setAllWords((prev) =>
        prev.map((w) =>
          w.id === word.id ? { ...w, word: word.word, lemma: word.lemma } : w
        )
      );

      showToastSuccess(`成功更新单词 "${word.word}"`);
      setDialogOpen(false);
    } catch (error) {
      showToastError(getErrorMessage(error, "更新单词失败"));
    }
  };

  const handleDeleteWord = (word: VocabularyWord) => {
    setWordToDelete(word);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!wordToDelete) return;

    try {
      await apiClient.api["known-words"].remove.$delete({
        json: { lemma: wordToDelete.lemma },
      });

      // 方案A：直接从前端状态移除，不重新请求
      setAllWords((prev) => prev.filter((w) => w.id !== wordToDelete.id));

      // 检查删除后当前页是否还有数据
      // 需要基于更新后的数据重新计算
      const updatedWords = allWords.filter((w) => w.id !== wordToDelete.id);

      // 应用搜索筛选
      let filteredResult = [...updatedWords];
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredResult = filteredResult.filter(
          (word) =>
            word.word.toLowerCase().includes(query) ||
            word.lemma.toLowerCase().includes(query)
        );
      }

      // 计算删除后的总页数
      const newTotalPages = Math.ceil(filteredResult.length / itemsPerPage);

      // 如果当前页超出了总页数，跳转到最后一页
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }

      showToastSuccess(`单词 "${wordToDelete.word}" 已删除`);
      setDeleteDialogOpen(false);
      setWordToDelete(null);
    } catch (error) {
      showToastError(getErrorMessage(error, "删除失败"));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLearningPageChange = (page: number) => {
    setLearningCurrentPage(page);
  };

  // Learning words handlers
  const handleAddLearningWord = () => {
    setEditingLearningWord(null);
    setLearningDialogOpen(true);
  };

  const handleConfirmAddLearning = async (
    word: string,
    meaningText: string,
    pos?: string
  ) => {
    try {
      await extractApiData<AddLearningWordResponse>(
        apiClient.api["learning-words"].add.$post({
          json: { word, meaningText, pos },
        })
      );

      await loadLearningWords();
      showToastSuccess(`成功添加学习单词 "${word}"`);
    } catch (error) {
      showToastError(getErrorMessage(error, "添加学习单词失败"));
    }
  };

  const handleEditLearningWord = (word: LearningWord) => {
    setEditingLearningWord(word);
    setLearningDialogOpen(true);
  };

  const handleSaveEditLearning = async (word: LearningWord) => {
    try {
      await extractApiData<UpdateLearningWordResponse>(
        apiClient.api["learning-words"].update.$put({
          json: {
            id: word.id,
            word: word.word,
            meaningText: word.meaningText,
          },
        })
      );

      setAllLearningWords((prev) =>
        prev.map((w) =>
          w.id === word.id
            ? {
                ...w,
                word: word.word,
                meaningText: word.meaningText,
                pos: word.pos,
              }
            : w
        )
      );

      showToastSuccess(`成功更新学习单词 "${word.word}"`);
      setLearningDialogOpen(false);
    } catch (error) {
      showToastError(getErrorMessage(error, "更新学习单词失败"));
    }
  };

  const handleDeleteLearningWord = (word: LearningWord) => {
    setLearningWordToDelete(word);
    setLearningDeleteDialogOpen(true);
  };

  const handleConfirmDeleteLearning = async () => {
    if (!learningWordToDelete) return;

    try {
      await apiClient.api["learning-words"].remove.$delete({
        json: { id: learningWordToDelete.id },
      });

      setAllLearningWords((prev) =>
        prev.filter((w) => w.id !== learningWordToDelete.id)
      );

      const updatedWords = allLearningWords.filter(
        (w) => w.id !== learningWordToDelete.id
      );

      let filteredResult = [...updatedWords];
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredResult = filteredResult.filter(
          (word) =>
            word.word.toLowerCase().includes(query) ||
            word.meaningText.toLowerCase().includes(query)
        );
      }

      const newTotalPages = Math.ceil(filteredResult.length / itemsPerPage);

      if (learningCurrentPage > newTotalPages && newTotalPages > 0) {
        setLearningCurrentPage(newTotalPages);
      }

      showToastSuccess(`单词 "${learningWordToDelete.word}" 已删除`);
      setLearningDeleteDialogOpen(false);
      setLearningWordToDelete(null);
    } catch (error) {
      showToastError(getErrorMessage(error, "删除失败"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "known" | "learning")}
          className="space-y-6"
        >
          {/* Tabs 导航栏 */}
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="known" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              已认知词汇库
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              学习中的单词
            </TabsTrigger>
          </TabsList>

          {/* 已认知词汇库 Tab */}
          <TabsContent value="known" className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <VocabularyToolbar
                  searchQuery={searchQuery}
                  sortOrder={sortOrder}
                  onSearchChange={handleSearch}
                  onSortOrderChange={handleSortOrderChange}
                  onAddWord={handleAddWord}
                />

                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}

                {!isLoading && (
                  <>
                    {currentWords.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        {searchQuery
                          ? "没有找到匹配的单词"
                          : "暂无已认知词汇，快去文章分析页面添加吧"}
                      </div>
                    ) : (
                      <>
                        <KnownWordsTable
                          words={currentWords}
                          onEdit={handleEditWord}
                          onDelete={handleDeleteWord}
                        />

                        {totalPages > 1 && (
                          <VocabularyPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={handlePageChange}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 学习中的单词卡片 Tab */}
          <TabsContent value="learning" className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* 工具栏 */}
                <VocabularyToolbar
                  searchQuery={searchQuery}
                  sortOrder={sortOrder}
                  onSearchChange={handleSearch}
                  onSortOrderChange={handleSortOrderChange}
                  onAddWord={handleAddLearningWord}
                />

                {isLoadingLearning && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}

                {!isLoadingLearning && (
                  <>
                    {currentLearningWords.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        {searchQuery
                          ? "没有找到匹配的单词"
                          : "暂无学习单词，快去添加吧"}
                      </div>
                    ) : (
                      <>
                        <LearningWordsTable
                          words={currentLearningWords}
                          onEdit={handleEditLearningWord}
                          onDelete={handleDeleteLearningWord}
                        />

                        {learningTotalPages > 1 && (
                          <VocabularyPagination
                            currentPage={learningCurrentPage}
                            totalPages={learningTotalPages}
                            totalItems={learningTotalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={handleLearningPageChange}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 新增/编辑已认知单词对话框 */}
      <EditWordDialog
        open={dialogOpen}
        word={editingWord}
        onOpenChange={setDialogOpen}
        onSave={handleSaveEdit}
        onAdd={handleConfirmAdd}
      />

      {/* 新增/编辑学习单词对话框 */}
      <EditLearningWordDialog
        open={learningDialogOpen}
        word={editingLearningWord}
        onOpenChange={setLearningDialogOpen}
        onSave={handleSaveEditLearning}
        onAdd={handleConfirmAddLearning}
      />

      {/* 删除已认知单词确认对话框 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        wordToDelete={wordToDelete?.word || ""}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />

      {/* 删除学习单词确认对话框 */}
      <DeleteConfirmDialog
        open={learningDeleteDialogOpen}
        wordToDelete={learningWordToDelete?.word || ""}
        onOpenChange={setLearningDeleteDialogOpen}
        onConfirm={handleConfirmDeleteLearning}
      />
    </div>
  );
}
