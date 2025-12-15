import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClassSchema, updateClassSchema, insertFolderSchema, updateFolderSchema, insertAssignmentSchema, updateAssignmentSchema, insertAnswerKeySchema, insertSubmissionSchema, updateSettingsSchema, insertEncouragementRangeSchema, updateEncouragementRangeSchema, type Assignment, type AssignmentWithClasses, type Submission, type AnswerKey } from "@shared/schema";
import { z } from "zod";

function normalizeAnswer(ans: string | undefined | null): string {
  if (!ans) return "";
  const lowercased = ans.trim().toLowerCase();
  return lowercased.split(',').map(s => s.trim()).sort().join(',');
}

function normalizeShortAnswer(ans: string | undefined | null): string {
  if (!ans) return "";
  return ans.trim().toLowerCase();
}

async function addClassIdsToAssignment(assignment: Assignment): Promise<AssignmentWithClasses> {
  const classIds = await storage.getClassIdsForAssignment(assignment.id);
  return { ...assignment, classIds };
}

async function addClassIdsToAssignments(assignments: Assignment[]): Promise<AssignmentWithClasses[]> {
  return Promise.all(assignments.map(addClassIdsToAssignment));
}

type SubmissionWithIncorrect = Submission & { incorrectQuestions: number[] };

async function addIncorrectQuestionsToSubmission(submission: Submission): Promise<SubmissionWithIncorrect> {
  try {
    const answerKeys = await storage.getAnswerKeysByAssignmentId(submission.assignmentId);
    const incorrectQuestions: number[] = [];
    
    if (submission.questionNumbers) {
      const currentQuestionNumbers = answerKeys.map(k => k.questionNumber);
      const arraysEqual = (a: number[], b: number[]) => 
        a.length === b.length && a.every((val, idx) => val === b[idx]);
      
      if (!arraysEqual(submission.questionNumbers, currentQuestionNumbers)) {
        return { ...submission, incorrectQuestions: [] };
      }
    }
    
    answerKeys.forEach((key: AnswerKey, index: number) => {
      const isEssayType = key.questionType === 'essay';
      const normalizer = isEssayType ? normalizeShortAnswer : normalizeAnswer;
      
      const studentAnswer = normalizer(submission.answers[index]);
      const correctAnswer = normalizer(key.correctAnswer);
      
      if (studentAnswer !== correctAnswer) {
        incorrectQuestions.push(key.questionNumber);
      }
    });
    
    return { ...submission, incorrectQuestions: incorrectQuestions.sort((a, b) => a - b) };
  } catch (error) {
    return { ...submission, incorrectQuestions: [] };
  }
}

async function addIncorrectQuestionsToSubmissions(submissions: Submission[]): Promise<SubmissionWithIncorrect[]> {
  return Promise.all(submissions.map(addIncorrectQuestionsToSubmission));
}

