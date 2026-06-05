import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const repositoriesTable = pgTable("repositories", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  description: text("description"),
  status: text("status").notNull().default("queued"),
  analysisProgress: integer("analysis_progress").default(0),
  currentModule: text("current_module"),
  primaryLanguage: text("primary_language"),
  stars: integer("stars"),
  totalFiles: integer("total_files"),
  totalLines: integer("total_lines"),
  defaultBranch: text("default_branch"),
  topics: text("topics").array(),
  forks: integer("forks"),
  license: text("license"),
  repoSize: integer("repo_size"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const analysisResultsTable = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(),
  module: text("module").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRepositorySchema = createInsertSchema(repositoriesTable).omit({ id: true, createdAt: true });
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositoriesTable.$inferSelect;

export const insertAnalysisResultSchema = createInsertSchema(analysisResultsTable).omit({ id: true, createdAt: true });
export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;
export type AnalysisResult = typeof analysisResultsTable.$inferSelect;
