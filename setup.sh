#!/bin/bash

# DuckCoding 一键安装脚本 - macOS/Linux
# 零依赖，自动安装所需环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logo
print_logo() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════╗"
    echo "║   DuckCoding 一键配置工具             ║"
    echo "║   Claude Code · CodeX · Gemini        ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检测系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO=$ID
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        OS="unknown"
    fi
}

# 检查 Node.js
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js 已安装: $NODE_VERSION"
        return 0
    else
        print_warning "Node.js 未安装"
        return 1
    fi
}

# 安装 Node.js - macOS
install_node_macos() {
    print_info "正在为 macOS 安装 Node.js..."

    # 检查 Homebrew
    if command -v brew &> /dev/null; then
        print_info "使用 Homebrew 安装 Node.js..."
        brew install node
    else
        print_warning "Homebrew 未安装，正在安装 Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # 添加 Homebrew 到 PATH
        if [[ $(uname -m) == 'arm64' ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/usr/local/bin/brew shellenv)"
        fi

        brew install node
    fi
}

# 安装 Node.js - Linux
install_node_linux() {
    print_info "正在为 Linux 安装 Node.js..."

    if [[ "$DISTRO" == "ubuntu" ]] || [[ "$DISTRO" == "debian" ]]; then
        # Ubuntu/Debian
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$DISTRO" == "centos" ]] || [[ "$DISTRO" == "rhel" ]] || [[ "$DISTRO" == "fedora" ]]; then
        # CentOS/RHEL/Fedora
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo yum install -y nodejs
    else
        print_error "不支持的 Linux 发行版: $DISTRO"
        print_info "请手动安装 Node.js: https://nodejs.org/"
        exit 1
    fi
}

# 安装 Node.js
install_node() {
    if [[ "$OS" == "macos" ]]; then
        install_node_macos
    elif [[ "$OS" == "linux" ]]; then
        install_node_linux
    else
        print_error "不支持的操作系统"
        exit 1
    fi

    # 验证安装
    if check_node; then
        print_success "Node.js 安装成功！"
    else
        print_error "Node.js 安装失败"
        exit 1
    fi
}

# 安装项目依赖
install_dependencies() {
    print_info "正在安装项目依赖..."

    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    cd "$SCRIPT_DIR"

    if [ ! -f "package.json" ]; then
        print_error "找不到 package.json"
        exit 1
    fi

    npm install
    print_success "依赖安装完成！"
}

# 运行主程序
run_main() {
    print_info "启动 DuckCoding 配置工具..."
    echo ""
    node cli.js
}

# 主流程
main() {
    clear
    print_logo

    print_info "检测系统环境..."
    detect_os
    print_info "操作系统: $OS"

    echo ""

    # 检查并安装 Node.js
    if ! check_node; then
        echo ""
        read -p "$(echo -e ${YELLOW}是否自动安装 Node.js? [Y/n]: ${NC})" -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
            install_node
        else
            print_error "需要 Node.js 才能运行此工具"
            print_info "请访问 https://nodejs.org/ 手动安装"
            exit 1
        fi
    fi

    echo ""

    # 安装依赖
    install_dependencies

    echo ""

    # 运行主程序
    run_main
}

# 错误处理
trap 'print_error "安装过程中出现错误"; exit 1' ERR

# 执行主流程
main
