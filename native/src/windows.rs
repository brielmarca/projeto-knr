use crate::{cpu_usage, CollectionError, CpuSnapshot};
use std::time::{Duration, Instant};
use windows_sys::Win32::Foundation::{GetLastError, FILETIME};
use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;
use windows_sys::Win32::System::Registry::{RegGetValueW, HKEY_LOCAL_MACHINE, RRF_RT_REG_SZ};
use windows_sys::Win32::System::SystemInformation::{
    GetLogicalProcessorInformation, GetSystemWindowsDirectoryW, GlobalMemoryStatusEx,
    RelationProcessorCore, MEMORYSTATUSEX, SYSTEM_LOGICAL_PROCESSOR_INFORMATION,
};
use windows_sys::Win32::System::Threading::{GetActiveProcessorGroupCount, GetSystemTimes};

pub(super) fn system_drive_storage() -> Result<crate::StorageSnapshot, CollectionError> {
    // Bounded UTF-16 output buffer; no environment variables or user-supplied paths.
    let mut directory = vec![0_u16; 32768];
    // SAFETY: initialized writable storage with capacity supplied in UTF-16 units.
    // Windows does not retain this pointer.
    let length =
        unsafe { GetSystemWindowsDirectoryW(directory.as_mut_ptr(), directory.len() as u32) };
    if length == 0 {
        return Err(CollectionError::StorageWindowsApi {
            code: unsafe { GetLastError() },
        });
    }
    if length as usize >= directory.len() || directory[length as usize] != 0 {
        return Err(CollectionError::InvalidStorage);
    }
    let volume = crate::storage::system_drive_volume(&directory[..length as usize])?;
    let root: Vec<u16> = format!("{volume}\\\0").encode_utf16().collect();
    let mut total_bytes = 0;
    let mut free_bytes = 0;
    // SAFETY: root is an absolute NUL-terminated drive root; outputs are writable
    // u64s that live through the call. The unused volume-wide free output is null.
    // Pair caller-available free space with caller-available total capacity so
    // quotas cannot produce freeBytes > totalBytes or misleading derived usage.
    if unsafe {
        GetDiskFreeSpaceExW(
            root.as_ptr(),
            &mut free_bytes,
            &mut total_bytes,
            std::ptr::null_mut(),
        )
    } == 0
    {
        return Err(CollectionError::StorageWindowsApi {
            code: unsafe { GetLastError() },
        });
    }
    crate::StorageSnapshot::from_measurement(volume, total_bytes, free_bytes)
}

pub(super) fn cpu() -> Result<CpuSnapshot, CollectionError> {
    // GetSystemTimes only covers the calling thread's group on multi-group hosts.
    // Refuse those hosts rather than label a partial measurement as system usage.
    // SAFETY: this read-only query takes no pointers or handles.
    if unsafe { GetActiveProcessorGroupCount() } != 1 {
        return Err(CollectionError::UnsupportedCpuTopology);
    }
    let model = cpu_model()?;
    let (logical_core_count, physical_core_count) = core_counts()?;
    let before = cpu_times()?;
    let started = Instant::now();
    std::thread::sleep(Duration::from_millis(250));
    let after = cpu_times()?;
    let sample_duration_ms =
        u64::try_from(started.elapsed().as_millis()).map_err(|_| CollectionError::InvalidCpu)?;
    if sample_duration_ms == 0 || sample_duration_ms > crate::MAX_SAFE_INTEGER {
        return Err(CollectionError::InvalidCpu);
    }
    Ok(CpuSnapshot {
        model,
        logical_core_count,
        physical_core_count,
        usage_percent: cpu_usage(before, after)?,
        sample_duration_ms,
    })
}

