import { Octokit } from '@octokit/rest'
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function getAllFiles(dir: string, baseDir: string = dir): Promise<{path: string, content: string}[]> {
  const files: {path: string, content: string}[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.endsWith('.tar.gz') || entry.name.endsWith('.log')) {
      continue;
    }
    
    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files.push({ path: relativePath, content });
      } catch (e) {
        console.log(`Skipping binary file: ${relativePath}`);
      }
    }
  }
  
  return files;
}

export async function uploadToGitHub(repoName: string): Promise<string> {
  const octokit = await getUncachableGitHubClient();
  
  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  
  let repoExists = false;
  try {
    await octokit.repos.get({ owner, repo: repoName });
    repoExists = true;
  } catch (e) {
    repoExists = false;
  }
  
  if (!repoExists) {
    await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: false,
      auto_init: true,
      description: '권예진T 오답체크 - Homework Check System'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const projectDir = process.cwd();
  const files = await getAllFiles(projectDir);
  
  let tree: any[] = [];
  for (const file of files) {
    const { data: blob } = await octokit.git.createBlob({
      owner,
      repo: repoName,
      content: Buffer.from(file.content).toString('base64'),
      encoding: 'base64'
    });
    
    tree.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
  }
  
  let parentSha: string | undefined;
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: 'heads/main'
    });
    parentSha = ref.object.sha;
  } catch (e) {
    // New repo, no parent
  }
  
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo: repoName,
    tree,
    base_tree: parentSha
  });
  
  const commitParams: any = {
    owner,
    repo: repoName,
    message: 'Backup from Replit - ' + new Date().toISOString(),
    tree: newTree.sha
  };
  
  if (parentSha) {
    commitParams.parents = [parentSha];
  }
  
  const { data: commit } = await octokit.git.createCommit(commitParams);
  
  await octokit.git.updateRef({
    owner,
    repo: repoName,
    ref: 'heads/main',
    sha: commit.sha
  });
  
  return `https://github.com/${owner}/${repoName}`;
}
