CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    published BOOLEAN NOT NULL DEFAULT false,
    generated_by_agent BOOLEAN NOT NULL DEFAULT false,
    reading_time_min INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS github_repos (
    id SERIAL PRIMARY KEY,
    github_id BIGINT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    language TEXT,
    stars INT NOT NULL DEFAULT 0,
    topics TEXT[] DEFAULT '{}',
    is_private BOOLEAN NOT NULL DEFAULT false,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_repos (
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repo_id INT NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, repo_id)
);

CREATE TABLE IF NOT EXISTS post_projects (
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, project_id)
);