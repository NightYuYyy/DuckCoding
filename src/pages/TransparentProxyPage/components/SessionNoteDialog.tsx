// 会话备注编辑弹窗组件
// 允许用户为会话设置备注

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateSessionNote } from '@/lib/tauri-commands';

interface SessionNoteDialogProps {
  /** 弹窗开关状态 */
  open: boolean;
  /** 开关状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 会话 ID */
  sessionId: string;
  /** 当前备注 */
  currentNote: string | null;
  /** 备注更新成功回调 */
  onNoteUpdated: () => void;
}

/**
 * 会话备注编辑弹窗组件
 *
 * 功能：
 * - 显示和编辑会话备注
 * - 备注用于替代会话标识符显示
 */
export function SessionNoteDialog({
  open,
  onOpenChange,
  sessionId,
  currentNote,
  onNoteUpdated,
}: SessionNoteDialogProps) {
  const [note, setNote] = useState(currentNote || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 打开弹窗时重置状态
  useEffect(() => {
    if (open) {
      setNote(currentNote || '');
    }
  }, [open, currentNote]);

  /**
   * 保存备注按钮点击处理
   */
  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSessionNote(sessionId, note.trim() || null);
      toast({
        title: '备注已保存',
      });
      onNoteUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: '保存失败',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑会话备注</DialogTitle>
          <DialogDescription>设置备注后将替代会话标识符显示在列表中。</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <Label htmlFor="session-note">备注</Label>
          <Input
            id="session-note"
            placeholder="为此会话添加备注（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
          />
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
