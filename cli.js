#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { installTool, checkInstallation } = require('./lib/installer');
const { configureAPI, switchAPI, listConfigs } = require('./lib/config');
const { TOOLS, PROVIDERS, INSTALL_METHODS } = require('./lib/constants');

const pkg = require('./package.json');

// ASCII Art Logo
const logo = `
${chalk.bold.cyan('╔═══════════════════════════════════════════════════╗')}
${chalk.bold.cyan('║')}                                                   ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}     ${chalk.bold.yellow('🦆 DuckCoding 一键配置工具')}                ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}                                                   ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}       ${chalk.gray('Claude Code · CodeX · Gemini CLI')}         ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}                                                   ${chalk.bold.cyan('║')}
${chalk.bold.cyan('╚═══════════════════════════════════════════════════╝')}
`;

program
  .name('duckcoding')
  .description('DuckCoding 一键安装配置工具')
  .version(pkg.version);

// 主菜单
async function mainMenu() {
  console.clear();
  console.log(logo);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: chalk.bold('请选择操作:'),
      choices: [
        {
          name: `${chalk.blue('📦')} 安装工具 ${chalk.gray('(Claude Code / CodeX / Gemini CLI)')}`,
          value: 'install'
        },
        {
          name: `${chalk.green('⚙️ ')} 配置 API Key ${chalk.gray('(设置 DuckCoding 或自定义 API)')}`,
          value: 'config'
        },
        {
          name: `${chalk.yellow('🔄')} 切换配置 ${chalk.gray('(在多个配置间快速切换)')}`,
          value: 'switch'
        },
        {
          name: `${chalk.cyan('📋')} 查看配置 ${chalk.gray('(查看所有已保存的配置)')}`,
          value: 'list'
        },
        {
          name: `${chalk.magenta('✅')} 检查安装 ${chalk.gray('(检查工具安装状态)')}`,
          value: 'check'
        },
        {
          name: `${chalk.blue('🔄')} 更新工具 ${chalk.gray('(检查并更新已安装的工具)')}`,
          value: 'update'
        },
        new inquirer.Separator(),
        {
          name: `${chalk.red('❌')} 退出`,
          value: 'exit'
        }
      ]
    }
  ]);

  switch (action) {
    case 'install':
      await installMenu();
      break;
    case 'config':
      await configMenu();
      break;
    case 'switch':
      await switchMenu();
      break;
    case 'list':
      await listConfigs();
      await pressAnyKey();
      await mainMenu();
      break;
    case 'check':
      await checkMenu();
      break;
    case 'update':
      await updateMenu();
      break;
    case 'exit':
      console.log(chalk.green('\n👋 感谢使用 DuckCoding 工具！\n'));
      process.exit(0);
  }
}

// 安装菜单
async function installMenu() {
  console.clear();
  console.log(chalk.bold.blue('\n📦 选择要安装的工具\n'));

  // 先检查哪些工具已安装
  const installedStatus = {};
  console.log(chalk.gray('正在检查已安装的工具...\n'));

  for (const [key, tool] of Object.entries(TOOLS)) {
    installedStatus[key] = await checkInstallation(key, true);
  }

  const { tools } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'tools',
      message: '选择工具 (空格选择，回车确认):',
      choices: [
        {
          name: `${chalk.cyan('Claude Code')} - Anthropic 官方 CLI ${chalk.gray('(推荐官方脚本)')} ${installedStatus['claude-code'] ? chalk.green('✓ 已安装') : chalk.red('✗ 未安装')}`,
          value: 'claude-code',
          checked: !installedStatus['claude-code']
        },
        {
          name: `${chalk.magenta('CodeX')} - OpenAI 代码助手 ${chalk.gray('(推荐 Homebrew/npm)')} ${installedStatus['codex'] ? chalk.green('✓ 已安装') : chalk.red('✗ 未安装')}`,
          value: 'codex',
          checked: !installedStatus['codex']
        },
        {
          name: `${chalk.green('Gemini CLI')} - Google Gemini 命令行工具 ${chalk.gray('(npm)')} ${installedStatus['gemini-cli'] ? chalk.green('✓ 已安装') : chalk.red('✗ 未安装')}`,
          value: 'gemini-cli',
          checked: !installedStatus['gemini-cli']
        }
      ],
      validate: (answer) => {
        if (answer.length < 1) {
          return '请至少选择一个工具（已安装的工具可以重新安装或直接跳过）';
        }
        return true;
      }
    }
  ]);

  // 检查是否所有选中的工具都已安装
  const allInstalled = tools.every(tool => installedStatus[tool]);

  if (allInstalled && tools.length > 0) {
    console.log(chalk.yellow('\n⚠️  您选择的所有工具都已安装'));
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '请选择操作:',
        choices: [
          { name: '重新安装（覆盖现有安装）', value: 'reinstall' },
          { name: '跳过安装，直接配置 API', value: 'config' },
          { name: '返回主菜单', value: 'back' }
        ]
      }
    ]);

    if (action === 'back') {
      return await mainMenu();
    } else if (action === 'config') {
      return await configMenu();
    }
    // 如果选择 reinstall，继续往下执行
  }

  console.log('');

  // 为每个工具单独选择安装方式
  for (const toolKey of tools) {
    const toolInfo = TOOLS[toolKey];
    const methods = INSTALL_METHODS[toolKey];

    // 如果已安装，询问是否跳过
    if (installedStatus[toolKey]) {
      const { skipInstall } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'skipInstall',
          message: `${toolInfo.name} 已安装，是否跳过？`,
          default: true
        }
      ]);

      if (skipInstall) {
        console.log(chalk.gray(`跳过 ${toolInfo.name} 的安装\n`));
        continue;
      }
    }

    // 构建选项列表
    const choices = [];
    const platform = process.platform;

    for (const [methodKey, methodInfo] of Object.entries(methods)) {
      // 检查平台兼容性
      if (methodInfo.platform && !methodInfo.platform.includes(platform)) {
        continue; // 跳过不兼容的平台
      }

      let name = methodInfo.name;
      if (methodInfo.description) {
        name += ` ${chalk.gray('- ' + methodInfo.description)}`;
      }

      // 标记推荐选项
      if (
        (toolKey === 'claude-code' && methodKey === 'official') ||
        (toolKey === 'codex' && methodKey === 'brew' && platform === 'darwin') ||
        (toolKey === 'gemini-cli' && methodKey === 'npm')
      ) {
        name = `${chalk.green('★')} ${name} ${chalk.yellow('(推荐)')}`;
      }

      choices.push({
        name,
        value: methodKey
      });
    }

    // 如果只有一个选项，直接使用
    let method;
    if (choices.length === 1) {
      method = choices[0].value;
      console.log(chalk.gray(`${toolInfo.name}: 使用 ${methods[method].name}`));
    } else {
      const { selectedMethod } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedMethod',
          message: `选择 ${toolInfo.name} 的安装方式:`,
          choices
        }
      ]);
      method = selectedMethod;
    }

    await installTool(toolKey, method);
    console.log('');
  }

  console.log(chalk.green('✅ 安装流程完成！\n'));

  const { continueConfig } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continueConfig',
      message: '是否现在配置 API Key?',
      default: true
    }
  ]);

  if (continueConfig) {
    await configMenu();
  } else {
    await mainMenu();
  }
}

