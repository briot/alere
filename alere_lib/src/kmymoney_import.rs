use log::info;

pub fn import(
    target: String,
    source: String,
) -> Result<(), &'static str> {
    info!("new_file {} {}", target, source);
    Err("not implemented")
}
