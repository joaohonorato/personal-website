export type UserRole = "ADMIN" | "WRITER" | "READER";

export type User = {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  published: boolean;
  generatedByAgent: boolean;
  readingTimeMin: number;
  createdAt: string;
  updatedAt: string;
};

export type PostSummary = {
  id: number;
  title: string;
  slug: string;
};

export type RepoSummary = {
  id: number;
  name: string;
  url: string;
  language: string | null;
  stars: number;
};

export type Project = {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  repos: RepoSummary[];
  posts: PostSummary[];
};

export type GithubRepo = {
  id: number;
  name: string;
  fullName: string;
  isPrivate: boolean;
};
