#![forbid(unsafe_code)]

use std::{env, error::Error, fs, path::Path, process::ExitCode};

const HELP: &str = "Fox Framework CLI

Usage:
  fox new <directory> [--framework-path <directory>]
  fox --help
  fox --version

Creates a Rust HTTP application without overwriting an existing directory.
Before the first crates.io release, supply --framework-path pointing to the
Fox checkout. The generated app listens on FOX_ADDR (default 127.0.0.1:3000).
";

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("fox: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let mut args = env::args_os().skip(1);
    let command = args.next().ok_or(HELP)?;
    if command == "--help" || command == "-h" {
        if args.next().is_some() {
            return Err("unexpected arguments after --help".into());
        }
        print!("{HELP}");
        return Ok(());
    }
    if command == "--version" || command == "-V" {
        if args.next().is_some() {
            return Err("unexpected arguments after --version".into());
        }
        println!("fox {}", env!("CARGO_PKG_VERSION"));
        return Ok(());
    }
    if command != "new" {
        return Err(format!("unknown command {:?}\n{HELP}", command).into());
    }
    let directory = args.next().ok_or("new requires a directory")?;
    let mut framework = None;
    if let Some(option) = args.next() {
        if option != "--framework-path" {
            return Err(format!("unknown option {option:?}").into());
        }
        framework = Some(args.next().ok_or("--framework-path requires a directory")?);
    }
    if args.next().is_some() {
        return Err("unexpected additional arguments".into());
    }
    let directory = Path::new(&directory);
    let name = directory
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("directory must have a UTF-8 project name")?;
    if !valid_name(name) {
        return Err("project name must start with a lowercase ASCII letter and contain only lowercase letters, digits, '-' or '_' (not a Rust keyword)".into());
    }
    let dependency = match framework {
        Some(path) => {
            let path = Path::new(&path).canonicalize()?;
            let manifest = fs::read_to_string(path.join("Cargo.toml"))?;
            if !manifest
                .lines()
                .any(|line| line.trim() == "name = \"fox-framework\"")
            {
                return Err("--framework-path must point to the fox-framework crate".into());
            }
            let escaped =
                serde_json::to_string(path.to_str().ok_or("framework path must be UTF-8")?)?;
            format!(
                "{{ version = \"{}\", path = {escaped} }}",
                env!("CARGO_PKG_VERSION")
            )
        }
        None => format!("\"{}\"", env!("CARGO_PKG_VERSION")),
    };
    let manifest = format!(
        "[package]\nname = \"{name}\"\nversion = \"0.1.0\"\nedition = \"2024\"\nrust-version = \"1.100\"\n\n[dependencies]\nfox-framework = {dependency}\ntokio = {{ version = \"1\", features = [\"macros\", \"rt-multi-thread\", \"signal\", \"sync\"] }}\nserde_json = \"1\"\ntracing = \"0.1\"\ntracing-subscriber = {{ version = \"0.3\", features = [\"env-filter\"] }}\n"
    );
    fs::create_dir(directory)?;
    fs::create_dir(directory.join("src"))?;
    fs::write(directory.join("Cargo.toml"), manifest)?;
    fs::write(
        directory.join("src/main.rs"),
        include_str!("../../examples/hello.rs"),
    )?;
    fs::write(directory.join(".gitignore"), "/target/\n")?;
    println!(
        "Created {}. Run: cd {} && cargo run",
        directory.display(),
        directory.display()
    );
    Ok(())
}

fn valid_name(name: &str) -> bool {
    let keywords = [
        "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum",
        "extern", "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move",
        "mut", "pub", "ref", "return", "self", "static", "struct", "super", "trait", "true",
        "type", "unsafe", "use", "where", "while", "abstract", "become", "box", "do", "final",
        "gen", "macro", "override", "priv", "try", "typeof", "unsized", "virtual", "yield", "test",
        "std", "core", "alloc",
    ];
    !keywords.contains(&name)
        && name
            .bytes()
            .next()
            .is_some_and(|byte| byte.is_ascii_lowercase())
        && name.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-' || byte == b'_'
        })
}
