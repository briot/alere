use crate::models::ScalingFactor;
use num_traits::ToPrimitive;
use rust_decimal::{Decimal, RoundingStrategy};


/// Convert the number to a rounded value, and compute the error

fn round_and_err(
    d: Decimal,
    strat: RoundingStrategy,
) -> (Decimal, Decimal) {
    // Round to 0 decimal places
    let v = d.round_dp_with_strategy(0, strat);
    let err =
        if d.is_zero() { Decimal::ZERO }

        // We should never round 0.3 down to 0, since otherwise we are losing
        // information (something was not quite null and is now completely
        // null)
        else if v.is_zero() { Decimal::MAX }
        else { d / v - Decimal::ONE };
    (v, err)
}


/// Convert from a string "num/dec" to a decimal

pub fn parse_str(text: &str) -> Option<Decimal> {
    if text.is_empty() {
        return None;
    }

    let s: Vec<&str> = text.split('/').collect();
    assert_eq!(s.len(), 2);

    let num = s[0].parse::<i64>();
    let den = s[1].parse::<i64>();
    match (num, den) {
        (Err(_), _) | (_, Err(_)) => None,
        (Ok(0), _)        => Some(Decimal::ZERO),
        (Ok(n), Ok(d))    => Some(Decimal::new(n, 1) / Decimal::new(d, 1)),
    }
}


/// Scales a decimal price so that it can be represented as an integer in the
/// database, to eliminate rounding errors and reduce space usage.

pub fn scale_value(
    value: Option<Decimal>,
    scale: ScalingFactor,
)  -> Option<i64> {
    let v = match value {
        None    => return None,
        Some(v) => v,
    };

    if v == Decimal::ZERO {
        return Some(0);
    }

    let scaled = v * Decimal::from(scale);
    let (d1, err1) = round_and_err(scaled, RoundingStrategy::MidpointTowardZero);
    let (d2, err2) = round_and_err(
        scaled, RoundingStrategy::MidpointAwayFromZero);
    let (pdec, err) = if err2 < err1 { (d2, err2) } else { (d1, err1) };
    if err > Decimal::from_f32_retain(0.001).unwrap() {
        println!(
            "WARNING: price {} \
                imported as {} with rounding error {}%, \
                scale={}",
            v, pdec.to_i64().unwrap_or(0) / (scale as i64),
            (err * Decimal::ONE_HUNDRED).round_dp(2),
            scale);
    }
    pdec.to_i64()
}

#[cfg(test)]
mod tests {
    use crate::scaling::{parse_str, scale_value};

    #[test]
    fn it_scales() {
        let r = scale_value(parse_str("1663/2000"), 100);
        assert_eq!(r, Some(83));

        let r = scale_value(parse_str("8319/10000"), 100);
        assert_eq!(r, Some(120));
    }
}

