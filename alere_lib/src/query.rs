/// A Common-Table-Expression

pub struct CTE {
    pub name: String, //  name of the cte
    pub sql: String,  //  the sql to execute
}

impl CTE {
    pub fn new(name: String, sql: String) -> CTE {
        CTE { name, sql }
    }
}

impl std::fmt::Display for CTE {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} AS ({})", self.name, self.sql)
    }
}

/// A query might have a number of required common-table-expressions

pub struct SQL {
    pub ctes: Vec<CTE>,
    pub sql: String,
}

impl SQL {
    pub fn new(ctes: Vec<CTE>, sql: String) -> SQL {
        SQL { ctes, sql }
    }
}

/// A trait implemented for all objects that can return a query.

pub trait Query {
    /// The type returned when executing the query.
    type Result;

    /// Returns the query to execute for self.
    fn query(self) -> SQL;
}
