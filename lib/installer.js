const chalk = require('chalk');
const ora = require('ora');
const { TOOLS, INSTALL_METHODS } = require('./constants');
const { executeCommand, commandExists, getPlatformInfo } = require('./utils');

/**
 * 安装工具 - 使用官方推荐方式
 */
async function installTool(toolKey, method = null) {
  const tool = TOOLS[toolKey];
  if (!tool) {
    console.log(chalk.red(`❌ 未知工具: ${toolKey}`));
    return false;
  }

  const toolMethods = INSTALL_METHODS[toolKey];
  if (!toolMethods) {
    console.log(chalk.red(`❌ 工具 ${tool.name} 没有配置安装方法`));
    return false;
  }

  // 如果没有指定方法，选择默认推荐方法
  if (!method) {
    method = getRecommendedMethod(toolKey);
  }

  const installMethod = toolMethods[method];
  if (!installMethod) {
    console.log(chalk.red(`❌ 未知安装方式: ${method}`));
    console.log(chalk.gray(`可用方式: ${Object.keys(toolMethods).join(', ')}`));
    return false;
  }

  // 检查平台兼容性
  const platform = getPlatformInfo();
  if (installMethod.platform && !installMethod.platform.includes(platform.platform)) {
    console.log(chalk.red(`❌ ${installMethod.name} 不支持当前平台 (${platform.platform})`));
    return false;
  }

  console.log(chalk.cyan(`\n📦 正在安装 ${tool.name}...`));
  console.log(chalk.gray(`   方式: ${installMethod.name}`));
  if (installMethod.description) {
    console.log(chalk.gray(`   说明: ${installMethod.description}`));
  }
  console.log('');

  // 检查是否是手动安装
  if (installMethod.manual) {
    console.log(chalk.yellow(`⚠️  ${tool.name} 需要手动下载安装`));
    console.log(chalk.cyan(`\n请访问: ${installMethod.url}`));
    console.log(chalk.gray('\n下载对应平台的二进制文件后：'));
    console.log(chalk.gray('1. 解压文件'));
    console.log(chalk.gray('2. 将可执行文件重命名为 codex'));
    console.log(chalk.gray('3. 移动到 PATH 目录（如 /usr/local/bin 或 ~/.local/bin）'));
    console.log(chalk.gray('4. 添加执行权限: chmod +x codex\n'));
    return true;
  }

  // 检查是否已安装
  const alreadyInstalled = await checkInstallation(toolKey, true);
  if (alreadyInstalled) {
    console.log(chalk.yellow(`⚠️  ${tool.name} 已安装`));

    const inquirer = require('inquirer');
    const { reinstall } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reinstall',
        message: '是否重新安装?',
        default: false
      }
    ]);

    if (!reinstall) {
      return true;
    }
  }

  // 对于 Claude Code 的官方脚本安装
  if (toolKey === 'claude-code' && method === 'official') {
    return await installClaudeCodeOfficial(tool, installMethod, platform);
  }

  // 对于其他工具的常规安装
  return await installWithCommand(tool, installMethod);
}

/**
 * 使用官方脚本安装 Claude Code
 */
