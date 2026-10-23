//! Read-only Habit overview semantics; the frontend owns only chart geometry.
use crate::{
    sleep::{SleepEndpoint, SleepFactLookup, SleepHabitKey, SleepPoint, SleepView},
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
    fn mean(self, samples: &[StatisticSample]) -> Option<i64> {
        if samples.is_empty() {
            return None;
        }
        match self {
            Self::Duration => {
                Some((samples.iter().map(|sample| sample.value).sum::<i64>() as f64 / samples.len() as f64).round() as i64)
            }
            Self::Wake | Self::Sleep => {
                let angles = samples
                    .iter()
                    .map(|sample| sample.value as f64 / 1440.0 * std::f64::consts::TAU);
                let (sine, cosine) =
                    angles.fold((0.0, 0.0), |(s, c), a| (s + a.sin(), c + a.cos()));
                (sine.hypot(cosine) / samples.len() as f64 > 1e-6).then(|| {
                    ((sine.atan2(cosine) / std::f64::consts::TAU * 1440.0)
                        .rem_euclid(1440.0)
                        .round() as i64)
                        .rem_euclid(1440)
                })
            }
        }
    }
}

/// One clock phase for both endpoint plots and ordered overview statistics.
pub(crate) fn clock_plot_minutes(habit_key: SleepHabitKey, minutes: i64) -> i64 {
    let anchor = match habit_key {
        SleepHabitKey::Wake => 480,
        SleepHabitKey::Sleep => 60,
    };
    anchor + (minutes - anchor + 720).rem_euclid(1440) - 720
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
struct StatisticSample {
    /// Elapsed duration minutes or minute-of-day for circular clock means.
    value: i64,
    /// Duration minutes or anchored plot minutes for ordered extrema.
    ordered_value: i64,
    approximate: bool,
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
            if !matches!(
                self.fact_for_lived_date(SleepHabitKey::Wake, date),
                SleepFactLookup::Unique(_)
            ) {
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
                let mut samples = Vec::new();
                for offset in 0..period {
                    let day = end.plus_days(-(offset as i64)).to_string();
                    if metric == OverviewMetric::Duration {
                        if let Some(sample) = durations.iter().find(|sample| sample.date == day) {
                            samples.push(StatisticSample {
                                value: sample.minutes,
                                ordered_value: sample.minutes,
                                approximate: sample.approximate,
                            });
                        }
                    } else if let Some(key) = metric.habit_key() {
                        if let SleepFactLookup::Unique(fact) = self.fact_for_lived_date(key, &day) {
                            if let SleepEndpoint::Point { point } = &fact.endpoint {
                                let minutes = crate::sleep::clock_minutes(&point.time)
                                    .expect("validated canonical time");
                                samples.push(StatisticSample {
                                    value: i64::from(minutes),
                                    ordered_value: fact.clock_plot_minutes.expect("canonical point coordinate"),
                                    approximate: point.approximate,
                                });
                            }
                        }
                    }
                }
                let mean = metric.mean(&samples);
                let earliest = (samples.len() > 1)
                    .then(|| samples.iter().map(|sample| sample.ordered_value).min().unwrap());
                let latest = (samples.len() > 1)
                    .then(|| samples.iter().map(|sample| sample.ordered_value).max().unwrap());
                let extreme_approximate = |extreme: Option<i64>| {
                    samples.iter().any(|sample| {
                        Some(sample.ordered_value) == extreme && sample.approximate
                    })
                };
                statistics.push(OverviewStatistics {
                    metric,
                    period,
                    count: samples.len(),
                    mean,
                    earliest,
                    latest,
                    approximate: samples.iter().any(|sample| sample.approximate),
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
