#!/usr/bin/env ts-node
import dotenv from 'dotenv';
import readline from 'readline';
import { createSecureStorage } from '../github/storage';
import { GitHubOAuth } from '../github/oauth';
import { createGitHubClient } from '../github/client';
import type { DeviceFlowStart } from '../github/types';
import { consoleLogger } from '../github/logger';

dotenv.config();

const storage = createSecureStorage();
const oauth = new GitHubOAuth({ storage });
const client = createGitHubClient({ storage });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const waitForEnter = (message: string) =>
  new Promise<void>((resolve) => {
    rl.question(message, () => resolve());
  });

const showDeviceInstructions = (device: DeviceFlowStart) => {
  consoleLogger.info('请在浏览器中访问 GitHub 完成授权', {
    verificationUri: device.verificationUriComplete || device.verificationUri,
    userCode: device.userCode,
  });
  console.info(`\n请打开浏览器访问: ${device.verificationUri}`);
  console.info(`输入授权码: ${device.userCode}`);
  if (device.verificationUriComplete) {
    console.info(`或直接打开: ${device.verificationUriComplete}`);
  }
};

const authStart = async () => {
  const start = await oauth.startAuthorization({ forceFlow: process.env.FORCE_FLOW as any });
  if (start.flow === 'auth_code') {
    console.info('请在浏览器中打开以下链接完成授权:');
    console.info(start.authorizationUrl);
    await waitForEnter('\n完成后按回车继续...');
    const url = new URL(await new Promise<string>((resolve) => rl.question('粘贴完整回调 URL: ', resolve)));
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      throw new Error('回调参数缺失');
    }
    const result = await oauth.handleAuthorizationCodeCallback(code, state);
    console.info(`授权成功，欢迎 ${result.user.login}`);
  } else {
    showDeviceInstructions(start);
    const controller = new AbortController();
    const onCancel = () => controller.abort();
    process.on('SIGINT', onCancel);
    try {
      const result = await oauth.waitForDeviceToken(start, controller.signal);
      console.info(`授权成功，欢迎 ${result.user.login}`);
    } finally {
      process.off('SIGINT', onCancel);
    }
  }
};

const authWhoAmI = async () => {
  const account = await storage.getAccount();
  if (!account) {
    console.info('尚未登录');
    return;
  }
  const profile = await client.checkToken();
  console.info(`当前账号: ${profile.user.login} (#${profile.user.id})`);
  console.info(`Scopes: ${profile.scopes.join(', ')}`);
};

const runRepoTest = async () => {
  const owner = process.env.TEST_OWNER;
  const repo = process.env.TEST_REPO;
  if (!owner || !repo) {
    throw new Error('TEST_OWNER/TEST_REPO 未配置');
  }
  const who = await client.checkToken();
  console.info(`使用账号 ${who.user.login} 测试仓库 ${owner}/${repo}`);
  await client.checkRateLimit();
  const access = await client.checkRepoAccess(owner, repo);
  if (!access.hasWrite) {
    throw new Error('仓库写权限不足');
  }
  const timestamp = new Date().toISOString();
  const issue = await client.createIssue(owner, repo, {
    title: `healthcheck: ${timestamp}`,
    body: '自动化测试创建的 Issue',
  });
  console.info(`创建 Issue #${issue.number}`);
  await client.commentIssue(owner, repo, issue.number, '健康检查评论');
  await client.closeIssue(owner, repo, issue.number);
  console.info('Issue 创建/评论/关闭流程完成');
};

const revoke = async () => {
  await oauth.revokeToken();
  console.info('已撤销并清除本地凭证');
};

const main = async () => {
  const command = process.argv[2];
  try {
    switch (command) {
      case 'auth:start':
        await authStart();
        break;
      case 'auth:whoami':
        await authWhoAmI();
        break;
      case 'test:repo':
        await runRepoTest();
        break;
      case 'auth:revoke':
        await revoke();
        break;
      default:
        console.info('可用命令: auth:start | auth:whoami | test:repo | auth:revoke');
    }
  } catch (error) {
    console.error('执行失败', error);
  } finally {
    rl.close();
  }
};

if (require.main === module) {
  main();
}

