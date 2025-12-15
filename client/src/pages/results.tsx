import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Trophy, Home } from "lucide-react";
import type { Submission, AssignmentWithClasses, Settings, EncouragementRange } from "@shared/schema";

export default function Results() {
  const [, setLocation] = useLocation();
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("lastSubmissionId");
    if (!id) {
      setLocation("/");
      return;
    }
    setSubmissionId(id);
  }, [setLocation]);

  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: [`/api/submissions/${submissionId}`],
    enabled: !!submissionId,
  });

  const { data: assignment, isLoading: isLoadingAssignment } = useQuery<AssignmentWithClasses>({
    queryKey: [`/api/assignments/${submission?.assignmentId}`],
    enabled: !!submission?.assignmentId,
  });

  const { data: incorrectAnswers, isLoading: isLoadingIncorrect } = useQuery<
    Array<{ questionNumber: number; studentAnswer: string; correctAnswer: string; comment: string | null }>
  >({
    queryKey: [`/api/submissions/${submissionId}/incorrect`],
    enabled: !!submissionId && !!assignment,
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: encouragementRanges } = useQuery<EncouragementRange[]>({
    queryKey: ["/api/encouragement-ranges"],
  });

  const getEncouragementMessage = (percentage: number): string => {
    if (!encouragementRanges || encouragementRanges.length === 0) {
      return percentage >= 80 
        ? (settings?.highScoreMessage || "완벽한 정답률! 정말 대단해요 👍")
        : (settings?.lowScoreMessage || "문제가 쉽지 않았죠? 조금만 더 힘내봅시다!");
    }

    for (const range of encouragementRanges) {
      if (percentage >= range.minScore && percentage < range.maxScore) {
        return range.message;
      }
    }

    if (percentage >= 80) {
      return settings?.highScoreMessage || "완벽한 정답률! 정말 대단해요 👍";
    }
    return settings?.lowScoreMessage || "문제가 쉽지 않았죠? 조금만 더 힘내봅시다!";
  };

  if (isLoading || isLoadingAssignment || !submission || !assignment) {
    return (
      <div className="min-h-screen bg-background p-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const percentage = Math.round((submission.score / submission.totalQuestions) * 100);
  const isHighScore = percentage >= 80;
  const incorrectCount = submission.totalQuestions - submission.score;

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <Card className={isHighScore ? "border-chart-2" : ""}>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isHighScore ? "bg-chart-2/10" : "bg-primary/10"
                }`}
              >
                <Trophy className={`w-10 h-10 ${isHighScore ? "text-chart-2" : "text-primary"}`} />
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold mb-2" data-testid="text-result-title">
                {submission.studentName}님의 결과
              </CardTitle>
              <CardDescription className="text-lg" data-testid="text-result-message">
                {getEncouragementMessage(percentage)}
              </CardDescription>
            </div>
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary" data-testid="text-score">
                  {submission.score}
                </div>
                <div className="text-sm text-muted-foreground mt-1">정답</div>
              </div>
              <div className="text-3xl text-muted-foreground">/</div>
              <div className="text-center">
                <div className="text-5xl font-bold text-foreground">
                  {submission.totalQuestions}
                </div>
                <div className="text-sm text-muted-foreground mt-1">문제</div>
              </div>
            </div>
            <div className="pt-2">
              <Badge
                variant={isHighScore ? "default" : "secondary"}
                className="text-lg px-4 py-2"
                data-testid="badge-percentage"
              >
                {percentage}%
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {isLoadingIncorrect ? (
          <Skeleton className="h-32 w-full" />
        ) : incorrectAnswers && incorrectAnswers.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                틀린 문제
              </CardTitle>
              <CardDescription>
                {assignment.showAnswers ? "다시 한번 확인해보세요" : "다음 문제를 틀렸습니다"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {incorrectAnswers.map((item) => (
                <div
                  key={item.questionNumber}
                  className="p-4 rounded-md border border-destructive/20 bg-destructive/5"
                  data-testid={`incorrect-question-${item.questionNumber}`}
                >
                  <div className="font-semibold text-base mb-2">
                    {item.questionNumber}번
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-muted-foreground">내 답:</span>{" "}
                        <span className="font-medium">{item.studentAnswer}</span>
                      </div>
                    </div>
                    {assignment.showAnswers ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-chart-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-muted-foreground">정답:</span>{" "}
                          <span className="font-medium text-chart-2">{item.correctAnswer}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        오답을 수정해보세요
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : incorrectAnswers && incorrectAnswers.length === 0 ? (
          <Card className="border-chart-2 bg-chart-2/5">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-chart-2 mx-auto mb-3" />
              <p className="text-lg font-semibold">모든 문제를 다 맞았습니다 :)</p>
            </CardContent>
          </Card>
        ) : null}

        <Button
          variant="outline"
          className="w-full h-12 text-base"
          onClick={() => {
            localStorage.removeItem("studentName");
            localStorage.removeItem("lastSubmissionId");
            setLocation("/");
          }}
          data-testid="button-home"
        >
          <Home className="mr-2 h-5 w-5" />
          처음으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