async function installClaudeCodeOfficial(tool, installMethod, platform) {
  const command = installMethod.commands[platform.platform];
  const shell = installMethod.shell[platform.platform];

  if (!command) {
    console.log(chalk.red(`❌ 当前平台 (${platform.platform}) 不支持官方安装脚本`));
    return false;
  }

  console.log(chalk.cyan('🔧 使用官方安装脚本...'));
  console.log(chalk.gray(`   执行: ${command}\n`));

  // Windows 特殊提示
  if (platform.platform === 'win32') {
    console.log(chalk.yellow('⚠️  Windows 用户注意:'));
    console.log(chalk.gray('- 如果遇到"无法加载文件"错误，请以管理员身份运行 PowerShell'));
    console.log(chalk.gray('- 或者运行: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser\n'));
  }

  const spinner = ora('正在安装...').start();

  // 根据平台选择执行方式
  let result;
  if (platform.platform === 'win32') {
    // Windows PowerShell - 使用 -ExecutionPolicy Bypass 来避免执行策略问题
    const powershellCmd = `powershell.exe -ExecutionPolicy Bypass -Command "${command}"`;
    result = await executeCommand(powershellCmd);
  } else {
    // Unix-like systems
    result = await executeCommand(command, { shell: shell || 'bash' });
  }

  if (result.success) {
    spinner.succeed(chalk.green(`${tool.name} 安装成功！`));

    // 验证安装
    const verifySpinner = ora('验证安装...').start();

    // 等待一下让安装完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    const installed = await checkInstallation(tool.name.toLowerCase().replace(' ', '-'), true);

    if (installed) {
      verifySpinner.succeed(chalk.green('安装验证通过'));

      if (platform.platform === 'win32') {
        console.log(chalk.cyan('\n💡 Windows 用户提示:'));
        console.log(chalk.gray('1. 重启 PowerShell 或命令提示符'));
        console.log(chalk.gray('2. 运行: claude --version'));
        console.log(chalk.gray('3. 确保 PATH 已更新（可能需要重启系统）\n'));
      } else {
        console.log(chalk.cyan('\n💡 提示: 可能需要重启终端以使用 claude 命令\n'));
      }

      return true;
    } else {
      verifySpinner.warn(chalk.yellow('无法验证安装，但安装脚本已执行'));
      console.log(chalk.gray('请尝试：'));
      console.log(chalk.gray('1. 重启终端'));
      console.log(chalk.gray('2. 运行: claude --version'));

      if (platform.platform === 'win32') {
        console.log(chalk.gray('3. Windows: 检查 %USERPROFILE%\\.claude\\bin 是否在 PATH 中'));
      } else {
        console.log(chalk.gray('3. 检查 ~/.claude/bin 或 ~/.local/bin 是否在 PATH 中'));
      }
      console.log('');

      return true;
    }
  } else {
    spinner.fail(chalk.red(`${tool.name} 安装失败`));
    console.log(chalk.red('\n错误信息:'));
    console.log(chalk.gray(result.stderr || result.error));

    console.log(chalk.yellow('\n💡 故障排除:'));
    console.log(chalk.gray('1. 检查网络连接'));
    console.log(chalk.gray('2. 确保有足够的权限'));

    if (platform.platform === 'win32') {
      console.log(chalk.gray('3. Windows: 以管理员身份运行 PowerShell'));
      console.log(chalk.gray('4. 设置执行策略:'));
      console.log(chalk.cyan('   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser'));
      console.log(chalk.gray('5. 手动运行安装脚本:'));
      console.log(chalk.cyan('   irm https://claude.ai/install.ps1 | iex'));
    } else {
      console.log(chalk.gray('3. 检查 curl 是否已安装'));
      console.log(chalk.gray('4. 手动运行安装脚本:'));
      console.log(chalk.cyan('   curl -fsSL https://claude.ai/install.sh | bash'));
    }
    console.log('');

    return false;
  }
}

/**
 * 使用命令安装工具（npm/brew）
 */
async function installWithCommand(tool, installMethod) {
  // 检查依赖工具
  const spinner = ora('检查依赖...').start();

  let checkCmd = installMethod.check;
  if (!checkCmd) {
    spinner.succeed('跳过依赖检查');
  } else {
    const hasInstallTool = await commandExists(checkCmd.split(' ')[0]);

    if (!hasInstallTool) {
      spinner.fail(chalk.red(`依赖工具未安装: ${checkCmd.split(' ')[0]}`));

      if (checkCmd.includes('npm')) {
        console.log(chalk.yellow('\n请先安装 Node.js:'));
        console.log(chalk.gray('  访问: https://nodejs.org/\n'));
      } else if (checkCmd.includes('brew')) {
        console.log(chalk.yellow('\n请先安装 Homebrew:'));
        console.log(chalk.gray('  运行: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"\n'));
      }

      return false;
    }

    spinner.succeed('依赖检查通过');
  }

  // 执行安装
  const installSpinner = ora(`正在安装 ${tool.name}...`).start();
  const installCmd = installMethod.command;

  console.log(chalk.gray(`\n执行: ${installCmd}\n`));

  const result = await executeCommand(installCmd);

  if (result.success) {
    installSpinner.succeed(chalk.green(`${tool.name} 安装成功！`));

    // 验证安装
    const verifySpinner = ora('验证安装...').start();

    // 等待一下让安装完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    const installed = await checkInstallation(tool.name.toLowerCase().replace(' ', '-'), true);

    if (installed) {
      verifySpinner.succeed(chalk.green('安装验证通过'));
      return true;
    } else {
      verifySpinner.warn(chalk.yellow('无法验证安装，但安装命令已执行'));
      console.log(chalk.gray('可能需要重启终端或重新加载环境变量\n'));
      return true;
    }
  } else {
    installSpinner.fail(chalk.red(`${tool.name} 安装失败`));
    console.log(chalk.red('\n错误信息:'));
    console.log(chalk.gray(result.stderr || result.error));

    // 提供解决建议
    console.log(chalk.yellow('\n💡 常见问题解决:'));
    console.log(chalk.gray('  1. 检查网络连接'));

    if (installCmd.includes('npm')) {
      console.log(chalk.gray('  2. 检查 npm 配置: npm config list'));
      console.log(chalk.gray('  3. 尝试清除缓存: npm cache clean --force'));
      console.log(chalk.gray('  4. 使用管理员权限运行'));
    } else if (installCmd.includes('brew')) {
      console.log(chalk.gray('  2. 更新 Homebrew: brew update'));
      console.log(chalk.gray('  3. 检查 Homebrew: brew doctor'));
    }
    console.log('');

    return false;
  }
}

