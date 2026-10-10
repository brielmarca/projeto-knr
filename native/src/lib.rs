//! Read-only memory, sampled CPU, and system-drive telemetry. Wire shape: contracts/system-snapshot.ts.

use chrono::{DateTime, SecondsFormat, Utc};
use serde::Serialize;
use std::fmt;

mod storage;
pub use storage::StorageSnapshot;

#[cfg(target_os = "windows")]
mod windows;

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemorySnapshot {
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub usage_percent: f64,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuSnapshot {
    pub model: String,
    pub logical_core_count: u32,
    pub physical_core_count: u32,
    pub usage_percent: f64,
    pub sample_duration_ms: u64,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSnapshotV1 {
    pub schema_version: u8,
    pub collected_at: String,
    pub memory: Option<MemorySnapshot>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpu: Option<CpuSnapshot>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub storage: Option<StorageSnapshot>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum CollectionError {
    UnsupportedPlatform,
    WindowsApi { code: u32 },
    InvalidMemory,
    InvalidCpu,
    CpuWindowsApi { code: u32 },
    UnsupportedCpuTopology,
    StorageWindowsApi { code: u32 },
    InvalidStorage,
}

impl fmt::Display for CollectionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::StorageWindowsApi { code } => {
                write!(f, "System-drive collection failed (Win32 error {code})")
            }
            Self::InvalidStorage => {
                f.write_str("System-drive values violate the snapshot contract")
            }
            Self::UnsupportedPlatform => {
                f.write_str("System telemetry collection requires Windows")
            }
            Self::InvalidCpu => f.write_str("CPU measurements violate the snapshot contract"),
            Self::CpuWindowsApi { code } => write!(f, "CPU collection failed (Win32 error {code})"),
            Self::UnsupportedCpuTopology => {
                f.write_str("CPU sampling requires a single processor group")
            }
            Self::WindowsApi { code } => {
                write!(f, "GlobalMemoryStatusEx failed (Win32 error {code})")
            }
            Self::InvalidMemory => {
                f.write_str("Physical memory values violate the snapshot contract")
            }
        }
    }
}

impl std::error::Error for CollectionError {}

/// Collect a point-in-time v1 snapshot. Failures return an error, never fake data.
pub fn collect_system_snapshot() -> Result<SystemSnapshotV1, CollectionError> {
    let mut snapshot = snapshot_from_memory(collect_memory(), Utc::now())?;
    #[cfg(target_os = "windows")]
    {
        snapshot.cpu = Some(windows::cpu()?);
        snapshot.storage = Some(windows::system_drive_storage()?);
    }
    snapshot.collected_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    Ok(snapshot)
}

#[cfg(target_os = "windows")]
fn collect_memory() -> Result<(u64, u64), CollectionError> {
    windows::physical_memory()
}

#[cfg(not(target_os = "windows"))]
fn collect_memory() -> Result<(u64, u64), CollectionError> {
    Err(CollectionError::UnsupportedPlatform)
}

fn snapshot_from_memory(
    measurement: Result<(u64, u64), CollectionError>,
    collected_at: DateTime<Utc>,
) -> Result<SystemSnapshotV1, CollectionError> {
    let (total_bytes, available_bytes) = measurement?;
    if total_bytes == 0 || total_bytes > MAX_SAFE_INTEGER || available_bytes > total_bytes {
        return Err(CollectionError::InvalidMemory);
    }
    let used_bytes = total_bytes - available_bytes;
    Ok(SystemSnapshotV1 {
        schema_version: 1,
        cpu: None,
        storage: None,
        collected_at: collected_at.to_rfc3339_opts(SecondsFormat::Millis, true),
        memory: Some(MemorySnapshot {
            total_bytes,
            available_bytes,
            used_bytes,
            usage_percent: (used_bytes as f64 / total_bytes as f64) * 100.0,
        }),
    })
}

