import { type Class, type InsertClass, type UpdateClass, type Folder, type InsertFolder, type UpdateFolder, type Assignment, type InsertAssignment, type UpdateAssignment, type AnswerKey, type InsertAnswerKey, type Submission, type InsertSubmission, type Settings, type UpdateSettings, type EncouragementRange, type InsertEncouragementRange, type UpdateEncouragementRange, classes, folders, assignments, assignmentClasses, answerKeys, submissions, settings, encouragementRanges } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, sql, asc, inArray } from "drizzle-orm";

export interface IStorage {
  createClass(cls: InsertClass): Promise<Class>;
  getAllClasses(): Promise<Class[]>;
  getClass(id: string): Promise<Class | undefined>;
  updateClass(id: string, updates: UpdateClass): Promise<Class | undefined>;
  deleteClass(id: string): Promise<boolean>;
  reorderClasses(classIds: string[]): Promise<Class[]>;
  
  createFolder(folder: InsertFolder): Promise<Folder>;
  getAllFolders(): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;
  updateFolder(id: string, updates: UpdateFolder): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<boolean>;
  reorderFolders(folderIds: string[]): Promise<Folder[]>;
  
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAllAssignments(): Promise<Assignment[]>;
  getAssignmentsByClassId(classId: string): Promise<Assignment[]>;
  getAssignment(id: string): Promise<Assignment | undefined>;
  updateAssignment(id: string, updates: UpdateAssignment): Promise<Assignment | undefined>;
  deleteAssignment(id: string): Promise<boolean>;
  reorderAssignments(assignmentIds: string[]): Promise<Assignment[]>;
  
  setAssignmentClasses(assignmentId: string, classIds: string[]): Promise<void>;
  getClassIdsForAssignment(assignmentId: string): Promise<string[]>;
  
  getAnswerKeysByAssignmentId(assignmentId: string): Promise<AnswerKey[]>;
  setAnswerKeysForAssignment(assignmentId: string, answerKeys: Omit<InsertAnswerKey, 'assignmentId'>[]): Promise<AnswerKey[]>;
  
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissionsByAssignmentId(assignmentId: string): Promise<Submission[]>;
  getSubmissionsByClassId(classId: string): Promise<Submission[]>;
  getAllSubmissions(): Promise<Submission[]>;
  updateSubmissionScore(id: string, score: number, totalQuestions: number): Promise<Submission | undefined>;
  deleteSubmission(id: string): Promise<boolean>;
  
  getSettings(): Promise<Settings>;
  updateSettings(updates: UpdateSettings): Promise<Settings>;
  
  getAllEncouragementRanges(): Promise<EncouragementRange[]>;
  createEncouragementRange(range: InsertEncouragementRange): Promise<EncouragementRange>;
  updateEncouragementRange(id: string, updates: UpdateEncouragementRange): Promise<EncouragementRange | undefined>;
  deleteEncouragementRange(id: string): Promise<boolean>;
  reorderEncouragementRanges(rangeIds: string[]): Promise<EncouragementRange[]>;
}

export class MemStorage implements IStorage {
  private classes: Map<string, Class>;
  private folders: Map<string, Folder>;
  private assignments: Map<string, Assignment>;
  private assignmentClasses: Map<string, Set<string>>;
  private answerKeys: Map<string, AnswerKey>;
  private submissions: Map<string, Submission>;
  private settings: Settings;
  private encouragementRanges: Map<string, EncouragementRange>;

  constructor() {
    this.classes = new Map();
    this.folders = new Map();
    this.assignments = new Map();
    this.assignmentClasses = new Map();
    this.answerKeys = new Map();
    this.submissions = new Map();
    this.settings = {
      id: "global",
      appTitle: "권예진T 오답체크",
      highScoreMessage: "완벽한 정답률! 정말 대단해요 👍",
      lowScoreMessage: "문제가 쉽지 않았죠? 조금만 더 힘내봅시다!",
      perfectScoreMessage: "모든 문제를 다 맞았습니다 :)",
    };
    this.encouragementRanges = new Map();
  }

  async createClass(insertClass: InsertClass): Promise<Class> {
    const id = randomUUID();
    const maxOrder = Math.max(0, ...Array.from(this.classes.values()).map(c => c.sortOrder));
    const cls: Class = {
      id,
      ...insertClass,
      sortOrder: maxOrder + 1,
      completed: false,
      hidden: false,
      createdAt: new Date(),
    };
    this.classes.set(id, cls);
    return cls;
  }

