use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::error;
use log::{info, error};

#[derive(Debug, Serialize, Deserialize)]
struct SavedSettings {
    recent_files: Vec<PathBuf>,
}

pub struct Settings {
    filename: PathBuf,
    saved: SavedSettings,
}

impl Settings {

    fn config_file(app_config_dir: &Option<PathBuf>) -> PathBuf {
        let mut doc = match app_config_dir {
            Some(d) => d.clone(),
            None    => PathBuf::from("/tmp/alere"),
        };
        _ = std::fs::create_dir(doc.as_path()); //  Create directory if needed
        doc.push("settings.yaml");
        doc
    }

    pub fn load(
        app_config_dir: &Option<PathBuf>
    ) -> Result<Self, Box<dyn error::Error>> {
        let filename = Settings::config_file(app_config_dir);
        return match std::fs::File::open(&filename) {
            Ok(f)  => {
                let saved = serde_yaml::from_reader::<_, SavedSettings>(f)?;
                info!("Loaded settings {}", filename.display());
                Ok(Settings {
                    saved,
                    filename,
                })
            },
            Err(_) => {
                let saved: SavedSettings = Default::default();
                let s2 = Settings {
                    saved,
                    filename,
                };
                s2.save();
                Ok(s2)
            }
        };
    }

    pub fn save(&self) {
        let f = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(&self.filename);

        match f {
            Ok(f) => {
                match serde_yaml::to_writer(f, &self.saved) {
                    Ok(_) => info!("Saved settings {}", self.filename.display()),
                    Err(e) => error!("Failed to save settings: {}", e),
                };
            },
            Err(e) => error!("Failed to save settings: {:?}", e),
        };
    }

    pub fn add_recent_file(&mut self, filename: &PathBuf) {
        self.saved.recent_files.push(filename.clone());
        self.save();
    }
    pub fn get_recent_files(&self) -> Vec<PathBuf> {
        self.saved.recent_files.clone()
    }

    /// The default file that we should open
    pub fn default_file(&mut self) -> PathBuf {
        if let Some(r) = self.saved.recent_files.last() {
            return r.clone();
        }

        let mut doc = match tauri::api::path::document_dir() {
            Some(d) => d,
            None    => PathBuf::from(tauri::api::path::home_dir().unwrap()),
        };
        doc.push("alere");
        _ = std::fs::create_dir(doc.as_path()); //  Create directory if needed

        doc.push("alere_db.sqlite3");
        self.add_recent_file(&doc);
        doc
    }
}

impl Default for SavedSettings {
    fn default() -> Self {
        SavedSettings {
            recent_files: vec!(),
        }
    }
}
