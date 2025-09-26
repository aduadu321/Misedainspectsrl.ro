#!/usr/bin/env ts-node
import "dotenv/config";
import path from "path";
import fs from "fs";
import SFTPClient from "ssh2-sftp-client";
import { Client } from "ssh2";
import type { Client as ClientType, ClientChannel } from "ssh2";

interface DeploymentConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  homeDir: string;
  appDir: string;
  publicDir: string;
  restartCommand?: string;
  installCommand: string;
}

type RequiredEnv =
  | "CPANEL_HOST"
  | "CPANEL_USER"
  | "CPANEL_PASS"
  | "CPANEL_APP_DIR"
  | "CPANEL_PUBLIC_HTML";

const ensureEnv = (key: RequiredEnv): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const loadConfig = (): DeploymentConfig => {
  const username = ensureEnv("CPANEL_USER");
  const host = process.env.CPANEL_HOST || "misedainspectsrl.ro";
  const port = Number(process.env.CPANEL_PORT || "22");
  const password = ensureEnv("CPANEL_PASS");
  const homeDir = `/home/${username}`;
  const appDir = ensureEnv("CPANEL_APP_DIR");
  const publicDir = ensureEnv("CPANEL_PUBLIC_HTML");

  return {
    host,
    port,
    username,
    password,
    homeDir,
    appDir,
    publicDir,
    restartCommand: process.env.CPANEL_RESTART_CMD,
    installCommand: "cd \"$1\" && npm ci --omit=dev",
  };
};

const executeSshCommand = (
  conn: ClientType,
  command: string
): Promise<{ code: number; output: string }> => {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream: ClientChannel) => {
      if (err) {
        reject(err);
        return;
      }

      let output = "";
      let code = 0;

      stream
        .on("close", (exitCode: number) => {
          code = exitCode;
          resolve({ code, output });
        })
        .on("data", (data: Buffer) => {
          const text = data.toString();
          output += text;
          console.log("STDOUT:", text.trim());
        })
        .stderr.on("data", (data: Buffer) => {
          const text = data.toString();
          output += text;
          console.log("STDERR:", text.trim());
        });
    });
  });
};

const deployToCpanel = async (): Promise<void> => {
  const config = loadConfig();
  const localDeployPath = path.join(process.cwd(), "deploy");

  console.log("🚀 Starting cPanel deployment...");
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`User: ${config.username}`);
  console.log(`App Directory: ${config.appDir}`);
  console.log(`Public Directory: ${config.publicDir}`);

  if (!fs.existsSync(localDeployPath)) {
    throw new Error(
      `Deploy folder not found: ${localDeployPath}. Run 'npm run zip:deploy' first.`
    );
  }

  const sftp = new SFTPClient();
  const ssh = new Client();

  try {
    // Connect via SFTP for file operations
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    });

    console.log("✅ SFTP connected");

    // Upload files
    const remoteAppPath = path.posix.join(config.homeDir, config.appDir);
    const remotePublicPath = path.posix.join(config.homeDir, config.publicDir);

    console.log(
      `📁 Uploading backend files to ${remoteAppPath}...`
    );
    await sftp.uploadDir(path.join(localDeployPath, "dist-server"), remoteAppPath);

    console.log(
      `📁 Uploading package.json to ${remoteAppPath}...`
    );
    await sftp.put(
      path.join(localDeployPath, "package.json"),
      path.posix.join(remoteAppPath, "package.json")
    );

    console.log(
      `🌐 Uploading frontend to ${remotePublicPath}...`
    );
    await sftp.uploadDir(path.join(localDeployPath, "dist"), remotePublicPath);

    await sftp.end();
    console.log("✅ File upload completed");

    // Connect via SSH for command execution
    await new Promise<void>((resolve, reject) => {
      ssh
        .on("ready", () => {
          console.log("✅ SSH connected");
          resolve();
        })
        .on("error", reject)
        .connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
        });
    });

    // Install dependencies
    console.log("📦 Installing dependencies...");
    const installResult = await executeSshCommand(
      ssh,
      `cd "${remoteAppPath}" && npm ci --omit=dev`
    );

    if (installResult.code !== 0) {
      throw new Error(
        `Dependency installation failed with code ${installResult.code}`
      );
    }

    // Restart application if command provided
    if (config.restartCommand) {
      console.log("🔄 Restarting application...");
      const restartResult = await executeSshCommand(
        ssh,
        config.restartCommand.replace("$1", remoteAppPath)
      );

      if (restartResult.code !== 0) {
        console.warn(
          `Application restart returned code ${restartResult.code}, but continuing...`
        );
      }
    }

    ssh.end();
    console.log("✅ SSH disconnected");

    console.log("
🎉 Deployment completed successfully!");
    console.log(`🔗 Your app should be available at: https://${config.host}`);
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  } finally {
    if (sftp.sftp) {
      await sftp.end();
    }
    ssh.end();
  }
};

deployToCpanel().catch((error) => {
  console.error("Deploy script error:", error);
  process.exit(1);
});