/// Windows kernel time includes idle time. Reject counter regressions and empty samples.
#[cfg(any(target_os = "windows", test))]
fn cpu_usage(before: [u64; 3], after: [u64; 3]) -> Result<f64, CollectionError> {
    let delta = |index: usize| {
        after[index]
            .checked_sub(before[index])
            .ok_or(CollectionError::InvalidCpu)
    };
    let idle = delta(0)?;
    let kernel = delta(1)?;
    let user = delta(2)?;
    let total = kernel
        .checked_add(user)
        .ok_or(CollectionError::InvalidCpu)?;
    if total == 0 || idle > kernel {
        return Err(CollectionError::InvalidCpu);
    }
    Ok((total - idle) as f64 / total as f64 * 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cpu_usage_accounts_for_idle_in_kernel_and_preserves_zero() {
        assert_eq!(cpu_usage([10, 20, 30], [30, 60, 70]), Ok(75.0));
        assert_eq!(cpu_usage([0; 3], [50, 50, 0]), Ok(0.0));
        assert_eq!(cpu_usage([0; 3], [0, 50, 50]), Ok(100.0));
        for (before, after) in [
            ([0; 3], [0; 3]),
            ([1; 3], [0; 3]),
            ([0; 3], [2, 1, 2]),
            ([0; 3], [0, u64::MAX, 1]),
        ] {
            assert_eq!(cpu_usage(before, after), Err(CollectionError::InvalidCpu));
        }
    }

    fn map(total: u64, available: u64) -> Result<SystemSnapshotV1, CollectionError> {
        snapshot_from_memory(
            Ok((total, available)),
            "2026-10-07T12:00:00Z".parse().unwrap(),
        )
    }

    #[test]
    fn serializes_to_shared_v1_contract_fixture() {
        let snapshot = map(16 * 1024_u64.pow(3), 4 * 1024_u64.pow(3)).unwrap();
        let expected: serde_json::Value = serde_json::from_str(include_str!(
            "../../contracts/fixtures/memory-snapshot.json"
        ))
        .unwrap();
        assert_eq!(serde_json::to_value(snapshot).unwrap(), expected);
    }

    #[test]
    fn serializes_cpu_to_shared_contract_fixture() {
        let mut snapshot = map(16 * 1024_u64.pow(3), 4 * 1024_u64.pow(3)).unwrap();
        snapshot.cpu = Some(CpuSnapshot {
            model: "Test CPU".into(),
            logical_core_count: 16,
            physical_core_count: 8,
            usage_percent: 25.125,
            sample_duration_ms: 251,
        });
        let expected: serde_json::Value = serde_json::from_str(include_str!(
            "../../contracts/fixtures/cpu-memory-snapshot.json"
        ))
        .unwrap();
        assert_eq!(serde_json::to_value(snapshot).unwrap(), expected);
    }

    #[test]
    fn preserves_zero_measurements_and_safe_integer_boundaries() {
        for (total, available) in [
            (1, 0),
            (1, 1),
            (MAX_SAFE_INTEGER, 0),
            (MAX_SAFE_INTEGER, MAX_SAFE_INTEGER),
            (MAX_SAFE_INTEGER, MAX_SAFE_INTEGER - 1),
        ] {
            let memory = map(total, available).unwrap().memory.unwrap();
            assert_eq!(memory.total_bytes, total);
            assert_eq!(memory.available_bytes, available);
            assert_eq!(memory.used_bytes, total - available);
            assert_eq!(
                memory.usage_percent,
                ((total - available) as f64 / total as f64) * 100.0
            );
        }
    }

    #[test]
    fn does_not_round_fractional_usage() {
        let memory = map(3, 1).unwrap().memory.unwrap();
        assert_eq!(memory.usage_percent, (2.0 / 3.0) * 100.0);
        assert_ne!(memory.usage_percent, 66.67);
    }

    #[test]
    fn rejects_invalid_measurements_without_clamping() {
        for (total, available) in [
            (0, 0),
            (0, 1),
            (1, 2),
            (MAX_SAFE_INTEGER + 1, 0),
            (u64::MAX, u64::MAX),
        ] {
            assert_eq!(map(total, available), Err(CollectionError::InvalidMemory));
        }
    }

    #[test]
    fn propagates_collection_errors_without_a_snapshot() {
        for code in [0, 5, 87] {
            let result =
                snapshot_from_memory(Err(CollectionError::WindowsApi { code }), Utc::now());
            assert_eq!(result, Err(CollectionError::WindowsApi { code }));
        }
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn non_windows_is_explicitly_unsupported() {
        assert_eq!(
            collect_system_snapshot(),
            Err(CollectionError::UnsupportedPlatform)
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn collects_real_physical_memory() {
        let snapshot = collect_system_snapshot().unwrap();
        let cpu = snapshot.cpu.unwrap();
        assert!(!cpu.model.trim().is_empty());
        assert!(cpu.physical_core_count > 0);
        assert!(cpu.logical_core_count >= cpu.physical_core_count);
        assert!((0.0..=100.0).contains(&cpu.usage_percent));
        assert!(cpu.sample_duration_ms >= 250);
        let storage = snapshot.storage.unwrap();
        assert!(storage.total_bytes > 0);
        assert!(storage.free_bytes <= storage.total_bytes);
        assert_eq!(storage.used_bytes, storage.total_bytes - storage.free_bytes);
        assert_eq!(
            storage.free_percent,
            storage.free_bytes as f64 / storage.total_bytes as f64 * 100.0
        );
        assert_eq!(storage.volume.len(), 2);
        let memory = snapshot.memory.unwrap();
        assert!(memory.total_bytes > 0);
        assert!(memory.available_bytes <= memory.total_bytes);
        assert_eq!(
            memory.used_bytes,
            memory.total_bytes - memory.available_bytes
        );
        assert!(snapshot.collected_at.parse::<DateTime<Utc>>().is_ok());
    }
}