  async getAllClasses(): Promise<Class[]> {
    return Array.from(this.classes.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getClass(id: string): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async updateClass(id: string, updates: UpdateClass): Promise<Class | undefined> {
    const cls = this.classes.get(id);
    if (!cls) {
      return undefined;
    }
    const updated: Class = {
      ...cls,
      ...updates,
    };
    this.classes.set(id, updated);
    return updated;
  }

  async deleteClass(id: string): Promise<boolean> {
    const deleted = this.classes.delete(id);
    if (deleted) {
      this.assignmentClasses.forEach((classIds, assignmentId) => {
        classIds.delete(id);
      });
    }
    return deleted;
  }

  async reorderClasses(classIds: string[]): Promise<Class[]> {
    classIds.forEach((id, index) => {
      const cls = this.classes.get(id);
      if (cls) {
        this.classes.set(id, { ...cls, sortOrder: index });
      }
    });
    return this.getAllClasses();
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const id = randomUUID();
    const maxOrder = Math.max(0, ...Array.from(this.folders.values()).map(f => f.sortOrder));
    const folder: Folder = {
      id,
      ...insertFolder,
      sortOrder: maxOrder + 1,
      completed: false,
      createdAt: new Date(),
    };
    this.folders.set(id, folder);
    return folder;
  }

  async getAllFolders(): Promise<Folder[]> {
    return Array.from(this.folders.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    return this.folders.get(id);
  }

  async updateFolder(id: string, updates: UpdateFolder): Promise<Folder | undefined> {
    const folder = this.folders.get(id);
    if (!folder) {
      return undefined;
    }
    const updated: Folder = {
      ...folder,
      ...updates,
    };
    this.folders.set(id, updated);
    return updated;
  }

  async deleteFolder(id: string): Promise<boolean> {
    const deleted = this.folders.delete(id);
    if (deleted) {
      Array.from(this.assignments.values()).forEach((assignment) => {
        if (assignment.folderId === id) {
          this.assignments.set(assignment.id, { ...assignment, folderId: null });
        }
      });
    }
    return deleted;
  }

  async reorderFolders(folderIds: string[]): Promise<Folder[]> {
    folderIds.forEach((id, index) => {
      const folder = this.folders.get(id);
      if (folder) {
        this.folders.set(id, { ...folder, sortOrder: index });
      }
    });
    return this.getAllFolders();
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const { classIds, ...assignmentData } = insertAssignment;
    const id = randomUUID();
    const maxOrder = Math.max(0, ...Array.from(this.assignments.values()).map(a => a.sortOrder));
    const assignment: Assignment = {
      id,
      title: assignmentData.title,
      folderId: assignmentData.folderId || null,
      sortOrder: maxOrder + 1,
      completed: false,
      showAnswers: assignmentData.showAnswers ?? true,
      createdAt: new Date(),
    };
    this.assignments.set(id, assignment);
    
    if (classIds && classIds.length > 0) {
      await this.setAssignmentClasses(id, classIds);
    }
    
    return assignment;
  }

  async getAllAssignments(): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getAssignmentsByClassId(classId: string): Promise<Assignment[]> {
    const assignmentIds: string[] = [];
    this.assignmentClasses.forEach((classIds, assignmentId) => {
      if (classIds.has(classId)) {
        assignmentIds.push(assignmentId);
      }
    });
    
    return Array.from(this.assignments.values())
      .filter((a) => assignmentIds.includes(a.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getAssignment(id: string): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async updateAssignment(id: string, updates: UpdateAssignment): Promise<Assignment | undefined> {
    const assignment = this.assignments.get(id);
    if (!assignment) {
      return undefined;
    }
    
    const { classIds, ...baseUpdates } = updates;
    const updated: Assignment = {
      ...assignment,
      ...baseUpdates,
    };
    this.assignments.set(id, updated);
    
    if (classIds !== undefined) {
      await this.setAssignmentClasses(id, classIds);
    }
    
    return updated;
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const deleted = this.assignments.delete(id);
    if (deleted) {
      this.assignmentClasses.delete(id);
    }
    return deleted;
  }
  
  async setAssignmentClasses(assignmentId: string, classIds: string[]): Promise<void> {
    this.assignmentClasses.set(assignmentId, new Set(classIds));
  }
  
  async getClassIdsForAssignment(assignmentId: string): Promise<string[]> {
    const classIds = this.assignmentClasses.get(assignmentId);
    return classIds ? Array.from(classIds) : [];
  }

  async reorderAssignments(assignmentIds: string[]): Promise<Assignment[]> {
    assignmentIds.forEach((id, index) => {
      const assignment = this.assignments.get(id);
      if (assignment) {
        this.assignments.set(id, { ...assignment, sortOrder: index });
      }
    });
    return this.getAllAssignments();
  }

  async getAnswerKeysByAssignmentId(assignmentId: string): Promise<AnswerKey[]> {
    return Array.from(this.answerKeys.values())
      .filter((key) => key.assignmentId === assignmentId)
      .sort((a, b) => a.questionNumber - b.questionNumber);
  }

  async setAnswerKeysForAssignment(assignmentId: string, insertKeys: Omit<InsertAnswerKey, 'assignmentId'>[]): Promise<AnswerKey[]> {
    Array.from(this.answerKeys.entries()).forEach(([id, key]) => {
      if (key.assignmentId === assignmentId) {
        this.answerKeys.delete(id);
      }
    });
    
    const keys: AnswerKey[] = insertKeys.map((key) => ({
      ...key,
      id: randomUUID(),
      assignmentId,
      questionType: key.questionType || "multiple-choice",
      comment: key.comment ?? null,
    }));

    keys.forEach((key) => {
      this.answerKeys.set(key.id, key);
    });

    return keys;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const id = randomUUID();
    const submission: Submission = {
      id,
      ...insertSubmission,
      questionNumbers: insertSubmission.questionNumbers ?? null,
      submittedAt: new Date(),
    };
    this.submissions.set(id, submission);
    return submission;
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    return this.submissions.get(id);
  }

  async getSubmissionsByAssignmentId(assignmentId: string): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter((sub) => sub.assignmentId === assignmentId);
  }

  async getSubmissionsByClassId(classId: string): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter((sub) => sub.classId === classId);
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values());
  }

  async updateSubmissionScore(id: string, score: number, totalQuestions: number): Promise<Submission | undefined> {
    const submission = this.submissions.get(id);
    if (!submission) {
      return undefined;
    }
    const updated: Submission = { ...submission, score, totalQuestions };
    this.submissions.set(id, updated);
    return updated;
  }

  async deleteSubmission(id: string): Promise<boolean> {
    return this.submissions.delete(id);
  }

  async getSettings(): Promise<Settings> {
    return this.settings;
  }

  async updateSettings(updates: UpdateSettings): Promise<Settings> {
    this.settings = {
      ...this.settings,
      ...updates,
    };
    return this.settings;
  }

  async getAllEncouragementRanges(): Promise<EncouragementRange[]> {
    return Array.from(this.encouragementRanges.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async createEncouragementRange(insertRange: InsertEncouragementRange): Promise<EncouragementRange> {
    const id = randomUUID();
    const maxOrder = Math.max(0, ...Array.from(this.encouragementRanges.values()).map(r => r.displayOrder));
    const range: EncouragementRange = {
      id,
      ...insertRange,
      displayOrder: maxOrder + 1,
      createdAt: new Date(),
    };
    this.encouragementRanges.set(id, range);
    return range;
  }

  async updateEncouragementRange(id: string, updates: UpdateEncouragementRange): Promise<EncouragementRange | undefined> {
    const range = this.encouragementRanges.get(id);
    if (!range) {
      return undefined;
    }
    const updated: EncouragementRange = {
      ...range,
      ...updates,
    };
    this.encouragementRanges.set(id, updated);
    return updated;
  }

  async deleteEncouragementRange(id: string): Promise<boolean> {
    return this.encouragementRanges.delete(id);
  }

  async reorderEncouragementRanges(rangeIds: string[]): Promise<EncouragementRange[]> {
    rangeIds.forEach((id, index) => {
      const range = this.encouragementRanges.get(id);
      if (range) {
        this.encouragementRanges.set(id, { ...range, displayOrder: index });
      }
    });
    return this.getAllEncouragementRanges();
  }
}

export class DatabaseStorage implements IStorage {
  async createClass(insertClass: InsertClass): Promise<Class> {
    const maxOrder = await db
      .select({ max: sql<number>`COALESCE(MAX(${classes.sortOrder}), 0)` })
      .from(classes);
    
    const [cls] = await db.insert(classes).values({
      ...insertClass,
      sortOrder: (maxOrder[0]?.max ?? 0) + 1,
    }).returning();
    
    return cls;
  }

  async getAllClasses(): Promise<Class[]> {
    return db.select().from(classes).orderBy(asc(classes.sortOrder));
  }

  async getClass(id: string): Promise<Class | undefined> {
    const result = await db.select().from(classes).where(eq(classes.id, id));
    return result[0];
  }

  async updateClass(id: string, updates: UpdateClass): Promise<Class | undefined> {
    const [updated] = await db
      .update(classes)
      .set(updates)
      .where(eq(classes.id, id))
      .returning();
    return updated;
  }

  async deleteClass(id: string): Promise<boolean> {
    const result = await db.delete(classes).where(eq(classes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async reorderClasses(classIds: string[]): Promise<Class[]> {
    await Promise.all(
      classIds.map((id, index) =>
        db.update(classes).set({ sortOrder: index }).where(eq(classes.id, id))
      )
    );
    return this.getAllClasses();
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const maxOrder = await db
      .select({ max: sql<number>`COALESCE(MAX(${folders.sortOrder}), 0)` })
      .from(folders);
    
    const [folder] = await db.insert(folders).values({
      ...insertFolder,
      sortOrder: (maxOrder[0]?.max ?? 0) + 1,
    }).returning();
    
    return folder;
  }

  async getAllFolders(): Promise<Folder[]> {
    return db.select().from(folders).orderBy(asc(folders.sortOrder));
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const result = await db.select().from(folders).where(eq(folders.id, id));
    return result[0];
  }

  async updateFolder(id: string, updates: UpdateFolder): Promise<Folder | undefined> {
    const [updated] = await db
      .update(folders)
      .set(updates)
      .where(eq(folders.id, id))
      .returning();
    return updated;
  }

  async deleteFolder(id: string): Promise<boolean> {
    await db
      .update(assignments)
      .set({ folderId: null })
      .where(eq(assignments.folderId, id));
    
    const result = await db.delete(folders).where(eq(folders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async reorderFolders(folderIds: string[]): Promise<Folder[]> {
    await Promise.all(
      folderIds.map((id, index) =>
        db.update(folders).set({ sortOrder: index }).where(eq(folders.id, id))
      )
    );
    return this.getAllFolders();
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const { classIds, ...assignmentData } = insertAssignment;
    
    const maxOrder = await db
      .select({ max: sql<number>`COALESCE(MAX(${assignments.sortOrder}), 0)` })
      .from(assignments);
    
    const [assignment] = await db.insert(assignments).values({
      title: assignmentData.title,
      folderId: assignmentData.folderId || null,
      showAnswers: assignmentData.showAnswers ?? true,
      sortOrder: (maxOrder[0]?.max ?? 0) + 1,
    }).returning();
    
    if (classIds && classIds.length > 0) {
      await this.setAssignmentClasses(assignment.id, classIds);
    }
    
    return assignment;
  }

  async getAllAssignments(): Promise<Assignment[]> {
    return db.select().from(assignments).orderBy(asc(assignments.sortOrder));
  }

  async getAssignmentsByClassId(classId: string): Promise<Assignment[]> {
    const results = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        folderId: assignments.folderId,
        sortOrder: assignments.sortOrder,
        completed: assignments.completed,
        showAnswers: assignments.showAnswers,
        createdAt: assignments.createdAt,
      })
      .from(assignments)
      .innerJoin(assignmentClasses, eq(assignmentClasses.assignmentId, assignments.id))
      .where(eq(assignmentClasses.classId, classId))
      .orderBy(asc(assignments.sortOrder));
    
    return results;
  }

  async getAssignment(id: string): Promise<Assignment | undefined> {
    const result = await db.select().from(assignments).where(eq(assignments.id, id));
    return result[0];
  }

  async updateAssignment(id: string, updates: UpdateAssignment): Promise<Assignment | undefined> {
    const { classIds, ...baseUpdates } = updates;
    
    const [updated] = await db
      .update(assignments)
      .set(baseUpdates)
      .where(eq(assignments.id, id))
      .returning();
    
    if (classIds !== undefined) {
      await this.setAssignmentClasses(id, classIds);
    }
    
    return updated;
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const result = await db.delete(assignments).where(eq(assignments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async reorderAssignments(assignmentIds: string[]): Promise<Assignment[]> {
    await Promise.all(
      assignmentIds.map((id, index) =>
        db.update(assignments).set({ sortOrder: index }).where(eq(assignments.id, id))
      )
    );
    return this.getAllAssignments();
  }

  async getAnswerKeysByAssignmentId(assignmentId: string): Promise<AnswerKey[]> {
    return db
      .select()
      .from(answerKeys)
      .where(eq(answerKeys.assignmentId, assignmentId))
      .orderBy(asc(answerKeys.questionNumber));
  }

  async setAnswerKeysForAssignment(
    assignmentId: string,
    insertKeys: Omit<InsertAnswerKey, 'assignmentId'>[]
  ): Promise<AnswerKey[]> {
    await db.delete(answerKeys).where(eq(answerKeys.assignmentId, assignmentId));
    
    if (insertKeys.length === 0) {
      return [];
    }
    
    const keys = await db
      .insert(answerKeys)
      .values(insertKeys.map((key) => ({ ...key, assignmentId })))
      .returning();
    
    return keys;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const [submission] = await db
      .insert(submissions)
      .values({
        ...insertSubmission,
        questionNumbers: insertSubmission.questionNumbers ?? null,
      })
      .returning();
    
    return submission;
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const result = await db.select().from(submissions).where(eq(submissions.id, id));
    return result[0];
  }

  async getSubmissionsByAssignmentId(assignmentId: string): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .where(eq(submissions.assignmentId, assignmentId));
  }

  async getSubmissionsByClassId(classId: string): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .where(eq(submissions.classId, classId))
      .orderBy(asc(submissions.submittedAt));
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return db.select().from(submissions);
  }

  async updateSubmissionScore(id: string, score: number, totalQuestions: number): Promise<Submission | undefined> {
    const [updated] = await db
      .update(submissions)
      .set({ score, totalQuestions })
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }

  async deleteSubmission(id: string): Promise<boolean> {
    const result = await db.delete(submissions).where(eq(submissions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getSettings(): Promise<Settings> {
    const result = await db.select().from(settings);
    
    if (result.length === 0) {
      const [newSettings] = await db
        .insert(settings)
        .values({ appTitle: "권예진T 오답체크" })
        .returning();
      return newSettings;
    }
    
    return result[0];
  }

  async updateSettings(updates: UpdateSettings): Promise<Settings> {
    const current = await this.getSettings();
    
    const [updated] = await db
      .update(settings)
      .set(updates)
      .where(eq(settings.id, current.id))
      .returning();
    
    return updated;
  }
  
  async setAssignmentClasses(assignmentId: string, classIds: string[]): Promise<void> {
    await db.delete(assignmentClasses).where(eq(assignmentClasses.assignmentId, assignmentId));
    
    if (classIds.length > 0) {
      await db.insert(assignmentClasses).values(
        classIds.map((classId) => ({
          assignmentId,
          classId,
        }))
      );
    }
  }
  
  async getClassIdsForAssignment(assignmentId: string): Promise<string[]> {
    const results = await db
      .select({ classId: assignmentClasses.classId })
      .from(assignmentClasses)
      .where(eq(assignmentClasses.assignmentId, assignmentId));
    
    return results.map((r) => r.classId);
  }

  async getAllEncouragementRanges(): Promise<EncouragementRange[]> {
    return db
      .select()
      .from(encouragementRanges)
      .orderBy(asc(encouragementRanges.displayOrder));
  }

  async createEncouragementRange(insertRange: InsertEncouragementRange): Promise<EncouragementRange> {
    const maxOrder = await db
      .select({ max: sql<number>`COALESCE(MAX(${encouragementRanges.displayOrder}), -1)` })
      .from(encouragementRanges);

    const [range] = await db
      .insert(encouragementRanges)
      .values({
        ...insertRange,
        displayOrder: (maxOrder[0].max ?? -1) + 1,
      })
      .returning();

    return range;
  }

  async updateEncouragementRange(id: string, updates: UpdateEncouragementRange): Promise<EncouragementRange | undefined> {
    const [updated] = await db
      .update(encouragementRanges)
      .set(updates)
      .where(eq(encouragementRanges.id, id))
      .returning();
    
    return updated;
  }

  async deleteEncouragementRange(id: string): Promise<boolean> {
    const result = await db.delete(encouragementRanges).where(eq(encouragementRanges.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async reorderEncouragementRanges(rangeIds: string[]): Promise<EncouragementRange[]> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < rangeIds.length; i++) {
        await tx
          .update(encouragementRanges)
          .set({ displayOrder: i })
          .where(eq(encouragementRanges.id, rangeIds[i]));
      }
    });

    return this.getAllEncouragementRanges();
  }
}

export const storage = new DatabaseStorage();