// 配置菜单
async function configMenu() {
  console.clear();
  console.log(chalk.bold.green('\n⚙️  配置 API Key\n'));

  const { tool } = await inquirer.prompt([
    {
      type: 'list',
      name: 'tool',
      message: '选择要配置的工具:',
      choices: [
        { name: `${chalk.cyan('Claude Code')} - Anthropic`, value: 'claude-code' },
        { name: `${chalk.magenta('CodeX')} - OpenAI`, value: 'codex' },
        { name: `${chalk.green('Gemini CLI')} - Google`, value: 'gemini-cli' }
      ]
    }
  ]);

  const toolInfo = TOOLS[tool];

  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: '选择 API 提供商:',
      choices: [
        { name: `${chalk.yellow('DuckCoding')} - 专为这些工具提供的 API 服务`, value: 'duckcoding' },
        { name: `${chalk.blue('Custom')} - 自定义 API 提供商`, value: 'custom' }
      ]
    }
  ]);

  // 如果选择 DuckCoding，显示专用分组提示
  if (provider === 'duckcoding') {
    console.log(chalk.yellow('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold.yellow('⚠️  重要提示：请使用专用分组密钥！'));
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.white(`\n配置 ${toolInfo.name} 时，必须使用【${toolInfo.groupName}】的密钥！\n`));
    console.log(chalk.gray('获取步骤：'));
    console.log(chalk.gray('1. 访问: https://duckcoding.com/console/token'));
    console.log(chalk.gray(`2. 点击 "创建新密钥"`));
    console.log(chalk.gray(`3. 在 "令牌分组" 中选择【${toolInfo.groupName}】`));
    console.log(chalk.gray('4. 复制生成的 API Key\n'));
    console.log(chalk.red('❌ 不要使用其他分组的密钥，否则无法正常使用！\n'));
  }

  const { apiKey } = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiKey',
      message: provider === 'duckcoding'
        ? `输入 ${toolInfo.groupName} 的 API Key:`
        : '输入 API Key:',
      validate: (input) => input.length > 0 || '请输入有效的 API Key'
    }
  ]);

  let baseUrl = '';
  if (provider === 'custom') {
    const { customUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customUrl',
        message: '输入 Base URL:',
        default: 'https://api.example.com',
        validate: (input) => input.length > 0 || '请输入有效的 Base URL'
      }
    ]);
    baseUrl = customUrl;
  } else {
    // DuckCoding
    baseUrl = PROVIDERS[provider].baseUrl;
  }

  const { profileName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'profileName',
      message: '配置名称 (用于快速切换):',
      default: `${provider}-${Date.now().toString().slice(-4)}`
    }
  ]);

  await configureAPI(tool, {
    provider,
    apiKey,
    baseUrl,
    profileName
  });

  console.log(chalk.green(`\n✅ ${TOOLS[tool].name} 配置成功！\n`));

  await pressAnyKey();
  await mainMenu();
}

