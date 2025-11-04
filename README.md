# DuckCoding 一键配置工具

<div align="center">

![DuckCoding Logo](src/assets/duck-logo.png)

**一键安装和配置 AI 编程工具的桌面应用**

支持 Claude Code、CodeX、Gemini CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)]()
[![Release](https://img.shields.io/github/v/release/DuckCoding-dev/DuckCoding)](https://github.com/DuckCoding-dev/DuckCoding/releases)

</div>

## ✨ 功能特性

- **🚀 一键安装** - 自动安装 Claude Code、CodeX、Gemini CLI
- **⚙️ 一键配置** - 快速配置 DuckCoding API 或自定义 API 端点
- **📊 用量统计** - 实时查看账户余额和30天用量趋势
- **🔑 一键生成令牌** - 直接在应用内创建 DuckCoding API 令牌
- **🔄 多配置管理** - 支持保存和切换多个配置文件
- **🎨 现代界面** - 基于 React + Tailwind CSS 的精美 UI
- **💻 跨平台** - 支持 macOS (Intel/Apple Silicon)、Windows、Linux

## 📥 下载安装

前往 [Releases 页面](https://github.com/DuckCoding-dev/DuckCoding/releases) 下载适合你系统的安装包：

- **macOS**: `DuckCoding_1.0.0_universal.dmg` (支持 Intel 和 Apple Silicon M1/M2/M3/M4/M5)
- **Windows**: `DuckCoding_1.0.0_x64-setup.exe` 或 `.msi`
- **Linux**: `duckcoding_1.0.0_amd64.deb` (Debian/Ubuntu) 或 `.rpm` (Fedora/RHEL) 或 `.AppImage`

## 🎯 使用方法

### 1. 安装工具

在「安装工具」标签页选择需要安装的 AI 编程工具：
- **Claude Code** - Anthropic 官方 AI 编程助手
- **CodeX** - OpenAI 官方代码生成工具
- **Gemini CLI** - Google Gemini 命令行工具

点击「安装」按钮即可自动安装。

### 2. 配置全局设置（可选）

如果你想使用用量统计和一键生成令牌功能：

1. 访问 [DuckCoding 控制台](https://duckcoding.com/console/token)
2. 点击右上角头像 → 个人中心
3. 获取「用户ID」和「系统访问令牌」
4. 在应用的「控制台」标签页点击「配置全局设置」填入

### 3. 配置 API

在「配置 API」标签页：

#### 方式一：一键生成（推荐）

1. **选择工具** - 选择要配置的工具
2. **点击「一键生成」** - 自动创建对应的专用分组令牌并配置

#### 方式二：手动配置

1. **选择工具** - 选择要配置的工具
2. **选择提供商**
   - **DuckCoding** - 使用 DuckCoding API（需要专用分组令牌）
   - **自定义** - 使用自己的 API 端点
3. **输入 API 密钥** - 填写你的 API 密钥
4. **保存配置** - 可选：为配置命名以便后续切换

### 4. 查看用量

在「控制台」标签页：
- **余额显示** - 查看账户总额度、已用额度、剩余额度
- **用量图表** - 查看最近30天的用量趋势
- **请求统计** - 查看总请求次数

### 5. 切换配置

在「切换配置」标签页：
- 查看所有已保存的配置
- 一键切换到不同的配置文件

## 🔑 关于 DuckCoding API 令牌

### 专用分组说明

DuckCoding 要求每个工具使用对应的专用分组令牌：

| 工具 | 必须选择的分组 |
|------|--------------|
| Claude Code | **Claude Code 专用分组** |
| CodeX | **CodeX 专用分组** |
| Gemini CLI | **Gemini CLI 专用分组** |

❌ **不能混用**：不同工具的专用分组令牌不能互相使用

✅ **一键生成**：应用会自动为你创建正确的专用分组令牌

### 手动获取令牌

如果需要手动创建令牌：

1. 访问 [DuckCoding 令牌管理](https://duckcoding.com/console/token)
2. 点击「创建令牌」
3. 选择对应工具的专用分组
4. 复制生成的令牌到应用中配置

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **桌面框架**: Tauri 2.0 (Rust)
- **图表**: Recharts
- **UI 组件**: Shadcn/ui + Radix UI
- **构建工具**: Vite

## 📖 配置文件说明

应用会在以下位置创建配置文件：

### Claude Code
- **位置**: `~/.claude/settings.json`
- **格式**: JSON
- 只更新 API 相关字段，保留其他自定义配置

### CodeX
- **位置**: `~/.codex/config.toml` + `~/.codex/auth.json`
- **格式**: TOML + JSON
- 保存模型提供商配置和认证信息

### Gemini CLI
- **位置**: `~/.gemini/.env` + `~/.gemini/settings.json`
- **格式**: ENV + JSON
- 保存环境变量和工具设置

## 🔒 隐私和安全

- ✅ **不收集用户数据** - 所有配置保存在本地
- ✅ **不上传配置文件** - 应用包不包含任何用户配置
- ✅ **安全存储** - 配置文件权限设置为仅所有者可读写 (0600)
- ✅ **开源透明** - 所有代码公开可审查

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [DuckCoding 官网](https://duckcoding.com)
- [DuckCoding 控制台](https://duckcoding.com/console)
- [Claude Code 文档](https://docs.claude.com/claude-code)
- [OpenAI CodeX](https://openai.com/codex)
- [Google Gemini](https://ai.google.dev)

## ⚠️ 免责声明

本工具仅用于简化 AI 编程工具的安装和配置流程，不提供 API 服务本身。使用第三方 API 服务时请遵守其服务条款。

---

<div align="center">

Made with ❤️ by DuckCoding

[官网](https://duckcoding.com) · [反馈问题](https://github.com/DuckCoding-dev/DuckCoding/issues)

</div>
