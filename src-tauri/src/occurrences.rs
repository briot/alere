use serde::Deserialize;

#[derive(Deserialize, Debug)]
#[serde(transparent)]   // serialize as if it was only 'max'
pub struct Occurrences {
    pub max: Option<u16>,
}

impl Occurrences {
    pub fn new(max: u16) -> Self {
        Occurrences {
            max: Some(max),
        }
    }

    pub fn get_max_occurrences(&self) -> u16 {
        self.max.unwrap_or(100)
    }

    pub fn no_recurrence() -> Self {
        Occurrences::new(0)
    }

    pub fn unlimited() -> Self {
        Occurrences {
            max: None,
        }
    }
}
