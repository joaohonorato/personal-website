import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().default([]),
  published: boolean("published").default(false).notNull(),
  generatedByAgent: boolean("generated_by_agent").default(false).notNull(),
  readingTimeMin: integer("reading_time_min").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const githubRepos = pgTable("github_repos", {
  id: serial("id").primaryKey(),
  githubId: integer("github_id").notNull().unique(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  language: text("language"),
  stars: integer("stars").default(0).notNull(),
  topics: text("topics").array().default([]),
  isPrivate: boolean("is_private").default(false).notNull(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectRepos = pgTable(
  "project_repos",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repoId: integer("repo_id")
      .notNull()
      .references(() => githubRepos.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.repoId] }),
  })
);

export const postProjects = pgTable(
  "post_projects",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.projectId] }),
  })
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type GithubRepo = typeof githubRepos.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
