// 更新服务模块
//
// 包含应用自身的更新检查、下载、安装等功能

pub mod update_service;

// 直接从 models 导入并重新导出类型
pub use crate::models::update::{UpdateInfo, UpdateStatus};
pub use update_service::UpdateService;
