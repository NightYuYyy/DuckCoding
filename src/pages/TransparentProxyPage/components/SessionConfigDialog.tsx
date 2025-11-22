// 会话配置切换弹窗组件
// 允许用户选择会话使用的 API 配置

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useSessionConfigManagement } from '../hooks/useSessionConfigManagement';

interface SessionConfigDialogProps {
  /** 弹窗开关状态 */
  open: boolean;
  /** 开关状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 会话 ID */
  sessionId: string;
  /** 当前配置名称 */
  currentConfig: string;
  /** 当前自定义配置名称 */
  currentCustomProfileName: string | null;
  /** 配置更新成功回调 */
  onConfigUpdated: () => void;
}

/**
 * 会话配置切换弹窗组件
 *
 * 功能：
 * - 显示可用配置列表（global + 配置文件）
 * - 用户选择配置后保存
 * - 保存成功后刷新会话列表
 */
export function SessionConfigDialog({
  open,
  onOpenChange,
  sessionId,
  currentConfig,
  currentCustomProfileName,
  onConfigUpdated,
}: SessionConfigDialogProps) {
  // 配置选择状态：对于 custom 配置，使用 custom_profile_name 作为选中值
  const [selectedConfig, setSelectedConfig] = useState(
    currentConfig === 'custom' && currentCustomProfileName
      ? currentCustomProfileName
      : currentConfig,
  );
  const { profiles, loading, loadProfiles, applyConfig } = useSessionConfigManagement();
  const { toast } = useToast();

  // 打开弹窗时加载配置列表和重置状态
  useEffect(() => {
    if (open) {
      setSelectedConfig(
        currentConfig === 'custom' && currentCustomProfileName
          ? currentCustomProfileName
          : currentConfig,
      );
      loadProfiles();
    }
  }, [open, currentConfig, currentCustomProfileName, loadProfiles]);

  /**
   * 保存配置按钮点击处理
   */
  const handleSave = async () => {
    const result = await applyConfig(sessionId, selectedConfig);
    if (result.success) {
      toast({
        title: '配置已更新',
        description: '下一个请求将使用新配置',
      });
      onConfigUpdated();
      onOpenChange(false);
    } else {
      toast({
        title: '配置更新失败',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>切换会话配置</DialogTitle>
          <DialogDescription>
            选择此会话使用的 API 配置。保存后立即生效，下一个请求将使用新配置。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedConfig} onValueChange={setSelectedConfig}>
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div key={profile} className="flex items-center space-x-2">
                  <RadioGroupItem value={profile} id={`profile-${profile}`} />
                  <Label
                    htmlFor={`profile-${profile}`}
                    className="flex-1 cursor-pointer text-sm font-normal"
                  >
                    {profile === 'global' ? (
                      <span className="flex items-center gap-2">
                        <span className="font-medium">全局默认配置</span>
                        <span className="text-xs text-muted-foreground">(跟随透明代理设置)</span>
                      </span>
                    ) : (
                      <span className="font-medium">{profile}</span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          {profiles.length === 1 && (
            <p className="text-sm text-muted-foreground mt-4">
              暂无自定义配置文件，可在配置页面创建新配置。
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
