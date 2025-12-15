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
    throw new Error('X_REPLIT_TOKEN not found');
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

// Only get essential project files
function getEssentialFiles(baseDir: string): {path: string, content: string}[] {
  const files: {path: string, content: string}[] = [];
  
  const essentialPaths = [
    'client/src',
    'server',
    'shared',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'drizzle.config.ts',
    'components.json',
    'replit.md',
    'design_guidelines.md',
    'postcss.config.js',
    'client/index.html',
    'client/public'
  ];
  
  function readDir(dir: string, base: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(base, fullPath);
      
      if (entry.isDirectory()) {
        readDir(fullPath, base);
      } else {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          files.push({ path: relativePath, content });
        } catch (e) {
          // Skip binary files
        }
      }
    }
  }
  
  for (const p of essentialPaths) {
    const fullPath = path.join(baseDir, p);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        readDir(fullPath, baseDir);
      } else {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          files.push({ path: p, content });
        } catch (e) {
          // Skip
        }
      }
    }
  }
  
  return files;
}

async function uploadToGitHub(repoName: string): Promise<string> {
  const octokit = await getUncachableGitHubClient();
  
  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  
  console.log(`Uploading to ${owner}/${repoName}...`);
  
  let repoExists = false;
  try {
    await octokit.repos.get({ owner, repo: repoName });
    repoExists = true;
    console.log('Repository exists, updating...');
  } catch (e) {
    console.log('Creating new repository...');
  }
  
  if (!repoExists) {
    await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: false,
      auto_init: true,
      description: '권예진T 오답체크 - Homework Check System'
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  const projectDir = process.cwd();
  const files = getEssentialFiles(projectDir);
  console.log(`Found ${files.length} essential files`);
  
  // Upload files one by one with delay to avoid rate limit
  for (const file of files) {
    try {
      let sha: string | undefined;
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo: repoName,
          path: file.path
        });
        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (e) {
        // File doesn't exist yet
      }
      
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: file.path,
        message: `Update ${file.path}`,
        content: Buffer.from(file.content).toString('base64'),
        sha
      });
      
      console.log(`Uploaded: ${file.path}`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    } catch (e: any) {
      console.error(`Failed to upload ${file.path}: ${e.message}`);
    }
  }
  
  return `https://github.com/${owner}/${repoName}`;
}

uploadToGitHub('homework-check-backup')
  .then(url => console.log('SUCCESS:', url))
  .catch(err => console.error('ERROR:', err.message));
