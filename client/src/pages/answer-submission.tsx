import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AnswerKey, Submission } from "@shared/schema";

export default function AnswerSubmission() {
  const [, setLocation] = useLocation();
  const [studentName, setStudentName] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);

  useEffect(() => {
    const name = localStorage.getItem("studentName");
    const selectedClass = localStorage.getItem("selectedClassId");
    const selectedAssignment = localStorage.getItem("selectedAssignmentId");
    if (!name || !selectedAssignment || !selectedClass) {
      setLocation("/");
      return;
    }
    setStudentName(name);
    setClassId(selectedClass);
    setAssignmentId(selectedAssignment);
  }, [setLocation]);

  const { data: answerKeys, isLoading } = useQuery<AnswerKey[]>({
    queryKey: [`/api/assignments/${assignmentId}/answer-keys`],
    enabled: !!assignmentId,
  });

  useEffect(() => {
    if (answerKeys) {
      setAnswers(new Array(answerKeys.length).fill(""));
    }
  }, [answerKeys]);

  const submitMutation = useMutation({
    mutationFn: async (data: { studentName: string; answers: string[]; assignmentId: string; classId: string }) => {
      const res = await apiRequest("POST", "/api/submissions", data);
      return await res.json() as Submission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}/submissions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/submissions`] });
      localStorage.setItem("lastSubmissionId", data.id);
      setLocation("/results");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answers.every((a) => a.trim().length > 0) && assignmentId && classId) {
      submitMutation.mutate({ studentName, answers, assignmentId, classId });
    }
  };

  const toggleChoice = (questionIndex: number, choice: number) => {
    const newAnswers = [...answers];
    const currentAnswer = newAnswers[questionIndex];
    const currentChoices = currentAnswer ? currentAnswer.split(", ").map(Number).filter(n => !isNaN(n)) : [];
    
    let updatedChoices: number[];
    if (currentChoices.includes(choice)) {
      updatedChoices = currentChoices.filter((c) => c !== choice);
    } else {
      updatedChoices = [...currentChoices, choice];
    }
    
    newAnswers[questionIndex] = updatedChoices.sort((a, b) => a - b).join(", ");
    setAnswers(newAnswers);
  };

  const handleEssayChange = (questionIndex: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = value;
    setAnswers(newAnswers);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!answerKeys || answerKeys.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-base">
            아직 문제가 설정되지 않았습니다. 선생님께 문의하세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const allAnswered = answers.length > 0 && answers.every((a) => a.trim().length > 0);

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-md mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold" data-testid="text-submission-title">답안 제출</CardTitle>
            <CardDescription className="text-base" data-testid="text-student-name">
              {studentName}님, 각 문제의 답을 입력하세요
            </CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {answerKeys.map((key, index) => {
            const isMultipleChoice = key.questionType === 'multiple-choice' || !key.questionType;
            const currentAnswer = answers[index] || "";
            const selectedChoices = isMultipleChoice 
              ? currentAnswer.split(", ").map(Number).filter(n => !isNaN(n))
              : [];

            return (
              <Card key={key.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        {key.questionNumber}번{!isMultipleChoice && " (단답형)"}
                      </Label>
                      {isMultipleChoice && selectedChoices.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          선택: {selectedChoices.join(", ")}
                        </span>
                      )}
                    </div>
                    {key.comment && (
                      <div className="px-3 py-2 rounded-md bg-muted/50 border border-muted">
                        <p className="text-sm text-muted-foreground">
                          💡 {key.comment}
                        </p>
                      </div>
                    )}
                    {isMultipleChoice ? (
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((choice) => {
                          const isSelected = selectedChoices.includes(choice);
                          return (
                            <Button
                              key={choice}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className="h-12 text-lg font-semibold"
                              onClick={() => toggleChoice(index, choice)}
                              data-testid={`button-choice-${key.questionNumber}-${choice}`}
                            >
                              {choice}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <Textarea
                        value={currentAnswer}
                        onChange={(e) => handleEssayChange(index, e.target.value)}
                        placeholder="답변을 작성하세요..."
                        className="min-h-[100px] text-base resize-none"
                        data-testid={`input-essay-${key.questionNumber}`}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {submitMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                제출 중 오류가 발생했습니다. 다시 시도해주세요.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 text-base"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              처음으로
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 text-base font-semibold"
              disabled={!allAnswered || submitMutation.isPending}
              data-testid="button-submit"
            >
              {submitMutation.isPending ? (
                "제출 중..."
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  제출하기
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
