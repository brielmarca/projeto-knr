use serde::Serialize;

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageSnapshot {
    pub volume: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub free_percent: f64,
}

#[cfg(any(target_os = "windows", test))]
use crate::{CollectionError, MAX_SAFE_INTEGER};

#[cfg(any(target_os = "windows", test))]
impl StorageSnapshot {
    pub(crate) fn from_measurement(
        volume: String,
        total_bytes: u64,
        free_bytes: u64,
    ) -> Result<Self, CollectionError> {
        if volume.len() != 2
            || !volume.as_bytes()[0].is_ascii_uppercase()
            || volume.as_bytes()[1] != b':'
            || total_bytes == 0
            || total_bytes > MAX_SAFE_INTEGER
            || free_bytes > total_bytes
        {
            return Err(CollectionError::InvalidStorage);
        }
        Ok(Self {
            volume,
            total_bytes,
            free_bytes,
            used_bytes: total_bytes - free_bytes,
            free_percent: free_bytes as f64 / total_bytes as f64 * 100.0,
        })
    }
}

/// Derive the installation drive, never a guessed C: or a process environment value.
#[cfg(any(target_os = "windows", test))]
pub(crate) fn system_drive_volume(directory: &[u16]) -> Result<String, CollectionError> {
    if directory.len() < 4
        || directory[0] > 127
        || !(directory[0] as u8).is_ascii_alphabetic()
        || directory[1] != u16::from(b':')
        || directory[2] != u16::from(b'\\')
        || directory.contains(&0)
    {
        return Err(CollectionError::InvalidStorage);
    }
    Ok(format!(
        "{}:",
        (directory[0] as u8).to_ascii_uppercase() as char
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identifies_windows_installation_drive_without_assuming_c() {
        for (path, expected) in [
            ("C:\\Windows", "C:"),
            ("d:\\Windows", "D:"),
            ("Z:\\OS\\Windows", "Z:"),
        ] {
            assert_eq!(
                system_drive_volume(&path.encode_utf16().collect::<Vec<_>>()),
                Ok(expected.into())
            );
        }
        for path in [
            "",
            "C:",
            "C:Windows",
            "C:/Windows",
            "\\\\server\\Windows",
            "1:\\Windows",
            "C:\\Win\0dows",
            "\u{0100}:\\Windows",
        ] {
            assert_eq!(
                system_drive_volume(&path.encode_utf16().collect::<Vec<_>>()),
                Err(CollectionError::InvalidStorage)
            );
        }
    }

    #[test]
    fn storage_serializes_to_shared_fixture() {
        let storage = StorageSnapshot::from_measurement(
            "C:".into(),
            512 * 1024_u64.pow(3),
            128 * 1024_u64.pow(3),
        )
        .unwrap();
        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../contracts/fixtures/system-snapshot.json"
        ))
        .unwrap();
        assert_eq!(serde_json::to_value(storage).unwrap(), fixture["storage"]);
    }

    #[test]
    fn preserves_full_empty_fractional_and_safe_integer_measurements() {
        for (total, free) in [
            (1, 0),
            (1, 1),
            (3, 1),
            (MAX_SAFE_INTEGER, 0),
            (MAX_SAFE_INTEGER, MAX_SAFE_INTEGER),
            (MAX_SAFE_INTEGER, MAX_SAFE_INTEGER - 1),
        ] {
            let storage = StorageSnapshot::from_measurement("D:".into(), total, free).unwrap();
            assert_eq!(storage.used_bytes, total - free);
            assert_eq!(storage.free_percent, free as f64 / total as f64 * 100.0);
        }
    }

    #[test]
    fn rejects_invalid_storage_without_clamping_or_fallback() {
        for (total, free) in [
            (0, 0),
            (0, 1),
            (1, 2),
            (MAX_SAFE_INTEGER + 1, 0),
            (u64::MAX, u64::MAX),
        ] {
            assert_eq!(
                StorageSnapshot::from_measurement("C:".into(), total, free),
                Err(CollectionError::InvalidStorage)
            );
        }
        for volume in ["", "c:", "C:\\", "C:\\Windows", "1:", "\\\\server\\share"] {
            assert_eq!(
                StorageSnapshot::from_measurement(volume.into(), 1, 0),
                Err(CollectionError::InvalidStorage)
            );
        }
    }
}
