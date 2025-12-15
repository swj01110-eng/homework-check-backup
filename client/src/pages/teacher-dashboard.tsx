import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GraduationCap,
  LogOut,
  Save,
  Plus,
  Trash2,
  Calendar,
  Settings as SettingsIcon,
  FolderIcon,
  ChevronUp,
  ChevronDown,
  Edit2,
  Users,
  Check,
  ChevronsUpDown,
  Bell,
  RotateCcw,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, AssignmentWithClasses, AnswerKey, Submission, Settings, Folder, Class, EncouragementRange } from "@shared/schema";

type SubmissionWithIncorrect = Submission & { incorrectQuestions: number[] };

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [newClassName, setNewClassName] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentClassIds, setNewAssignmentClassIds] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<string>("10");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [answerInputs, setAnswerInputs] = useState<Array<{ questionNumber: number; answer: (number | string)[]; questionType: 'multiple-choice' | 'essay'; comment?: string }>>([{ questionNumber: 1, answer: [], questionType: 'multiple-choice', comment: '' }]);
  const [newAppTitle, setNewAppTitle] = useState("");
  const [newHighScoreMessage, setNewHighScoreMessage] = useState("");
  const [newLowScoreMessage, setNewLowScoreMessage] = useState("");
  const [newPerfectScoreMessage, setNewPerfectScoreMessage] = useState("");
  const [newRangeMinScore, setNewRangeMinScore] = useState<string>("0");
  const [newRangeMaxScore, setNewRangeMaxScore] = useState<string>("101");
  const [newRangeMessage, setNewRangeMessage] = useState("");
  const [editingRangeId, setEditingRangeId] = useState<string | null>(null);
  const [editingRangeMinScore, setEditingRangeMinScore] = useState<string>("0");
  const [editingRangeMaxScore, setEditingRangeMaxScore] = useState<string>("100");
  const [editingRangeMessage, setEditingRangeMessage] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editingAssignmentTitle, setEditingAssignmentTitle] = useState("");
  const [editingAssignmentClassIds, setEditingAssignmentClassIds] = useState<string[]>([]);
  const [editingAssignmentShowAnswers, setEditingAssignmentShowAnswers] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'class' | 'folder' | 'assignment'; id: string; name: string; classIds?: string[] } | null>(null);
  const [isNewClassSelectOpen, setIsNewClassSelectOpen] = useState(false);
  const [isEditClassSelectOpen, setIsEditClassSelectOpen] = useState(false);
  const [isCompletedClassesOpen, setIsCompletedClassesOpen] = useState(false);
  const [isCompletedFoldersOpen, setIsCompletedFoldersOpen] = useState(false);
  const [isCompletedAssignmentsOpen, setIsCompletedAssignmentsOpen] = useState(false);
  const [isCompletedSubmissionsOpen, setIsCompletedSubmissionsOpen] = useState(false);
  const [expandedCompletedAssignmentIds, setExpandedCompletedAssignmentIds] = useState<string[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<number>(() => {
    const saved = localStorage.getItem('lastNotificationCheck');
    return saved ? parseInt(saved) : Date.now();
  });

  useEffect(() => {
    const isAuth = localStorage.getItem("teacherAuth");
    if (isAuth !== "true") {
      setLocation("/teacher/login");
    }
  }, [setLocation]);

  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: folders, isLoading: isLoadingFolders } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const { data: assignments, isLoading: isLoadingAssignments } = useQuery<AssignmentWithClasses[]>({
    queryKey: ["/api/assignments"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: encouragementRanges } = useQuery<EncouragementRange[]>({
    queryKey: ["/api/encouragement-ranges"],
  });

  useEffect(() => {
    if (settings) {
      setNewAppTitle(settings.appTitle);
      setNewHighScoreMessage(settings.highScoreMessage);
      setNewLowScoreMessage(settings.lowScoreMessage);
      setNewPerfectScoreMessage(settings.perfectScoreMessage);
    }
  }, [settings]);

  useEffect(() => {
    if (assignments && assignments.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  const { data: answerKeys } = useQuery<AnswerKey[]>({
    queryKey: [`/api/assignments/${selectedAssignmentId}/answer-keys`],
    enabled: !!selectedAssignmentId,
  });

  const { data: submissions } = useQuery<SubmissionWithIncorrect[]>({
    queryKey: selectedClassId 
      ? [`/api/classes/${selectedClassId}/submissions`]
      : [`/api/assignments/${selectedAssignmentId}/submissions`],
    enabled: !!selectedClassId || !!selectedAssignmentId,
  });

  const { data: allSubmissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
  });

  useEffect(() => {
    if (answerKeys && answerKeys.length > 0) {
      setAnswerInputs(
        answerKeys
          .map((key) => ({
            questionNumber: key.questionNumber,
            answer: key.questionType === 'essay'
              ? (key.correctAnswer.trim() !== "" ? [key.correctAnswer] : [])
              : key.correctAnswer
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s !== "")
                  .map((s) => Number(s))
                  .filter((n) => !Number.isNaN(n)),
            questionType: (key.questionType || 'multiple-choice') as 'multiple-choice' | 'essay',
            comment: key.comment || '',
          }))
          .sort((a, b) => a.questionNumber - b.questionNumber)
      );
    } else {
      setAnswerInputs([{ questionNumber: 1, answer: [], questionType: 'multiple-choice', comment: '' }]);
    }
  }, [answerKeys, selectedAssignmentId]);

  const createClassMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/classes", { name });
      return await res.json() as Class;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setNewClassName("");
      toast({
        title: "반 생성 완료",
        description: "새 반이 생성되었습니다.",
      });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PATCH", `/api/classes/${id}`, { name });
      return await res.json() as Class;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setEditingClassId(null);
      setEditingClassName("");
      toast({
        title: "반 수정 완료",
        description: "반 이름이 변경되었습니다.",
      });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/classes/${id}`, null);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "반 삭제 완료",
        description: "반이 삭제되었습니다.",
      });
    },
  });

  const toggleClassCompletedMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/classes/${id}`, { completed });
      return await res.json() as Class;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
  });

  const toggleFolderCompletedMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/folders/${id}`, { completed });
      return await res.json() as Folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/folders", { name });
      return await res.json() as Folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setNewFolderName("");
      toast({
        title: "폴더 생성 완료",
        description: "새 폴더가 생성되었습니다.",
      });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PATCH", `/api/folders/${id}`, { name });
      return await res.json() as Folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setEditingFolderId(null);
      setEditingFolderName("");
      toast({
        title: "폴더 수정 완료",
        description: "폴더명이 변경되었습니다.",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/folders/${id}`, null);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "폴더 삭제 완료",
        description: "폴더가 삭제되었습니다. 하위 문제는 미분류로 이동되었습니다.",
      });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { title: string; classIds: string[]; folderId?: string; showAnswers: boolean; questionCount?: number }) => {
      const res = await apiRequest("POST", "/api/assignments", data);
      return await res.json() as AssignmentWithClasses;
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      if (assignment.classIds && assignment.classIds.length > 0) {
        assignment.classIds.forEach(classId => {
          queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/assignments`] });
        });
      }
      setNewAssignmentTitle("");
      setNewAssignmentClassIds([]);
      setSelectedFolderId(null);
      setShowAnswers(true);
      setQuestionCount("10");
      toast({
        title: "문제 생성 완료",
        description: "새로운 문제가 생성되었습니다.",
      });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, oldClassIds, title, classIds, showAnswers }: { id: string; oldClassIds?: string[]; title?: string; classIds?: string[]; showAnswers?: boolean }) => {
      const body: Record<string, any> = {};
      if (title !== undefined) body.title = title;
      if (classIds !== undefined) body.classIds = classIds;
      if (showAnswers !== undefined) body.showAnswers = showAnswers;
      
      const res = await apiRequest("PATCH", `/api/assignments/${id}`, body);
      return { assignment: await res.json() as AssignmentWithClasses, oldClassIds };
    },
    onSuccess: ({ assignment, oldClassIds }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      if (assignment.classIds && assignment.classIds.length > 0) {
        assignment.classIds.forEach(classId => {
          queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/assignments`] });
        });
      }
      if (oldClassIds && oldClassIds.length > 0) {
        oldClassIds.forEach(classId => {
          if (!assignment.classIds || !assignment.classIds.includes(classId)) {
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/assignments`] });
          }
        });
      }
      setEditingAssignmentId(null);
      setEditingAssignmentTitle("");
      setEditingAssignmentClassIds([]);
      setEditingAssignmentShowAnswers(true);
      toast({
        title: "문제 수정 완료",
        description: "문제가 수정되었습니다.",
      });
    },
  });

  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/assignments/${id}`, { completed });
      return await res.json() as AssignmentWithClasses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async ({ id, classIds }: { id: string; classIds?: string[] }) => {
      const res = await apiRequest("DELETE", `/api/assignments/${id}`, null);
      return { result: await res.json(), classIds };
    },
    onSuccess: ({ classIds }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      if (classIds && classIds.length > 0) {
        classIds.forEach(classId => {
          queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/assignments`] });
        });
      }
      toast({
        title: "문제 삭제 완료",
        description: "문제가 삭제되었습니다.",
      });
    },
  });

  const moveAssignmentMutation = useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/assignments/${id}`, { folderId });
      return await res.json() as AssignmentWithClasses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "문제 이동 완료",
        description: "문제가 이동되었습니다.",
      });
    },
  });

  const reorderFoldersMutation = useMutation({
    mutationFn: async (folderIds: string[]) => {
      const res = await apiRequest("POST", "/api/folders/reorder", { folderIds });
      return await res.json() as Folder[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
    },
  });

  const reorderAssignmentsMutation = useMutation({
    mutationFn: async (assignmentIds: string[]) => {
      const res = await apiRequest("POST", "/api/assignments/reorder", { assignmentIds });
      return await res.json() as AssignmentWithClasses[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
    },
  });

  const saveAnswersMutation = useMutation({
    mutationFn: async (data: { assignmentId: string; answerKeys: Array<{ questionNumber: number; correctAnswer: string; questionType?: string; comment?: string }> }) => {
      const res = await apiRequest("POST", `/api/assignments/${data.assignmentId}/answer-keys`, { answerKeys: data.answerKeys });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "답안 키 저장에 실패했습니다");
      }
      return await res.json() as AnswerKey[];
    },
    onSuccess: () => {
      if (selectedAssignmentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/assignments/${selectedAssignmentId}/answer-keys`] });
        queryClient.invalidateQueries({ queryKey: [`/api/assignments/${selectedAssignmentId}/submissions`] });
      }
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: [`/api/classes/${selectedClassId}/submissions`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "저장 완료",
        description: "정답이 성공적으로 저장되었습니다. 제출 내역이 자동으로 재채점되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: error.message || "답안 키 저장 중 오류가 발생했습니다.",
      });
    },
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/submissions/${id}`, null);
      return await res.json();
    },
    onSuccess: () => {
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: [`/api/classes/${selectedClassId}/submissions`] });
      }
      if (selectedAssignmentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/assignments/${selectedAssignmentId}/submissions`] });
      }
      toast({
        title: "제출 삭제 완료",
        description: "제출이 삭제되었습니다.",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: { appTitle: string; highScoreMessage: string; lowScoreMessage: string; perfectScoreMessage: string }) => {
      const res = await apiRequest("PATCH", "/api/settings", updates);
      return await res.json() as Settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "설정 저장 완료",
        description: "설정이 업데이트되었습니다.",
      });
    },
  });

  const createEncouragementRangeMutation = useMutation({
    mutationFn: async (range: { minScore: number; maxScore: number; message: string }) => {
      const res = await apiRequest("POST", "/api/encouragement-ranges", range);
      return await res.json() as EncouragementRange;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/encouragement-ranges"] });
      toast({
        title: "격려 문구 구간 추가 완료",
        description: "새 격려 문구 구간이 추가되었습니다.",
      });
    },
  });

  const updateEncouragementRangeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { minScore?: number; maxScore?: number; message?: string } }) => {
      const res = await apiRequest("PATCH", `/api/encouragement-ranges/${id}`, updates);
      return await res.json() as EncouragementRange;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/encouragement-ranges"] });
      toast({
        title: "격려 문구 구간 수정 완료",
        description: "격려 문구 구간이 수정되었습니다.",
      });
    },
  });

  const deleteEncouragementRangeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/encouragement-ranges/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/encouragement-ranges"] });
      toast({
        title: "격려 문구 구간 삭제 완료",
        description: "격려 문구 구간이 삭제되었습니다.",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("teacherAuth");
    setLocation("/teacher/login");
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      createClassMutation.mutate(newClassName.trim());
    }
  };

  const handleEditClass = (cls: Class) => {
    setEditingClassId(cls.id);
    setEditingClassName(cls.name);
  };

  const handleSaveClass = () => {
    if (editingClassId && editingClassName.trim()) {
      updateClassMutation.mutate({ id: editingClassId, name: editingClassName.trim() });
    }
  };

  const handleToggleClassCompleted = (id: string, currentCompleted: boolean) => {
    toggleClassCompletedMutation.mutate({ id, completed: !currentCompleted });
  };

  const handleToggleFolderCompleted = (id: string, currentCompleted: boolean) => {
    toggleFolderCompletedMutation.mutate({ id, completed: !currentCompleted });
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim());
    }
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleSaveFolder = () => {
    if (editingFolderId && editingFolderName.trim()) {
      updateFolderMutation.mutate({ id: editingFolderId, name: editingFolderName.trim() });
    }
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssignmentTitle.trim() && newAssignmentClassIds.length > 0) {
      const count = parseInt(questionCount) || 0;
      const data: { title: string; classIds: string[]; folderId?: string; showAnswers: boolean; questionCount?: number } = {
        title: newAssignmentTitle.trim(),
        classIds: newAssignmentClassIds,
        showAnswers: showAnswers,
      };
      if (selectedFolderId) {
        data.folderId = selectedFolderId;
      }
      if (count > 0) {
        data.questionCount = count;
      }
      createAssignmentMutation.mutate(data);
    }
  };

  const handleEditAssignment = (assignment: AssignmentWithClasses) => {
    setEditingAssignmentId(assignment.id);
    setEditingAssignmentTitle(assignment.title);
    setEditingAssignmentClassIds(assignment.classIds);
    setEditingAssignmentShowAnswers(assignment.showAnswers);
  };

  const handleSaveAssignment = () => {
    if (editingAssignmentId && editingAssignmentTitle.trim() && editingAssignmentClassIds.length > 0) {
      const currentAssignment = assignments?.find((a) => a.id === editingAssignmentId);
      updateAssignmentMutation.mutate({ 
        id: editingAssignmentId,
        oldClassIds: currentAssignment?.classIds || [],
        title: editingAssignmentTitle.trim(),
        classIds: editingAssignmentClassIds,
        showAnswers: editingAssignmentShowAnswers
      });
    }
  };

  const handleToggleCompleted = (id: string, currentCompleted: boolean) => {
    toggleCompletedMutation.mutate({ id, completed: !currentCompleted });
  };

  const handleMoveFolderUp = (folderId: string) => {
    if (!folders) return;
    
    const index = folders.findIndex((f) => f.id === folderId);
    if (index === 0) return;
    
    const reordered = [...folders];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    
    reorderFoldersMutation.mutate(reordered.map((f) => f.id));
  };

  const handleMoveFolderDown = (folderId: string) => {
    if (!folders) return;
    
    const index = folders.findIndex((f) => f.id === folderId);
    if (index === folders.length - 1) return;
    
    const reordered = [...folders];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    
    reorderFoldersMutation.mutate(reordered.map((f) => f.id));
  };

  const handleMoveAssignmentUp = (assignmentId: string, folderId: string | null) => {
    if (!assignments) return;
    
    const folderAssignments = assignments.filter((a) => 
      folderId ? a.folderId === folderId : !a.folderId
    );
    const localIndex = folderAssignments.findIndex((a) => a.id === assignmentId);
    
    if (localIndex === 0) return;
    
    const reordered = [...folderAssignments];
    [reordered[localIndex - 1], reordered[localIndex]] = [reordered[localIndex], reordered[localIndex - 1]];
    
    const otherAssignments = assignments.filter((a) => 
      folderId ? a.folderId !== folderId : !!a.folderId
    );
    
    const newOrder = [...reordered, ...otherAssignments];
    reorderAssignmentsMutation.mutate(newOrder.map((a) => a.id));
  };

  const handleMoveAssignmentDown = (assignmentId: string, folderId: string | null) => {
    if (!assignments) return;
    
    const folderAssignments = assignments.filter((a) => 
      folderId ? a.folderId === folderId : !a.folderId
    );
    const localIndex = folderAssignments.findIndex((a) => a.id === assignmentId);
    
    if (localIndex === folderAssignments.length - 1) return;
    
    const reordered = [...folderAssignments];
    [reordered[localIndex], reordered[localIndex + 1]] = [reordered[localIndex + 1], reordered[localIndex]];
    
    const otherAssignments = assignments.filter((a) => 
      folderId ? a.folderId !== folderId : !!a.folderId
    );
    
    const newOrder = [...reordered, ...otherAssignments];
    reorderAssignmentsMutation.mutate(newOrder.map((a) => a.id));
  };

  const handleSaveAnswers = () => {
    if (!selectedAssignmentId) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "문제를 선택해주세요.",
      });
      return;
    }

    const validAnswers = answerInputs
      .filter((input) => input.answer.length > 0)
      .map((input) => ({
        questionNumber: input.questionNumber,
        correctAnswer: input.questionType === 'essay' 
          ? String(input.answer[0])
          : [...(input.answer as number[])].sort((a, b) => a - b).join(", "),
        questionType: input.questionType,
        comment: input.comment || '',
      }));

    if (validAnswers.length === 0) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "최소 하나의 문제를 설정해주세요.",
      });
      return;
    }

    saveAnswersMutation.mutate({ assignmentId: selectedAssignmentId, answerKeys: validAnswers });
  };

  const cloneAnswers = (rows: typeof answerInputs) =>
    rows.map(({ questionNumber, answer, questionType, comment }) => ({
      questionNumber,
      answer: [...answer],
      questionType,
      comment: comment || '',
    }));

  const handleAddQuestion = () => {
    setAnswerInputs((prev) => {
      const cloned = cloneAnswers(prev);
      const maxNumber = cloned.reduce((max, row) => Math.max(max, row.questionNumber), 0);
      cloned.push({ questionNumber: maxNumber + 1, answer: [], questionType: 'multiple-choice', comment: '' });
      return cloned;
    });
  };

  const handleRemoveQuestion = (index: number) => {
    if (answerInputs.length > 1) {
      setAnswerInputs((prev) => {
        const cloned = cloneAnswers(prev);
        return cloned.filter((_, i) => i !== index);
      });
    }
  };

  const toggleAnswerChoice = (index: number, choice: number) => {
    setAnswerInputs((prev) => {
      const cloned = cloneAnswers(prev);
      const target = cloned[index];
      const choices = new Set(target.answer as number[]);
      choices.has(choice) ? choices.delete(choice) : choices.add(choice);
      cloned[index] = {
        questionNumber: target.questionNumber,
        answer: Array.from(choices).sort((a, b) => a - b),
        questionType: target.questionType,
        comment: target.comment || '',
      };
      return cloned;
    });
  };

  const toggleQuestionType = (index: number) => {
    setAnswerInputs((prev) => {
      const cloned = cloneAnswers(prev);
      const target = cloned[index];
      cloned[index] = {
        questionNumber: target.questionNumber,
        answer: [],
        questionType: target.questionType === 'multiple-choice' ? 'essay' : 'multiple-choice',
        comment: target.comment || '',
      };
      return cloned;
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      appTitle: newAppTitle.trim() || "권예진T 오답체크",
      highScoreMessage: newHighScoreMessage.trim() || "완벽한 정답률! 정말 대단해요 👍",
      lowScoreMessage: newLowScoreMessage.trim() || "문제가 쉽지 않았죠? 조금만 더 힘내봅시다!",
      perfectScoreMessage: newPerfectScoreMessage.trim() || "모든 문제를 다 맞았습니다 :)",
    });
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const newSubmissions = allSubmissions?.filter((submission) => {
    const submittedTime = new Date(submission.submittedAt).getTime();
    return submittedTime > lastCheckedTime;
  }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) || [];

  const handleNotificationClick = () => {
    setIsNotificationOpen(true);
  };

  const handleMarkAsRead = () => {
    const now = Date.now();
    setLastCheckedTime(now);
    localStorage.setItem('lastNotificationCheck', now.toString());
    setIsNotificationOpen(false);
  };

  const groupedAssignments = assignments?.reduce((acc, assignment) => {
    const folderId = assignment.folderId || "uncategorized";
    if (!acc[folderId]) {
      acc[folderId] = [];
    }
    acc[folderId].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">선생님 대시보드</h1>
              <p className="text-sm text-muted-foreground">문제 및 정답 관리</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative"
                  onClick={handleNotificationClick}
                  data-testid="button-notifications"
                >
                  <Bell className="w-4 h-4" />
                  {newSubmissions.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold" data-testid="badge-notification-count">
                      {newSubmissions.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">새로운 제출</h3>
                    {newSubmissions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAsRead}
                        data-testid="button-mark-read"
                      >
                        모두 읽음
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-64">
                    {newSubmissions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        새로운 제출이 없습니다
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {newSubmissions.map((submission) => {
                          const assignment = assignments?.find((a) => a.id === submission.assignmentId);
                          const className = classes?.find((c) => c.id === submission.classId)?.name;
                          return (
                            <div
                              key={submission.id}
                              className="p-3 border rounded-md space-y-1 hover-elevate"
                              data-testid={`notification-${submission.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{submission.studentName}</p>
                                <Badge variant={submission.score === submission.totalQuestions ? "default" : "secondary"}>
                                  {submission.score}/{submission.totalQuestions}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {assignment?.title} · {className}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(submission.submittedAt)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="classes" data-testid="tab-classes">반 관리</TabsTrigger>
            <TabsTrigger value="folders" data-testid="tab-folders">폴더 관리</TabsTrigger>
            <TabsTrigger value="assignments" data-testid="tab-assignments">문제 관리</TabsTrigger>
            <TabsTrigger value="answer-keys" data-testid="tab-answer-keys">답안 키</TabsTrigger>
            <TabsTrigger value="results" data-testid="tab-results">학생 결과</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">설정</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>새 반 만들기</CardTitle>
                <CardDescription>새로운 반을 생성합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateClass} className="flex gap-3">
                  <Input
                    placeholder="반 이름 (예: 1반, 2반...)"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    data-testid="input-class-name"
                  />
                  <Button
                    type="submit"
                    disabled={!newClassName.trim() || createClassMutation.isPending}
                    data-testid="button-create-class"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    생성
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>반 목록</CardTitle>
                <CardDescription>생성된 모든 반</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingClasses ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : classes && classes.length > 0 ? (
                  (() => {
                    const activeClasses = classes.filter((c) => !c.completed);
                    const completedClasses = classes.filter((c) => c.completed);
                    
                    return (
                      <div className="space-y-6">
                        {activeClasses.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">진행 중인 반</Label>
                            <div className="grid gap-3">
                              {activeClasses.map((cls) => (
                                <div
                                  key={cls.id}
                                  className="flex items-center justify-between p-4 border rounded-md"
                                  data-testid={`class-${cls.id}`}
                                >
                                  {editingClassId === cls.id ? (
                                    <div className="flex items-center gap-3 flex-1">
                                      <Users className="w-5 h-5 text-muted-foreground" />
                                      <Input
                                        value={editingClassName}
                                        onChange={(e) => setEditingClassName(e.target.value)}
                                        data-testid={`input-edit-class-${cls.id}`}
                                      />
                                      <Button onClick={handleSaveClass} size="sm" data-testid={`button-save-class-${cls.id}`}>
                                        저장
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingClassId(null);
                                          setEditingClassName("");
                                        }}
                                        size="sm"
                                        data-testid={`button-cancel-edit-class-${cls.id}`}
                                      >
                                        취소
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-3 flex-1">
                                        <Users className="w-5 h-5 text-muted-foreground" />
                                        <span className="font-medium">{cls.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                          <Label htmlFor={`class-completed-${cls.id}`} className="text-sm">
                                            종강
                                          </Label>
                                          <Switch
                                            id={`class-completed-${cls.id}`}
                                            checked={cls.completed}
                                            onCheckedChange={() => handleToggleClassCompleted(cls.id, cls.completed)}
                                            data-testid={`switch-class-completed-${cls.id}`}
                                          />
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditClass(cls)}
                                          data-testid={`button-edit-class-${cls.id}`}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setDeleteDialog({ type: 'class', id: cls.id, name: cls.name })}
                                          data-testid={`button-delete-class-${cls.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {completedClasses.length > 0 && (
                          <Collapsible open={isCompletedClassesOpen} onOpenChange={setIsCompletedClassesOpen}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-between"
                                data-testid="button-toggle-completed-classes"
                              >
                                <span className="font-semibold">종강</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isCompletedClassesOpen ? "rotate-180" : ""}`} />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 mt-2">
                              {completedClasses.map((cls) => (
                                <div
                                  key={cls.id}
                                  className="flex items-center justify-between p-4 border rounded-md opacity-60"
                                  data-testid={`class-${cls.id}`}
                                >
                                  {editingClassId === cls.id ? (
                                    <div className="flex items-center gap-3 flex-1">
                                      <Users className="w-5 h-5 text-muted-foreground" />
                                      <Input
                                        value={editingClassName}
                                        onChange={(e) => setEditingClassName(e.target.value)}
                                        data-testid={`input-edit-class-${cls.id}`}
                                      />
                                      <Button onClick={handleSaveClass} size="sm" data-testid={`button-save-class-${cls.id}`}>
                                        저장
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingClassId(null);
                                          setEditingClassName("");
                                        }}
                                        size="sm"
                                        data-testid={`button-cancel-edit-class-${cls.id}`}
                                      >
                                        취소
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-3 flex-1">
                                        <Users className="w-5 h-5 text-muted-foreground" />
                                        <span className="font-medium">{cls.name}</span>
                                        <Badge variant="secondary">종강</Badge>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                          <Label htmlFor={`class-completed-${cls.id}`} className="text-sm">
                                            종강
                                          </Label>
                                          <Switch
                                            id={`class-completed-${cls.id}`}
                                            checked={cls.completed}
                                            onCheckedChange={() => handleToggleClassCompleted(cls.id, cls.completed)}
                                            data-testid={`switch-class-completed-${cls.id}`}
                                          />
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditClass(cls)}
                                          data-testid={`button-edit-class-${cls.id}`}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setDeleteDialog({ type: 'class', id: cls.id, name: cls.name })}
                                          data-testid={`button-delete-class-${cls.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    아직 생성된 반이 없습니다
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="folders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>새 폴더 만들기</CardTitle>
                <CardDescription>문제를 그룹화할 폴더를 생성합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateFolder} className="flex gap-3">
                  <Input
                    placeholder="폴더 이름"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    data-testid="input-folder-name"
                  />
                  <Button
                    type="submit"
                    disabled={!newFolderName.trim() || createFolderMutation.isPending}
                    data-testid="button-create-folder"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    생성
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>폴더 목록</CardTitle>
                <CardDescription>생성된 모든 폴더</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFolders ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : folders && folders.length > 0 ? (
                  (() => {
                    const activeFolders = folders.filter((f) => !f.completed);
                    const completedFolders = folders.filter((f) => f.completed);
                    
                    return (
                      <div className="space-y-6">
                        {activeFolders.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">진행 중인 폴더</Label>
                            <div className="grid gap-3">
                              {activeFolders.map((folder, index) => (
                                <div
                                  key={folder.id}
                                  className="flex items-center justify-between p-4 border rounded-md"
                                  data-testid={`folder-${folder.id}`}
                                >
                                  {editingFolderId === folder.id ? (
                                    <div className="flex items-center gap-3 flex-1">
                                      <FolderIcon className="w-5 h-5 text-muted-foreground" />
                                      <Input
                                        value={editingFolderName}
                                        onChange={(e) => setEditingFolderName(e.target.value)}
                                        data-testid={`input-edit-folder-${folder.id}`}
                                      />
                                      <Button onClick={handleSaveFolder} size="sm" data-testid={`button-save-folder-${folder.id}`}>
                                        저장
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setEditingFolderId(null);
                                          setEditingFolderName("");
                                        }}
                                        size="sm"
                                        data-testid={`button-cancel-folder-${folder.id}`}
                                      >
                                        취소
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-3">
                                        <div className="flex flex-col gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleMoveFolderUp(folder.id)}
                                            disabled={index === 0 || reorderFoldersMutation.isPending}
                                            className="h-6 w-6"
                                            data-testid={`button-folder-up-${folder.id}`}
                                          >
                                            <ChevronUp className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleMoveFolderDown(folder.id)}
                                            disabled={index === activeFolders.length - 1 || reorderFoldersMutation.isPending}
                                            className="h-6 w-6"
                                            data-testid={`button-folder-down-${folder.id}`}
                                          >
                                            <ChevronDown className="w-4 h-4" />
                                          </Button>
                                        </div>
                                        <FolderIcon className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                          <p className="font-medium">{folder.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            문제 {groupedAssignments?.[folder.id]?.length || 0}개
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={folder.completed}
                                          onCheckedChange={() => handleToggleFolderCompleted(folder.id, folder.completed)}
                                          data-testid={`switch-folder-completed-${folder.id}`}
                                        />
                                        <Label className="text-sm">종강</Label>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditFolder(folder)}
                                          data-testid={`button-edit-folder-${folder.id}`}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setDeleteDialog({ type: 'folder', id: folder.id, name: folder.name })}
                                          data-testid={`button-delete-folder-${folder.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {completedFolders.length > 0 && (
                          <Collapsible open={isCompletedFoldersOpen} onOpenChange={setIsCompletedFoldersOpen}>
                            <div className="space-y-3">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-between"
                                  data-testid="button-toggle-completed-folders"
                                >
                                  <Label className="text-sm font-semibold text-muted-foreground cursor-pointer">종강</Label>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${isCompletedFoldersOpen ? "rotate-180" : ""}`} />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-3">
                                {completedFolders.map((folder) => (
                                  <div
                                    key={folder.id}
                                    className="flex items-center justify-between p-4 border rounded-md opacity-60"
                                    data-testid={`folder-${folder.id}`}
                                  >
                                    {editingFolderId === folder.id ? (
                                      <div className="flex items-center gap-3 flex-1">
                                        <FolderIcon className="w-5 h-5 text-muted-foreground" />
                                        <Input
                                          value={editingFolderName}
                                          onChange={(e) => setEditingFolderName(e.target.value)}
                                          data-testid={`input-edit-folder-${folder.id}`}
                                        />
                                        <Button onClick={handleSaveFolder} size="sm" data-testid={`button-save-folder-${folder.id}`}>
                                          저장
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setEditingFolderId(null);
                                            setEditingFolderName("");
                                          }}
                                          size="sm"
                                          data-testid={`button-cancel-folder-${folder.id}`}
                                        >
                                          취소
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-3">
                                          <FolderIcon className="w-5 h-5 text-muted-foreground" />
                                          <div>
                                            <p className="font-medium">{folder.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                              문제 {groupedAssignments?.[folder.id]?.length || 0}개
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Switch
                                            checked={folder.completed}
                                            onCheckedChange={() => handleToggleFolderCompleted(folder.id, folder.completed)}
                                            data-testid={`switch-folder-completed-${folder.id}`}
                                          />
                                          <Label className="text-sm">종강</Label>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditFolder(folder)}
                                            data-testid={`button-edit-folder-${folder.id}`}
                                          >
                                            <Edit2 className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteDialog({ type: 'folder', id: folder.id, name: folder.name })}
                                            data-testid={`button-delete-folder-${folder.id}`}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    아직 생성된 폴더가 없습니다
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>새 문제 만들기</CardTitle>
                <CardDescription>새로운 숙제 문제를 생성합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAssignment} className="space-y-3">
                  <div className="flex gap-3">
                    <Input
                      placeholder="예: 1주차, 2주차, 3주차..."
                      value={newAssignmentTitle}
                      onChange={(e) => setNewAssignmentTitle(e.target.value)}
                      data-testid="input-assignment-title"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="문제 개수"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(e.target.value)}
                      data-testid="input-question-count"
                      className="w-32"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Popover open={isNewClassSelectOpen} onOpenChange={setIsNewClassSelectOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          role="combobox"
                          className="w-full justify-between truncate"
                          data-testid="button-select-classes"
                        >
                          {newAssignmentClassIds.length > 0
                            ? `${classes?.filter(c => newAssignmentClassIds.includes(c.id)).map(c => c.name).join(", ")}`
                            : "반 선택 (필수)"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="반 검색..." />
                          <CommandList>
                            <CommandEmpty>반을 찾을 수 없습니다.</CommandEmpty>
                            {classes?.map((cls) => (
                              <CommandItem
                                key={cls.id}
                                onSelect={() => {
                                  setNewAssignmentClassIds(prev =>
                                    prev.includes(cls.id)
                                      ? prev.filter(id => id !== cls.id)
                                      : [...prev, cls.id]
                                  );
                                }}
                              >
                                <Checkbox
                                  checked={newAssignmentClassIds.includes(cls.id)}
                                  className="mr-2"
                                  data-testid={`checkbox-class-${cls.id}`}
                                />
                                {cls.name}
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Select value={selectedFolderId || "none"} onValueChange={(value) => setSelectedFolderId(value === "none" ? null : value)}>
                      <SelectTrigger data-testid="select-folder">
                        <SelectValue placeholder="폴더 선택 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">폴더 없음</SelectItem>
                        {folders?.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="submit"
                      disabled={!newAssignmentTitle.trim() || newAssignmentClassIds.length === 0 || createAssignmentMutation.isPending}
                      data-testid="button-create-assignment"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      생성
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-answers"
                      checked={showAnswers}
                      onCheckedChange={setShowAnswers}
                      data-testid="switch-show-answers"
                    />
                    <Label htmlFor="show-answers" className="text-sm">
                      틀린 문제의 정답 보여주기
                    </Label>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>문제 목록</CardTitle>
                <CardDescription>폴더별로 그룹화된 문제 (폴더 내에서 순서 변경 가능)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAssignments ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : assignments && assignments.length > 0 ? (
                  (() => {
                    const activeFolders = (folders || []).filter((f) => !f.completed);
                    const allFolders = [
                      ...activeFolders,
                      { id: "uncategorized", name: "미분류", sortOrder: 999999, completed: false }
                    ];
                    
                    const folderMap = new Map((folders || []).map((f) => [f.id, f]));
                    const classMap = new Map((classes || []).map((c) => [c.id, c]));
                    
                    const areAllClassesCompleted = (assignment: AssignmentWithClasses) => {
                      if (assignment.classIds.length === 0) return false;
                      return assignment.classIds.every(classId => {
                        const cls = classMap.get(classId);
                        return cls?.completed || false;
                      });
                    };
                    
                    const completedAssignments = assignments.filter(areAllClassesCompleted);
                    const completedFolderIds = new Set(completedAssignments.map(a => a.folderId).filter(Boolean));
                    const completedFoldersWithUncategorized = [
                      ...(folders || []).filter(f => completedFolderIds.has(f.id) || f.completed),
                      ...(completedAssignments.some(a => !a.folderId) ? [{ id: "uncategorized-completed", name: "미분류", sortOrder: 999999, completed: true }] : [])
                    ];
                    
                    return (
                      <div className="space-y-6">
                        {allFolders.map((folder) => {
                          const folderAssignments = assignments.filter((a) => {
                            if (areAllClassesCompleted(a)) return false;
                            if (folder.id === "uncategorized") {
                              return !a.folderId;
                            }
                            return a.folderId === folder.id;
                          });

                          if (folderAssignments.length === 0) {
                            return null;
                          }

                          return (
                            <div key={folder.id} className="space-y-3">
                              <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md">
                                <FolderIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">
                                  {folder.name}
                                </span>
                                <Badge variant="secondary" className="text-xs ml-auto">
                                  {folderAssignments.length}개
                                </Badge>
                              </div>
                          <div className="grid gap-2">
                            {folderAssignments.map((assignment, index) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between p-4 border rounded-md"
                                data-testid={`assignment-${assignment.id}`}
                              >
                                {editingAssignmentId === assignment.id ? (
                                  <div className="flex flex-col gap-3 flex-1">
                                    <div className="flex items-center gap-3">
                                      <Calendar className="w-5 h-5 text-muted-foreground" />
                                      <Input
                                        value={editingAssignmentTitle}
                                        onChange={(e) => setEditingAssignmentTitle(e.target.value)}
                                        data-testid={`input-edit-assignment-${assignment.id}`}
                                      />
                                      <Button 
                                        onClick={handleSaveAssignment} 
                                        size="sm" 
                                        disabled={!editingAssignmentTitle.trim() || editingAssignmentClassIds.length === 0}
                                        data-testid={`button-save-assignment-${assignment.id}`}
                                      >
                                        저장
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setEditingAssignmentId(null);
                                          setEditingAssignmentTitle("");
                                          setEditingAssignmentClassIds([]);
                                          setEditingAssignmentShowAnswers(true);
                                        }}
                                        size="sm"
                                        data-testid={`button-cancel-assignment-${assignment.id}`}
                                      >
                                        취소
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-2 ml-8">
                                      <Label className="text-sm">반 (필수):</Label>
                                      <Popover open={isEditClassSelectOpen} onOpenChange={setIsEditClassSelectOpen}>
                                        <PopoverTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            role="combobox"
                                            className="w-60 justify-between truncate"
                                            data-testid={`button-edit-select-classes-${assignment.id}`}
                                          >
                                            {editingAssignmentClassIds.length > 0
                                              ? `${classes?.filter(c => editingAssignmentClassIds.includes(c.id)).map(c => c.name).join(", ")}`
                                              : "반 선택 (필수)"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                          <Command>
                                            <CommandInput placeholder="반 검색..." />
                                            <CommandList>
                                              <CommandEmpty>반을 찾을 수 없습니다.</CommandEmpty>
                                              {classes?.map((cls) => (
                                                <CommandItem
                                                  key={cls.id}
                                                  onSelect={() => {
                                                    setEditingAssignmentClassIds(prev =>
                                                      prev.includes(cls.id)
                                                        ? prev.filter(id => id !== cls.id)
                                                        : [...prev, cls.id]
                                                    );
                                                  }}
                                                >
                                                  <Checkbox
                                                    checked={editingAssignmentClassIds.includes(cls.id)}
                                                    className="mr-2"
                                                    data-testid={`checkbox-edit-class-${cls.id}-${assignment.id}`}
                                                  />
                                                  {cls.name}
                                                </CommandItem>
                                              ))}
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    <div className="flex items-center gap-2 ml-8">
                                      <Switch
                                        id={`show-answers-${assignment.id}`}
                                        checked={editingAssignmentShowAnswers}
                                        onCheckedChange={setEditingAssignmentShowAnswers}
                                        data-testid={`toggle-show-answers-${assignment.id}`}
                                      />
                                      <Label htmlFor={`show-answers-${assignment.id}`} className="text-sm">
                                        정답 보여주기 (학생이 틀린 문제의 정답을 볼 수 있습니다)
                                      </Label>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleMoveAssignmentUp(assignment.id, folder.id === "uncategorized" ? null : folder.id)}
                                          disabled={index === 0 || reorderAssignmentsMutation.isPending}
                                          className="h-6 w-6"
                                          data-testid={`button-move-up-${assignment.id}`}
                                        >
                                          <ChevronUp className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleMoveAssignmentDown(assignment.id, folder.id === "uncategorized" ? null : folder.id)}
                                          disabled={index === folderAssignments.length - 1 || reorderAssignmentsMutation.isPending}
                                          className="h-6 w-6"
                                          data-testid={`button-move-down-${assignment.id}`}
                                        >
                                          <ChevronDown className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <Calendar className="w-5 h-5 text-muted-foreground" />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium">{assignment.title}</p>
                                          {assignment.completed && (
                                            <Badge variant="secondary" className="text-xs">
                                              완료됨
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {formatDate(assignment.createdAt)}
                                        </p>
                                      </div>
                                      <Select
                                        value={assignment.folderId || "none"}
                                        onValueChange={(value) => moveAssignmentMutation.mutate({ id: assignment.id, folderId: value === "none" ? null : value })}
                                      >
                                        <SelectTrigger className="w-40" data-testid={`select-move-folder-${assignment.id}`}>
                                          <SelectValue placeholder="폴더 이동" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">미분류</SelectItem>
                                          {folders?.map((f) => (
                                            <SelectItem key={f.id} value={f.id}>
                                              {f.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <Label htmlFor={`toggle-${assignment.id}`} className="text-sm">
                                        완료
                                      </Label>
                                      <Switch
                                        id={`toggle-${assignment.id}`}
                                        checked={assignment.completed}
                                        onCheckedChange={() => handleToggleCompleted(assignment.id, assignment.completed)}
                                        data-testid={`toggle-completed-${assignment.id}`}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditAssignment(assignment)}
                                        data-testid={`button-edit-assignment-${assignment.id}`}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDeleteDialog({ type: 'assignment', id: assignment.id, name: assignment.title, classIds: assignment.classIds })}
                                        data-testid={`button-delete-assignment-${assignment.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    
                    {completedFoldersWithUncategorized.some((folder) => {
                      const folderAssignments = assignments.filter((a) => {
                        if (!areAllClassesCompleted(a)) return false;
                        if (folder.id === "uncategorized-completed") {
                          return !a.folderId;
                        }
                        return a.folderId === folder.id;
                      });
                      return folderAssignments.length > 0;
                    }) && (
                      <Collapsible open={isCompletedAssignmentsOpen} onOpenChange={setIsCompletedAssignmentsOpen}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between"
                            data-testid="button-toggle-completed-assignments"
                          >
                            <span className="font-semibold">종강</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isCompletedAssignmentsOpen ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-6 mt-4">
                          {completedFoldersWithUncategorized.map((folder) => {
                            const folderAssignments = assignments.filter((a) => {
                              if (!areAllClassesCompleted(a)) return false;
                              if (folder.id === "uncategorized-completed") {
                                return !a.folderId;
                              }
                              return a.folderId === folder.id;
                            });

                            if (folderAssignments.length === 0) {
                              return null;
                            }

                            return (
                              <div key={folder.id} className="space-y-3 opacity-60">
                                <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md">
                                  <FolderIcon className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-semibold">
                                    {folder.name}
                                  </span>
                                  <Badge variant="secondary" className="text-xs ml-auto">
                                    {folderAssignments.length}개
                                  </Badge>
                                </div>
                                <div className="grid gap-2">
                                  {folderAssignments.map((assignment, index) => (
                                    <div
                                      key={assignment.id}
                                      className="flex items-center justify-between p-4 border rounded-md"
                                      data-testid={`assignment-${assignment.id}`}
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <Calendar className="w-5 h-5 text-muted-foreground" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium">{assignment.title}</p>
                                            <Badge variant="secondary" className="text-xs">
                                              종강
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                            {classes ? classes.filter((c) => assignment.classIds.includes(c.id)).map((c) => c.name).join(", ") : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditAssignment(assignment)}
                                          data-testid={`button-edit-assignment-${assignment.id}`}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setDeleteDialog({ type: 'assignment', id: assignment.id, name: assignment.title, classIds: assignment.classIds })}
                                          data-testid={`button-delete-assignment-${assignment.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                    );
                  })()
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    아직 생성된 문제가 없습니다
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="answer-keys" className="space-y-6">
            {assignments && assignments.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>문제 선택</CardTitle>
                    <CardDescription>답안 키를 설정할 문제를 선택하세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(() => {
                      const activeAssignments = assignments.filter((a) => !a.completed);
                      const completedAssignments = assignments.filter((a) => a.completed);

                      return (
                        <>
                          {activeAssignments.length > 0 && (
                            <div className="space-y-3">
                              <Label className="text-sm font-semibold">진행 중인 문제</Label>
                              <div className="grid gap-2">
                                {activeAssignments.map((assignment) => (
                                  <Button
                                    key={assignment.id}
                                    variant={selectedAssignmentId === assignment.id ? "default" : "outline"}
                                    className="justify-start h-auto py-3"
                                    onClick={() => setSelectedAssignmentId(assignment.id)}
                                    data-testid={`button-select-assignment-${assignment.id}`}
                                  >
                                    <div className="flex flex-col items-start gap-1">
                                      <span className="font-semibold">{assignment.title}</span>
                                      <span className="text-xs opacity-80">
                                        {classes ? classes.filter((c) => assignment.classIds.includes(c.id)).map((c) => c.name).join(", ") : ""}
                                      </span>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {completedAssignments.length > 0 && (
                            <Collapsible open={isCompletedAssignmentsOpen} onOpenChange={setIsCompletedAssignmentsOpen}>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold text-muted-foreground">완료된 문제</Label>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid="button-toggle-completed-assignments">
                                    {isCompletedAssignmentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent className="mt-3">
                                <div className="grid gap-2">
                                  {completedAssignments.map((assignment) => (
                                    <Button
                                      key={assignment.id}
                                      variant={selectedAssignmentId === assignment.id ? "default" : "outline"}
                                      className="justify-start h-auto py-3"
                                      onClick={() => setSelectedAssignmentId(assignment.id)}
                                      data-testid={`button-select-assignment-${assignment.id}`}
                                    >
                                      <div className="flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">{assignment.title}</span>
                                          <Badge variant="secondary" className="text-xs">완료됨</Badge>
                                        </div>
                                        <span className="text-xs opacity-80">
                                          {classes ? classes.filter((c) => assignment.classIds.includes(c.id)).map((c) => c.name).join(", ") : ""}
                                        </span>
                                      </div>
                                    </Button>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                {selectedAssignmentId && (
                  <Card>
                    <CardHeader>
                      <CardTitle>정답 설정</CardTitle>
                      <CardDescription>
                        {assignments.find((a) => a.id === selectedAssignmentId)?.title} 정답 키
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {answerInputs.map((input, index) => (
                        <div key={index} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">{input.questionNumber}번</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={input.questionType === 'multiple-choice' ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleQuestionType(index)}
                                data-testid={`button-type-${index}`}
                              >
                                {input.questionType === 'multiple-choice' ? '객관식' : '단답형'}
                              </Button>
                              {input.questionType === 'multiple-choice' && input.answer.length > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  선택: {[...(input.answer as number[])].sort((a, b) => a - b).join(", ")}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveQuestion(index)}
                                disabled={answerInputs.length === 1}
                                data-testid={`button-remove-${index}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {input.questionType === 'multiple-choice' ? (
                            <div className="grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map((choice) => {
                                const isSelected = input.answer.includes(choice);
                                return (
                                  <Button
                                    key={choice}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    className="h-12 text-lg font-semibold"
                                    onClick={() => toggleAnswerChoice(index, choice)}
                                    data-testid={`button-answer-${index}-${choice}`}
                                  >
                                    {choice}
                                  </Button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <Input
                                type="text"
                                value={input.answer.length > 0 ? String(input.answer[0]) : ""}
                                onChange={(e) => {
                                  const newAnswers = [...answerInputs];
                                  newAnswers[index] = {
                                    ...newAnswers[index],
                                    answer: [e.target.value as any]
                                  };
                                  setAnswerInputs(newAnswers);
                                }}
                                placeholder="정답을 입력하세요 (예: 1.3, 서울, 대한민국)"
                                className="text-base"
                                data-testid={`input-essay-answer-${index}`}
                              />
                              <Input
                                type="text"
                                value={input.comment || ""}
                                onChange={(e) => {
                                  const newAnswers = [...answerInputs];
                                  newAnswers[index] = {
                                    ...newAnswers[index],
                                    comment: e.target.value
                                  };
                                  setAnswerInputs(newAnswers);
                                }}
                                placeholder="코멘트 (선택사항)"
                                className="text-sm"
                                data-testid={`input-comment-${index}`}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={handleAddQuestion}
                          className="flex-1"
                          data-testid="button-add-question"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          문제 추가
                        </Button>
                        <Button
                          onClick={handleSaveAnswers}
                          disabled={saveAnswersMutation.isPending}
                          className="flex-1"
                          data-testid="button-save-answers"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          저장하기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    먼저 문제를 생성해주세요
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {classes && classes.length > 0 && assignments && assignments.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>반 선택</CardTitle>
                    <CardDescription>결과를 확인할 반을 선택하세요</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedClassId || ""} onValueChange={setSelectedClassId}>
                      <SelectTrigger data-testid="select-class-results">
                        <SelectValue placeholder="반을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedClassId && (() => {
                  const activeSubmissions = submissions
                    ?.filter((s) => {
                      const assignment = assignments.find((a) => a.id === s.assignmentId);
                      return assignment && !assignment.completed;
                    })
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) || [];

                  const completedAssignments = assignments
                    .filter((a) => a.completed && a.classIds.includes(selectedClassId))
                    .sort((a, b) => a.title.localeCompare(b.title));

                  const getSubmissionsForAssignment = (assignmentId: string) => {
                    return submissions
                      ?.filter((s) => s.assignmentId === assignmentId)
                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) || [];
                  };

                  const renderSubmissionRow = (submission: SubmissionWithIncorrect) => {
                    const percentage = Math.round(
                      (submission.score / submission.totalQuestions) * 100
                    );
                    const isHighScore = percentage >= 80;
                    const assignment = assignments.find((a) => a.id === submission.assignmentId);
                    const incorrectText = submission.incorrectQuestions.length > 0
                      ? submission.incorrectQuestions.map((q) => `${q}번`).join(", ")
                      : "-";

                    return (
                      <TableRow
                        key={submission.id}
                        data-testid={`row-submission-${submission.id}`}
                      >
                        <TableCell className="font-medium">
                          {submission.studentName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {assignment?.title || "알 수 없음"}
                        </TableCell>
                        <TableCell>
                          {submission.score} / {submission.totalQuestions}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isHighScore ? "default" : "secondary"}>
                            {percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {incorrectText}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(submission.submittedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSubmissionMutation.mutate(submission.id)}
                            data-testid={`button-delete-submission-${submission.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  };

                  const toggleCompletedAssignment = (assignmentId: string) => {
                    setExpandedCompletedAssignmentIds((prev) =>
                      prev.includes(assignmentId)
                        ? prev.filter((id) => id !== assignmentId)
                        : [...prev, assignmentId]
                    );
                  };

                  return (
                    <>
                      {completedAssignments.length > 0 && (
                        <Collapsible
                          open={isCompletedSubmissionsOpen}
                          onOpenChange={setIsCompletedSubmissionsOpen}
                        >
                          <Card>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle>완료된 문제</CardTitle>
                                  <CardDescription>
                                    {completedAssignments.length}개의 완료된 문제
                                  </CardDescription>
                                </div>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="outline"
                                    data-testid="button-toggle-completed-submissions"
                                  >
                                    {isCompletedSubmissionsOpen ? (
                                      <>
                                        <ChevronUp className="h-4 w-4 mr-2" />
                                        접기
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                        펼치기
                                      </>
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </CardHeader>
                            <CollapsibleContent>
                              <CardContent className="space-y-3">
                                {completedAssignments.map((assignment) => {
                                  const assignmentSubmissions = getSubmissionsForAssignment(assignment.id);
                                  const isExpanded = expandedCompletedAssignmentIds.includes(assignment.id);

                                  return (
                                    <div key={assignment.id} className="border rounded-lg">
                                      <button
                                        onClick={() => toggleCompletedAssignment(assignment.id)}
                                        className="w-full flex items-center justify-between p-3 hover-elevate text-left"
                                        data-testid={`button-toggle-assignment-${assignment.id}`}
                                      >
                                        <div>
                                          <h3 className="font-semibold">{assignment.title}</h3>
                                          <p className="text-sm text-muted-foreground">
                                            {assignmentSubmissions.length}개의 제출
                                          </p>
                                        </div>
                                        {isExpanded ? (
                                          <ChevronUp className="h-4 w-4 flex-shrink-0" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                        )}
                                      </button>

                                      {isExpanded && assignmentSubmissions.length > 0 && (
                                        <div className="border-t">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>학생 이름</TableHead>
                                                <TableHead>문제</TableHead>
                                                <TableHead>점수</TableHead>
                                                <TableHead>비율</TableHead>
                                                <TableHead>틀린 문제</TableHead>
                                                <TableHead>제출 시간</TableHead>
                                                <TableHead>작업</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {assignmentSubmissions.map(renderSubmissionRow)}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      )}

                                      {isExpanded && assignmentSubmissions.length === 0 && (
                                        <div className="border-t p-4 text-center text-muted-foreground">
                                          아직 제출된 답안이 없습니다
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      )}

                      <Card>
                        <CardHeader>
                          <CardTitle>학생 제출 결과</CardTitle>
                          <CardDescription>
                            {classes.find((c) => c.id === selectedClassId)?.name} 제출 현황
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {activeSubmissions.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>학생 이름</TableHead>
                                  <TableHead>문제</TableHead>
                                  <TableHead>점수</TableHead>
                                  <TableHead>비율</TableHead>
                                  <TableHead>틀린 문제</TableHead>
                                  <TableHead>제출 시간</TableHead>
                                  <TableHead>작업</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {activeSubmissions.map(renderSubmissionRow)}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-center text-muted-foreground py-8">
                              아직 제출된 답안이 없습니다
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    먼저 문제를 생성해주세요
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>앱 설정</CardTitle>
                <CardDescription>앱 제목 설정</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="app-title">앱 제목</Label>
                  <Input
                    id="app-title"
                    value={newAppTitle}
                    onChange={(e) => setNewAppTitle(e.target.value)}
                    placeholder="예: 권예진T 오답체크"
                    data-testid="input-app-title"
                  />
                  <p className="text-sm text-muted-foreground">
                    학생들이 보는 앱 제목입니다
                  </p>
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  <Save className="w-4 h-4 mr-2" />
                  설정 저장
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>격려 문구 구간 설정</CardTitle>
                    <CardDescription>정답률에 따른 격려 문구를 자유롭게 추가하고 관리할 수 있습니다</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {encouragementRanges && encouragementRanges.length > 0 ? (
                  <div className="space-y-4">
                    {encouragementRanges.map((range) => (
                      <div key={range.id} className="border rounded-lg p-4 space-y-2">
                        {editingRangeId === range.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`edit-min-${range.id}`}>최소 점수 (이상)</Label>
                                <Input
                                  id={`edit-min-${range.id}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editingRangeMinScore}
                                  onChange={(e) => setEditingRangeMinScore(e.target.value)}
                                  data-testid={`input-edit-min-score-${range.id}`}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`edit-max-${range.id}`}>최대 점수 (미만)</Label>
                                <Input
                                  id={`edit-max-${range.id}`}
                                  type="number"
                                  min="0"
                                  max="101"
                                  value={editingRangeMaxScore}
                                  onChange={(e) => setEditingRangeMaxScore(e.target.value)}
                                  data-testid={`input-edit-max-score-${range.id}`}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`edit-message-${range.id}`}>격려 문구</Label>
                              <Input
                                id={`edit-message-${range.id}`}
                                value={editingRangeMessage}
                                onChange={(e) => setEditingRangeMessage(e.target.value)}
                                placeholder="예: 완벽한 정답률! 정말 대단해요 👍"
                                data-testid={`input-edit-message-${range.id}`}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const minScore = parseInt(editingRangeMinScore);
                                  const maxScore = parseInt(editingRangeMaxScore);
                                  if (isNaN(minScore) || isNaN(maxScore) || !editingRangeMessage.trim()) {
                                    toast({
                                      title: "입력 오류",
                                      description: "모든 필드를 올바르게 입력해주세요.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  updateEncouragementRangeMutation.mutate({
                                    id: range.id,
                                    updates: { minScore, maxScore, message: editingRangeMessage },
                                  });
                                  setEditingRangeId(null);
                                }}
                                data-testid={`button-save-edit-${range.id}`}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                저장
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingRangeId(null)}
                                data-testid={`button-cancel-edit-${range.id}`}
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{range.minScore}% 이상 {range.maxScore}% 미만</Badge>
                                </div>
                                <p className="text-sm">{range.message}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingRangeId(range.id);
                                    setEditingRangeMinScore(range.minScore.toString());
                                    setEditingRangeMaxScore(range.maxScore.toString());
                                    setEditingRangeMessage(range.message);
                                  }}
                                  data-testid={`button-edit-range-${range.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteEncouragementRangeMutation.mutate(range.id)}
                                  data-testid={`button-delete-range-${range.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    아직 격려 문구 구간이 없습니다. 새 구간을 추가해주세요.
                  </p>
                )}

                <div className="border-t pt-6 space-y-3">
                  <h3 className="font-semibold">새 격려 문구 구간 추가</h3>
                  <p className="text-sm text-muted-foreground">
                    예시: 90 이상 101 미만 = 90점부터 100점까지 포함
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-min-score">최소 점수 (이상)</Label>
                      <Input
                        id="new-min-score"
                        type="number"
                        min="0"
                        max="100"
                        value={newRangeMinScore}
                        onChange={(e) => setNewRangeMinScore(e.target.value)}
                        placeholder="0"
                        data-testid="input-new-min-score"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-max-score">최대 점수 (미만)</Label>
                      <Input
                        id="new-max-score"
                        type="number"
                        min="0"
                        max="101"
                        value={newRangeMaxScore}
                        onChange={(e) => setNewRangeMaxScore(e.target.value)}
                        placeholder="101"
                        data-testid="input-new-max-score"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-message">격려 문구</Label>
                    <Input
                      id="new-message"
                      value={newRangeMessage}
                      onChange={(e) => setNewRangeMessage(e.target.value)}
                      placeholder="예: 완벽한 정답률! 정말 대단해요 👍"
                      data-testid="input-new-message"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const minScore = parseInt(newRangeMinScore);
                      const maxScore = parseInt(newRangeMaxScore);
                      if (isNaN(minScore) || isNaN(maxScore) || !newRangeMessage.trim()) {
                        toast({
                          title: "입력 오류",
                          description: "모든 필드를 올바르게 입력해주세요.",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (minScore > maxScore) {
                        toast({
                          title: "입력 오류",
                          description: "최소 점수는 최대 점수보다 작거나 같아야 합니다.",
                          variant: "destructive",
                        });
                        return;
                      }
                      createEncouragementRangeMutation.mutate({ minScore, maxScore, message: newRangeMessage });
                      setNewRangeMinScore("0");
                      setNewRangeMaxScore("101");
                      setNewRangeMessage("");
                    }}
                    data-testid="button-add-range"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    구간 추가
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'class' && `"${deleteDialog.name}" 반을 삭제합니다.`}
              {deleteDialog?.type === 'folder' && `"${deleteDialog.name}" 폴더를 삭제합니다. 폴더 안의 문제는 미분류로 이동됩니다.`}
              {deleteDialog?.type === 'assignment' && `"${deleteDialog.name}" 문제를 삭제합니다.`}
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteDialog) return;
                if (deleteDialog.type === 'class') {
                  deleteClassMutation.mutate(deleteDialog.id);
                } else if (deleteDialog.type === 'folder') {
                  deleteFolderMutation.mutate(deleteDialog.id);
                } else if (deleteDialog.type === 'assignment') {
                  deleteAssignmentMutation.mutate({ id: deleteDialog.id, classIds: deleteDialog.classIds });
                }
                setDeleteDialog(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
