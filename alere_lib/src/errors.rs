
#[derive(Debug)]
pub enum AlrError {
    IOError(std::io::Error),
    DBError(diesel::result::Error),
    StrError(String),
}

impl std::fmt::Display for AlrError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            AlrError::IOError(e) => write!(f, "{}", e),
            AlrError::DBError(e) => write!(f, "{}", e),
            AlrError::StrError(e) => write!(f, "{}", e),
        }
    }
}

impl std::error::Error for AlrError {
    fn description(&self) -> &str {
        match self {
            AlrError::IOError(_) => "io-error",
            AlrError::DBError(_) => "db-error",
            AlrError::StrError(e) => e,
        }
    }
}

impl From<std::io::Error> for AlrError {
    fn from(e: std::io::Error) -> Self {
        AlrError::IOError(e)
    }
}
impl From<diesel::result::Error> for AlrError {
    fn from(e: diesel::result::Error) -> Self {
        AlrError::DBError(e)
    }
}
impl From<String> for AlrError {
    fn from(e: String) -> Self {
        AlrError::StrError(e)
    }
}
impl From<&str> for AlrError {
    fn from(e: &str) -> Self {
        AlrError::StrError(e.into())
    }
}

//  So that our Result can be returned from tauri
impl serde::Serialize for AlrError {

  fn serialize<S>(
        &self, serializer: S
  ) -> core::result::Result<S::Ok, S::Error>
      where S: serde::ser::Serializer,
  {
    serializer.serialize_str(self.to_string().as_ref())
  }
}

pub type Result<T> = core::result::Result<T, AlrError>;
