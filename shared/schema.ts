import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  completed: boolean("completed").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const folders = pgTable("folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  folderId: varchar("folder_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  showAnswers: boolean("show_answers").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assignmentClasses = pgTable("assignment_classes", {
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.assignmentId, table.classId] }),
}));

export const answerKeys = pgTable("answer_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull(),
  questionNumber: integer("question_number").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  questionType: text("question_type").notNull().default("multiple-choice"),
  comment: text("comment"),
});

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  assignmentId: varchar("assignment_id").notNull(),
  studentName: text("student_name").notNull(),
  answers: text("answers").array().notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  questionNumbers: integer("question_numbers").array(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appTitle: text("app_title").notNull().default("권예진T 오답체크"),
  highScoreMessage: text("high_score_message").notNull().default("완벽한 정답률! 정말 대단해요 👍"),
  lowScoreMessage: text("low_score_message").notNull().default("문제가 쉽지 않았죠? 조금만 더 힘내봅시다!"),
  perfectScoreMessage: text("perfect_score_message").notNull().default("모든 문제를 다 맞았습니다 :)"),
});

export const encouragementRanges = pgTable("encouragement_ranges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  minScore: integer("min_score").notNull(),
  maxScore: integer("max_score").notNull(),
  message: text("message").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  sortOrder: true,
  completed: true,
  createdAt: true,
});

export const updateClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
}).partial();

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
  sortOrder: true,
  completed: true,
  createdAt: true,
});

export const updateFolderSchema = createInsertSchema(folders).omit({
  id: true,
  createdAt: true,
}).partial();

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  sortOrder: true,
  completed: true,
  createdAt: true,
}).extend({
  folderId: z.string().nullable().optional(),
  classIds: z.array(z.string()).min(1, "최소 1개 반을 선택해야 합니다"),
});

export const updateAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
}).extend({
  folderId: z.string().nullable().optional(),
  classIds: z.array(z.string()).optional(),
}).partial();

export const insertAssignmentClassSchema = createInsertSchema(assignmentClasses).omit({
  createdAt: true,
});

export const insertAnswerKeySchema = createInsertSchema(answerKeys).omit({
  id: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export const updateSettingsSchema = insertSettingsSchema.partial();

export const insertEncouragementRangeSchema = createInsertSchema(encouragementRanges).omit({
  id: true,
  displayOrder: true,
  createdAt: true,
}).extend({
  minScore: z.number().int().min(0).max(100),
  maxScore: z.number().int().min(0).max(101),
});

export const updateEncouragementRangeSchema = createInsertSchema(encouragementRanges).omit({
  id: true,
  createdAt: true,
}).extend({
  minScore: z.number().int().min(0).max(100).optional(),
  maxScore: z.number().int().min(0).max(101).optional(),
}).partial();

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type UpdateClass = z.infer<typeof updateClassSchema>;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type UpdateFolder = z.infer<typeof updateFolderSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type AssignmentWithClasses = Assignment & { classIds: string[] };
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type UpdateAssignment = z.infer<typeof updateAssignmentSchema>;
export type AssignmentClass = typeof assignmentClasses.$inferSelect;
export type InsertAssignmentClass = z.infer<typeof insertAssignmentClassSchema>;
export type AnswerKey = typeof answerKeys.$inferSelect;
export type InsertAnswerKey = z.infer<typeof insertAnswerKeySchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type EncouragementRange = typeof encouragementRanges.$inferSelect;
export type InsertEncouragementRange = z.infer<typeof insertEncouragementRangeSchema>;
export type UpdateEncouragementRange = z.infer<typeof updateEncouragementRangeSchema>;
