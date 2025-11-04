const fs = require('fs');
const path = require('path');
const os = require('os');
const { readJsonFile, writeJsonFile } = require('./utils');

// 全局配置目录
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.duckcoding');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');

/**
 * 确保全局配置目录存在
 */
function ensureGlobalConfigDir() {
  if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  }
}

/**
 * 保存全局配置
 * @param {Object} config - { userId: string, systemToken: string }
 */
function saveGlobalConfig(config) {
  ensureGlobalConfigDir();
  writeJsonFile(GLOBAL_CONFIG_FILE, config);
}

/**
 * 读取全局配置
 * @returns {Object|null} { userId: string, systemToken: string } 或 null
 */
function getGlobalConfig() {
  if (!fs.existsSync(GLOBAL_CONFIG_FILE)) {
    return null;
  }
  return readJsonFile(GLOBAL_CONFIG_FILE);
}

/**
 * 检查全局配置是否完整
 * @returns {boolean}
 */
function hasValidGlobalConfig() {
  const config = getGlobalConfig();
  return config && config.userId && config.systemToken;
}

module.exports = {
  saveGlobalConfig,
  getGlobalConfig,
  hasValidGlobalConfig,
  GLOBAL_CONFIG_DIR,
  GLOBAL_CONFIG_FILE
};