async function regradeSubmissionsForAssignment(assignmentId: string): Promise<void> {
  try {
    const submissions = await storage.getSubmissionsByAssignmentId(assignmentId);
    const answerKeys = await storage.getAnswerKeysByAssignmentId(assignmentId);
    
    if (answerKeys.length === 0) {
      return;
    }
    
    const totalQuestions = answerKeys.length;
    const currentQuestionNumbers = answerKeys.map(k => k.questionNumber);
    let regradeCount = 0;
    
    for (const submission of submissions) {
      if (submission.questionNumbers) {
        const arraysEqual = (a: number[], b: number[]) => 
          a.length === b.length && a.every((val, idx) => val === b[idx]);
        
        if (!arraysEqual(submission.questionNumbers, currentQuestionNumbers)) {
          continue;
        }
      } else {
        if (submission.answers.length !== totalQuestions) {
          continue;
        }
      }
      
      let score = 0;
      answerKeys.forEach((key: AnswerKey, index: number) => {
        const isEssayType = key.questionType === 'essay';
        const normalizer = isEssayType ? normalizeShortAnswer : normalizeAnswer;
        
        const normalizedStudent = normalizer(submission.answers[index]);
        const normalizedCorrect = normalizer(key.correctAnswer);
        if (normalizedStudent === normalizedCorrect) {
          score++;
        }
      });
      
      if (score !== submission.score) {
        await storage.updateSubmissionScore(submission.id, score, totalQuestions);
        regradeCount++;
      }
    }
    
    if (regradeCount > 0) {
      console.log(`[Regrade] Updated ${regradeCount} submission(s) for assignment ${assignmentId}`);
    }
  } catch (error) {
    console.error("[Regrade] Error during regrading:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Download backup file
  app.get("/api/download-backup", (req, res) => {
    const path = require("path");
    const fs = require("fs");
    const filePath = path.join(process.cwd(), "homework-check-backup.tar.gz");
    if (fs.existsSync(filePath)) {
      res.download(filePath, "homework-check-backup.tar.gz");
    } else {
      res.status(404).json({ error: "Backup file not found" });
    }
  });

  app.get("/api/classes", async (req, res) => {
    try {
      const classes = await storage.getAllClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  app.get("/api/classes/visible", async (req, res) => {
    try {
      const allClasses = await storage.getAllClasses();
      const visibleClasses = allClasses.filter(c => !c.hidden && !c.completed);
      res.json(visibleClasses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visible classes" });
    }
  });

  app.post("/api/classes", async (req, res) => {
    try {
      const data = insertClassSchema.parse(req.body);
      const cls = await storage.createClass(data);
      res.json(cls);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create class" });
      }
    }
  });

  app.patch("/api/classes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateClassSchema.parse(req.body);
      const updated = await storage.updateClass(id, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Class not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update class" });
      }
    }
  });

  app.delete("/api/classes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteClass(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Class not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete class" });
    }
  });

  app.post("/api/classes/reorder", async (req, res) => {
    try {
      const schema = z.object({
        classIds: z.array(z.string()),
      });
      const { classIds } = schema.parse(req.body);
      const classes = await storage.reorderClasses(classIds);
      res.json(classes);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to reorder classes" });
      }
    }
  });

  app.get("/api/classes/:id/assignments", async (req, res) => {
    try {
      const { id } = req.params;
      const assignments = await storage.getAssignmentsByClassId(id);
      const assignmentsWithClassIds = await addClassIdsToAssignments(assignments);
      res.json(assignmentsWithClassIds);
    } catch (error) {
      console.error("Error fetching assignments for class:", error);
      res.status(500).json({ error: "Failed to fetch assignments for class" });
    }
  });

  app.get("/api/folders", async (req, res) => {
    try {
      const folders = await storage.getAllFolders();
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      const data = insertFolderSchema.parse(req.body);
      const folder = await storage.createFolder(data);
      res.json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create folder" });
      }
    }
  });

  app.patch("/api/folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateFolderSchema.parse(req.body);
      const updated = await storage.updateFolder(id, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Folder not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update folder" });
      }
    }
  });

  app.delete("/api/folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFolder(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Folder not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  app.post("/api/folders/reorder", async (req, res) => {
    try {
      const schema = z.object({
        folderIds: z.array(z.string()),
      });
      const { folderIds } = schema.parse(req.body);
      const folders = await storage.reorderFolders(folderIds);
      res.json(folders);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to reorder folders" });
      }
    }
  });

  app.get("/api/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAllAssignments();
      const assignmentsWithClassIds = await addClassIdsToAssignments(assignments);
      res.json(assignmentsWithClassIds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.post("/api/assignments", async (req, res) => {
    try {
      const schema = insertAssignmentSchema.extend({
        questionCount: z.number().min(1).max(100).optional(),
      });
      const { questionCount, ...assignmentData } = schema.parse(req.body);
      const assignment = await storage.createAssignment(assignmentData);
      
      if (questionCount && questionCount > 0) {
        const emptyAnswerKeys = Array.from({ length: questionCount }, (_, i) => ({
          questionNumber: i + 1,
          correctAnswer: "",
          questionType: "multiple-choice" as const,
        }));
        await storage.setAnswerKeysForAssignment(assignment.id, emptyAnswerKeys);
      }
      
      const assignmentWithClassIds = await addClassIdsToAssignment(assignment);
      res.json(assignmentWithClassIds);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create assignment" });
      }
    }
  });

  app.patch("/api/assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateAssignmentSchema.parse(req.body);
      
      const assignment = await storage.getAssignment(id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      const updated = await storage.updateAssignment(id, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      const updatedWithClassIds = await addClassIdsToAssignment(updated);
      res.json(updatedWithClassIds);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update assignment" });
      }
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAssignment(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  app.post("/api/assignments/reorder", async (req, res) => {
    try {
      const schema = z.object({
        assignmentIds: z.array(z.string()),
      });
      const { assignmentIds } = schema.parse(req.body);
      const assignments = await storage.reorderAssignments(assignmentIds);
      const assignmentsWithClassIds = await addClassIdsToAssignments(assignments);
      res.json(assignmentsWithClassIds);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to reorder assignments" });
      }
    }
  });

  app.get("/api/assignments/:assignmentId/answer-keys", async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const answerKeys = await storage.getAnswerKeysByAssignmentId(assignmentId);
      res.json(answerKeys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch answer keys" });
    }
  });

  app.post("/api/assignments/:assignmentId/answer-keys", async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const assignment = await storage.getAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const schema = z.object({
        answerKeys: z.array(z.object({
          questionNumber: z.number(),
          correctAnswer: z.string(),
          questionType: z.enum(['multiple-choice', 'essay']).optional(),
          comment: z.string().optional(),
        })),
      });
      const { answerKeys } = schema.parse(req.body);
      const saved = await storage.setAnswerKeysForAssignment(assignmentId, answerKeys);
      
      await regradeSubmissionsForAssignment(assignmentId);
      
      res.json(saved);
    } catch (error) {
      console.error("Error saving answer keys:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save answer keys" });
      }
    }
  });

  app.get("/api/assignments/:assignmentId/submissions", async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const submissions = await storage.getSubmissionsByAssignmentId(assignmentId);
      const submissionsWithIncorrect = await addIncorrectQuestionsToSubmissions(submissions);
      res.json(submissionsWithIncorrect);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const assignment = await storage.getAssignment(id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      const assignmentWithClassIds = await addClassIdsToAssignment(assignment);
      res.json(assignmentWithClassIds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignment" });
    }
  });

  app.post("/api/submissions", async (req, res) => {
    try {
      const requestSchema = insertSubmissionSchema.pick({ studentName: true, answers: true, assignmentId: true, classId: true });
      const { studentName, answers, assignmentId, classId } = requestSchema.parse(req.body);

      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const answerKeys = await storage.getAnswerKeysByAssignmentId(assignmentId);
      
      if (answerKeys.length === 0) {
        return res.status(400).json({ error: "No answer keys configured for this assignment" });
      }

      if (answers.length !== answerKeys.length) {
        return res.status(400).json({ error: "Number of answers doesn't match number of questions" });
      }

      let score = 0;
      answerKeys.forEach((key, index) => {
        const isEssayType = key.questionType === 'essay';
        const normalizer = isEssayType ? normalizeShortAnswer : normalizeAnswer;
        
        const normalizedStudent = normalizer(answers[index]);
        const normalizedCorrect = normalizer(key.correctAnswer);
        if (normalizedStudent === normalizedCorrect) {
          score++;
        }
      });

      const questionNumbers = answerKeys.map(key => key.questionNumber);

      const submissionData = {
        classId,
        assignmentId,
        studentName: studentName.trim(),
        answers,
        score,
        totalQuestions: answerKeys.length,
        questionNumbers,
      };

      const submission = await storage.createSubmission(submissionData);
      res.json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid submission data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  app.get("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  app.delete("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubmission(id);
      res.json({ message: "Submission deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete submission" });
    }
  });

  app.get("/api/submissions/:id/incorrect", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const answerKeys = await storage.getAnswerKeysByAssignmentId(submission.assignmentId);
      
      const incorrect = answerKeys
        .map((key, index) => {
          const studentAnswer = submission.answers[index];
          const correctAnswer = key.correctAnswer;
          const isEssayType = key.questionType === 'essay';
          const normalizer = isEssayType ? normalizeShortAnswer : normalizeAnswer;
          const normalizedStudent = normalizer(studentAnswer);
          const normalizedCorrect = normalizer(correctAnswer);
          
          if (normalizedStudent !== normalizedCorrect) {
            return {
              questionNumber: key.questionNumber,
              studentAnswer: studentAnswer || "",
              correctAnswer,
              comment: key.comment || null,
            };
          }
          return null;
        })
        .filter((item): item is { questionNumber: number; studentAnswer: string; correctAnswer: string; comment: string | null } => item !== null);

      res.json(incorrect);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incorrect answers" });
    }
  });

  app.get("/api/submissions", async (req, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/classes/:classId/submissions", async (req, res) => {
    try {
      const { classId } = req.params;
      const submissions = await storage.getSubmissionsByClassId(classId);
      const submissionsWithIncorrect = await addIncorrectQuestionsToSubmissions(submissions);
      res.json(submissionsWithIncorrect);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch class submissions" });
    }
  });

  app.post("/api/teacher/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        password: z.string().min(1, "Password is required"),
      });

      const { password } = loginSchema.parse(req.body);
      const correctPassword = "teacher123";

      if (password === correctPassword) {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ success: false, error: "Invalid password" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const updates = updateSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(updates);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });

  app.get("/api/encouragement-ranges", async (req, res) => {
    try {
      const ranges = await storage.getAllEncouragementRanges();
      res.json(ranges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch encouragement ranges" });
    }
  });

  app.post("/api/encouragement-ranges", async (req, res) => {
    try {
      const insertRange = insertEncouragementRangeSchema.parse(req.body);
      const range = await storage.createEncouragementRange(insertRange);
      res.status(201).json(range);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create encouragement range" });
      }
    }
  });

  app.patch("/api/encouragement-ranges/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateEncouragementRangeSchema.parse(req.body);
      const range = await storage.updateEncouragementRange(id, updates);
      
      if (!range) {
        return res.status(404).json({ error: "Encouragement range not found" });
      }
      
      res.json(range);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update encouragement range" });
      }
    }
  });

  app.delete("/api/encouragement-ranges/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteEncouragementRange(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Encouragement range not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete encouragement range" });
    }
  });

  app.post("/api/encouragement-ranges/reorder", async (req, res) => {
    try {
      const { rangeIds } = z.object({
        rangeIds: z.array(z.string()).min(1, "At least one range ID is required"),
      }).parse(req.body);
      
      const ranges = await storage.reorderEncouragementRanges(rangeIds);
      res.json(ranges);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to reorder encouragement ranges" });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
