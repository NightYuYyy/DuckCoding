// 会话数据管理 Hook
// 提供定时轮询、删除和清空操作

import { useState, useEffect, useCallback } from 'react';
import {
  getSessionList,
  deleteSession,
  clearAllSessions,
  type SessionRecord,
} from '@/lib/tauri-commands';
import { useToast } from '@/hooks/use-toast';
import type { ToolId } from '../types/proxy-history';

/**
 * 会话数据管理 Hook
 *
 * 功能：
 * - 自动定时轮询（5 秒间隔）
 * - 提供删除和清空操作
 * - 管理 loading 状态
 * - 支持 null 参数（禁用时不加载数据）
 */
export function useSessionData(toolId: ToolId | null) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /**
   * 获取会话列表
   */
  const fetchSessions = useCallback(async () => {
    if (!toolId) return; // 禁用时不加载

    try {
      setLoading(true);
      const result = await getSessionList(toolId, 1, 50);
      setSessions(result.sessions);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      // 静默失败，避免频繁通知用户
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  /**
   * 删除单个会话
   */
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession(sessionId);
        toast({
          title: '删除成功',
          description: '会话记录已删除',
        });
        // 触发刷新
        setRefreshTrigger((prev) => prev + 1);
      } catch (error: any) {
        toast({
          title: '删除失败',
          description: error?.message || String(error),
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  /**
   * 清空所有会话
   */
  const handleClearAllSessions = useCallback(async () => {
    if (!toolId) return; // 禁用时不执行

    try {
      await clearAllSessions(toolId);
      toast({
        title: '清空成功',
        description: '所有会话记录已清空',
      });
      // 触发刷新
      setRefreshTrigger((prev) => prev + 1);
    } catch (error: any) {
      toast({
        title: '清空失败',
        description: error?.message || String(error),
        variant: 'destructive',
      });
    }
  }, [toolId, toast]);

  /**
   * 手动刷新
   */
  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // 定时轮询（5 秒间隔）+ 手动刷新触发
  useEffect(() => {
    if (!toolId) {
      // 禁用时清空数据
      setSessions([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    // 立即执行一次
    fetchSessions();

    // 每 5 秒轮询
    const interval = setInterval(fetchSessions, 5000);

    return () => clearInterval(interval);
  }, [fetchSessions, refreshTrigger, toolId]);

  return {
    sessions,
    total,
    loading,
    deleteSession: handleDeleteSession,
    clearAllSessions: handleClearAllSessions,
    refresh,
  };
}
