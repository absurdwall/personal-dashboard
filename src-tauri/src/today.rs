use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

const DAILY_RECORD_TYPE: &str = "daily-record";
const CANONICAL_SECTIONS: [&str; 4] = ["今天的大致安排", "计划依据", "白天更新", "晚间复盘"];

pub trait TodayWorkspacePersistence {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String>;
    fn save_selected_vault(&self, vault: &Path) -> Result<(), String>;
}

pub trait TodayWorkspaceExchange {
    fn select_vault(&self) -> Result<Option<PathBuf>, String>;
}

pub trait TodayClock {
    fn current_date(&self) -> String;
    fn current_time_label(&self) -> String;
}

pub trait TodayRecordStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String>;
    fn save_if_unchanged(&self, path: &Path, expected: &[u8], updated: &[u8])
        -> Result<(), String>;
}

#[derive(Clone, Copy)]
pub struct FileTodayRecordStore;

impl TodayRecordStore for FileTodayRecordStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        match fs::read(path) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("Could not read today's daily record: {error}")),
        }
    }

    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        let current = fs::read(path)
            .map_err(|error| format!("Could not re-read today's daily record: {error}"))?;
        if current != expected {
            return Err(
                "今天的 Daily Record 已在外部发生变化。请刷新 Today 后再保存；外部内容未被覆盖。"
                    .into(),
            );
        }
        let temporary = path.with_extension(format!("md.tmp-{}", std::process::id()));
        let write_result = (|| {
            let mut output = OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&temporary)
                .map_err(|error| {
                    format!("Could not prepare today's daily record update: {error}")
                })?;
            output
                .write_all(updated)
                .and_then(|_| output.sync_all())
                .map_err(|error| format!("Could not write today's daily record update: {error}"))?;
            fs::rename(&temporary, path)
                .map_err(|error| format!("Could not activate today's daily record update: {error}"))
        })();
        if write_result.is_err() {
            let _ = fs::remove_file(&temporary);
        }
        write_result
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DaytimeUpdateKind {
    MeaningfulEvent,
    RememberedBlock,
    HabitOutcome,
    MaterialChange,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DaytimeUpdateInput {
    pub expected_revision: String,
    pub kind: DaytimeUpdateKind,
    pub content: String,
    pub habit_name: Option<String>,
    pub habit_outcome: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EveningUpdateMode {
    Addition,
    Correction,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EveningUpdateInput {
    pub expected_revision: String,
    pub mode: EveningUpdateMode,
    pub content: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TodayState {
    Unconfigured,
    Missing,
    Ready,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MorningBlockView {
    pub period: String,
    pub title: String,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningEvidenceView {
    pub label: String,
    pub items: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaytimeUpdateView {
    pub title: String,
    pub context: Vec<String>,
    pub revised_direction: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaytimeView {
    pub updates: Vec<DaytimeUpdateView>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EveningView {
    pub account: Vec<String>,
    pub comparison: Vec<String>,
    pub summary: Vec<String>,
    pub questions: Vec<String>,
    pub additions: Vec<String>,
    pub corrections: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayView {
    pub state: TodayState,
    pub date: String,
    pub vault_name: Option<String>,
    pub message: String,
    pub revision: Option<String>,
    pub timeline: Vec<MorningBlockView>,
    pub evidence: Vec<PlanningEvidenceView>,
    pub daytime: DaytimeView,
    pub evening: EveningView,
}

pub struct TodayApplication<P, E, C, S = FileTodayRecordStore> {
    persistence: P,
    exchange: E,
    clock: C,
    record_store: S,
}

impl<P, E, C> TodayApplication<P, E, C, FileTodayRecordStore>
where
    P: TodayWorkspacePersistence,
    E: TodayWorkspaceExchange,
    C: TodayClock,
{
    pub fn new(persistence: P, exchange: E, clock: C) -> Self {
        Self {
            persistence,
            exchange,
            clock,
            record_store: FileTodayRecordStore,
        }
    }
}

impl<P, E, C, S> TodayApplication<P, E, C, S>
where
    P: TodayWorkspacePersistence,
    E: TodayWorkspaceExchange,
    C: TodayClock,
    S: TodayRecordStore,
{
    pub fn with_record_store(persistence: P, exchange: E, clock: C, record_store: S) -> Self {
        Self {
            persistence,
            exchange,
            clock,
            record_store,
        }
    }

    pub fn open(&self) -> Result<TodayView, String> {
        let date = self.clock.current_date();
        let Some(vault) = self.persistence.load_selected_vault()? else {
            return Ok(TodayView {
                state: TodayState::Unconfigured,
                date,
                vault_name: None,
                message: "请选择 Tortilla Flat vault，以读取今天的早间计划。".into(),
                revision: None,
                timeline: Vec::new(),
                evidence: Vec::new(),
                daytime: DaytimeView::default(),
                evening: EveningView::default(),
            });
        };
        self.open_vault(&vault, date)
    }

    pub fn select_vault(&self) -> Result<TodayView, String> {
        let Some(vault) = self.exchange.select_vault()? else {
            return self.open();
        };
        self.persistence.save_selected_vault(&vault)?;
        self.open_vault(&vault, self.clock.current_date())
    }

    pub fn append_daytime_update(&self, input: DaytimeUpdateInput) -> Result<TodayView, String> {
        validate_short_text(&input.content, "白天更新")?;
        let (heading, body) = daytime_block(&input, &self.clock.current_time_label())?;
        let (vault, path, document) = self.load_writable_record()?;
        require_revision(&document, &input.expected_revision)?;
        validate_daily_record(&document, &self.clock.current_date())?;
        let updated = append_to_canonical_section(
            &document,
            "白天更新",
            &format!("### {heading}\n\n{body}"),
            Some("晚间复盘"),
        );
        self.record_store
            .save_if_unchanged(&path, document.as_bytes(), updated.as_bytes())?;
        self.open_vault(&vault, self.clock.current_date())
    }

    pub fn update_evening_review(&self, input: EveningUpdateInput) -> Result<TodayView, String> {
        validate_short_text(&input.content, "晚间复盘更新")?;
        let (vault, path, document) = self.load_writable_record()?;
        require_revision(&document, &input.expected_revision)?;
        validate_daily_record(&document, &self.clock.current_date())?;
        let updated = match input.mode {
            EveningUpdateMode::Addition => update_evening_subsection(
                &document,
                "用户补充",
                &format!("- {}", input.content.trim()),
                false,
            )?,
            EveningUpdateMode::Correction => {
                update_evening_subsection(&document, "用户修正", input.content.trim(), true)?
            }
        };
        self.record_store
            .save_if_unchanged(&path, document.as_bytes(), updated.as_bytes())?;
        self.open_vault(&vault, self.clock.current_date())
    }

    fn load_writable_record(&self) -> Result<(PathBuf, PathBuf, String), String> {
        let vault = self.persistence.load_selected_vault()?.ok_or_else(|| {
            "请先选择 Tortilla Flat vault，再更新今天的 Daily Record。".to_string()
        })?;
        let path = canonical_record_path(&vault, &self.clock.current_date())?;
        let bytes = self.record_store.load(&path)?.ok_or_else(|| {
            "今天还没有 Daily Record。请先让 Codex 运行早间流程，然后刷新 Today。".to_string()
        })?;
        let document = String::from_utf8(bytes).map_err(|_| {
            "今天的 Daily Record 不是有效的 UTF-8 文本；未写入任何内容。".to_string()
        })?;
        Ok((vault, path, document))
    }

    fn open_vault(&self, vault: &Path, date: String) -> Result<TodayView, String> {
        let vault_name = vault
            .file_name()
            .and_then(|name| name.to_str())
            .map(str::to_owned);
        let path = canonical_record_path(vault, &date)?;
        let bytes = match self.record_store.load(&path)? {
            Some(document) => document,
            None => {
                return Ok(TodayView {
                    state: TodayState::Missing,
                    date,
                    vault_name,
                    message: "今天还没有 Daily Record。请先让 Codex 运行早间流程，然后刷新 Today。"
                        .into(),
                    revision: None,
                    timeline: Vec::new(),
                    evidence: Vec::new(),
                    daytime: DaytimeView::default(),
                    evening: EveningView::default(),
                });
            }
        };
        let document = String::from_utf8(bytes)
            .map_err(|_| "今天的 Daily Record 不是有效的 UTF-8 文本。".to_string())?;
        let revision = document_revision(document.as_bytes());

        match parse_daily_record(&document, &date) {
            Ok((timeline, evidence, daytime, evening)) => Ok(TodayView {
                state: TodayState::Ready,
                date,
                vault_name,
                message: if timeline.is_empty() {
                    "今天的 Daily Record 有效，但早间计划尚未写入。".into()
                } else {
                    "已从今天的 Daily Record 读取早间计划。".into()
                },
                revision: Some(revision),
                timeline,
                evidence,
                daytime,
                evening,
            }),
            Err(message) => Ok(TodayView {
                state: TodayState::Error,
                date,
                vault_name,
                message,
                revision: None,
                timeline: Vec::new(),
                evidence: Vec::new(),
                daytime: DaytimeView::default(),
                evening: EveningView::default(),
            }),
        }
    }
}

fn validate_daily_record(document: &str, expected_date: &str) -> Result<(), String> {
    parse_daily_record(document, expected_date).map(|_| ())
}

fn document_revision(document: &[u8]) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in document {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

fn require_revision(document: &str, expected: &str) -> Result<(), String> {
    if document_revision(document.as_bytes()) == expected {
        Ok(())
    } else {
        Err(
            "今天的 Daily Record 已在外部发生变化。请刷新 Today 后再保存；外部内容未被覆盖。"
                .into(),
        )
    }
}

fn validate_short_text(value: &str, label: &str) -> Result<(), String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{label}不能为空。"));
    }
    if value.chars().count() > 500 || value.contains(['\n', '\r']) {
        return Err(format!("{label}只能是一条不超过 500 字的简短内容。"));
    }
    Ok(())
}

fn daytime_block(input: &DaytimeUpdateInput, time: &str) -> Result<(String, String), String> {
    let content = input.content.trim();
    match input.kind {
        DaytimeUpdateKind::MeaningfulEvent => {
            Ok((format!("{time} — 有意义的事件"), content.into()))
        }
        DaytimeUpdateKind::RememberedBlock => Ok((format!("{time} — 补记时间块"), content.into())),
        DaytimeUpdateKind::MaterialChange => Ok((format!("{time} — 重大调整"), content.into())),
        DaytimeUpdateKind::HabitOutcome => {
            let habit = input.habit_name.as_deref().unwrap_or("").trim();
            validate_short_text(habit, "Habit 名称")?;
            let outcome = input.habit_outcome.as_deref().unwrap_or("");
            if !matches!(outcome, "normal" | "baseline" | "partial" | "not_done") {
                return Err("Habit 结果只能是 normal、baseline、partial 或 not_done；未选择仍表示 unknown。".into());
            }
            Ok((
                format!("{time} — Habit 结果"),
                format!("- Habit：{habit}\n- 结果：{outcome}\n- 说明：{content}"),
            ))
        }
    }
}

fn append_to_canonical_section(
    document: &str,
    heading: &str,
    block: &str,
    insert_before: Option<&str>,
) -> String {
    if let Some((_, end)) = section_offsets(document, heading) {
        let mut output = String::with_capacity(document.len() + block.len() + 3);
        output.push_str(&document[..end]);
        if !output.ends_with('\n') {
            output.push('\n');
        }
        if !output.ends_with("\n\n") {
            output.push('\n');
        }
        output.push_str(block);
        output.push('\n');
        if !document[end..].starts_with('\n') {
            output.push('\n');
        }
        output.push_str(&document[end..]);
        return output;
    }

    let insertion = insert_before
        .and_then(|candidate| section_offsets(document, candidate).map(|(start, _)| start))
        .unwrap_or(document.len());
    let mut output = String::with_capacity(document.len() + heading.len() + block.len() + 8);
    output.push_str(&document[..insertion]);
    if !output.ends_with('\n') {
        output.push('\n');
    }
    if !output.ends_with("\n\n") {
        output.push('\n');
    }
    output.push_str(&format!("## {heading}\n\n{block}\n\n"));
    output.push_str(&document[insertion..]);
    output
}

fn update_evening_subsection(
    document: &str,
    subsection: &str,
    content: &str,
    replace_existing: bool,
) -> Result<String, String> {
    if section_offsets(document, "晚间复盘").is_none() {
        return Ok(append_to_canonical_section(
            document,
            "晚间复盘",
            &format!("### {subsection}\n\n{content}"),
            None,
        ));
    }
    let matches = subsection_offsets(document, "晚间复盘", subsection);
    if matches.len() > 1 {
        return Err(format!(
            "今天的 Daily Record 包含多个“{subsection}”段落。请先合并重复段落；未写入任何内容。"
        ));
    }
    let Some((body_start, end)) = matches.first().copied() else {
        return Ok(append_to_canonical_section(
            document,
            "晚间复盘",
            &format!("### {subsection}\n\n{content}"),
            None,
        ));
    };
    let mut output = String::with_capacity(document.len() + content.len() + 4);
    output.push_str(&document[..body_start]);
    if replace_existing {
        output.push('\n');
        output.push_str(content);
        output.push_str("\n\n");
    } else {
        let existing = &document[body_start..end];
        output.push_str(existing);
        if !output.ends_with('\n') {
            output.push('\n');
        }
        if !output.ends_with("\n\n") {
            output.push('\n');
        }
        output.push_str(content);
        output.push_str("\n\n");
    }
    output.push_str(&document[end..]);
    Ok(output)
}

fn subsection_offsets(document: &str, parent: &str, subsection: &str) -> Vec<(usize, usize)> {
    let Some((parent_start, parent_end)) = section_offsets(document, parent) else {
        return Vec::new();
    };
    let marker = format!("### {subsection}");
    let mut matches = Vec::new();
    let mut offset = parent_start;
    let mut body_start = None;
    for segment in document[parent_start..parent_end].split_inclusive('\n') {
        let line = segment.trim_end_matches(['\r', '\n']);
        if line.trim() == marker {
            if let Some(start) = body_start.take() {
                matches.push((start, offset));
            }
            body_start = Some(offset + segment.len());
        } else if body_start.is_some()
            && (line.trim().starts_with("### ") || line.trim().starts_with("## "))
        {
            matches.push((body_start.take().expect("subsection start exists"), offset));
        }
        offset += segment.len();
    }
    if let Some(start) = body_start {
        matches.push((start, parent_end));
    }
    matches
}

fn section_offsets(document: &str, heading: &str) -> Option<(usize, usize)> {
    let marker = format!("## {heading}");
    let mut offset = 0;
    let mut section_start = None;
    for segment in document.split_inclusive('\n') {
        let line = segment.trim_end_matches(['\r', '\n']);
        if section_start.is_none() && line.trim() == marker {
            section_start = Some(offset);
        } else if section_start.is_some() && line.trim().starts_with("## ") {
            return Some((section_start.expect("section start exists"), offset));
        }
        offset += segment.len();
    }
    section_start.map(|start| (start, document.len()))
}

fn canonical_record_path(vault: &Path, date: &str) -> Result<PathBuf, String> {
    let (year, month) = date_parts(date)
        .ok_or_else(|| "The current local date is not a valid YYYY-MM-DD date.".to_string())?;
    Ok(vault
        .join("life/Journal/Daily")
        .join(year)
        .join(format!("{year}-{month}"))
        .join(format!("{date}.md")))
}

fn date_parts(date: &str) -> Option<(&str, &str)> {
    let bytes = date.as_bytes();
    if bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
    {
        Some((&date[..4], &date[5..7]))
    } else {
        None
    }
}

fn parse_daily_record(
    document: &str,
    expected_date: &str,
) -> Result<
    (
        Vec<MorningBlockView>,
        Vec<PlanningEvidenceView>,
        DaytimeView,
        EveningView,
    ),
    String,
> {
    let (frontmatter, body) = split_frontmatter(document).ok_or_else(|| {
        "今天的 Daily Record 缺少有效 frontmatter。请修复 type 和 date，然后刷新 Today。"
            .to_string()
    })?;
    let record_type = frontmatter_value(frontmatter, "type");
    let record_date = frontmatter_value(frontmatter, "date");
    if record_type.as_deref() != Some(DAILY_RECORD_TYPE)
        || record_date.as_deref() != Some(expected_date)
    {
        return Err(format!(
            "今天的 Daily Record 身份与 {expected_date} 不一致。请修复 type 和 date，然后刷新 Today。"
        ));
    }

    for canonical in CANONICAL_SECTIONS {
        if section_count(body, canonical) > 1 {
            return Err(format!(
                "今天的 Daily Record 包含多个“{canonical}”段落。请合并重复段落，然后刷新 Today。"
            ));
        }
    }

    let timeline = section_body(body, "今天的大致安排")
        .map(parse_timeline)
        .unwrap_or_default();
    let evidence = section_body(body, "计划依据")
        .map(parse_evidence)
        .unwrap_or_default();
    let daytime = section_body(body, "白天更新")
        .map(parse_daytime)
        .unwrap_or_default();
    let evening = section_body(body, "晚间复盘")
        .map(parse_evening)
        .unwrap_or_default();
    Ok((timeline, evidence, daytime, evening))
}

fn split_frontmatter(document: &str) -> Option<(&str, &str)> {
    let normalized = document.strip_prefix('\u{feff}').unwrap_or(document);
    let after_open = normalized.strip_prefix("---\n")?;
    let boundary = after_open.find("\n---")?;
    let frontmatter = &after_open[..boundary];
    let mut body = &after_open[boundary + 4..];
    body = body.strip_prefix('\n').unwrap_or(body);
    Some((frontmatter, body))
}

fn frontmatter_value(frontmatter: &str, key: &str) -> Option<String> {
    frontmatter.lines().find_map(|line| {
        let (candidate, value) = line.split_once(':')?;
        (candidate.trim() == key).then(|| {
            value
                .trim()
                .trim_matches(|character| character == '\'' || character == '"')
                .to_owned()
        })
    })
}

fn section_count(body: &str, heading: &str) -> usize {
    body.lines()
        .filter(|line| line.trim() == format!("## {heading}"))
        .count()
}

fn section_body<'a>(body: &'a str, heading: &str) -> Option<&'a str> {
    let marker = format!("## {heading}");
    let mut offset = 0;
    let mut start = None;
    let mut end = body.len();
    for segment in body.split_inclusive('\n') {
        let line = segment.trim_end_matches(['\r', '\n']);
        if start.is_none() && line.trim() == marker {
            start = Some(offset + segment.len());
        } else if start.is_some() && line.trim().starts_with("## ") {
            end = offset;
            break;
        }
        offset += segment.len();
    }
    let start = start?;
    Some(body[start..end].trim())
}

fn parse_timeline(section: &str) -> Vec<MorningBlockView> {
    section
        .lines()
        .filter_map(|line| {
            let item = line.trim().strip_prefix("- ")?.trim();
            if item.is_empty() {
                return None;
            }
            let (period, content) = parse_bold_prefix(item)
                .map(|(period, content)| {
                    (
                        period
                            .trim_end_matches('：')
                            .trim_end_matches(':')
                            .to_owned(),
                        content,
                    )
                })
                .unwrap_or_else(|| ("安排".to_owned(), item));
            let (title, detail) = split_summary(content);
            (!title.is_empty()).then_some(MorningBlockView {
                period,
                title: title.to_owned(),
                detail: detail.map(str::to_owned),
            })
        })
        .collect()
}

fn parse_bold_prefix(item: &str) -> Option<(&str, &str)> {
    let rest = item.strip_prefix("**")?;
    let end = rest.find("**")?;
    Some((&rest[..end], rest[end + 2..].trim()))
}

fn split_summary(content: &str) -> (&str, Option<&str>) {
    for delimiter in ['；', ';'] {
        if let Some(index) = content.find(delimiter) {
            let title = content[..index].trim().trim_end_matches(['。', '.']);
            let detail = content[index + delimiter.len_utf8()..].trim();
            return (title, (!detail.is_empty()).then_some(detail));
        }
    }
    (content.trim(), None)
}

fn parse_evidence(section: &str) -> Vec<PlanningEvidenceView> {
    let mut groups = Vec::new();
    let mut current: Option<PlanningEvidenceView> = None;
    for line in section.lines() {
        let trimmed = line.trim();
        if let Some(label) = trimmed
            .strip_prefix("### ")
            .or_else(|| trimmed.strip_prefix("#### "))
        {
            if let Some(group) = current.take() {
                groups.push(group);
            }
            current = Some(PlanningEvidenceView {
                label: clean_inline_markdown(label),
                items: Vec::new(),
            });
        } else if let Some(item) = trimmed.strip_prefix("- ") {
            let item = clean_inline_markdown(item);
            if !item.is_empty() {
                current
                    .get_or_insert_with(|| PlanningEvidenceView {
                        label: "其他依据".into(),
                        items: Vec::new(),
                    })
                    .items
                    .push(item);
            }
        }
    }
    if let Some(group) = current {
        groups.push(group);
    }
    groups
}

#[derive(Default)]
struct ReadingContent {
    paragraphs: Vec<String>,
    items: Vec<String>,
}

fn parse_daytime(section: &str) -> DaytimeView {
    let updates = split_subsections(section)
        .into_iter()
        .filter_map(|(title, body)| {
            let content = parse_reading_content(&body);
            if content.paragraphs.is_empty() && content.items.is_empty() {
                return None;
            }
            Some(DaytimeUpdateView {
                title: title.unwrap_or_else(|| "白天记录".into()),
                context: content.paragraphs,
                revised_direction: content.items,
            })
        })
        .collect();
    DaytimeView { updates }
}

fn parse_evening(section: &str) -> EveningView {
    let mut view = EveningView::default();
    for (heading, body) in split_subsections(section) {
        let content = parse_reading_content(&body);
        let mut lines = content.paragraphs;
        lines.extend(content.items);
        if lines.is_empty() {
            continue;
        }
        let normalized = heading.as_deref().unwrap_or("今天发生了什么");
        if normalized.contains("用户补充") {
            view.additions.extend(lines);
        } else if normalized.contains("用户修正") {
            view.corrections.extend(lines);
        } else if normalized.contains("计划与实际") || normalized.contains("计划与现实") {
            view.comparison.extend(lines);
        } else if normalized.contains("总结") || normalized.contains("概览") {
            view.summary.extend(lines);
        } else if normalized.contains("问题")
            || normalized.contains("待确认")
            || normalized.contains("缺口")
        {
            view.questions.extend(lines);
        } else if normalized.contains("发生了什么")
            || normalized.contains("今日记录")
            || normalized.contains("重要事件")
            || heading.is_none()
        {
            view.account.extend(lines);
        }
    }
    view
}

fn split_subsections(section: &str) -> Vec<(Option<String>, String)> {
    let mut sections = Vec::new();
    let mut heading = None;
    let mut lines = Vec::new();
    for line in section.lines() {
        let trimmed = line.trim();
        if let Some(next_heading) = trimmed
            .strip_prefix("### ")
            .or_else(|| trimmed.strip_prefix("#### "))
        {
            if heading.is_some() || lines.iter().any(|line: &String| !line.trim().is_empty()) {
                sections.push((heading.take(), lines.join("\n")));
                lines.clear();
            }
            heading = Some(clean_inline_markdown(next_heading));
        } else {
            lines.push(line.to_owned());
        }
    }
    if heading.is_some() || lines.iter().any(|line| !line.trim().is_empty()) {
        sections.push((heading, lines.join("\n")));
    }
    sections
}

fn parse_reading_content(body: &str) -> ReadingContent {
    let mut content = ReadingContent::default();
    let mut paragraph = Vec::new();
    let flush_paragraph = |paragraph: &mut Vec<String>, output: &mut Vec<String>| {
        if !paragraph.is_empty() {
            output.push(clean_inline_markdown(&paragraph.join(" ")));
            paragraph.clear();
        }
    };
    for line in body.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            flush_paragraph(&mut paragraph, &mut content.paragraphs);
        } else if let Some(item) = list_item(trimmed) {
            flush_paragraph(&mut paragraph, &mut content.paragraphs);
            let item = clean_inline_markdown(item);
            if !item.is_empty() {
                content.items.push(item);
            }
        } else if !trimmed.starts_with('#') {
            paragraph.push(trimmed.to_owned());
        }
    }
    flush_paragraph(&mut paragraph, &mut content.paragraphs);
    content
}

fn list_item(line: &str) -> Option<&str> {
    line.strip_prefix("- ").or_else(|| line.strip_prefix("* "))
}

fn clean_inline_markdown(value: &str) -> String {
    let mut output = String::new();
    let mut remainder = value.trim();
    while let Some(open) = remainder.find('[') {
        output.push_str(&remainder[..open]);
        let link = &remainder[open + 1..];
        let Some(close_label) = link.find(']') else {
            output.push_str(&remainder[open..]);
            remainder = "";
            break;
        };
        let after_label = &link[close_label + 1..];
        if !after_label.starts_with('(') {
            output.push_str(&remainder[open..open + close_label + 2]);
            remainder = after_label;
            continue;
        }
        let Some(close_url) = after_label.find(')') else {
            output.push_str(&remainder[open..]);
            remainder = "";
            break;
        };
        output.push_str(&link[..close_label]);
        remainder = &after_label[close_url + 1..];
    }
    output.push_str(remainder);
    output.replace("**", "").replace('`', "").trim().to_owned()
}
