use serde_json::{json, Value};
use tauri::ipc::{CallbackFn, InvokeBody};
use tauri::test::{get_ipc_response, mock_builder, MockRuntime, INVOKE_KEY};
use tauri::webview::InvokeRequest;
use tauri::{WebviewUrl, WebviewWindow, WebviewWindowBuilder};

fn request(url: &str) -> InvokeRequest {
    InvokeRequest {
        cmd: "collect_system_snapshot".into(),
        callback: CallbackFn(0),
        error: CallbackFn(1),
        url: url.parse().unwrap(),
        body: InvokeBody::default(),
        headers: Default::default(),
        invoke_key: INVOKE_KEY.to_string(),
    }
}

fn invoke(window: &WebviewWindow<MockRuntime>, url: &str) -> Result<Value, Value> {
    get_ipc_response(window, request(url)).map(|body| body.deserialize().unwrap())
}

#[test]
fn real_handler_and_capability_allow_only_local_main_window() {
    // Use the production registration and generated ACL, not a permissive test context.
    let app = super::builder(mock_builder())
        .build(tauri::generate_context!())
        .unwrap();
    let main = WebviewWindowBuilder::new(&app, "main", WebviewUrl::default())
        .build()
        .unwrap();
    let other = WebviewWindowBuilder::new(&app, "other", WebviewUrl::default())
        .build()
        .unwrap();
    let local_url = if cfg!(windows) {
        "http://tauri.localhost"
    } else {
        "tauri://localhost"
    };

    let result = invoke(&main, local_url);
    if cfg!(windows) {
        let snapshot = result.expect("local main must reach the native Windows collector");
        assert_eq!(snapshot["schemaVersion"], json!(1));
        assert!(snapshot["memory"]["totalBytes"].as_u64().unwrap() > 0);
        assert_eq!(snapshot.as_object().unwrap().len(), 3);
    } else {
        assert_eq!(result, Err(json!({ "code": "UNSUPPORTED_PLATFORM" })));
    }

    for result in [
        invoke(&other, local_url),
        invoke(&main, "https://example.com"),
    ] {
        let error = result.expect_err("unprivileged context must be denied");
        let message = error
            .as_str()
            .expect("Tauri ACL rejection must precede collection");
        assert!(
            message.contains("not allowed"),
            "unexpected error: {message}"
        );
    }
}
