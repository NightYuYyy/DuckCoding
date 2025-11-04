const os = require('os');
const path = require('path');

// 工具定义
const TOOLS = {
  'claude-code': {
    name: 'Claude Code',
    groupName: 'Claude Code 专用分组',
    npmPackage: '@anthropic-ai/claude-code',
    checkCommand: 'claude --version',
    configDir: path.join(os.homedir(), '.claude'),
    configFile: 'settings.json',
    envVars: {
      apiKey: 'ANTHROPIC_AUTH_TOKEN',
      baseUrl: 'ANTHROPIC_BASE_URL'
    }
  },
  'codex': {
    name: 'CodeX',
    groupName: 'CodeX 专用分组',
    npmPackage: '@openai/codex',
    checkCommand: 'codex --version',
    configDir: path.join(os.homedir(), '.codex'),
    configFile: 'config.toml',
    envVars: {
      apiKey: 'OPENAI_API_KEY',
      baseUrl: 'OPENAI_BASE_URL'
    }
  },
  'gemini-cli': {
    name: 'Gemini CLI',
    groupName: 'Gemini CLI 专用分组',
    npmPackage: '@google/generative-ai-cli',
    checkCommand: 'gemini --version',
    configDir: path.join(os.homedir(), '.gemini'),
    configFile: 'settings.json',
    envVars: {
      apiKey: 'GEMINI_API_KEY',
      baseUrl: 'GOOGLE_GEMINI_BASE_URL'
    }
  }
};

// API 提供商
const PROVIDERS = {
  duckcoding: {
    name: 'DuckCoding',
    baseUrl: 'https://jp.duckcoding.com',
    website: 'https://duckcoding.com/console/token',
    description: '专为 Claude Code、CodeX、Gemini CLI 用户提供的 API 服务'
  }
};

// 安装方法 - 使用官方推荐方式
const INSTALL_METHODS = {
  'claude-code': {
    official: {
      name: 'Official Binary (推荐)',
      description: '官方原生二进制，不需要 Node.js',
      commands: {
        darwin: 'curl -fsSL https://claude.ai/install.sh | bash',
        linux: 'curl -fsSL https://claude.ai/install.sh | bash',
        win32: 'irm https://claude.ai/install.ps1 | iex'
      },
      check: null,
      shell: {
        darwin: 'bash',
        linux: 'bash',
        win32: 'powershell'
      }
    },
    brew: {
      name: 'Homebrew',
      description: 'macOS 使用 Homebrew',
      command: 'brew install --cask claude-code',
      check: 'brew --version',
      platform: ['darwin']
    },
    npm: {
      name: 'NPM',
      description: '通过 npm 安装',
      command: 'npm install -g @anthropic-ai/claude-code',
      check: 'npm --version'
    }
  },
  'codex': {
    brew: {
      name: 'Homebrew (macOS 推荐)',
      description: 'macOS 推荐使用 Homebrew',
      command: 'brew install codex',
      check: 'brew --version',
      platform: ['darwin']
    },
    npm: {
      name: 'NPM',
      description: 'npm 包装的原生 Rust 二进制',
      command: 'npm install -g @openai/codex',
      check: 'npm --version'
    },
    binary: {
      name: 'Direct Binary Download',
      description: '从 GitHub 下载原生二进制',
      url: 'https://github.com/openai/codex/releases',
      manual: true
    }
  },
  'gemini-cli': {
    npm: {
      name: 'NPM (推荐)',
      description: '通过 npm 安装（需要 Node.js 18+）',
      command: 'npm install -g @google/gemini-cli',
      check: 'npm --version'
    },
    brew: {
      name: 'Homebrew',
      description: 'macOS/Linux 使用 Homebrew',
      command: 'brew install gemini-cli',
      check: 'brew --version',
      platform: ['darwin', 'linux']
    }
  }
};

module.exports = {
  TOOLS,
  PROVIDERS,
  INSTALL_METHODS
};
