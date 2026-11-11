use crate::commodities::Commodity;
use crate::price_sources::PriceSourceFrom;
use chrono::{DateTime, Local};
use rust_decimal::Decimal;
use std::collections::HashMap;

#[derive(Default)]
pub struct PriceCollection {
    pub(crate) prices: HashMap<(Commodity, Commodity), Vec<Price>>,
}

impl PriceCollection {
    /// Register a new historical price.
    /// Prices are kept sorted so we can quickly look them up later.
    pub fn add(
        &mut self,
        origin: &Commodity,
        target: &Commodity,
        price: Price,
    ) {
        let p = self
            .prices
            .entry((origin.clone(), target.clone()))
            .or_default();
        let pos = match p.binary_search_by(|pr| pr.older_than(&price)) {
            Ok(pos) | Err(pos) => pos,
        };
        p.insert(pos, price);
    }

    /// Return the known historical prices for an origin/target pair.
    #[must_use]
    pub fn history(&self, origin: &Commodity, target: &Commodity) -> &[Price] {
        self.prices
            .get(&(origin.clone(), target.clone()))
            .map(Vec::as_slice)
            .unwrap_or_default()
    }

    /// Return all price observations involving a commodity, regardless of
    /// whether it was stored as the origin or target of the price pair.
    pub fn history_for_commodity(
        &self,
        commodity: &Commodity,
    ) -> impl Iterator<Item = (&Commodity, &Commodity, &Price)> {
        self.prices
            .iter()
            .filter(move |((origin, target), _)| {
                origin == commodity || target == commodity
            })
            .flat_map(|((origin, target), prices)| {
                prices.iter().map(move |price| (origin, target, price))
            })
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Price {
    pub timestamp: DateTime<Local>,
    pub price: Decimal,
    _source: PriceSourceFrom,
}

impl Price {
    /// Create a new price
    #[must_use]
    pub fn new(
        timestamp: DateTime<Local>,
        price: Decimal,
        source: PriceSourceFrom,
    ) -> Self {
        Price {
            timestamp,
            price,
            _source: source,
        }
    }

    /// Compare two prices chronologically.
    /// We do not implement std::cmd::PartialOrd since it seems like the latter
    /// should compare actual prices.
    #[must_use]
    pub fn older_than(&self, price: &Price) -> std::cmp::Ordering {
        self.timestamp.cmp(&price.timestamp)
    }

    #[must_use]
    pub fn older_than_ts(&self, ts: &DateTime<Local>) -> std::cmp::Ordering {
        self.timestamp.cmp(ts)
    }

    #[must_use]
    pub fn more_recent_than_ts(
        &self,
        ts: &DateTime<Local>,
    ) -> std::cmp::Ordering {
        self.timestamp.cmp(ts).reverse()
    }

    /// Invert the price
    #[must_use]
    pub fn invert(&self) -> Price {
        Price {
            timestamp: self.timestamp,
            price: Decimal::ONE / self.price,
            _source: self._source,
        }
    }
}
