#!/usr/bin/env node
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { AuthTokenManager } from '../chrome-extension/src/services/infrastructure/auth-token.manager';
import { FileStorageRepository } from '../chrome-extension/src/services/infrastructure/file-storage.repository';
import { ChannelType } from '../chrome-extension/src/types/core/channel.types';

// .env.localを手動で読み込む
async function loadEnvLocal(): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = await fs.readFile(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
        if (!key.startsWith('#') && key.trim()) {
          envVars[key.trim()] = value;
          process.env[key.trim()] = value; // Also set to process.env for immediate use
        }
      }
    });
    console.log('✅ .env.local を読み込みました。');
  } catch (error) {
    console.log('⚠️ .env.local ファイルが見つかりません。新規作成します。');
  }
  return envVars;
}

// .env.localを安全に更新する
async function updateEnvLocal(updates: Record<string, string>) {
  let currentEnv: Record<string, string> = {};
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = await fs.readFile(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
        if (!key.startsWith('#') && key.trim()) {
          currentEnv[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    // ファイルが存在しない場合は新規作成
  }

  const mergedEnv = { ...currentEnv, ...updates };
  const newEnvContent = Object.entries(mergedEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const envPath = path.join(process.cwd(), '.env.local');
  await fs.writeFile(envPath, newEnvContent, 'utf8');
  console.log('✅ .env.local を更新しました。');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupGmail() {
  console.log('\n--- Gmail設定を開始します ---');
  await loadEnvLocal(); // Always load to ensure process.env is updated

  const storage = new FileStorageRepository();
  const authManager = new AuthTokenManager(storage);

  const authUrl = authManager.generateAuthUrl();
  console.log('\n1. 以下のURLをブラウザで開いて認証してください:');
  console.log(authUrl);

  const code = await askQuestion('\n2. 認証後に表示されるコードをここに貼り付けてください: ');

  try {
    await authManager.exchangeCodeForToken(code);
    console.log('🎉 Gmailの認証設定が正常に完了しました！');
  } catch (error: any) {
    console.error('❌ 設定中にエラーが発生しました:', error.message);
  }
}

async function setupDiscord() {
  console.log('\n--- Discord設定を開始します ---');
  await loadEnvLocal(); // Always load to ensure process.env is updated

  console.log('\nDiscord Botの情報を入力してください。');
  console.log('Discord Developers PortalのBot設定ページから取得できます。');

  const discordBotToken = await askQuestion('Discord Bot Token (DISCORD_BOT_TOKEN): ');
  const discordClientId = await askQuestion('Discord Client ID (Application ID) (DISCORD_CLIENT_ID): ');
  const discordTestChannelId = await askQuestion('Discord Test Channel ID (DISCORD_TEST_CHANNEL_ID): ');

  await updateEnvLocal({
    DISCORD_BOT_TOKEN: discordBotToken.trim(),
    DISCORD_CLIENT_ID: discordClientId.trim(),
    DISCORD_TEST_CHANNEL_ID: discordTestChannelId.trim(),
  });

  console.log('✅ Discordの設定を保存しました。');
  console.log('ボットをサーバーに招待し、指定したチャンネルにメッセージを送信できることを確認してください。');
}

async function setupLine() {
  console.log('\n--- LINE設定を開始します ---');
  await loadEnvLocal(); // Always load to ensure process.env is updated

  console.log('\nLINE Developers Consoleからチャネル情報を入力してください。');
  console.log('Messaging API設定ページから取得できます。');

  const lineChannelAccessToken = await askQuestion('LINE Channel Access Token (LINE_CHANNEL_ACCESS_TOKEN): ');
  const lineChannelSecret = await askQuestion('LINE Channel Secret (LINE_CHANNEL_SECRET): ');
  const lineTestUserId = await askQuestion('LINE Test User ID (LINE_TEST_USER_ID): ');
  const lineProxyUrl = await askQuestion('LINE Proxy URL (LINE_PROXY_URL, 例: https://your-ngrok-url.ngrok-free.app): ');

  await updateEnvLocal({
    LINE_CHANNEL_ACCESS_TOKEN: lineChannelAccessToken.trim(),
    LINE_CHANNEL_SECRET: lineChannelSecret.trim(),
    LINE_TEST_USER_ID: lineTestUserId.trim(),
    LINE_PROXY_URL: lineProxyUrl.trim(),
    WEBHOOK_SIGNATURE_VALIDATION: 'false', // PoCのため署名検証を無効化
  });

  console.log('✅ LINEの設定を保存しました。');
  console.log('LINEアプリからボットにメッセージを送信し、Webhookが正しく動作することを確認してください。');
  console.log('LINE Test User IDは、Webhookのログから確認できます。');
}


async function main() {
  console.clear();
  console.log('***************************************');
  console.log('* チャンネル初期設定ウィザード        *');
  console.log('***************************************\n');

  const choice = await askQuestion('設定したいチャンネルを選択してください (1: Gmail, 2: Discord, 3: LINE, q: 終了): ');

  switch (choice.trim()) {
    case '1':
      await setupGmail();
      break;
    case '2':
      await setupDiscord();
      break;
    case '3':
      await setupLine();
      break;
    case 'q':
      break;
    default:
      console.log('無効な選択です。');
  }
  rl.close();
}

main().catch(console.error);