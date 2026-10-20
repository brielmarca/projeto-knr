use serde::Serialize;

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuSnapshot {
    pub name: String,
    pub manufacturer: Option<String>,
    pub vram_bytes: Option<u64>,
}

#[cfg(any(target_os = "windows", test))]
fn from_description(
    description: &[u16],
    vendor: u32,
    dedicated_bytes: u64,
) -> Result<GpuSnapshot, crate::CollectionError> {
    let end = description
        .iter()
        .position(|&c| c == 0)
        .ok_or(crate::CollectionError::InvalidGpu)?;
    let name =
        String::from_utf16(&description[..end]).map_err(|_| crate::CollectionError::InvalidGpu)?;
    let name = name.trim();
    if name.is_empty()
        || name.encode_utf16().count() > 128
        || name.chars().any(|c| c <= '\u{1f}' || c == '\u{7f}')
    {
        return Err(crate::CollectionError::InvalidGpu);
    }
    let manufacturer = match vendor {
        0x10de => Some("NVIDIA"),
        0x1002 => Some("AMD"),
        0x8086 => Some("Intel"),
        0x1414 => Some("Microsoft"),
        0x5143 => Some("Qualcomm"),
        _ => None,
    }
    .map(str::to_owned);
    Ok(GpuSnapshot {
        name: name.to_owned(),
        manufacturer,
        // Zero does not prove the absence of VRAM (e.g. UMA/driver limitations).
        // Never substitute shared system memory or truncate to a 32-bit counter.
        vram_bytes: (dedicated_bytes > 0 && dedicated_bytes <= crate::MAX_SAFE_INTEGER)
            .then_some(dedicated_bytes),
    })
}

#[cfg(target_os = "windows")]
pub(crate) fn collect() -> Result<Vec<GpuSnapshot>, crate::CollectionError> {
    use windows::Win32::Graphics::Dxgi::{
        CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE, DXGI_ERROR_NOT_FOUND,
    };
    let api_error = |error: windows::core::Error| crate::CollectionError::GpuApi {
        code: error.code().0,
    };
    // SAFETY: DXGI creates an owned COM interface. The windows crate releases
    // factory/adapter references on every path. No D3D device or COM apartment needed.
    let factory: IDXGIFactory1 = unsafe { CreateDXGIFactory1() }.map_err(api_error)?;
    let mut gpus = Vec::new();
    // Bound driver enumeration, including software adapters, without returning
    // a silently truncated list. Probe index 32 only to confirm termination.
    for index in 0..=32 {
        // SAFETY: factory is live, index is bounded, returned interface is owned.
        let adapter = match unsafe { factory.EnumAdapters1(index) } {
            Ok(adapter) => adapter,
            Err(error) if error.code() == DXGI_ERROR_NOT_FOUND => return Ok(gpus),
            Err(error) => return Err(api_error(error)),
        };
        if index == 32 {
            return Err(crate::CollectionError::InvalidGpu);
        }
        // SAFETY: adapter is live; the generated binding initializes the output.
        let desc = unsafe { adapter.GetDesc1() }.map_err(api_error)?;
        if desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32 != 0 {
            continue;
        }
        gpus.push(from_description(
            &desc.Description,
            desc.VendorId,
            desc.DedicatedVideoMemory as u64,
        )?);
    }
    unreachable!("bounded enumeration returns at index 32")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "windows")]
    #[test]
    fn enumerates_real_adapters_without_requiring_a_display_or_dedicated_vram() {
        let gpus = collect().unwrap();
        assert!(gpus.len() <= 32);
        for gpu in gpus {
            assert!(!gpu.name.is_empty());
            assert!(gpu
                .vram_bytes
                .is_none_or(|bytes| bytes > 0 && bytes <= crate::MAX_SAFE_INTEGER));
        }
    }

    fn description(name: &str) -> Vec<u16> {
        name.encode_utf16().chain([0]).collect()
    }

    #[test]
    fn preserves_large_dedicated_capacity_and_vendor_identity() {
        let gpu = from_description(&description("Test GPU"), 0x10de, 12 * 1024_u64.pow(3)).unwrap();
        assert_eq!(gpu.name, "Test GPU");
        assert_eq!(gpu.manufacturer.as_deref(), Some("NVIDIA"));
        assert_eq!(gpu.vram_bytes, Some(12 * 1024_u64.pow(3)));
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("../../contracts/fixtures/gpu-snapshot.json"))
                .unwrap();
        assert_eq!(serde_json::to_value(gpu).unwrap(), fixture["gpus"][0]);
    }

    #[test]
    fn unknown_vendor_and_unreliable_vram_remain_null() {
        for bytes in [0, crate::MAX_SAFE_INTEGER + 1, u64::MAX] {
            let gpu = from_description(&description("Unknown GPU"), 0xffff, bytes).unwrap();
            assert_eq!(gpu.manufacturer, None);
            assert_eq!(gpu.vram_bytes, None);
        }
        for (vendor, expected) in [(0x8086, "Intel"), (0x1002, "AMD")] {
            assert_eq!(
                from_description(&description("GPU"), vendor, 0)
                    .unwrap()
                    .manufacturer
                    .as_deref(),
                Some(expected)
            );
        }
    }

    #[test]
    fn invalid_driver_names_are_errors() {
        for name in [
            vec![],
            vec![65],
            vec![0xd800, 0],
            description("  "),
            description("GPU\nname"),
            description(&"x".repeat(129)),
        ] {
            assert_eq!(
                from_description(&name, 0, 0),
                Err(crate::CollectionError::InvalidGpu)
            );
        }
    }
}
