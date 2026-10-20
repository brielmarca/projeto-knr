use serde::Serialize;

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSnapshot {
    pub pid: u32,
    pub name: String,
    pub working_set_bytes: u64,
}

#[cfg(any(target_os = "windows", test))]
const MAX_PROCESSES: usize = 128;

/// Keep only the largest readable working sets, with a stable PID tie-breaker.
/// Failed per-process reads are absent, never fabricated zero measurements.
#[cfg(any(target_os = "windows", test))]
fn bounded_processes(
    readings: impl IntoIterator<Item = Option<ProcessSnapshot>>,
) -> Vec<ProcessSnapshot> {
    let mut processes = Vec::with_capacity(MAX_PROCESSES + 1);
    for process in readings.into_iter().flatten() {
        if process.pid == 0
            || process.working_set_bytes > crate::MAX_SAFE_INTEGER
            || process.name.trim().is_empty()
            || process.name.encode_utf16().count() > 260
            || process
                .name
                .chars()
                .any(|c| c <= '\u{1f}' || c == '\u{7f}' || c == '/' || c == '\\')
        {
            continue;
        }
        processes.push(process);
        processes.sort_unstable_by(|a, b| {
            b.working_set_bytes
                .cmp(&a.working_set_bytes)
                .then(a.pid.cmp(&b.pid))
        });
        processes.truncate(MAX_PROCESSES);
    }
    processes
}

#[cfg(target_os = "windows")]
pub(super) fn collect() -> Result<Vec<ProcessSnapshot>, crate::CollectionError> {
    use windows_sys::Win32::Foundation::GetLastError;
    use windows_sys::Win32::System::ProcessStatus::K32EnumProcesses;

    // Fixed upper bound on allocation and per-process work. A full buffer may be
    // truncated by Windows: fail explicitly rather than claim a complete top list.
    let mut pids = vec![0_u32; 65_536];
    let capacity = std::mem::size_of_val(pids.as_slice()) as u32;
    let mut bytes = 0;
    // SAFETY: writable aligned buffer, exact byte capacity, valid output pointer.
    if unsafe { K32EnumProcesses(pids.as_mut_ptr(), capacity, &mut bytes) } == 0 {
        return Err(crate::CollectionError::ProcessWindowsApi {
            code: unsafe { GetLastError() },
        });
    }
    if bytes >= capacity || bytes % 4 != 0 {
        return Err(crate::CollectionError::InvalidProcesses);
    }
    pids.truncate(bytes as usize / 4);
    pids.sort_unstable();
    pids.dedup();
    Ok(bounded_processes(pids.into_iter().map(read_process)))
}

#[cfg(target_os = "windows")]
fn read_process(pid: u32) -> Option<ProcessSnapshot> {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::System::ProcessStatus::{
        K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS,
    };
    use windows_sys::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_VM_READ,
    };

    struct ProcessHandle(HANDLE);
    impl Drop for ProcessHandle {
        fn drop(&mut self) {
            // SAFETY: owns a successfully opened handle, closed exactly once.
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
    if pid == 0 {
        return None;
    }
    // SAFETY: read-only access, no inheritance, no debug privilege or elevation.
    let raw = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, 0, pid) };
    if raw.is_null() {
        return None;
    }
    let handle = ProcessHandle(raw);
    let mut path = vec![0_u16; 32768];
    let mut length = path.len() as u32;
    // SAFETY: owned handle and writable UTF-16 buffer with its actual capacity.
    if unsafe { QueryFullProcessImageNameW(handle.0, 0, path.as_mut_ptr(), &mut length) } == 0
        || length == 0
        || length as usize >= path.len()
    {
        return None;
    }
    let path = String::from_utf16(&path[..length as usize]).ok()?;
    // Resolve name from the same handle as memory, avoiding PID-reuse name races.
    let name = path.rsplit(['\\', '/']).next()?.to_owned();
    let mut counters = PROCESS_MEMORY_COUNTERS {
        cb: std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
        ..Default::default()
    };
    // SAFETY: initialized correctly sized writable counters and owned process handle.
    if unsafe {
        K32GetProcessMemoryInfo(
            handle.0,
            &mut counters,
            std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
        )
    } == 0
    {
        return None;
    }
    Some(ProcessSnapshot {
        pid,
        name,
        working_set_bytes: counters.WorkingSetSize as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn reading(pid: u32, bytes: u64) -> Option<ProcessSnapshot> {
        Some(ProcessSnapshot {
            pid,
            name: "test.exe".into(),
            working_set_bytes: bytes,
        })
    }

    #[test]
    fn serializes_to_shared_process_fixture() {
        let mut snapshot =
            crate::snapshot_from_memory(Ok((1, 1)), "2026-10-07T12:00:00Z".parse().unwrap())
                .unwrap();
        snapshot.memory = None;
        snapshot.processes = Some(
            [
                (12, "large.exe", 5_368_709_120),
                (4, "test.exe", 1024),
                (8, "test.exe", 1024),
                (16, "idle.exe", 0),
            ]
            .into_iter()
            .map(|(pid, name, working_set_bytes)| ProcessSnapshot {
                pid,
                name: name.into(),
                working_set_bytes,
            })
            .collect(),
        );
        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../contracts/fixtures/process-snapshot.json"
        ))
        .unwrap();
        assert_eq!(serde_json::to_value(snapshot).unwrap(), fixture);
    }

    #[test]
    fn caps_after_ranking_and_breaks_ties_by_pid() {
        let result = bounded_processes((1..=200).rev().map(|pid| reading(pid, 42)));
        assert_eq!(result.len(), MAX_PROCESSES);
        assert_eq!(result.first().unwrap().pid, 1);
        assert_eq!(result.last().unwrap().pid, 128);
        let result = bounded_processes((1..=200).map(|pid| reading(pid, u64::from(pid))));
        assert_eq!(result.first().unwrap().pid, 200);
        assert_eq!(result.last().unwrap().pid, 73);
    }

    #[test]
    fn skips_failed_reads_and_invalid_values_but_keeps_real_zero() {
        let result = bounded_processes([
            None,
            reading(1, 0),
            None,
            reading(2, crate::MAX_SAFE_INTEGER),
            reading(3, u64::MAX),
            reading(0, 1),
        ]);
        assert_eq!(
            result,
            vec![
                reading(2, crate::MAX_SAFE_INTEGER).unwrap(),
                reading(1, 0).unwrap()
            ]
        );
        assert!(bounded_processes([None, None]).is_empty());
        for name in ["", " ", "bad\0name", "C:\\path.exe", "bad\nname"] {
            assert!(bounded_processes([Some(ProcessSnapshot {
                pid: 1,
                name: name.into(),
                working_set_bytes: 0
            })])
            .is_empty());
        }
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn reads_current_process_and_enumerates_without_elevation() {
        let current = read_process(std::process::id()).unwrap();
        assert_eq!(current.pid, std::process::id());
        assert!(!current.name.is_empty());
        assert!(current.working_set_bytes > 0);
        assert!(read_process(0).is_none());
        assert!(read_process(u32::MAX).is_none());
        let processes = collect().unwrap();
        assert!(!processes.is_empty());
        assert!(processes.len() <= MAX_PROCESSES);
        assert!(processes
            .windows(2)
            .all(|p| p[0].working_set_bytes > p[1].working_set_bytes
                || (p[0].working_set_bytes == p[1].working_set_bytes && p[0].pid < p[1].pid)));
    }
}
