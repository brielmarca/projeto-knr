use crate::CollectionError;
use windows_sys::Win32::Foundation::GetLastError;
use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};

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
