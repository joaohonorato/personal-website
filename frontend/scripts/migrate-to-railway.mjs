import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const SOURCE_URL = process.env.DATABASE_URL;
const DEST_URL = process.env.RAILWAY_DATABASE_URL;

if (!SOURCE_URL || !DEST_URL) {
  console.error('Missing DATABASE_URL or RAILWAY_DATABASE_URL in .env.local');
  process.exit(1);
}

async function migrate() {
  const src = postgres(SOURCE_URL, { ssl: 'require', max: 1 });
  const dest = postgres(DEST_URL, { ssl: 'require', max: 1 });

  try {
    console.log('Reading data from Supabase...');
    const [posts, repos, projects, projectRepos, postProjects] = await Promise.all([
      src`SELECT * FROM posts ORDER BY id`,
      src`SELECT * FROM github_repos ORDER BY id`,
      src`SELECT * FROM projects ORDER BY id`,
      src`SELECT * FROM project_repos`,
      src`SELECT * FROM post_projects`,
    ]);

    console.log(`  posts:         ${posts.length}`);
    console.log(`  github_repos:  ${repos.length}`);
    console.log(`  projects:      ${projects.length}`);
    console.log(`  project_repos: ${projectRepos.length}`);
    console.log(`  post_projects: ${postProjects.length}`);

    // Verify Railway schema is ready
    const tables = await dest`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    console.log('\nRailway tables:', tables.map(t => t.tablename).join(', ') || 'NONE');

    if (tables.length === 0) {
      console.error('No tables found in Railway — wait for Spring Boot to deploy and create the schema first.');
      process.exit(1);
    }

    // Clear and repopulate
    console.log('\nClearing Railway data...');
    await dest`TRUNCATE posts, github_repos, projects, project_repos, post_projects RESTART IDENTITY CASCADE`;

    if (posts.length > 0) {
      await dest`INSERT INTO posts ${dest(posts)}`;
      console.log(`Inserted ${posts.length} posts`);
    }
    if (repos.length > 0) {
      await dest`INSERT INTO github_repos ${dest(repos)}`;
      console.log(`Inserted ${repos.length} github_repos`);
    }
    if (projects.length > 0) {
      await dest`INSERT INTO projects ${dest(projects)}`;
      console.log(`Inserted ${projects.length} projects`);
    }
    if (projectRepos.length > 0) {
      await dest`INSERT INTO project_repos ${dest(projectRepos)}`;
      console.log(`Inserted ${projectRepos.length} project_repos`);
    }
    if (postProjects.length > 0) {
      await dest`INSERT INTO post_projects ${dest(postProjects)}`;
      console.log(`Inserted ${postProjects.length} post_projects`);
    }

    // Reset sequences so new inserts get correct IDs
    for (const table of ['posts', 'github_repos', 'projects']) {
      await dest.unsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`
      );
    }

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await src.end();
    await dest.end();
  }
}

migrate();