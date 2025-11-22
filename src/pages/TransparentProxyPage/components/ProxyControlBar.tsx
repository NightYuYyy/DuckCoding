// 代理控制条组件
// 提供代理启动/停止控制按钮和代理详情显示

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Power, AlertCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { ToolMetadata, ToolId } from '../types/proxy-history';
import { getActiveConfig, type ToolProxyConfig } from '@/lib/tauri-commands';

interface ProxyControlBarProps {
  /** 工具元数据 */
  tool: ToolMetadata;
  /** 代理是否运行中 */
  isRunning: boolean;
  /** 代理端口 */
  port: number | null;
  /** 是否加载中（启动中或停止中） */
  isLoading: boolean;
  /** 是否已配置（有 API Key） */
  isConfigured: boolean;
  /** 工具代理配置 */
  config: ToolProxyConfig | null;
  /** 启动代理回调 */
  onStart: () => void;
  /** 停止代理回调 */
  onStop: () => void;
}

/**
 * 遮蔽 API Key，只显示前后各4位
 */
function maskApiKey(apiKey: string | null | undefined): string {
  if (!apiKey) return '未配置';
  if (apiKey.length <= 12) return '****';
  return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`;
}

/**
 * 代理详情组件（可折叠）
 */
function ProxyDetails({ config, port }: { config: ToolProxyConfig | null; port: number | null }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const proxyUrl = port ? `http://127.0.0.1:${port}` : '未启动';
  const baseUrl = config?.real_base_url || '跟随主配置';
  const apiKey = config?.real_api_key;
  const localApiKey = config?.local_api_key;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {/* 代理地址 */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">代理地址</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono truncate">
              {proxyUrl}
            </code>
            {port && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(proxyUrl, 'proxyUrl')}
                title="复制"
              >
                {copiedField === 'proxyUrl' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 保护密钥 */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">保护密钥</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono truncate">
              {maskApiKey(localApiKey)}
            </code>
            {localApiKey && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(localApiKey, 'localApiKey')}
                title="复制"
              >
                {copiedField === 'localApiKey' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 上游 Base URL */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">上游 Base URL</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono truncate">
              {baseUrl}
            </code>
            {config?.real_base_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(config.real_base_url!, 'baseUrl')}
                title="复制"
              >
                {copiedField === 'baseUrl' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 上游 API Key */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">上游 API Key</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono truncate">
              {maskApiKey(apiKey)}
            </code>
            <span title="为了安全不支持复制">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground/50 cursor-not-allowed"
                disabled
              >
                <Copy className="h-3 w-3" />
              </Button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 代理控制条组件
 *
 * 功能：
 * - 显示当前工具的代理运行状态
 * - 提供启动/停止代理按钮
 * - 代理运行时显示可折叠的详情区域
 */
export function ProxyControlBar({
  tool,
  isRunning,
  port,
  isLoading,
  isConfigured,
  config,
  onStart,
  onStop,
}: ProxyControlBarProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  return (
    <div
      className={`p-4 rounded-lg border-2 mb-6 transition-all ${
        isRunning
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-300 dark:border-blue-700'
          : 'bg-muted/30 border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* 左侧：状态信息 */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{tool.name} 透明代理</h4>
              <Badge variant={isRunning ? 'default' : 'secondary'} className="text-xs">
                {isRunning ? `运行中 (端口 ${port})` : '已停止'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRunning
                ? `代理地址：http://127.0.0.1:${port}`
                : isConfigured
                  ? '点击「启动代理」开始使用'
                  : '请先在全局设置中配置透明代理'}
            </p>
          </div>
        </div>

        {/* 右侧：控制按钮 */}
        <div className="flex items-center gap-2">
          {!isConfigured && !isRunning && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 mr-2">
              <AlertCircle className="h-3 w-3" />
              <span>未配置</span>
            </div>
          )}

          {/* 详情展开/折叠按钮（仅运行时显示） */}
          {isRunning && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="h-8 px-2"
              title={detailsExpanded ? '收起详情' : '展开详情'}
            >
              {detailsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}

          {isRunning ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStop}
              disabled={isLoading}
              className="h-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  停止中...
                </>
              ) : (
                <>
                  <Power className="h-3 w-3 mr-1" />
                  停止代理
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onStart}
              disabled={isLoading || !isConfigured}
              className="h-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  启动中...
                </>
              ) : (
                <>
                  <Power className="h-3 w-3 mr-1" />
                  启动代理
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 代理详情（可折叠） */}
      {isRunning && detailsExpanded && <ProxyDetails config={config} port={port} />}
    </div>
  );
}
