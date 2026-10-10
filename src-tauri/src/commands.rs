use krz_telemetry::{CollectionError, SystemSnapshotV1};
use serde::Serialize;

/// Stable IPC failures. Internal worker/panic details never cross the boundary.
#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "code", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SnapshotError {
    UnsupportedPlatform,
    WindowsApi {
        #[serde(rename = "win32Code")]
        win32_code: u32,
    },
    InvalidMemory,
    InvalidCpu,
    CpuWindowsApi {
        #[serde(rename = "win32Code")]
        win32_code: u32,
    },
    UnsupportedCpuTopology,
    StorageWindowsApi {
        #[serde(rename = "win32Code")]
        win32_code: u32,
    },
    InvalidStorage,
    CollectionTaskFailed,
}

impl From<CollectionError> for SnapshotError {
    fn from(error: CollectionError) -> Self {
        match error {
            CollectionError::UnsupportedPlatform => Self::UnsupportedPlatform,
            CollectionError::WindowsApi { code } => Self::WindowsApi { win32_code: code },
            CollectionError::InvalidMemory => Self::InvalidMemory,
            CollectionError::InvalidCpu => Self::InvalidCpu,
            CollectionError::CpuWindowsApi { code } => Self::CpuWindowsApi { win32_code: code },
            CollectionError::UnsupportedCpuTopology => Self::UnsupportedCpuTopology,
            CollectionError::StorageWindowsApi { code } => {
                Self::StorageWindowsApi { win32_code: code }
            }
            CollectionError::InvalidStorage => Self::InvalidStorage,
        }
    }
}

/// Read-only, argument-free IPC. The native collector runs on a blocking worker,
/// not the webview thread or an async executor worker.
#[tauri::command]
pub async fn collect_system_snapshot() -> Result<SystemSnapshotV1, SnapshotError> {
    collect_on_worker(krz_telemetry::collect_system_snapshot).await
}

async fn collect_on_worker(
    collect: impl FnOnce() -> Result<SystemSnapshotV1, CollectionError> + Send + 'static,
) -> Result<SystemSnapshotV1, SnapshotError> {
    tauri::async_runtime::spawn_blocking(collect)
        .await
        .map_err(|_| SnapshotError::CollectionTaskFailed)?
        .map_err(SnapshotError::from)
}

#[cfg(test)]
mod tests {
    use super::*;
    use krz_telemetry::{CpuSnapshot, MemorySnapshot, StorageSnapshot};
    use serde_json::json;

    #[test]
    fn worker_preserves_snapshot_wire_shape_and_runs_on_another_thread() {
        tauri::async_runtime::block_on(async {
            let caller = std::thread::current().id();
            let snapshot = collect_on_worker(move || {
                assert_ne!(std::thread::current().id(), caller);
                Ok(SystemSnapshotV1 {
                    schema_version: 1,
                    storage: Some(StorageSnapshot {
                        volume: "C:".into(),
                        total_bytes: 549_755_813_888,
                        free_bytes: 137_438_953_472,
                        used_bytes: 412_316_860_416,
                        free_percent: 25.0,
                    }),
                    cpu: Some(CpuSnapshot {
                        model: "Test CPU".into(),
                        logical_core_count: 16,
                        physical_core_count: 8,
                        usage_percent: 25.125,
                        sample_duration_ms: 251,
                    }),
                    collected_at: "2026-10-07T12:00:00.000Z".into(),
                    memory: Some(MemorySnapshot {
                        total_bytes: 17_179_869_184,
                        available_bytes: 4_294_967_296,
                        used_bytes: 12_884_901_888,
                        usage_percent: 75.0,
                    }),
                })
            })
            .await
            .unwrap();
            let fixture: serde_json::Value = serde_json::from_str(include_str!(
                "../../contracts/fixtures/system-snapshot.json"
            ))
            .unwrap();
            assert_eq!(serde_json::to_value(snapshot).unwrap(), fixture);
        });
    }

    #[test]
    fn collection_failures_have_stable_structured_payloads() {
        for (error, expected) in [
            (
                CollectionError::StorageWindowsApi { code: 5 },
                json!({ "code": "STORAGE_WINDOWS_API", "win32Code": 5 }),
            ),
            (
                CollectionError::InvalidStorage,
                json!({ "code": "INVALID_STORAGE" }),
            ),
            (
                CollectionError::UnsupportedPlatform,
                json!({ "code": "UNSUPPORTED_PLATFORM" }),
            ),
            (
                CollectionError::WindowsApi { code: 5 },
                json!({ "code": "WINDOWS_API", "win32Code": 5 }),
            ),
            (
                CollectionError::InvalidMemory,
                json!({ "code": "INVALID_MEMORY" }),
            ),
            (
                CollectionError::InvalidCpu,
                json!({ "code": "INVALID_CPU" }),
            ),
            (
                CollectionError::CpuWindowsApi { code: 5 },
                json!({ "code": "CPU_WINDOWS_API", "win32Code": 5 }),
            ),
            (
                CollectionError::UnsupportedCpuTopology,
                json!({ "code": "UNSUPPORTED_CPU_TOPOLOGY" }),
            ),
        ] {
            let result = tauri::async_runtime::block_on(collect_on_worker(|| Err(error)));
            assert_eq!(serde_json::to_value(result.unwrap_err()).unwrap(), expected);
        }
    }

    #[test]
    fn worker_panic_is_a_structured_error_without_panic_details() {
        let result = tauri::async_runtime::block_on(collect_on_worker(|| {
            panic!("private worker failure details");
        }));
        assert_eq!(
            serde_json::to_value(result.unwrap_err()).unwrap(),
            json!({ "code": "COLLECTION_TASK_FAILED" })
        );
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn command_preserves_unsupported_platform() {
        assert_eq!(
            tauri::async_runtime::block_on(collect_system_snapshot()),
            Err(SnapshotError::UnsupportedPlatform)
        );
    }
}
