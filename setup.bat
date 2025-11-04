@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM DuckCoding 一键安装脚本 - Windows
REM 零依赖，自动安装所需环境

color 0B

echo.
echo ╔═══════════════════════════════════════╗
echo ║   DuckCoding 一键配置工具             ║
echo ║   Claude Code · CodeX · Gemini        ║
echo ╚═══════════════════════════════════════╝
echo.

echo [信息] 检测系统环境...
echo [信息] 操作系统: Windows
echo.

REM 检查 Node.js
echo [信息] 检查 Node.js 安装状态...
where node >nul 2>&1
if %errorlevel% == 0 (
    echo [成功] Node.js 已安装
    node -v
    goto :install_deps
)

echo [警告] Node.js 未安装
echo.
echo 此工具需要 Node.js 才能运行。
echo.
set /p INSTALL_NODE="是否打开 Node.js 下载页面? (Y/n): "

if /i "!INSTALL_NODE!" == "n" (
    echo [错误] 需要 Node.js 才能运行此工具
    echo [信息] 请访问 https://nodejs.org/ 手动安装
    pause
    exit /b 1
)

echo.
echo [信息] 正在打开 Node.js 下载页面...
start https://nodejs.org/
echo.
echo ====================================
echo 请按照以下步骤操作：
echo 1. 下载 LTS 版本（长期支持版）
echo 2. 运行安装程序，按默认设置安装
echo 3. 安装完成后，重新运行此脚本
echo ====================================
echo.
pause
exit /b 0

:install_deps
echo.
echo [信息] 检查项目依赖...

if not exist "package.json" (
    echo [错误] 找不到 package.json
    pause
    exit /b 1
)

if exist "node_modules" (
    echo [信息] 依赖已安装，跳过安装步骤
    goto :run_main
)

echo [信息] 正在安装项目依赖...
echo.
call npm install

if %errorlevel% neq 0 (
    echo.
    echo [错误] 依赖安装失败
    echo.
    echo 常见问题解决：
    echo 1. 检查网络连接
    echo 2. 尝试清除缓存: npm cache clean --force
    echo 3. 以管理员身份运行此脚本
    echo.
    pause
    exit /b 1
)

echo.
echo [成功] 依赖安装完成！

:run_main
echo.
echo [信息] 启动 DuckCoding 配置工具...
echo.

node cli.js

if %errorlevel% neq 0 (
    echo.
    echo [错误] 程序运行出错
    pause
    exit /b 1
)

pause
exit /b 0