fn cpu_times() -> Result<[u64; 3], CollectionError> {
    let mut idle = FILETIME::default();
    let mut kernel = FILETIME::default();
    let mut user = FILETIME::default();
    // SAFETY: all three initialized outputs live through the synchronous call.
    if unsafe { GetSystemTimes(&mut idle, &mut kernel, &mut user) } == 0 {
        return Err(CollectionError::CpuWindowsApi {
            code: unsafe { GetLastError() },
        });
    }
    Ok([idle, kernel, user]
        .map(|time| (u64::from(time.dwHighDateTime) << 32) | u64::from(time.dwLowDateTime)))
}

fn cpu_model() -> Result<String, CollectionError> {
    let path: Vec<u16> = "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0\0"
        .encode_utf16()
        .collect();
    let name: Vec<u16> = "ProcessorNameString\0".encode_utf16().collect();
    let mut buffer = [0_u16; 513];
    let mut bytes = std::mem::size_of_val(&buffer) as u32;
    // SAFETY: NUL-terminated constant names and a writable buffer with its exact
    // byte capacity. RegGetValueW opens/closes the subkey and only reads REG_SZ.
    let result = unsafe {
        RegGetValueW(
            HKEY_LOCAL_MACHINE,
            path.as_ptr(),
            name.as_ptr(),
            RRF_RT_REG_SZ,
            std::ptr::null_mut(),
            buffer.as_mut_ptr().cast(),
            &mut bytes,
        )
    };
    if result != 0 {
        return Err(CollectionError::CpuWindowsApi { code: result });
    }
    let length = bytes as usize / 2;
    if bytes % 2 != 0 || length == 0 || length > buffer.len() || buffer[length - 1] != 0 {
        return Err(CollectionError::InvalidCpu);
    }
    let model = String::from_utf16(&buffer[..length - 1])
        .map_err(|_| CollectionError::InvalidCpu)?
        .trim()
        .to_owned();
    if model.is_empty() || model.contains('\0') {
        return Err(CollectionError::InvalidCpu);
    }
    Ok(model)
}

fn core_counts() -> Result<(u32, u32), CollectionError> {
    // Bounded, aligned storage; ample for the supported single processor group.
    let mut entries = vec![SYSTEM_LOGICAL_PROCESSOR_INFORMATION::default(); 4096];
    let entry_size = std::mem::size_of::<SYSTEM_LOGICAL_PROCESSOR_INFORMATION>();
    let capacity = entries.len() * entry_size;
    let mut bytes = capacity as u32;
    // SAFETY: initialized and aligned storage, exact byte capacity, no retained pointer.
    if unsafe { GetLogicalProcessorInformation(entries.as_mut_ptr(), &mut bytes) } == 0 {
        return Err(CollectionError::CpuWindowsApi {
            code: unsafe { GetLastError() },
        });
    }
    if bytes as usize > capacity || bytes as usize % entry_size != 0 {
        return Err(CollectionError::InvalidCpu);
    }
    let mut physical = 0;
    let mut mask = 0_usize;
    for entry in &entries[..bytes as usize / entry_size] {
        if entry.Relationship == RelationProcessorCore {
            if entry.ProcessorMask == 0 || mask & entry.ProcessorMask != 0 {
                return Err(CollectionError::InvalidCpu);
            }
            physical += 1;
            mask |= entry.ProcessorMask;
        }
    }
    if physical == 0 {
        return Err(CollectionError::InvalidCpu);
    }
    Ok((mask.count_ones(), physical))
}

pub(super) fn physical_memory() -> Result<(u64, u64), CollectionError> {
    let mut status = MEMORYSTATUSEX {
        dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
        ..Default::default()
    };
    // SAFETY: status is initialized, correctly sized, writable, and lives through
    // this synchronous call. Windows does not retain the pointer.
    if unsafe { GlobalMemoryStatusEx(&mut status) } == 0 {
        // SAFETY: read this thread's error immediately after the failed API call.
        return Err(CollectionError::WindowsApi {
            code: unsafe { GetLastError() },
        });
    }
    Ok((status.ullTotalPhys, status.ullAvailPhys))
}
