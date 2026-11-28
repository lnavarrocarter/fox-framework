use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
    sync::atomic::{AtomicUsize, Ordering},
};

static SEQUENCE: AtomicUsize = AtomicUsize::new(0);

struct Temp(PathBuf);

impl Temp {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "fox-rust-test-{}-{}",
            std::process::id(),
            SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&path).unwrap();
        Self(path)
    }
}

impl Drop for Temp {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).unwrap();
    }
}

fn cli(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_fox"))
        .args(args)
        .output()
        .unwrap()
}

#[test]
fn generated_project_compiles_and_existing_directories_are_not_overwritten() {
    let temp = Temp::new();
    let project = temp.0.join("hello-fox");
    let project = project.to_str().unwrap();
    let framework = env!("CARGO_MANIFEST_DIR");
    let result = cli(&["new", project, "--framework-path", framework]);
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let main = fs::read_to_string(Path::new(project).join("src/main.rs")).unwrap();
    assert!(main.contains("FoxFactory"));
    let again = cli(&["new", project, "--framework-path", framework]);
    assert!(!again.status.success());
    assert_eq!(
        fs::read_to_string(Path::new(project).join("src/main.rs")).unwrap(),
        main
    );
    let check = Command::new(env!("CARGO"))
        .args(["check", "--offline", "--manifest-path"])
        .arg(Path::new(project).join("Cargo.toml"))
        .arg("--target-dir")
        .arg(Path::new(framework).join("target/scaffold-check"))
        .output()
        .unwrap();
    assert!(
        check.status.success(),
        "{}",
        String::from_utf8_lossy(&check.stderr)
    );
}

#[test]
fn invalid_arguments_fail_without_creating_a_project() {
    let temp = Temp::new();
    let invalid = temp.0.join("bad.name");
    assert!(!cli(&["new", invalid.to_str().unwrap()]).status.success());
    assert!(!invalid.exists());
    for args in [
        &["unknown"][..],
        &["new"],
        &["new", "fn"],
        &["--help", "extra"],
        &["new", "valid", "--framework-path"],
    ] {
        assert!(!cli(args).status.success());
    }
    assert!(cli(&["--help"]).status.success());
    assert!(
        String::from_utf8(cli(&["--version"]).stdout)
            .unwrap()
            .contains(env!("CARGO_PKG_VERSION"))
    );
}
