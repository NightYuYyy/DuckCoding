pub mod events;
pub mod tray;
pub mod window;

// 导出窗口管理函数
pub use window::{focus_main_window, hide_window_to_tray, restore_window_state};

// 导出托盘管理函数
pub use tray::create_tray_menu;

// 导出事件常量和函数
pub use events::{
    emit_close_confirm, emit_single_instance, SingleInstancePayload, CLOSE_CONFIRM_EVENT,
    SINGLE_INSTANCE_EVENT,
};