/**
 * 获取推荐的安装方法
 */
function getRecommendedMethod(toolKey) {
  const platform = getPlatformInfo();
  const methods = INSTALL_METHODS[toolKey];

  if (toolKey === 'claude-code') {
    return 'official'; // Claude Code 始终推荐官方脚本
  }

  if (toolKey === 'codex') {
    return platform.isMac ? 'brew' : 'npm'; // macOS 推荐 Homebrew
  }

  if (toolKey === 'gemini-cli') {
    return 'npm';
  }

  // 默认返回第一个可用方法
  return Object.keys(methods)[0];
}

/**
 * 检查工具是否已安装
 */
async function checkInstallation(toolKey, silent = false) {
  const tool = TOOLS[toolKey];
  if (!tool) {
    if (!silent) console.log(chalk.red(`❌ 未知工具: ${toolKey}`));
    return false;
  }

  const result = await executeCommand(tool.checkCommand);
  const isInstalled = result.success;

  if (!silent) {
    if (isInstalled) {
      console.log(chalk.green(`✅ ${tool.name}: 已安装`));
      if (result.stdout) {
        console.log(chalk.gray(`   版本: ${result.stdout.split('\n')[0]}`));
      }
    } else {
      console.log(chalk.red(`❌ ${tool.name}: 未安装`));
    }
  }

  return isInstalled;
}

/**
 * 更新工具
 */
async function updateTool(toolKey) {
  const tool = TOOLS[toolKey];
  if (!tool) {
    console.log(chalk.red(`❌ 未知工具: ${toolKey}`));
    return false;
  }

  // 检查是否已安装
  const installed = await checkInstallation(toolKey, true);
  if (!installed) {
    console.log(chalk.yellow(`⚠️  ${tool.name} 未安装，无法更新`));
    console.log(chalk.gray('请先使用安装功能安装该工具\n'));
    return false;
  }

  console.log(chalk.cyan(`\n🔄 正在更新 ${tool.name}...`));

  const platform = getPlatformInfo();

  // Claude Code 使用官方更新命令
  if (toolKey === 'claude-code') {
    return await updateClaudeCode(tool, platform);
  }

  // CodeX 和 Gemini CLI 根据安装方式更新
  return await updateViaPackageManager(tool, toolKey, platform);
}

/**
 * 更新 Claude Code（使用官方命令）
 */
async function updateClaudeCode(tool, platform) {
  console.log(chalk.gray('Claude Code 支持自动更新，检查更新...\n'));

  const spinner = ora('检查更新...').start();

  // Claude Code 有内置的更新命令
  const updateCmd = 'claude update';
  const result = await executeCommand(updateCmd);

  if (result.success) {
    spinner.succeed(chalk.green('更新检查完成'));

    if (result.stdout) {
      console.log(chalk.gray(result.stdout));
    }

    console.log(chalk.cyan('\n💡 提示:'));
    console.log(chalk.gray('- Claude Code 会自动检查更新'));
    console.log(chalk.gray('- 也可以手动运行: claude update\n'));

    return true;
  } else {
    spinner.info(chalk.yellow('无法检查更新'));

    // 如果 claude update 不可用，建议重新安装
    console.log(chalk.yellow('\n⚠️  无法使用内置更新命令'));
    console.log(chalk.gray('建议重新运行官方安装脚本以获取最新版本:\n'));

    if (platform.platform === 'win32') {
      console.log(chalk.cyan('  irm https://claude.ai/install.ps1 | iex\n'));
    } else {
      console.log(chalk.cyan('  curl -fsSL https://claude.ai/install.sh | bash\n'));
    }

    return false;
  }
}

/**
 * 通过包管理器更新工具
 */
