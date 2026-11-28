FROM rust:bookworm AS build
WORKDIR /build
COPY Cargo.toml Cargo.lock rust-toolchain.toml README.md LICENSE ./
COPY src ./src
COPY examples/hello.rs ./examples/hello.rs
RUN rustup show && cargo build --locked --release --example hello

FROM debian:bookworm-slim
COPY --from=build /build/target/release/examples/hello /usr/local/bin/fox-example
ENV FOX_ADDR=0.0.0.0:3000
ENV RUST_LOG=info
USER 65532:65532
EXPOSE 3000
STOPSIGNAL SIGINT
ENTRYPOINT ["/usr/local/bin/fox-example"]