// 切换配置菜单
async function switchMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\n🔄 切换 API 配置:\n'));

  const { tool } = await inquirer.prompt([
    {
      type: 'list',
      name: 'tool',
      message: '选择工具:',
      choices: [
        { name: 'Claude Code', value: 'claude-code' },
        { name: 'CodeX', value: 'codex' },
        { name: 'Gemini CLI', value: 'gemini-cli' }
      ]
    }
  ]);

  await switchAPI(tool);
  await pressAnyKey();
  await mainMenu();
}

// 检查安装状态
async function checkMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\n✅ 检查安装状态:\n'));

  for (const [key, tool] of Object.entries(TOOLS)) {
    await checkInstallation(key);
  }

  await pressAnyKey();
  await mainMenu();
}

// 更新工具菜单
async function updateMenu() {
  console.clear();
  console.log(chalk.bold.blue('\n🔄 更新已安装的工具\n'));

  // 检查哪些工具已安装
  const installedTools = [];
  console.log(chalk.gray('正在检查已安装的工具...\n'));

  for (const [key, tool] of Object.entries(TOOLS)) {
    const installed = await checkInstallation(key, true);
    if (installed) {
      installedTools.push({ key, name: tool.name });
    }
  }

  if (installedTools.length === 0) {
    console.log(chalk.yellow('\n⚠️  没有检测到已安装的工具\n'));
    console.log(chalk.gray('请先使用 "安装工具" 选项安装工具\n'));
    await pressAnyKey();
    return await mainMenu();
  }

  // 显示已安装的工具
  console.log(chalk.cyan('已安装的工具:\n'));
  installedTools.forEach(({ name }) => {
    console.log(chalk.green(`  ✓ ${name}`));
  });
  console.log('');

  const { tools } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'tools',
      message: '选择要更新的工具:',
      choices: installedTools.map(({ key, name }) => ({
        name,
        value: key,
        checked: true
      })),
      validate: (answer) => {
        if (answer.length < 1) {
          return '请至少选择一个工具';
        }
        return true;
      }
    }
  ]);

  console.log('');

  const { updateTool } = require('./lib/installer');

  for (const toolKey of tools) {
    await updateTool(toolKey);
    console.log('');
  }

  console.log(chalk.green('✅ 更新检查完成！\n'));

  await pressAnyKey();
  await mainMenu();
}

// 等待用户按键
async function pressAnyKey() {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.gray('按回车键继续...')
    }
  ]);
}

// 命令行模式
program
  .command('install <tool>')
  .description('安装指定工具 (claude-code, codex, gemini-cli, all)')
  .option('-m, --method <method>', '安装方式 (official, npm, brew, binary)')
  .action(async (tool, options) => {
    const { getRecommendedMethod } = require('./lib/installer');

    if (tool === 'all') {
      // 安装所有工具，使用推荐方法
      await installTool('claude-code', options.method || getRecommendedMethod('claude-code'));
      await installTool('codex', options.method || getRecommendedMethod('codex'));
      await installTool('gemini-cli', options.method || getRecommendedMethod('gemini-cli'));
    } else {
      // 如果没有指定方法，使用推荐方法
      const method = options.method || getRecommendedMethod(tool);
      await installTool(tool, method);
    }
  });

program
  .command('config <tool>')
  .description('配置指定工具的 API')
  .option('-k, --key <apiKey>', 'API Key')
  .option('-p, --provider <provider>', 'API 提供商', 'duckcoding')
  .option('-u, --url <baseUrl>', '自定义 Base URL')
  .option('-n, --name <profileName>', '配置名称')
  .action(async (tool, options) => {
    if (!TOOLS[tool]) {
      console.log(chalk.red(`❌ 未知工具: ${tool}`));
      console.log(chalk.gray(`可用工具: claude-code, codex, gemini-cli`));
      return;
    }

    if (!options.key) {
      console.log(chalk.red('❌ 请使用 -k 参数提供 API Key'));
      return;
    }

    const baseUrl = options.url || PROVIDERS[options.provider]?.baseUrl || PROVIDERS.duckcoding.baseUrl;
    const profileName = options.name || `${options.provider}-${Date.now().toString().slice(-4)}`;

    await configureAPI(tool, {
      provider: options.provider,
      apiKey: options.key,
      baseUrl,
      profileName
    });
  });

program
  .command('switch <tool>')
  .description('切换工具的 API 配置')
  .action(async (tool) => {
    await switchAPI(tool);
  });

program
  .command('list')
  .description('列出所有配置')
  .action(async () => {
    await listConfigs();
  });

program
  .command('check')
  .description('检查工具安装状态')
  .action(async () => {
    for (const [key] of Object.entries(TOOLS)) {
      await checkInstallation(key);
    }
  });

// 如果没有参数，显示交互式菜单
if (process.argv.length === 2) {
  mainMenu().catch(console.error);
} else {
  program.parse();
}