async function updateViaPackageManager(tool, toolKey, platform) {
  const spinner = ora(`检查 ${tool.name} 的更新...`).start();

  let updateCmd;
  let packageManager = 'unknown';

  // 尝试检测使用的包管理器
  const npmInstalled = await commandExists('npm');
  const brewInstalled = await commandExists('brew');

  // 优先使用 Homebrew（如果在 macOS 且可用）
  if (platform.isMac && brewInstalled) {
    // 检查是否通过 brew 安装
    const brewListResult = await executeCommand('brew list');
    if (brewListResult.success && brewListResult.stdout.includes('codex')) {
      updateCmd = 'brew upgrade codex';
      packageManager = 'brew';
    }
  }

  // 如果没有找到 brew 安装，尝试 npm
  if (!updateCmd && npmInstalled) {
    if (toolKey === 'codex') {
      updateCmd = 'npm update -g @openai/codex';
      packageManager = 'npm';
    } else if (toolKey === 'gemini-cli') {
      updateCmd = 'npm update -g @google/gemini-cli';
      packageManager = 'npm';
    }
  }

  if (!updateCmd) {
    spinner.fail(chalk.red('无法确定更新方式'));
    console.log(chalk.gray('\n请使用以下命令手动更新:'));

    if (npmInstalled) {
      console.log(chalk.cyan(`  npm update -g ${tool.npmPackage}`));
    }
    if (brewInstalled && toolKey === 'codex') {
      console.log(chalk.cyan('  brew upgrade codex'));
    }
    console.log('');

    return false;
  }

  spinner.text = `正在使用 ${packageManager} 更新...`;

  const result = await executeCommand(updateCmd);

  if (result.success) {
    spinner.succeed(chalk.green(`${tool.name} 更新成功`));

    // 显示新版本
    const versionResult = await executeCommand(tool.checkCommand);
    if (versionResult.success && versionResult.stdout) {
      console.log(chalk.gray(`当前版本: ${versionResult.stdout.split('\n')[0]}\n`));
    }

    return true;
  } else {
    spinner.fail(chalk.red(`${tool.name} 更新失败`));
    console.log(chalk.red('\n错误信息:'));
    console.log(chalk.gray(result.stderr || result.error));

    // 检查是否是 npm cache 权限问题
    if (packageManager === 'npm' && result.stderr && result.stderr.includes('EACCES')) {
      console.log(chalk.yellow('\n⚠️  检测到 npm cache 权限问题'));
      console.log(chalk.gray('这是 npm 之前版本的 bug 导致的\n'));

      const inquirer = require('inquirer');
      const { fixNpmCache } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'fixNpmCache',
          message: '是否自动修复 npm cache 权限？（需要 sudo）',
          default: true
        }
      ]);

      if (fixNpmCache) {
        console.log(chalk.cyan('\n正在修复 npm cache 权限...\n'));

        // 获取用户 ID 和组 ID
        const idResult = await executeCommand('id -u');
        const gidResult = await executeCommand('id -g');

        if (idResult.success && gidResult.success) {
          const uid = idResult.stdout.trim();
          const gid = gidResult.stdout.trim();

          const fixSpinner = ora('修复权限（可能需要输入密码）...').start();
          const fixCmd = `sudo chown -R ${uid}:${gid} "${process.env.HOME}/.npm"`;

          console.log(chalk.gray(`执行: ${fixCmd}\n`));
          const fixResult = await executeCommand(fixCmd);

          if (fixResult.success) {
            fixSpinner.succeed(chalk.green('npm cache 权限修复成功'));
            console.log(chalk.cyan('\n正在重试更新...\n'));

            // 重试更新
            const retrySpinner = ora('重新更新...').start();
            const retryResult = await executeCommand(updateCmd);

            if (retryResult.success) {
              retrySpinner.succeed(chalk.green(`${tool.name} 更新成功`));

              const versionResult = await executeCommand(tool.checkCommand);
              if (versionResult.success && versionResult.stdout) {
                console.log(chalk.gray(`当前版本: ${versionResult.stdout.split('\n')[0]}\n`));
              }

              return true;
            } else {
              retrySpinner.fail(chalk.red('重试失败'));
              console.log(chalk.gray('请稍后手动重试\n'));
            }
          } else {
            fixSpinner.fail(chalk.red('权限修复失败'));
            console.log(chalk.gray('可能需要输入 sudo 密码或检查权限\n'));
          }
        }
      }

      console.log(chalk.yellow('\n💡 手动修复方法:'));
      console.log(chalk.cyan('  sudo chown -R $(id -u):$(id -g) ~/.npm'));
      console.log(chalk.gray('  然后重新运行更新\n'));

      return false;
    }

    // 其他错误的故障排除
    console.log(chalk.yellow('\n💡 故障排除:'));
    console.log(chalk.gray('1. 检查网络连接'));

    if (packageManager === 'npm') {
      console.log(chalk.gray('2. 尝试: npm cache clean --force'));
      console.log(chalk.gray('3. 手动更新: npm update -g ' + tool.npmPackage));
    } else if (packageManager === 'brew') {
      console.log(chalk.gray('2. 更新 Homebrew: brew update'));
      console.log(chalk.gray('3. 手动更新: brew upgrade codex'));
    }
    console.log('');

    return false;
  }
}

module.exports = {
  installTool,
  checkInstallation,
  getRecommendedMethod,
  updateTool
};
