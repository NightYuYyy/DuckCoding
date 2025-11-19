pub mod error;
pub mod http;
pub mod log_utils;
pub mod logger;

// 导出核心类型
pub use error::{AppError, AppResult, ErrorContext};
pub use http::{build_http_client, get_global_client};
pub use log_utils::{LogContext, Timer};
pub use logger::{init_logger, set_log_level, LogConfig, LogLevel};

// 重新导出 tracing 核心功能
pub use tracing::{debug, error, info, instrument, span, trace, warn, Level};
