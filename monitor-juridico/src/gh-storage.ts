import { Octokit } from "@octokit/rest";
import { createHash } from "crypto";

const owner = process.env.GH_OWNER!;
const repo = process.env.GH_REPO!;
const branch = process.env.GH_BRANCH || "main";
const token = process.env.GH_TOKEN!;

const octo = new Octokit({ auth: token });

async function getFile(path: string): Promise<{ content: any; sha?: string }> {
  try {
    const { data } = await octo.repos.getContent({ owner, repo, path, ref: branch });
    if (!("content" in data)) return { content: {} };
    const buff = Buffer.from((data as any).content, "base64").toString("utf8");
    return { content: JSON.parse(buff), sha: (data as any).sha };
  } catch {
    return { content: {} };
  }
}

async function putFile(path: string, json: any, msg: string, sha?: string) {
  const content = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");
  await octo.repos.createOrUpdateFileContents({
    owner, repo, path, branch,
    message: msg,
    content, sha
  });
}

// Helper to generate SHA1 hash for email
export function emailHash(email: string): string {
  return createHash('sha1').update(email.toLowerCase().trim()).digest('hex');
}

// User profile functions
export async function getUserProfile(emailHashValue: string) {
  return getFile(`data/users/${emailHashValue}/profile.json`);
}

export async function putUserProfile(emailHashValue: string, profile: any, sha?: string) {
  return putFile(`data/users/${emailHashValue}/profile.json`, profile, `chore: update profile (${emailHashValue})`, sha);
}

// Existing functions
export async function getHistory(userId: string) {
  return getFile(`data/users/${userId}/history.json`);
}

export async function putHistory(userId: string, history: any[], sha?: string) {
  return putFile(`data/users/${userId}/history.json`, history, `chore: update history (${userId})`, sha);
}

export async function getSeen(userId: string) {
  return getFile(`data/users/${userId}/seen.json`);
}

export async function putSeen(userId: string, seen: Record<string, string[]>, sha?: string) {
  return putFile(`data/users/${userId}/seen.json`, seen, `chore: update seen (${userId})`, sha);
}