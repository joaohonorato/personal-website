ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS linkedin_post_url TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_published_at TIMESTAMPTZ;
