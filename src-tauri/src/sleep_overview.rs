//! Read-only Habit overview semantics; the frontend owns only chart geometry.
use crate::{
    sleep::{SleepEndpoint, SleepHabitKey, SleepPoint, SleepView},
    today::CalendarDate,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OverviewMetric {
    Wake,
    Sleep,
    Duration,
}
impl OverviewMetric {
    fn habit_key(self) -> Option<SleepHabitKey> {
        match self {
            Self::Wake => Some(SleepHabitKey::Wake),
            Self::Sleep => Some(SleepHabitKey::Sleep),
            Self::Duration => None,
        }
    }
    fn ordered_minutes(self, value: i64) -> i64 {
        let anchor = match self {
            Self::Wake => 480,
            Self::Sleep => 60,
            Self::Duration => return value,
        };
        anchor + (value - anchor + 720).rem_euclid(1440) - 720
    }
    fn mean(self, values: &[i64]) -> Option<i64> {
        if values.is_empty() {
            return None;
        }
        match self {
            Self::Duration => {
                Some((values.iter().sum::<i64>() as f64 / values.len() as f64).round() as i64)
            }
            Self::Wake | Self::Sleep => {
                let angles = values
                    .iter()
                    .map(|value| *value as f64 / 1440.0 * std::f64::consts::TAU);
                let (sine, cosine) =
                    angles.fold((0.0, 0.0), |(s, c), a| (s + a.sin(), c + a.cos()));
                (sine.hypot(cosine) / values.len() as f64 > 1e-6).then(|| {
                    ((sine.atan2(cosine) / std::f64::consts::TAU * 1440.0)
                        .rem_euclid(1440.0)
                        .round() as i64)
                        .rem_euclid(1440)
                })
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SleepOverview {
    pub date: String,
    pub durations: Vec<DurationSample>,
    pub statistics: Vec<OverviewStatistics>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DurationSample {
    pub date: String,
    pub minutes: i64,
    pub approximate: bool,
    pub onset: SleepPoint,
    pub get_up: SleepPoint,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverviewStatistics {
    pub metric: OverviewMetric,
    pub period: usize,
    pub count: usize,
    pub mean: Option<i64>,
    pub earliest: Option<i64>,
    pub latest: Option<i64>,
    pub approximate: bool,
    pub earliest_approximate: bool,
    pub latest_approximate: bool,
}
impl SleepView {
    pub(crate) fn project_overview(mut self, date: &str) -> Self {
        let Some(end) = CalendarDate::parse(date) else {
            return self;
        };
        let mut durations = Vec::new();
        for fact in self.facts.iter().filter(|fact| fact.habit_key == SleepHabitKey::Wake) {
            let Some(date) = fact.lived_date.as_ref() else {
                continue;
            };
            if self
                .facts
                .iter()
                .filter(|other| {
                    other.habit_key == SleepHabitKey::Wake && other.lived_date.as_ref() == Some(date)
                })
                .count()
                != 1
            {
                continue;
            }
            let Some(record) = self
                .records
                .iter()
                .find(|record| record.id == fact.record_id)
            else {
                continue;
            };
            if let (
                SleepEndpoint::Point { point: onset },
                SleepEndpoint::Point { point: get_up },
                Some(minutes),
            ) = (
                &record.sleep_onset,
                &record.get_up,
                record.estimated_duration_minutes,
            ) {
                durations.push(DurationSample {
                    date: date.clone(),
                    minutes,
                    approximate: onset.approximate || get_up.approximate,
                    onset: onset.clone(),
                    get_up: get_up.clone(),
                });
            }
        }
        let mut statistics = Vec::new();
        for metric in [
            OverviewMetric::Wake,
            OverviewMetric::Sleep,
            OverviewMetric::Duration,
        ] {
            for period in [7, 30] {
                let mut values = Vec::new();
                let mut approximate = false;
                let mut qualities = Vec::new();
                for offset in 0..period {
                    let day = end.plus_days(-(offset as i64)).to_string();
                    if metric == OverviewMetric::Duration {
                        if let Some(sample) = durations.iter().find(|sample| sample.date == day) {
                            values.push(sample.minutes);
                            qualities.push(sample.approximate);
                            approximate |= sample.approximate;
                        }
                    } else {
                        let facts: Vec<_> = self
                            .facts
                            .iter()
                            .filter(|fact| {
                                Some(fact.habit_key) == metric.habit_key()
                                    && fact.lived_date.as_deref() == Some(&day)
                            })
                            .collect();
                        if let [fact] = facts.as_slice() {
                            if let SleepEndpoint::Point { point } = &fact.endpoint {
                                let minutes = crate::sleep::clock_minutes(&point.time)
                                    .expect("validated canonical time");
                                values.push(i64::from(minutes));
                                qualities.push(point.approximate);
                                approximate |= point.approximate;
                            }
                        }
                    }
                }
                let mean = metric.mean(&values);
                let ordered: Vec<_> = values
                    .iter()
                    .map(|value| metric.ordered_minutes(*value))
                    .collect();
                let earliest = (values.len() > 1).then(|| *ordered.iter().min().unwrap());
                let latest = (values.len() > 1).then(|| *ordered.iter().max().unwrap());
                let extreme_approximate = |extreme: Option<i64>| {
                    ordered
                        .iter()
                        .zip(&qualities)
                        .any(|(value, approximate)| Some(*value) == extreme && *approximate)
                };
                statistics.push(OverviewStatistics {
                    metric,
                    period,
                    count: values.len(),
                    mean,
                    earliest,
                    latest,
                    approximate,
                    earliest_approximate: extreme_approximate(earliest),
                    latest_approximate: extreme_approximate(latest),
                });
            }
        }
        self.overview = Some(SleepOverview {
            date: date.into(),
            durations,
            statistics,
        });
        self
    }
}
