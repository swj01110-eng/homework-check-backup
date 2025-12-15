import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import type { AssignmentWithClasses, Settings, Class, Folder } from "@shared/schema";

export default function StudentHome() {
  const [, setLocation] = useLocation();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [name, setName] = useState("");

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes/visible"],
  });

  const { data: folders, isLoading: isLoadingFolders } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const { data: assignments, isLoading: isLoadingAssignments } = useQuery<AssignmentWithClasses[]>({
    queryKey: selectedClass ? [`/api/classes/${selectedClass}/assignments`] : ["/api/assignments"],
    enabled: !!selectedClass,
  });

  useEffect(() => {
    setSelectedAssignment(null);
  }, [selectedClass]);

  const activeClasses = classes?.filter((c) => !c.completed) || [];
  
  const activeFolders = folders?.filter((f) => !f.completed).sort((a, b) => a.sortOrder - b.sortOrder) || [];
  
  const folderMap = new Map(folders?.map((f) => [f.id, f]) || []);
  
  const isAssignmentCompleted = (assignment: AssignmentWithClasses) => {
    if (assignment.completed) return true;
    if (assignment.folderId) {
      const folder = folderMap.get(assignment.folderId);
      return folder?.completed || false;
    }
    return false;
  };
  
  const activeAssignments = assignments?.filter((a) => !isAssignmentCompleted(a)) || [];
  
  const groupedActiveAssignments = activeFolders.map((folder) => ({
    folder,
    assignments: activeAssignments.filter((a) => a.folderId === folder.id).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
  
  const uncategorizedActiveAssignments = activeAssignments.filter((a) => !a.folderId).sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selectedAssignment && selectedClass) {
      localStorage.setItem("studentName", name.trim());
      localStorage.setItem("selectedAssignmentId", selectedAssignment);
      localStorage.setItem("selectedClassId", selectedClass);
      setLocation("/submit");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold" data-testid="text-app-title">
            {settings?.appTitle || "권예진T 오답체크"}
          </CardTitle>
          <CardDescription className="text-base">
            문제를 선택하고 이름을 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="class" className="text-base font-semibold">
                반 선택
              </Label>
              {isLoadingClasses ? (
                <Skeleton className="h-11 w-full" />
              ) : activeClasses.length > 0 ? (
                <Select value={selectedClass || ""} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-11" data-testid="select-class">
                    <SelectValue placeholder="반을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">
                  아직 등록된 반이 없습니다
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="assignment" className="text-base font-semibold">
                문제 선택
              </Label>
              {!selectedClass ? (
                <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">
                  먼저 반을 선택하세요
                </p>
              ) : isLoadingAssignments || isLoadingFolders ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {groupedActiveAssignments.map(({ folder, assignments: folderAssignments }) => (
                    folderAssignments.length > 0 && (
                      <div key={folder.id} className="space-y-2">
                        <Label className="text-sm font-semibold text-muted-foreground">
                          {folder.name}
                        </Label>
                        <div className="space-y-2">
                          {folderAssignments.map((assignment) => (
                            <Button
                              key={assignment.id}
                              variant={selectedAssignment === assignment.id ? "default" : "outline"}
                              className="w-full justify-start h-auto py-3"
                              onClick={() => setSelectedAssignment(assignment.id)}
                              data-testid={`button-select-assignment-${assignment.id}`}
                            >
                              {assignment.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                  
                  {uncategorizedActiveAssignments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">
                        미분류
                      </Label>
                      <div className="space-y-2">
                        {uncategorizedActiveAssignments.map((assignment) => (
                          <Button
                            key={assignment.id}
                            variant={selectedAssignment === assignment.id ? "default" : "outline"}
                            className="w-full justify-start h-auto py-3"
                            onClick={() => setSelectedAssignment(assignment.id)}
                            data-testid={`button-select-assignment-${assignment.id}`}
                          >
                            {assignment.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {activeAssignments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center p-4">
                      이 반에 등록된 문제가 없습니다
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="name" className="text-base font-semibold">
                이름
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 text-base"
                data-testid="input-student-name"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={!name.trim() || !selectedAssignment || !selectedClass}
              data-testid="button-start"
            >
              시작하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
