const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

/**
 * 执行命令并返回结果
 */
async function executeCommand(command, options = {}) {
  try {
    // 确保使用正确的 PATH 环境变量，优先使用系统路径而非项目 node_modules
    // 将系统路径放在最前面，避免使用项目本地的旧版本工具
    const systemPaths = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
    const userPath = process.env.PATH || '';
    const env = {
      ...process.env,
      PATH: `${systemPaths}:${userPath}`
    };

    const { stdout, stderr } = await execAsync(command, {
      shell: true,
      env,
      ...options
    });

    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || ''
    };
  }
}

/**
 * 检查命令是否存在
 */
async function commandExists(command) {
  const checkCmd = process.platform === 'win32'
    ? `where ${command}`
    : `which ${command}`;

  const result = await executeCommand(checkCmd);
  return result.success;
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 读取 JSON 文件
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 写入 JSON 文件
 */
function writeJsonFile(filePath, data) {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`写入文件失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 读取 TOML 文件 (简单解析)
 */
function readTomlFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    // 简单的 TOML 解析（仅支持基本格式）
    const config = {};
    let currentSection = null;

    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      // Section header
      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.slice(1, -1);
        const parts = currentSection.split('.');
        let obj = config;
        for (let i = 0; i < parts.length; i++) {
          if (i === parts.length - 1) {
            obj[parts[i]] = {};
            obj = obj[parts[i]];
          } else {
            if (!obj[parts[i]]) obj[parts[i]] = {};
            obj = obj[parts[i]];
          }
        }
        return;
      }

      // Key-value pair
      const match = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (match) {
        let [, key, value] = match;
        value = value.trim();

        // Parse value types
        if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1); // Remove quotes
        } else if (!isNaN(value) && value !== '') {
          value = Number(value);
        }

        if (currentSection) {
          const parts = currentSection.split('.');
          let obj = config;
          for (const part of parts) {
            if (!obj[part]) obj[part] = {};
            obj = obj[part];
          }
          obj[key] = value;
        } else {
          config[key] = value;
        }
      }
    });

    return config;
  } catch (error) {
    console.error(`读取 TOML 文件失败: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 写入 TOML 文件
 */
function writeTomlFile(filePath, data) {
  try {
    ensureDir(path.dirname(filePath));

    let content = '';

    // 写入顶层键值对
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        continue; // Skip sections for now
      }

      // 处理不同类型的值
      if (typeof value === 'boolean') {
        content += `${key} = ${value}\n`;
      } else if (typeof value === 'string') {
        content += `${key} = "${value}"\n`;
      } else if (typeof value === 'number') {
        content += `${key} = ${value}\n`;
      }
    }

    // 写入 sections
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        content += `\n[${key}]\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          if (typeof subValue === 'object' && !Array.isArray(subValue)) {
            // Nested section
            content += `\n[${key}.${subKey}]\n`;
            for (const [k, v] of Object.entries(subValue)) {
              if (typeof v === 'boolean') {
                content += `${k} = ${v}\n`;
              } else if (typeof v === 'string') {
                content += `${k} = "${v}"\n`;
              } else if (typeof v === 'number') {
                content += `${k} = ${v}\n`;
              }
            }
          } else {
            // 处理不同类型的值
            if (typeof subValue === 'boolean') {
              content += `${subKey} = ${subValue}\n`;
            } else if (typeof subValue === 'string') {
              content += `${subKey} = "${subValue}"\n`;
            } else if (typeof subValue === 'number') {
              content += `${subKey} = ${subValue}\n`;
            }
          }
        }
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`写入 TOML 文件失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 获取平台信息
 */
function getPlatformInfo() {
  const platform = process.platform;
  const arch = process.arch;

  return {
    platform,
    arch,
    isWindows: platform === 'win32',
    isMac: platform === 'darwin',
    isLinux: platform === 'linux',
    shell: process.env.SHELL || (platform === 'win32' ? 'cmd' : 'bash')
  };
}

module.exports = {
  executeCommand,
  commandExists,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  readTomlFile,
  writeTomlFile,
  getPlatformInfo
};
