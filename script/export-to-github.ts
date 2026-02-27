import { getUncachableGitHubClient } from '../server/github';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.cache',
  '.local',
  '.config',
  'dist',
  '.replit',
  'replit.nix',
  '.upm',
  'package-lock.json',
  'generated',
  'snippets',
  '.breakpoints',
  'references',
];

function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split('/');
  return parts.some(part => IGNORE_PATTERNS.includes(part));
}

function getAllFiles(dirPath: string, basePath: string = ''): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (shouldIgnore(relativePath)) continue;

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else if (entry.isFile()) {
      try {
        const content = fs.readFileSync(fullPath);
        const base64 = content.toString('base64');
        files.push({ path: relativePath, content: base64 });
      } catch {
        // skip unreadable files
      }
    }
  }
  return files;
}

async function exportToGitHub() {
  const repoName = process.argv[2] || 'scientific-calculator';

  console.log('Getting GitHub client...');
  const octokit = await getUncachableGitHubClient();

  const { data: user } = await octokit.rest.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);

  let repo;
  try {
    const { data } = await octokit.rest.repos.get({ owner: user.login, repo: repoName });
    repo = data;
    console.log(`Repository ${user.login}/${repoName} already exists, will update it.`);
  } catch {
    console.log(`Creating repository: ${repoName}...`);
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: 'Scientific Calculator - A full-featured scientific calculator web application',
      private: false,
      auto_init: true,
    });
    repo = data;
    console.log(`Created repository: ${repo.html_url}`);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Collecting files...');
  const projectDir = path.resolve(__dirname, '..');
  const files = getAllFiles(projectDir);
  console.log(`Found ${files.length} files to push.`);

  let latestCommitSha: string;
  let treeSha: string;
  try {
    const { data: ref } = await octokit.rest.git.getRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
    });
    latestCommitSha = ref.object.sha;
    const { data: commit } = await octokit.rest.git.getCommit({
      owner: user.login,
      repo: repoName,
      commit_sha: latestCommitSha,
    });
    treeSha = commit.tree.sha;
  } catch {
    const { data: ref } = await octokit.rest.git.getRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/master',
    });
    latestCommitSha = ref.object.sha;
    const { data: commit } = await octokit.rest.git.getCommit({
      owner: user.login,
      repo: repoName,
      commit_sha: latestCommitSha,
    });
    treeSha = commit.tree.sha;
  }

  console.log('Creating blobs...');
  const treeItems: any[] = [];
  for (const file of files) {
    const { data: blob } = await octokit.rest.git.createBlob({
      owner: user.login,
      repo: repoName,
      content: file.content,
      encoding: 'base64',
    });
    treeItems.push({
      path: file.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: blob.sha,
    });
  }

  console.log('Creating tree...');
  const { data: tree } = await octokit.rest.git.createTree({
    owner: user.login,
    repo: repoName,
    tree: treeItems,
    base_tree: treeSha,
  });

  console.log('Creating commit...');
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner: user.login,
    repo: repoName,
    message: 'Export Scientific Calculator from Replit',
    tree: tree.sha,
    parents: [latestCommitSha],
  });

  let branch = 'main';
  try {
    await octokit.rest.git.updateRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
      sha: newCommit.sha,
    });
  } catch {
    branch = 'master';
    await octokit.rest.git.updateRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/master',
      sha: newCommit.sha,
    });
  }

  console.log(`\nExport complete!`);
  console.log(`Repository: ${repo.html_url}`);
  console.log(`Branch: ${branch}`);
  console.log(`Commit: ${newCommit.sha.substring(0, 7)}`);
}

exportToGitHub().catch(err => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
