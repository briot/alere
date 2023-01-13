use log::info;
use std::path::PathBuf;

pub fn import(
    target: &PathBuf,
    source: &PathBuf,
) -> Result<(), &'static str> {
    info!("import Kmymon {} into {}", source.display(), target.display());
    Err("not implemented")
}
