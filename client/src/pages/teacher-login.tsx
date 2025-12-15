import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TeacherLogin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      return await apiRequest<{ success: boolean; message: string }>(
        "POST",
        "/api/teacher/login",
        { password }
      );
    },
    onSuccess: () => {
      localStorage.setItem("teacherAuth", "true");
      setLocation("/teacher/dashboard");
    },
    onError: () => {
      setError(true);
      setPassword("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    loginMutation.mutate(password);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">선생님 로그인</CardTitle>
          <CardDescription className="text-base">
            학생 답안과 점수를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-semibold">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                required
                className="h-11 text-base"
                data-testid="input-password"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  비밀번호가 올바르지 않습니다.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={!password.trim() || loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "로그인 중..." : "로그인"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => setLocation("/")}
                data-testid="button-back-to-student"
              >
                학생 페이지로 돌아가기
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
