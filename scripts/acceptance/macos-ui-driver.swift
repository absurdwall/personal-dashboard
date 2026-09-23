import ApplicationServices
import AppKit
import CoreGraphics
import Foundation

enum DriverError: Error, CustomStringConvertible {
    case usage
    case invalidPid(String)
    case timeout(String)
    case unexpectedText(String)
    case actionFailed(String, AXError)

    var description: String {
        switch self {
        case .usage:
            return "usage: macos-ui-driver <pid> <wait-text|assert-text|assert-absent-text|wait-active-text|assert-active-text|assert-active-absent-text|assert-focused-text|focus|focus-contains|press-key|type-text|choose-folder|choose-file|cancel-folder|assert-picker-title|assert-visible-focus|assert-semantic|assert-state|assert-centered|assert-axis-entry-card|assert-axis-cards-fit|assert-axis-overlap-stack|cycle-axis-stack|click-axis-card|focus-axis-card|scroll-axis-horizontal|assert-window-visible|assert-window-visible-link|click-visible-link|assert-live|assert-same-rendered-color|assert-rendered-variation|content-background-signature|assert-calendar-cells-transparent|capture-window|assert-capture-non-overwrite|make-image-fixture|scroll-text-visible|assert-long-text-fits|assert-document-fixed|assert-scroll-surface|scroll-to-bottom|assert-destination-inset|assert-select-option|assert-select-absent-option|dump-text|dump-picker|press|press-contains|select-contains|select-contains-allow-unchanged|set-size|assert-size|hide> <text> [timeout-seconds]"
        case let .invalidPid(value):
            return "invalid process id: \(value)"
        case let .timeout(text):
            return "timed out waiting for rendered UI text: \(text)"
        case let .unexpectedText(text):
            return "unexpected rendered UI text was visible: \(text)"
        case let .actionFailed(action, error):
            return "accessibility action \(action) failed: \(error.rawValue)"
        }
    }
}

func reportNativePickerTransition(_ message: String) {
    let line = "Native picker transition: \(message)\n"
    FileHandle.standardError.write(Data(line.utf8))
}

func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else {
        return nil
    }
    return value
}

func stringAttribute(_ element: AXUIElement, _ name: String) -> String {
    (attribute(element, name) as? String) ?? ""
}

func children(of element: AXUIElement) -> [AXUIElement] {
    (attribute(element, "AXChildren") as? [AXUIElement]) ?? []
}

func walk(_ root: AXUIElement, visit: (AXUIElement) -> Bool) -> Bool {
    var pending = [root]
    var visited = Set<CFHashCode>()

    while let element = pending.popLast() {
        guard visited.insert(CFHash(element)).inserted else {
            continue
        }
        if visit(element) {
            return true
        }
        pending.append(contentsOf: children(of: element).reversed())
    }
    return false
}

func nodeText(_ element: AXUIElement) -> String {
    [
        stringAttribute(element, "AXTitle"),
        stringAttribute(element, "AXValue"),
        stringAttribute(element, "AXDescription"),
    ]
    .filter { !$0.isEmpty }
    .joined(separator: " ")
}

func findText(_ application: AXUIElement, _ text: String) -> AXUIElement? {
    var match: AXUIElement?
    _ = walk(application) { element in
        if nodeText(element).localizedCaseInsensitiveContains(text) {
            match = element
            return true
        }
        return false
    }
    return match
}

struct AccessibilityPath {
    let element: AXUIElement
    let ancestors: [AXUIElement]
}

func findTextPath(
    _ root: AXUIElement,
    _ text: String,
    contains: Bool = true
) -> AccessibilityPath? {
    var visited = Set<CFHashCode>()

    func visit(
        _ element: AXUIElement,
        ancestors: [AXUIElement]
    ) -> AccessibilityPath? {
        guard visited.insert(CFHash(element)).inserted else {
            return nil
        }
        let renderedText = nodeText(element)
        let matches = contains
            ? renderedText.localizedCaseInsensitiveContains(text)
            : renderedText == text
        if matches {
            return AccessibilityPath(element: element, ancestors: ancestors)
        }
        let nextAncestors = ancestors + [element]
        for child in children(of: element) {
            if let result = visit(child, ancestors: nextAncestors) {
                return result
            }
        }
        return nil
    }

    return visit(root, ancestors: [])
}

func findTextPaths(
    _ root: AXUIElement,
    _ text: String,
    contains: Bool = true
) -> [AccessibilityPath] {
    var visited = Set<CFHashCode>()
    var matches: [AccessibilityPath] = []

    func visit(
        _ element: AXUIElement,
        ancestors: [AXUIElement]
    ) {
        guard visited.insert(CFHash(element)).inserted else {
            return
        }
        let renderedText = nodeText(element)
        let matchesText = contains
            ? renderedText.localizedCaseInsensitiveContains(text)
            : renderedText == text
        if matchesText {
            matches.append(AccessibilityPath(element: element, ancestors: ancestors))
        }
        let nextAncestors = ancestors + [element]
        for child in children(of: element) {
            visit(child, ancestors: nextAncestors)
        }
    }

    visit(root, ancestors: [])
    return matches
}

func findPressable(
    _ application: AXUIElement,
    _ text: String,
    contains: Bool = false
) -> AXUIElement? {
    let pressableRoles = Set([
        "AXButton",
        "AXCheckBox",
        "AXComboBox",
        "AXDisclosureTriangle",
        "AXMenuItem",
        "AXPopUpButton",
        "AXRadioButton",
    ])
    var match: AXUIElement?
    _ = walk(application) { element in
        let role = stringAttribute(element, "AXRole")
        let renderedText = nodeText(element)
        let matches = contains
            ? renderedText.localizedCaseInsensitiveContains(text)
            : renderedText == text
        if pressableRoles.contains(role) && matches {
            match = element
            return true
        }
        return false
    }
    return match
}

func findVisiblePressable(
    _ application: AXUIElement,
    _ text: String,
    contains: Bool = false
) -> AXUIElement? {
    let pressableRoles = Set([
        "AXButton",
        "AXCheckBox",
        "AXComboBox",
        "AXDisclosureTriangle",
        "AXMenuItem",
        "AXPopUpButton",
        "AXRadioButton",
    ])
    return findTextPaths(application, text, contains: contains)
        .first { path in
            pressableRoles.contains(stringAttribute(path.element, "AXRole")) &&
                (path.ancestors + [path.element]).allSatisfy {
                    visibleAttribute($0, "AXHidden")
                }
        }?
        .element
}

func findVisibleTextField(
    _ application: AXUIElement,
    _ label: String
) -> AXUIElement? {
    findTextPaths(application, label).first { path in
        ["AXTextField", "AXTextArea", "AXDateTimeArea"].contains(stringAttribute(path.element, "AXRole")) &&
            (path.ancestors + [path.element]).allSatisfy {
                visibleAttribute($0, "AXHidden")
            }
    }?.element
}

func findRole(_ application: AXUIElement, _ roles: Set<String>) -> AXUIElement? {
    var match: AXUIElement?
    _ = walk(application) { element in
        let role = stringAttribute(element, "AXRole")
        if roles.contains(role) {
            match = element
            return true
        }
        return false
    }
    return match
}

func findRoleWithin(_ root: AXUIElement, _ roles: Set<String>) -> AXUIElement? {
    var match: AXUIElement?
    _ = walk(root) { element in
        let role = stringAttribute(element, "AXRole")
        if roles.contains(role) {
            match = element
            return true
        }
        return false
    }
    return match
}

func findRolesWithin(_ root: AXUIElement, _ roles: Set<String>) -> [AXUIElement] {
    var matches: [AXUIElement] = []
    _ = walk(root) { element in
        if roles.contains(stringAttribute(element, "AXRole")) {
            matches.append(element)
        }
        return false
    }
    return matches
}

func waitForText(_ application: AXUIElement, _ text: String, timeout: TimeInterval) throws {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if findText(application, text) != nil {
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout(text)
}

func assertAbsentText(_ application: AXUIElement, _ text: String) throws {
    guard findText(application, text) == nil else {
        throw DriverError.unexpectedText(text)
    }
}

func visibleText(_ application: AXUIElement, _ text: String) -> AXUIElement? {
    findTextPaths(application, text).first { path in
        (path.ancestors + [path.element]).allSatisfy { element in
            visibleAttribute(element, "AXHidden")
        }
    }?.element
}

func waitForVisibleText(
    _ application: AXUIElement,
    _ text: String,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if visibleText(application, text) != nil {
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("visible active-destination text: \(text)")
}

func assertAbsentVisibleText(_ application: AXUIElement, _ text: String) throws {
    guard visibleText(application, text) == nil else {
        throw DriverError.unexpectedText("visible active-destination text: \(text)")
    }
}

func focusedElement(_ application: AXUIElement) -> AXUIElement? {
    guard let value = attribute(application, "AXFocusedUIElement") else {
        return nil
    }
    return unsafeDowncast(value, to: AXUIElement.self)
}

func waitForFocusedText(
    _ application: AXUIElement,
    _ text: String,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    var lastFocusedText = "<none>"
    repeat {
        if let element = focusedElement(application) {
            lastFocusedText = nodeText(element)
            if lastFocusedText.localizedCaseInsensitiveContains(text) {
                return
            }
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout(
        "focused rendered control: \(text) (actual: \(lastFocusedText))"
    )
}

func focusPressable(
    _ application: AXUIElement,
    pid: pid_t,
    text: String,
    contains: Bool,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let element = findVisiblePressable(application, text, contains: contains) {
            _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
            Thread.sleep(forTimeInterval: 0.05)
            let error = AXUIElementSetAttributeValue(
                element,
                "AXFocused" as CFString,
                kCFBooleanTrue
            )
            guard error == .success else {
                throw DriverError.actionFailed("focus \(text)", error)
            }
            let focusDeadline = min(deadline, Date().addingTimeInterval(1))
            repeat {
                if let focused = focusedElement(application),
                   nodeText(focused).localizedCaseInsensitiveContains(text) {
                    return
                }
                Thread.sleep(forTimeInterval: 0.1)
            } while Date() < focusDeadline
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("focusable rendered control: \(text)")
}

func keyCode(_ text: String) -> CGKeyCode? {
    switch text.lowercased() {
    case "return", "enter":
        return 36
    case "space":
        return 49
    case "escape", "esc":
        return 53
    case "tab":
        return 48
    case "up":
        return 126
    case "down":
        return 125
    case "left":
        return 123
    case "right":
        return 124
    case "home":
        return 115
    case "end":
        return 119
    default:
        return nil
    }
}

func postKey(_ pid: pid_t, _ text: String) throws {
    guard let code = keyCode(text) else {
        throw DriverError.usage
    }
    guard let source = CGEventSource(stateID: .combinedSessionState),
          let keyDown = CGEvent(
              keyboardEventSource: source,
              virtualKey: code,
              keyDown: true
          ),
          let keyUp = CGEvent(
              keyboardEventSource: source,
              virtualKey: code,
              keyDown: false
          ) else {
        throw DriverError.actionFailed("key \(text)", .failure)
    }
    keyDown.postToPid(pid)
    keyUp.postToPid(pid)
}

func postGlobalKey(_ text: String) throws {
    guard let code = keyCode(text) else {
        throw DriverError.usage
    }
    guard let source = CGEventSource(stateID: .combinedSessionState),
          let keyDown = CGEvent(
              keyboardEventSource: source,
              virtualKey: code,
              keyDown: true
          ),
          let keyUp = CGEvent(
              keyboardEventSource: source,
              virtualKey: code,
              keyDown: false
          ) else {
        throw DriverError.actionFailed("key (text)", .failure)
    }
    keyDown.flags = []
    keyUp.flags = []
    keyDown.post(tap: .cghidEventTap)
    keyUp.post(tap: .cghidEventTap)
}

func postGlobalText(_ text: String) throws {
    guard let source = CGEventSource(stateID: .combinedSessionState),
          let keyDown = CGEvent(
              keyboardEventSource: source,
              virtualKey: 0,
              keyDown: true
          ),
          let keyUp = CGEvent(
              keyboardEventSource: source,
              virtualKey: 0,
              keyDown: false
          ) else {
        throw DriverError.actionFailed("type \(text)", .failure)
    }
    // Combined session events can inherit Command from the preceding Cmd+A.
    // Plain text must not become a keyboard shortcut in native AppKit fields.
    keyDown.flags = []
    keyUp.flags = []
    let unicode = Array(text.utf16)
        unicode.withUnsafeBufferPointer { buffer in
            keyDown.keyboardSetUnicodeString(
                stringLength: buffer.count,
                unicodeString: buffer.baseAddress
            )
        }
    keyDown.post(tap: .cghidEventTap)
    keyUp.post(tap: .cghidEventTap)
}

func dateSegmentOrder() -> [String] {
    let format = DateFormatter.dateFormat(
        fromTemplate: "yyyyMMdd",
        options: 0,
        locale: Locale.current
    ) ?? "MM/dd/yyyy"
    var order: [String] = []
    for scalar in format.unicodeScalars {
        let name: String?
        switch scalar {
        case "y": name = "year"
        case "M", "L": name = "month"
        case "d": name = "day"
        default: name = nil
        }
        if let name, !order.contains(name) {
            order.append(name)
        }
    }
    return order.count == 3 ? order : ["month", "day", "year"]
}

func usesTwelveHourClock() -> Bool {
    let format = DateFormatter.dateFormat(
        fromTemplate: "jmm",
        options: 0,
        locale: Locale.current
    ) ?? "HH:mm"
    return format.contains("a") || format.contains("h") || format.contains("K")
}

func meridiemState(_ value: String) -> Bool? {
    let normalized = value
        .lowercased()
        .replacingOccurrences(of: ".", with: "")
        .replacingOccurrences(of: " ", with: "")
    if ["pm", "p.m", "下午", "午後", "nachmittag"].contains(where: normalized.contains) {
        return true
    }
    if ["am", "a.m", "上午", "午前", "vormittag"].contains(where: normalized.contains) {
        return false
    }
    return nil
}

func meridiemText(_ element: AXUIElement) -> String {
    ["AXValue", "AXTitle", "AXDescription"]
        .map { stringAttribute(element, $0) }
        .filter { !$0.isEmpty }
        .joined(separator: " ")
}

func setMeridiem(
    _ element: AXUIElement,
    pid: pid_t,
    afternoon: Bool
) throws {
    let current = meridiemState(meridiemText(element))
    if current == afternoon {
        return
    }
    if current != nil {
        try pressKey(pid, "up")
        Thread.sleep(forTimeInterval: 0.1)
        if meridiemState(meridiemText(element)) == afternoon {
            return
        }
        try pressKey(pid, "down")
        Thread.sleep(forTimeInterval: 0.1)
    }
    try postGlobalCharacters(afternoon ? "p" : "a")
    Thread.sleep(forTimeInterval: 0.1)
    if let observed = meridiemState(meridiemText(element)), observed != afternoon {
        throw DriverError.unexpectedText(
            "date/time field did not accept \(afternoon ? "PM" : "AM")"
        )
    }
}

func typeText(
    _ application: AXUIElement,
    pid: pid_t,
    label: String,
    value: String,
    timeout: TimeInterval
) throws {
    func dateTimeSegments(_ value: String) -> (kind: String, values: [(String, String)])? {
        let dateParts = value.split(separator: "-").compactMap { Int($0) }
        if dateParts.count == 3, dateParts[0] >= 1000 {
            let values: [String: String] = [
                "year": String(format: "%04d", dateParts[0]),
                "month": String(format: "%02d", dateParts[1]),
                "day": String(format: "%02d", dateParts[2]),
            ]
            return (
                "date",
                dateSegmentOrder().compactMap { name in
                    values[name].map { (name, $0) }
                }
            )
        }
        let timeParts = value.split(separator: ":").compactMap { Int($0) }
        if timeParts.count == 2 {
            let hour = usesTwelveHourClock()
                ? (timeParts[0] % 12 == 0 ? 12 : timeParts[0] % 12)
                : timeParts[0]
            var values: [(String, String)] = [
                ("hour", String(format: "%02d", hour)),
                ("minutes", String(format: "%02d", timeParts[1])),
            ]
            if usesTwelveHourClock() {
                values.append(("meridiem", timeParts[0] >= 12 ? "PM" : "AM"))
            }
            return ("time", values)
        }
        return nil
    }

    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let element = findVisibleTextField(application, label) {
            _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
            let role = stringAttribute(element, "AXRole")
            try setAccessibilityAttribute(
                element,
                "AXFocused",
                kCFBooleanTrue,
                "focus text field \(label)"
            )
            if role == "AXDateTimeArea" {
                guard let plan = dateTimeSegments(value) else {
                    throw DriverError.actionFailed("parse date/time \(label)", .failure)
                }
                guard let fieldFrame = frame(element) else {
                    throw DriverError.timeout("date/time field frame: \(label)")
                }
                var candidates: [(element: AXUIElement, frame: CGRect)] = []
                _ = walk(application) { candidate in
                    guard stringAttribute(candidate, "AXRole") == "AXIncrementor",
                          visibleAttribute(candidate, "AXHidden"),
                          let candidateFrame = frame(candidate),
                          fieldFrame.contains(
                              CGPoint(x: candidateFrame.midX, y: candidateFrame.midY)
                          ) else {
                        return false
                    }
                    candidates.append((candidate, candidateFrame))
                    return false
                }
                candidates.sort { left, right in
                    if abs(left.frame.minX - right.frame.minX) < 1 {
                        return left.frame.minY < right.frame.minY
                    }
                    return left.frame.minX < right.frame.minX
                }
                guard candidates.count >= plan.values.count else {
                    throw DriverError.timeout("date/time segments: \(label)")
                }
                for (index, segmentData) in plan.values.enumerated() {
                    let (segmentName, segmentValue) = segmentData
                    let titleMatch = candidates.first { candidate in
                        let title = stringAttribute(candidate.element, "AXTitle")
                            .lowercased()
                        return title == segmentName ||
                            (segmentName == "minutes" && title.contains("minute")) ||
                            (segmentName == "month" && title.contains("month")) ||
                            (segmentName == "day" && title.contains("day")) ||
                            (segmentName == "year" && title.contains("year"))
                    }
                    let segment = titleMatch?.element ?? candidates[index].element
                    try clickElement(segment, pid: pid)
                    if segmentName == "meridiem" {
                        try setMeridiem(
                            segment,
                            pid: pid,
                            afternoon: segmentValue == "PM"
                        )
                    } else {
                        try postGlobalCharacters(segmentValue)
                    }
                    Thread.sleep(forTimeInterval: 0.1)
                }
                Thread.sleep(forTimeInterval: 0.25)
                return
            }
            try setAccessibilityAttribute(
                element,
                "AXValue",
                value as CFString,
                "set text field \(label)"
            )
            Thread.sleep(forTimeInterval: 0.25)
            if stringAttribute(element, "AXValue") == value {
                return
            }
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("editable control: \(label)")
}

func postGlobalShortcut(keyCode: CGKeyCode, flags: CGEventFlags) throws {
    guard let source = CGEventSource(stateID: .combinedSessionState),
          let keyDown = CGEvent(
              keyboardEventSource: source,
              virtualKey: keyCode,
              keyDown: true
          ),
          let keyUp = CGEvent(
              keyboardEventSource: source,
              virtualKey: keyCode,
              keyDown: false
          ) else {
        throw DriverError.actionFailed("keyboard shortcut", .failure)
    }
    keyDown.flags = flags
    keyUp.flags = flags
    keyDown.post(tap: .cghidEventTap)
    keyUp.post(tap: .cghidEventTap)
}

func activateApplication(
    _ application: AXUIElement,
    pid: pid_t,
    timeout: TimeInterval
) throws {
    guard let runningApplication = NSRunningApplication(processIdentifier: pid) else {
        throw DriverError.invalidPid(String(pid))
    }
    let deadline = Date().addingTimeInterval(max(1, timeout))
    var lastAccessibilityError: AXError?
    repeat {
        if let session = CGSessionCopyCurrentDictionary() as? [String: Any],
           session["CGSSessionScreenIsLocked"] as? Bool == true {
            throw DriverError.unexpectedText(
                "macOS is locked; Accessibility acceptance requires an interactive desktop"
            )
        }
        _ = runningApplication.activate(options: [.activateAllWindows])
        if runningApplication.isActive {
            return
        }
        let error = AXUIElementSetAttributeValue(
            application,
            "AXFrontmost" as CFString,
            kCFBooleanTrue
        )
        lastAccessibilityError = error
        if error == .success,
           let frontmost = attribute(application, "AXFrontmost") as? NSNumber,
           frontmost.boolValue {
            return
        }
        if error != .success && error != .cannotComplete {
            throw DriverError.actionFailed("activate application", error)
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    let detail = lastAccessibilityError.map { " (last AX error: \($0.rawValue))" } ?? ""
    throw DriverError.timeout("active application\(detail)")
}

func visibleSheet(_ application: AXUIElement) -> AXUIElement? {
    findRolesWithin(application, ["AXSheet"]).first { sheet in
        visibleAttribute(sheet, "AXHidden")
    }
}

func waitForPickerSheet(
    _ application: AXUIElement,
    timeout: TimeInterval
) throws -> AXUIElement {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let sheet = visibleSheet(application),
           findPressable(sheet, "Open") != nil {
            return sheet
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("native folder picker")
}

func assertPickerTitle(
    _ application: AXUIElement,
    title: String,
    timeout: TimeInterval
) throws {
    let picker = try waitForPickerSheet(application, timeout: timeout)
    guard findText(picker, title) != nil else {
        throw DriverError.timeout("native folder picker title: \(title)")
    }
}

func waitForPickerPathField(
    _ application: AXUIElement,
    picker: AXUIElement,
    timeout: TimeInterval
) throws -> AXUIElement {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        let pickerTextFields = findRolesWithin(picker, ["AXTextField"])
        if let field = focusedElement(application),
           stringAttribute(field, "AXRole") == "AXTextField" {
            if pickerTextFields.contains(where: { CFEqual($0, field) }) {
                return field
            }
        }
        // Finder can expose the Go to Folder field before AXFocused catches up.
        // Its stable identifier is a stronger signal than waiting on that
        // eventually-consistent focus attribute alone.
        if let field = pickerTextFields.first(where: {
            stringAttribute($0, "AXIdentifier") == "PathTextField" &&
                visibleAttribute($0, "AXHidden")
        }) {
            return field
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("native folder path field")
}

func openPickerPathField(
    _ application: AXUIElement,
    picker: AXUIElement,
    pid: pid_t,
    timeout: TimeInterval
) throws -> AXUIElement {
    let deadline = Date().addingTimeInterval(timeout)
    var lastError: Error = DriverError.timeout("native folder path field")
    repeat {
        try activateApplication(
            application,
            pid: pid,
            timeout: min(2, max(0.1, deadline.timeIntervalSinceNow))
        )
        try postGlobalShortcut(keyCode: 5, flags: [.maskCommand, .maskShift])
        do {
            return try waitForPickerPathField(
                application,
                picker: picker,
                timeout: min(3, max(0.1, deadline.timeIntervalSinceNow))
            )
        } catch {
            lastError = error
        }
        if Date() >= deadline {
            break
        }
        Thread.sleep(forTimeInterval: 0.2)
    } while Date() < deadline
    throw lastError
}

func waitForTextFieldValue(
    _ field: AXUIElement,
    value: String,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    var lastValue = "<unavailable>"
    repeat {
        lastValue = stringAttribute(field, "AXValue")
        if lastValue == value {
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout(
        "exact native folder path: \(value) (actual: \(lastValue))"
    )
}

func waitForTextFieldToClose(
    _ root: AXUIElement,
    field: AXUIElement,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        let fieldStillPresent = findRolesWithin(root, ["AXTextField"])
            .contains(where: { CFEqual($0, field) })
        if !fieldStillPresent {
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("native folder path sheet to close")
}

func waitForPickerTarget(
    _ root: AXUIElement,
    targetName: String,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if findTextPaths(root, targetName).contains(where: { path in
            stringAttribute(path.element, "AXRole") != "AXTextField" &&
                visibleAttribute(path.element, "AXHidden")
        }) {
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("native folder picker target: \(targetName)")
}

func waitForEnabledOpenButton(
    _ root: AXUIElement,
    application: AXUIElement,
    timeout: TimeInterval
) throws -> AXUIElement? {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        // Return can confirm the selected directory and dismiss the whole panel.
        if visibleSheet(application) == nil {
            return nil
        }
        if let button = findPressable(root, "Open"),
           (attribute(button, "AXEnabled") as? NSNumber)?.boolValue != false {
            return button
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("enabled native folder picker Open button")
}

func waitForPickerToClose(
    _ application: AXUIElement,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if visibleSheet(application) == nil {
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("native folder picker to close")
}

func chooseFolder(
    _ application: AXUIElement,
    pid: pid_t,
    path: String,
    isFile: Bool = false,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    try activateApplication(
        application,
        pid: pid,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    let picker = try waitForPickerSheet(
        application,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    reportNativePickerTransition(
        "picker ready role=\(stringAttribute(picker, "AXRole")) " +
            "identifier=\(stringAttribute(picker, "AXIdentifier")) open=enabled"
    )

    let pathField = try openPickerPathField(
        application,
        picker: picker,
        pid: pid,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    reportNativePickerTransition(
        "path field focused role=\(stringAttribute(pathField, "AXRole")) " +
            "identifier=\(stringAttribute(pathField, "AXIdentifier")) " +
            "value=\(stringAttribute(pathField, "AXValue"))"
    )
    try setAccessibilityAttribute(
        pathField,
        "AXFocused",
        kCFBooleanTrue,
        "focus native folder path"
    )
    try postGlobalShortcut(keyCode: 0, flags: [.maskCommand])
    try postGlobalText(path)
    try waitForTextFieldValue(
        pathField,
        value: path,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    reportNativePickerTransition("exact path observed value=\(path)")

    // The first Return accepts the path/autocomplete result. Wait for Finder's
    // matching row before the second Return commits navigation; fixed sleeps
    // can race both asynchronous transitions and previously reported success
    // while this sheet was still open.
    try postGlobalKey("return")
    let targetName = URL(fileURLWithPath: path).lastPathComponent
    if isFile {
        let targetDeadline = Date().addingTimeInterval(
            min(2, max(0.1, deadline.timeIntervalSinceNow))
        )
        var targetVisible = false
        repeat {
            let pathFieldPresent = findRolesWithin(picker, ["AXTextField"])
                .contains(where: { CFEqual($0, pathField) })
            if !pathFieldPresent { break }
            targetVisible = findTextPaths(picker, targetName).contains(where: { path in
                stringAttribute(path.element, "AXRole") != "AXTextField" &&
                    visibleAttribute(path.element, "AXHidden")
            })
            if targetVisible { break }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < targetDeadline
        let pathFieldPresent = findRolesWithin(picker, ["AXTextField"])
            .contains(where: { CFEqual($0, pathField) })
        if pathFieldPresent {
            reportNativePickerTransition(
                targetVisible
                    ? "file target visible name=\(targetName)"
                    : "confirming exact file path without an AX target row name=\(targetName)"
            )
            try postGlobalKey("return")
        }
    } else {
        try waitForPickerTarget(
            picker,
            targetName: targetName,
            timeout: max(0.1, deadline.timeIntervalSinceNow)
        )
        reportNativePickerTransition("folder target visible name=\(targetName)")
        try postGlobalKey("return")
    }
    try waitForTextFieldToClose(
        picker,
        field: pathField,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    reportNativePickerTransition("path sheet closed")

    if let openButton = try waitForEnabledOpenButton(
        picker,
        application: application,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    ) {
        reportNativePickerTransition("Open button enabled")
        try performAccessibilityAction(openButton, "AXPress", "open selected native folder")
    }
    try waitForPickerToClose(
        application,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    reportNativePickerTransition("picker closed")
}

func cancelFolder(
    _ application: AXUIElement,
    pid: pid_t,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    try activateApplication(
        application,
        pid: pid,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    let picker = try waitForPickerSheet(
        application,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    if let cancel = findPressable(picker, "Cancel") {
        try performAccessibilityAction(cancel, "AXPress", "cancel native folder picker")
    } else {
        try pressKey(pid, "escape")
    }
    try waitForPickerToClose(
        application,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    reportNativePickerTransition("picker cancelled")
}

func characterKeyCode(_ character: Character) -> CGKeyCode? {
    switch character.lowercased() {
    case "a": return 0
    case "0": return 29
    case "1": return 18
    case "2": return 19
    case "3": return 20
    case "4": return 21
    case "5": return 23
    case "6": return 22
    case "7": return 26
    case "8": return 28
    case "9": return 25
    case "b": return 11
    case "c": return 8
    case "d": return 2
    case "e": return 14
    case "f": return 3
    case "g": return 5
    case "h": return 4
    case "i": return 34
    case "j": return 38
    case "k": return 40
    case "l": return 37
    case "m": return 46
    case "n": return 45
    case "o": return 31
    case "p": return 35
    case "q": return 12
    case "r": return 15
    case "s": return 1
    case "t": return 17
    case "u": return 32
    case "v": return 9
    case "w": return 13
    case "x": return 7
    case "y": return 16
    case "z": return 6
    default: return nil
    }
}

func postGlobalCharacters(_ text: String) throws {
    guard let source = CGEventSource(stateID: .combinedSessionState) else {
        throw DriverError.actionFailed("type (text)", .failure)
    }
    for character in text {
        guard let code = characterKeyCode(character),
              let keyDown = CGEvent(
                  keyboardEventSource: source,
                  virtualKey: code,
                  keyDown: true
              ),
              let keyUp = CGEvent(
                  keyboardEventSource: source,
                  virtualKey: code,
                  keyDown: false
              ) else {
            throw DriverError.actionFailed("type (text)", .failure)
        }
        keyDown.post(tap: .cghidEventTap)
        keyUp.post(tap: .cghidEventTap)
        Thread.sleep(forTimeInterval: 0.03)
    }
}

func pressGlobalKey(_ text: String) throws {
    try postGlobalKey(text)
    Thread.sleep(forTimeInterval: 0.25)
}

func pressGlobalKeyRepeated(_ text: String, count: Int) throws {
    for _ in 0..<count {
        try postGlobalKey(text)
        Thread.sleep(forTimeInterval: 0.01)
    }
    Thread.sleep(forTimeInterval: 0.25)
}

func pressKey(_ pid: pid_t, _ text: String) throws {
    _ = NSRunningApplication(processIdentifier: pid)?.activate(
        options: []
    )
    try postKey(pid, text)
    Thread.sleep(forTimeInterval: 0.25)
}

func pressKeyRepeated(_ pid: pid_t, _ text: String, count: Int) throws {
    _ = NSRunningApplication(processIdentifier: pid)?.activate(
        options: []
    )
    for _ in 0..<count {
        try postKey(pid, text)
        Thread.sleep(forTimeInterval: 0.01)
    }
    Thread.sleep(forTimeInterval: 0.25)
}

func frame(_ element: AXUIElement) -> CGRect? {
    guard let rawPosition = attribute(element, "AXPosition"),
          let rawSize = attribute(element, "AXSize") else {
        return nil
    }
    let positionValue = unsafeDowncast(rawPosition, to: AXValue.self)
    let sizeValue = unsafeDowncast(rawSize, to: AXValue.self)
    var origin = CGPoint.zero
    var size = CGSize.zero
    guard AXValueGetValue(positionValue, .cgPoint, &origin),
          AXValueGetValue(sizeValue, .cgSize, &size) else {
        return nil
    }
    return CGRect(origin: origin, size: size)
}

func renderedBitmap(in sampleRect: CGRect) -> NSBitmapImageRep? {
    let sampleFile = FileManager.default.temporaryDirectory
        .appendingPathComponent("personal-dashboard-color-\(UUID().uuidString).png")
    defer { try? FileManager.default.removeItem(at: sampleFile) }
    let capture = Process()
    capture.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
    capture.arguments = [
        "-x",
        "-R",
        "\(Int(floor(sampleRect.minX))),\(Int(floor(sampleRect.minY)))," +
            "\(Int(ceil(sampleRect.width))),\(Int(ceil(sampleRect.height)))",
        sampleFile.path,
    ]
    do {
        try capture.run()
        capture.waitUntilExit()
    } catch {
        return nil
    }
    guard capture.terminationStatus == 0,
          let data = try? Data(contentsOf: sampleFile),
          let bitmap = NSBitmapImageRep(data: data) else {
        return nil
    }
    return bitmap
}

func captureOutputURL(_ outputPath: String) throws -> URL {
    let outputURL = URL(fileURLWithPath: outputPath)
    guard outputURL.path == outputPath,
          outputURL.path.hasPrefix("/") else {
        throw DriverError.unexpectedText("window capture path must be absolute")
    }
    guard !FileManager.default.fileExists(atPath: outputPath) else {
        throw DriverError.unexpectedText("window capture destination already exists")
    }
    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(
        atPath: outputURL.deletingLastPathComponent().path,
        isDirectory: &isDirectory
    ), isDirectory.boolValue else {
        throw DriverError.unexpectedText("window capture directory does not exist")
    }
    return outputURL
}

func writeNewCapture(
    _ data: Data,
    to outputURL: URL,
    afterAvailabilityCheck: (() throws -> Void)? = nil
) throws {
    guard !FileManager.default.fileExists(atPath: outputURL.path) else {
        throw DriverError.unexpectedText("window capture destination already exists")
    }
    try afterAvailabilityCheck?()
    do {
        try data.write(to: outputURL, options: .withoutOverwriting)
    } catch {
        throw DriverError.unexpectedText("window capture destination already exists or could not be created")
    }
}

func captureWindow(_ application: AXUIElement, pid: pid_t, outputPath: String) throws {
    let outputURL = try captureOutputURL(outputPath)
    guard let window = mainWindow(application),
          let windowFrame = frame(window) else {
        throw DriverError.timeout("main window frame for capture")
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    Thread.sleep(forTimeInterval: 0.25)
    guard let bitmap = renderedBitmap(in: windowFrame),
          let png = bitmap.representation(using: .png, properties: [:]) else {
        throw DriverError.timeout("rendered main window bitmap")
    }
    try writeNewCapture(png, to: outputURL)
}

func assertCaptureNonOverwrite(_ outputPath: String) throws {
    let outputURL = try captureOutputURL(outputPath)
    let sentinel = Data("capture destination owned by another writer".utf8)
    var rejected = false
    do {
        try writeNewCapture(Data("replacement bytes".utf8), to: outputURL) {
            guard FileManager.default.createFile(
                atPath: outputURL.path,
                contents: sentinel
            ) else {
                throw DriverError.unexpectedText("could not create the competing capture destination")
            }
        }
    } catch {
        rejected = true
    }
    guard rejected,
          try Data(contentsOf: outputURL) == sentinel else {
        throw DriverError.unexpectedText("window capture replaced a competing destination")
    }
}

func dominantRenderedColor(in sampleRect: CGRect) -> (red: Int, green: Int, blue: Int)? {
    guard let bitmap = renderedBitmap(in: sampleRect) else { return nil }
    var counts: [Int: Int] = [:]
    for y in 0..<bitmap.pixelsHigh {
        for x in 0..<bitmap.pixelsWide {
            guard let color = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB) else {
                continue
            }
            let red = Int((color.redComponent * 255).rounded())
            let green = Int((color.greenComponent * 255).rounded())
            let blue = Int((color.blueComponent * 255).rounded())
            let key = (red << 16) | (green << 8) | blue
            counts[key, default: 0] += 1
        }
    }
    guard let key = counts.max(by: { $0.value < $1.value })?.key else { return nil }
    return (red: (key >> 16) & 0xff, green: (key >> 8) & 0xff, blue: key & 0xff)
}

func visibleRenderedElement(_ application: AXUIElement, label: String) -> AXUIElement? {
    findTextPaths(application, label)
        .filter { path in
            (path.ancestors + [path.element]).allSatisfy {
                visibleAttribute($0, "AXHidden")
            }
        }
        .compactMap { path -> (element: AXUIElement, frame: CGRect)? in
            guard let elementFrame = frame(path.element),
                  elementFrame.width >= 2,
                  elementFrame.height >= 2 else {
                return nil
            }
            return (path.element, elementFrame)
        }
        .min(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height })?
        .element
}

func assertLongTextFits(_ application: AXUIElement, text: String) throws {
    guard text.count >= 80,
          let element = visibleRenderedElement(application, label: text),
          let textFrame = frame(element),
          let window = mainWindow(application),
          let windowFrame = frame(window) else {
        throw DriverError.timeout("long rendered text with measurable bounds: \(text)")
    }
    let tolerance: CGFloat = 2
    let visibleWindow = windowFrame.insetBy(dx: -tolerance, dy: -tolerance)
    guard visibleWindow.contains(
        CGPoint(x: textFrame.minX, y: textFrame.minY)
    ), visibleWindow.contains(
        CGPoint(x: textFrame.maxX, y: textFrame.maxY)
    ) else {
        throw DriverError.timeout(
            "long rendered text clipped outside the window: \(text) " +
                "frame=\(textFrame) window=\(windowFrame)"
        )
    }
    guard textFrame.height >= 28,
          textFrame.width <= windowFrame.width - 24 else {
        throw DriverError.timeout(
            "long rendered text did not wrap within the available layout: \(text) " +
                "frame=\(textFrame) window=\(windowFrame)"
        )
    }
}

func visibleAxisTitlePath(_ application: AXUIElement, title: String) -> AccessibilityPath? {
    findTextPaths(application, title).first { path in
        stringAttribute(path.element, "AXRole") == "AXStaticText" &&
            path.ancestors.contains { stringAttribute($0, "AXRole") == "AXLink" } &&
            (path.ancestors + [path.element]).allSatisfy { visibleAttribute($0, "AXHidden") }
    }
}

func assertAxisEntryCard(
    _ application: AXUIElement,
    startLabel: String,
    endLabel: String,
    title: String
) throws {
    guard let titlePath = visibleAxisTitlePath(application, title: title),
    let link = titlePath.ancestors.last(where: { stringAttribute($0, "AXRole") == "AXLink" }),
    let cardFrame = frame(link),
    let titleFrame = frame(titlePath.element),
    let nowPath = findTextPaths(application, "14:10", contains: false).first(where: { path in
        stringAttribute(path.element, "AXRole") == "AXStaticText" &&
            path.ancestors.contains { nodeText($0).localizedCaseInsensitiveContains("当前本地时间") }
    }),
    let nowFrame = frame(nowPath.element),
    let scalePath = visibleAxisTitlePath(application, title: "整理项目资料"),
    let scaleLink = scalePath.ancestors.last(where: { stringAttribute($0, "AXRole") == "AXLink" }),
    let scaleFrame = frame(scaleLink),
    let window = mainWindow(application),
    let windowFrame = frame(window) else {
        throw DriverError.timeout("rendered time-axis card and 14:10 scale bounds: \(startLabel) \(title)")
    }

    let startPieces = startLabel.split(separator: ":").compactMap { Int($0) }
    let endPieces = endLabel.split(separator: ":").compactMap { Int($0) }
    guard startPieces.count == 2, endPieces.count == 2 else {
        throw DriverError.unexpectedText("invalid time-axis card interval: \(startLabel)–\(endLabel)")
    }
    let startMinute = startPieces[0] * 60 + startPieces[1]
    let endMinute = endPieces[0] * 60 + endPieces[1]
    guard endMinute > startMinute else {
        throw DriverError.unexpectedText("invalid time-axis card interval: \(startLabel)–\(endLabel)")
    }
    let nowMinute = 14 * 60 + 10
    let scaleMinute = 15 * 60
    let pixelsPerMinute = (scaleFrame.minY - nowFrame.midY) / CGFloat(scaleMinute - nowMinute)
    let expectedHeight = CGFloat(endMinute - startMinute) * pixelsPerMinute
    let expectedTop = nowFrame.midY + CGFloat(startMinute - nowMinute) * pixelsPerMinute
    let visibleWindow = windowFrame.insetBy(dx: -2, dy: -2)
    let tolerance: CGFloat = 2
    guard pixelsPerMinute > 0, abs(cardFrame.minY - expectedTop) <= tolerance else {
        throw DriverError.unexpectedText(
            "rendered time-axis card does not begin at its \(startLabel) anchor: " +
                "card=\(cardFrame) expectedTop=\(expectedTop) pixelsPerMinute=\(pixelsPerMinute)"
        )
    }
    guard abs(cardFrame.height - expectedHeight) <= tolerance else {
        throw DriverError.unexpectedText(
            "rendered time-axis card height does not match \(startLabel)–\(endLabel): " +
                "card=\(cardFrame.height) expected=\(expectedHeight)"
        )
    }
    guard cardFrame.insetBy(dx: -tolerance, dy: -tolerance).contains(titleFrame),
          visibleWindow.contains(CGPoint(x: cardFrame.minX, y: cardFrame.minY)),
          visibleWindow.contains(CGPoint(x: cardFrame.maxX, y: cardFrame.maxY)) else {
        throw DriverError.unexpectedText(
            "rendered time-axis card or its title is clipped from view: \(title) " +
                "card=\(cardFrame) title=\(titleFrame) window=\(windowFrame)"
        )
    }
}

func axisCardLink(_ application: AXUIElement, title: String) -> (link: AXUIElement, path: AccessibilityPath)? {
    guard let titlePath = visibleAxisTitlePath(application, title: title),
          let link = titlePath.ancestors.last(where: { stringAttribute($0, "AXRole") == "AXLink" }) else {
        return nil
    }
    return (link, titlePath)
}

func axisScrollSurface(in path: AccessibilityPath) -> AXUIElement? {
    path.ancestors.last(where: { element in
        let text = nodeText(element).localizedLowercase
        return stringAttribute(element, "AXRole") == "AXScrollArea" ||
            text.contains("scroll horizontally to view both lanes") ||
            text.contains("横向滚动可查看两栏")
    })
}

func scrollAxisCardIntoWindow(
    _ application: AXUIElement,
    pid: pid_t,
    title: String
) throws {
    guard let window = mainWindow(application),
          let windowFrame = frame(window) else {
        throw DriverError.timeout("main window bounds for time-axis card: \(title)")
    }
    let visibleWindow = windowFrame.insetBy(dx: -2, dy: -2)
    for _ in 0..<8 {
        guard let card = axisCardLink(application, title: title),
              let cardFrame = frame(card.link) else {
            throw DriverError.timeout("rendered time-axis card bounds: \(title)")
        }
        if visibleWindow.contains(cardFrame) {
            return
        }
        guard let surface = scrollSurface(for: card.path),
              let surfaceFrame = frame(surface) else {
            throw DriverError.timeout("scrollable surface for time-axis card: \(title)")
        }
        let direction = cardFrame.maxY > windowFrame.maxY ? "down" : "up"
        let action = direction == "down" ? "AXScrollDownByPage" : "AXScrollUpByPage"
        let actionError = AXUIElementPerformAction(surface, action as CFString)
        Thread.sleep(forTimeInterval: 0.15)
        let afterPage = axisCardLink(application, title: title).flatMap { frame($0.link) }
        if actionError != .success || afterPage.map({ abs($0.minY - cardFrame.minY) < 1 }) != false {
            guard let source = CGEventSource(stateID: .combinedSessionState),
                  let move = CGEvent(
                    mouseEventSource: source,
                    mouseType: .mouseMoved,
                    mouseCursorPosition: CGPoint(x: surfaceFrame.midX, y: surfaceFrame.midY),
                    mouseButton: .left
                  ),
                  let scroll = CGEvent(
                    scrollWheelEvent2Source: source,
                    units: .pixel,
                    wheelCount: 1,
                    wheel1: direction == "down" ? -420 : 420,
                    wheel2: 0,
                    wheel3: 0
                  ) else {
                throw DriverError.actionFailed("scroll time-axis card into view", .failure)
            }
            move.postToPid(pid)
            Thread.sleep(forTimeInterval: 0.05)
            scroll.postToPid(pid)
            Thread.sleep(forTimeInterval: 0.2)
        }
    }
    guard let card = axisCardLink(application, title: title),
          let cardFrame = frame(card.link),
          visibleWindow.contains(cardFrame) else {
        throw DriverError.timeout("fully visible time-axis card after scrolling: \(title)")
    }
}

func assertAxisCardsFit(_ application: AXUIElement, pid: pid_t, specifications: String) throws {
    guard let window = mainWindow(application),
          let windowFrame = frame(window) else {
        throw DriverError.timeout("main window bounds for rendered time-axis cards")
    }
    let visibleWindow = windowFrame.insetBy(dx: -2, dy: -2)
    var cards: [(title: String, frame: CGRect)] = []
    for specification in specifications.split(separator: ";", omittingEmptySubsequences: false) {
        let fields = specification.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
        guard fields.count == 2 else {
            throw DriverError.usage
        }
        try scrollAxisCardIntoWindow(application, pid: pid, title: fields[0])
        guard let card = axisCardLink(application, title: fields[0]),
              let cardFrame = frame(card.link),
              let titleFrame = frame(card.path.element),
              let scrollSurface = axisScrollSurface(in: card.path),
              let scrollFrame = frame(scrollSurface) else {
            throw DriverError.timeout("rendered card and title bounds: \(specification)")
        }
        guard let timePath = findTextPaths(card.link, fields[1], contains: false).first(where: {
            stringAttribute($0.element, "AXRole") == "AXStaticText"
        }), let timeFrame = frame(timePath.element) else {
            throw DriverError.timeout("rendered time label inside card: \(fields[1])")
        }
        let contentBounds = cardFrame.insetBy(dx: -2, dy: -2)
        let titleStartsInsideCard = titleFrame.minY >= cardFrame.minY - 2 &&
            titleFrame.minY < cardFrame.maxY &&
            titleFrame.minX >= cardFrame.minX - 2 &&
            titleFrame.minX < cardFrame.maxX
        let visibleScrollSurface = scrollFrame.insetBy(dx: -2, dy: -2)
        guard cardFrame.width >= 80,
              cardFrame.height >= 38,
              titleStartsInsideCard,
              contentBounds.contains(timeFrame),
              visibleWindow.contains(cardFrame),
              visibleScrollSurface.contains(cardFrame) else {
            throw DriverError.unexpectedText(
                "rendered time-axis card time label or hit target is too narrow, clipped, or outside its scroll viewport: " +
                    "title=\(fields[0]) card=\(cardFrame) time=\(timeFrame) titleBounds=\(titleFrame) " +
                    "window=\(windowFrame) viewport=\(scrollFrame)"
            )
        }
        cards.append((fields[0], cardFrame))
    }
    print("Rendered card times and hit targets fit the single timeline lane when brought into view:")
    for card in cards {
        print("  \(card.title): \(card.frame)")
    }
}

func assertAxisOverlapStack(
    _ application: AXUIElement,
    firstTitle: String,
    secondTitle: String
) throws {
    guard let first = axisCardLink(application, title: firstTitle),
          let second = axisCardLink(application, title: secondTitle),
          let firstFrame = frame(first.link),
          let secondFrame = frame(second.link) else {
        throw DriverError.timeout("rendered cards for overlap stack: \(firstTitle), \(secondTitle)")
    }
    let overlap = firstFrame.intersection(secondFrame)
    let fannedApart = abs(firstFrame.minX - secondFrame.minX) > 1 ||
        abs(firstFrame.minY - secondFrame.minY) > 1
    let revealButton = findPressable(application, "切换重叠事项", contains: true) ??
        findPressable(application, "Show next overlapping item", contains: true)
    guard overlap.width > 1, overlap.height > 1, fannedApart, revealButton != nil else {
        throw DriverError.unexpectedText(
            "rendered overlapping cards are not fanned with a reveal control: " +
                "\(firstTitle)=\(firstFrame) / \(secondTitle)=\(secondFrame)"
        )
    }
    print("Rendered overlapping cards share one fanned stack with a reveal control: \(firstFrame) / \(secondFrame)")
}

func cycleAxisStack(_ application: AXUIElement) throws {
    guard let revealButton = findPressable(application, "切换重叠事项", contains: true) ??
        findPressable(application, "Show next overlapping item", contains: true) else {
        throw DriverError.timeout("overlapping time-axis stack reveal control")
    }
    try performAccessibilityAction(revealButton, "AXPress", "reveal next overlapping time-axis card")
    print("Revealed the next card in its overlapping time-axis stack")
}

func clickAxisCard(_ application: AXUIElement, pid: pid_t, title: String) throws {
    guard let card = axisCardLink(application, title: title) else {
        throw DriverError.timeout("visible rendered time-axis card link: \(title)")
    }
    try clickElement(card.link, pid: pid)
    print("Clicked rendered time-axis card at its independent hit target: \(title)")
}

func focusAxisCard(_ application: AXUIElement, pid: pid_t, title: String) throws {
    guard let card = axisCardLink(application, title: title) else {
        throw DriverError.timeout("visible rendered time-axis card link: \(title)")
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    let error = AXUIElementSetAttributeValue(card.link, "AXFocused" as CFString, kCFBooleanTrue)
    guard error == .success else {
        throw DriverError.actionFailed("focus time-axis card \(title)", error)
    }
    try waitForFocusedText(application, title, timeout: 2)
    print("Focused rendered time-axis card link: \(title)")
}

func scrollAxisHorizontally(
    _ application: AXUIElement,
    pid: pid_t,
    direction: String,
    targetTitle: String
) throws {
    guard direction == "left" || direction == "right",
          let card = axisCardLink(application, title: targetTitle),
          let initialFrame = frame(card.link),
          let surface = axisScrollSurface(in: card.path),
          let surfaceFrame = frame(surface),
          let source = CGEventSource(stateID: .combinedSessionState) else {
        throw DriverError.timeout("horizontal time-axis scroll surface for: \(targetTitle)")
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    var movedFrame = frame(card.link)
    let focusError = AXUIElementSetAttributeValue(
        surface,
        "AXFocused" as CFString,
        kCFBooleanTrue
    )
    if focusError == .success {
        var consecutiveUnchangedFrames = 0
        for _ in 0..<8 {
            try pressKey(pid, direction)
            let nextFrame = axisCardLink(application, title: targetTitle).flatMap { frame($0.link) }
            if let previousFrame = movedFrame,
               let nextFrame,
               abs(nextFrame.minX - previousFrame.minX) <= 1 {
                consecutiveUnchangedFrames += 1
            } else {
                consecutiveUnchangedFrames = 0
            }
            movedFrame = nextFrame
            if consecutiveUnchangedFrames >= 2 {
                break
            }
        }
    }
    if let rawScrollBar = attribute(surface, "AXHorizontalScrollBar") {
        let scrollBar = unsafeDowncast(rawScrollBar, to: AXUIElement.self)
        if let current = numberAttribute(scrollBar, "AXValue"),
           let maximum = numberAttribute(scrollBar, "AXMaxValue"),
           maximum > current {
            let minimum = numberAttribute(scrollBar, "AXMinValue") ?? 0
            let step = max(1, min(maximum - minimum, 0.7 * surfaceFrame.width))
            let target = direction == "right"
                ? min(maximum, current + step)
                : max(minimum, current - step)
            if target != current {
                let scrollError = AXUIElementSetAttributeValue(
                    scrollBar,
                    "AXValue" as CFString,
                    NSNumber(value: target)
                )
                if scrollError == .success {
                    Thread.sleep(forTimeInterval: 0.3)
                    movedFrame = axisCardLink(application, title: targetTitle).flatMap { frame($0.link) }
                }
            }
        }
    }
    let movedByScrollBar = movedFrame.map { candidate in
        direction == "right"
            ? candidate.minX < initialFrame.minX - 1
            : candidate.minX > initialFrame.minX + 1
    } ?? false
    let action = direction == "right" ? "AXScrollRightByPage" : "AXScrollLeftByPage"
    let actionError = movedByScrollBar
        ? .success
        : AXUIElementPerformAction(surface, action as CFString)
    if !movedByScrollBar {
        Thread.sleep(forTimeInterval: 0.2)
        movedFrame = axisCardLink(application, title: targetTitle).flatMap { frame($0.link) }
    }
    let movedInRequestedDirection = movedFrame.map { candidate in
        direction == "right"
            ? candidate.minX < initialFrame.minX - 1
            : candidate.minX > initialFrame.minX + 1
    } ?? false
    if !movedInRequestedDirection {
        guard let move = CGEvent(
                  mouseEventSource: source,
                  mouseType: .mouseMoved,
                  mouseCursorPosition: CGPoint(x: surfaceFrame.midX, y: surfaceFrame.midY),
                  mouseButton: .left
              ),
              let scroll = CGEvent(
                  scrollWheelEvent2Source: source,
                  units: .pixel,
                  wheelCount: 2,
                  wheel1: 0,
                  wheel2: direction == "right" ? 520 : -520,
                  wheel3: 0
              ) else {
            throw DriverError.actionFailed("scroll time axis \(direction)", .failure)
        }
        move.post(tap: .cghidEventTap)
        Thread.sleep(forTimeInterval: 0.05)
        scroll.post(tap: .cghidEventTap)
        Thread.sleep(forTimeInterval: 0.35)
        movedFrame = axisCardLink(application, title: targetTitle).flatMap { frame($0.link) }
    }
    guard let finalFrame = movedFrame,
          direction == "right"
            ? finalFrame.minX < initialFrame.minX - 1
            : finalFrame.minX > initialFrame.minX + 1 else {
        let surfaceDetails = card.path.ancestors.map { element in
            "\(stringAttribute(element, "AXRole"))[\(nodeText(element))]@\(String(describing: frame(element)))"
        }.joined(separator: " <- ")
        let scrollBarDetails: String
        if let rawScrollBar = attribute(surface, "AXHorizontalScrollBar") {
            let scrollBar = unsafeDowncast(rawScrollBar, to: AXUIElement.self)
            scrollBarDetails = "value=\(String(describing: numberAttribute(scrollBar, "AXValue"))) max=\(String(describing: numberAttribute(scrollBar, "AXMaxValue")))"
        } else {
            scrollBarDetails = "unavailable"
        }
        throw DriverError.unexpectedText(
            "horizontal time-axis scroll did not move \(direction) " +
                "(AX action: \(actionError.rawValue), focus: \(focusError.rawValue), scrollbar: \(scrollBarDetails)): " +
                "card=\(initialFrame) surface=\(surfaceFrame) ancestors=\(surfaceDetails)"
        )
    }
    print("Scrolled the time-axis region \(direction): \(initialFrame.minX) -> \(finalFrame.minX)")
}

func assertWindowVisibleText(_ application: AXUIElement, text: String) throws {
    guard let window = mainWindow(application),
          let windowFrame = frame(window),
          let element = visibleRenderedElement(application, label: text),
          let elementFrame = frame(element) else {
        throw DriverError.timeout("visible rendered UI text with measurable bounds: \(text)")
    }
    let visibleWindow = windowFrame.insetBy(dx: -2, dy: -2)
    guard visibleWindow.contains(CGPoint(x: elementFrame.minX, y: elementFrame.minY)),
          visibleWindow.contains(CGPoint(x: elementFrame.maxX, y: elementFrame.maxY)) else {
        throw DriverError.unexpectedText(
            "rendered UI text is outside the visible window: \(text) " +
                "frame=\(elementFrame) window=\(windowFrame)"
        )
    }
}

func assertWindowVisibleLink(_ application: AXUIElement, text: String) throws {
    guard let link = visibleLink(application, text: text),
          let linkFrame = frame(link),
          let window = mainWindow(application),
          let windowFrame = frame(window) else {
        throw DriverError.timeout("visible rendered link with measurable bounds: \(text)")
    }
    let visibleWindow = windowFrame.insetBy(dx: -2, dy: -2)
    guard visibleWindow.contains(CGPoint(x: linkFrame.minX, y: linkFrame.minY)),
          visibleWindow.contains(CGPoint(x: linkFrame.maxX, y: linkFrame.maxY)) else {
        throw DriverError.unexpectedText(
            "rendered link is outside the visible window: \(text) " +
                "frame=\(linkFrame) window=\(windowFrame)"
        )
    }
}

func visibleLink(_ application: AXUIElement, text: String) -> AXUIElement? {
    findTextPaths(application, text).first(where: { path in
        stringAttribute(path.element, "AXRole") == "AXLink" &&
            (path.ancestors + [path.element]).allSatisfy { visibleAttribute($0, "AXHidden") }
    })?.element
}

func clickVisibleLink(_ application: AXUIElement, pid: pid_t, text: String) throws {
    guard let link = visibleLink(application, text: text) else {
        throw DriverError.timeout("visible rendered link: \(text)")
    }
    try clickElement(link, pid: pid)
    print("Clicked rendered link: \(text)")
}

func scrollTextIntoWindow(
    _ application: AXUIElement,
    text: String,
    pid: pid_t
) throws {
    guard let path = findTextPaths(application, text).first(where: { candidate in
        (candidate.ancestors + [candidate.element]).allSatisfy {
            visibleAttribute($0, "AXHidden")
        } && frame(candidate.element) != nil && scrollSurface(for: candidate) != nil
    }), let surface = scrollSurface(for: path),
       let window = mainWindow(application), let windowFrame = frame(window) else {
        throw DriverError.timeout("scroll target with measurable bounds: \(text)")
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    let visibleWindow = windowFrame.insetBy(dx: -2, dy: -2)
    for _ in 0..<8 {
        guard let textElement = visibleRenderedElement(application, label: text),
              let textFrame = frame(textElement) else {
            break
        }
        if
           visibleWindow.contains(CGPoint(x: textFrame.minX, y: textFrame.minY)),
           visibleWindow.contains(CGPoint(x: textFrame.maxX, y: textFrame.maxY)) {
            try assertDocumentFixed(application)
            return
        }
        let action = textFrame.maxY > windowFrame.maxY
            ? "AXScrollDownByPage"
            : "AXScrollUpByPage"
        let scrollError = AXUIElementPerformAction(surface, action as CFString)
        guard scrollError == .success else {
            throw DriverError.actionFailed("scroll text into the window", scrollError)
        }
        Thread.sleep(forTimeInterval: 0.15)
        let afterActionY = visibleRenderedElement(application, label: text)
            .flatMap(frame)?.minY
        if afterActionY == nil || abs(afterActionY! - textFrame.minY) < 1 {
            guard let surfaceFrame = frame(surface),
                  let source = CGEventSource(stateID: .combinedSessionState),
                  let move = CGEvent(
                    mouseEventSource: source,
                    mouseType: .mouseMoved,
                    mouseCursorPosition: CGPoint(x: surfaceFrame.midX, y: surfaceFrame.midY),
                    mouseButton: .left
                  ),
                  let scroll = CGEvent(
                    scrollWheelEvent2Source: source,
                    units: .pixel,
                    wheelCount: 1,
                    wheel1: textFrame.maxY > windowFrame.maxY ? -420 : 420,
                    wheel2: 0,
                    wheel3: 0
                  ) else {
                throw DriverError.timeout("scroll event for long rendered text: \(text)")
            }
            move.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.05)
            scroll.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.2)
        }
    }
    throw DriverError.timeout(
        "scroll text into the visible window: \(text) " +
            "frame=\(String(describing: visibleRenderedElement(application, label: text).flatMap(frame))) " +
            "window=\(windowFrame) surface=\(String(describing: frame(surface)))"
    )
}

func waitForMatchingRenderedColors(
    _ application: AXUIElement,
    firstLabel: String,
    secondLabel: String,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    var lastActual = "unavailable"
    repeat {
        if let first = visibleRenderedElement(application, label: firstLabel),
           let second = visibleRenderedElement(application, label: secondLabel),
           let firstFrame = frame(first),
           let secondFrame = frame(second),
           let firstColor = dominantRenderedColor(in: firstFrame),
           let secondColor = dominantRenderedColor(in: secondFrame) {
            lastActual = String(
                format: "#%02x%02x%02x vs #%02x%02x%02x",
                firstColor.red,
                firstColor.green,
                firstColor.blue,
                secondColor.red,
                secondColor.green,
                secondColor.blue
            )
            if abs(firstColor.red - secondColor.red) <= 3 &&
                abs(firstColor.green - secondColor.green) <= 3 &&
                abs(firstColor.blue - secondColor.blue) <= 3 {
                return
            }
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout(
        "matching rendered colors \(firstLabel) and \(secondLabel) (actual: \(lastActual))"
    )
}

func assertRenderedVariation(
    _ application: AXUIElement,
    label: String,
    minimumDistance: Int
) throws {
    guard let element = visibleRenderedElement(application, label: label),
          let elementFrame = frame(element),
          let bitmap = renderedBitmap(in: elementFrame) else {
        throw DriverError.timeout("rendered color variation sample: \(label)")
    }
    var minimum = (red: 255, green: 255, blue: 255)
    var maximum = (red: 0, green: 0, blue: 0)
    let insetX = max(3, bitmap.pixelsWide / 20)
    let insetY = max(3, bitmap.pixelsHigh / 20)
    for y in stride(from: insetY, to: bitmap.pixelsHigh - insetY, by: 3) {
        for x in stride(from: insetX, to: bitmap.pixelsWide - insetX, by: 3) {
            guard let color = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB) else {
                continue
            }
            let red = Int((color.redComponent * 255).rounded())
            let green = Int((color.greenComponent * 255).rounded())
            let blue = Int((color.blueComponent * 255).rounded())
            minimum.red = min(minimum.red, red)
            minimum.green = min(minimum.green, green)
            minimum.blue = min(minimum.blue, blue)
            maximum.red = max(maximum.red, red)
            maximum.green = max(maximum.green, green)
            maximum.blue = max(maximum.blue, blue)
        }
    }
    let distance = maximum.red - minimum.red +
        maximum.green - minimum.green +
        maximum.blue - minimum.blue
    guard distance >= minimumDistance else {
        throw DriverError.timeout(
            "rendered color variation for \(label) was \(distance), expected at least \(minimumDistance); " +
                "frame=\(elementFrame) minimum=\(minimum) maximum=\(maximum)"
        )
    }
}

func renderedContentBackgroundSignature(
    _ application: AXUIElement,
    workspaceLabel: String
) throws -> String {
    guard let workspace = visibleRenderedElement(application, label: workspaceLabel),
          let workspaceFrame = frame(workspace) else {
        throw DriverError.timeout("main workspace frame for rendered background signature")
    }
    let sampleXs = [workspaceFrame.maxX - 42]
    let sampleYs: [CGFloat] = [0.54, 0.66, 0.78]
    let colors = sampleXs.flatMap { sampleX in
        sampleYs.compactMap { normalizedY in
            dominantRenderedColor(
                in: CGRect(
                    x: sampleX,
                    y: workspaceFrame.minY + workspaceFrame.height * normalizedY,
                    width: 5,
                    height: 5
                )
            )
        }
    }
    guard colors.count == sampleXs.count * sampleYs.count else {
        throw DriverError.timeout("rendered main-content background signature pixels")
    }
    return colors.map { color in
        String(format: "%02x%02x%02x", color.red, color.green, color.blue)
    }.joined(separator: "-")
}

func assertCalendarCellsTransparent(
    _ application: AXUIElement,
    label: String,
    tolerance: Int
) throws {
    let gridFrame = findTextPaths(application, label)
        .filter { path in
            (path.ancestors + [path.element]).allSatisfy {
                visibleAttribute($0, "AXHidden")
            }
        }
        .compactMap { frame($0.element) }
        .filter { $0.width >= 200 && $0.height >= 100 }
        .max(by: { $0.width * $0.height < $1.width * $1.height })
    guard let gridFrame,
          let window = mainWindow(application),
          let windowFrame = frame(window) else {
        throw DriverError.timeout("visible Calendar grid for transparency sampling: \(label)")
    }
    let visibleGrid = gridFrame.intersection(windowFrame.insetBy(dx: 2, dy: 2))
    guard !visibleGrid.isNull, visibleGrid.height >= 40 else {
        throw DriverError.timeout("enough visible Calendar grid for transparency sampling")
    }
    let outsideX = gridFrame.minX - 8
    let insideX = gridFrame.minX + 10
    let sampleYs: [CGFloat] = [0.18, 0.37, 0.63, 0.82]
    var matchingSamples = 0
    var comparisons: [String] = []
    for normalizedY in sampleYs {
        let sampleY = visibleGrid.minY + visibleGrid.height * normalizedY
        guard let outside = dominantRenderedColor(
            in: CGRect(x: outsideX, y: sampleY, width: 5, height: 5)
        ), let inside = dominantRenderedColor(
            in: CGRect(x: insideX, y: sampleY, width: 5, height: 5)
        ) else {
            continue
        }
        let distance = max(
            abs(outside.red - inside.red),
            abs(outside.green - inside.green),
            abs(outside.blue - inside.blue)
        )
        comparisons.append("\(distance)")
        if distance <= tolerance { matchingSamples += 1 }
    }
    guard matchingSamples >= 3 else {
        throw DriverError.timeout(
            "Calendar cells add an opaque surface over the page background; " +
                "matching=\(matchingSamples) channelDistances=\(comparisons) tolerance=\(tolerance)"
        )
    }
}

func makeImageFixture(_ value: String) throws {
    let parts = value.split(separator: "|", maxSplits: 1).map(String.init)
    guard parts.count == 2 else { throw DriverError.usage }
    let colors: (NSColor, NSColor)
    switch parts[0] {
    case "light":
        colors = (
            NSColor(calibratedRed: 0.97, green: 0.91, blue: 0.80, alpha: 1),
            NSColor(calibratedRed: 0.84, green: 0.92, blue: 0.88, alpha: 1)
        )
    case "complex":
        colors = (
            NSColor(calibratedRed: 0.12, green: 0.25, blue: 0.38, alpha: 1),
            NSColor(calibratedRed: 0.78, green: 0.35, blue: 0.16, alpha: 1)
        )
    default:
        throw DriverError.usage
    }
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: 320,
        pixelsHigh: 140,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        throw DriverError.timeout("create background image fixture")
    }
    for y in 0..<bitmap.pixelsHigh {
        for x in 0..<bitmap.pixelsWide {
            let stripe = (x / 40 + y / 35) % 2 == 0
            bitmap.setColor(stripe ? colors.0 : colors.1, atX: x, y: y)
        }
    }
    guard let png = bitmap.representation(using: .png, properties: [:]) else {
        throw DriverError.timeout("encode background image fixture")
    }
    try png.write(to: URL(fileURLWithPath: parts[1]), options: .atomic)
}

func performAccessibilityAction(
    _ element: AXUIElement,
    _ action: String,
    _ description: String
) throws {
    let error = AXUIElementPerformAction(element, action as CFString)
    guard error == .success else {
        throw DriverError.actionFailed(description, error)
    }
}

func setAccessibilityAttribute(
    _ element: AXUIElement,
    _ name: String,
    _ value: CFTypeRef,
    _ description: String
) throws {
    let error = AXUIElementSetAttributeValue(element, name as CFString, value)
    guard error == .success else {
        throw DriverError.actionFailed(description, error)
    }
}

func isExplicitlyUnsupported(_ error: AXError) -> Bool {
    error == .attributeUnsupported ||
        error == .actionUnsupported ||
        error == .notImplemented
}

struct PickerState: Equatable {
    let value: String
    let selectedValues: [String]

    var summary: String {
        let values = [value] + selectedValues
        return values.filter { !$0.isEmpty }.joined(separator: " | ")
    }
}

func pickerState(_ picker: AXUIElement) -> PickerState {
    let value = attribute(picker, "AXValue").map(normalizedAttributeValue) ?? ""
    let selectedValues = (attribute(picker, "AXSelectedChildren") as? [AXUIElement] ?? [])
        .flatMap { child in
            ["AXValue", "AXTitle"].compactMap { name in
                attribute(child, name).map(normalizedAttributeValue)
            }
        }
    return PickerState(value: value, selectedValues: selectedValues)
}

func pickerStateMatches(_ state: PickerState, _ text: String) -> Bool {
    let expected = text.lowercased()
    return ([state.value] + state.selectedValues).contains { value in
        !value.isEmpty && value.contains(expected)
    }
}

func waitForPickerValue(
    _ picker: AXUIElement,
    _ text: String,
    timeout: TimeInterval,
    changedFrom previousState: PickerState,
    requireChange: Bool = true
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    var lastValue = "<none>"
    repeat {
        let currentState = pickerState(picker)
        lastValue = currentState.summary
        if pickerStateMatches(currentState, text) {
            guard !requireChange || currentState != previousState else {
                throw DriverError.unexpectedText(
                    "specific picker value remained unchanged: \(text)"
                )
            }
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout(
        "specific picker value: \(text) (actual: \(lastValue))"
    )
}

func waitForExceptionPickerValue(
    _ application: AXUIElement,
    pickerIndex: Int,
    text: String,
    timeout: TimeInterval,
    changedFrom previousState: PickerState,
    requireChange: Bool = true
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    var lastValue = "<none>"
    var matchedUnchanged = false
    repeat {
        let pickers = findExceptionSchedulePickers(application)
        if pickers.indices.contains(pickerIndex) {
            let currentState = pickerState(pickers[pickerIndex])
            lastValue = currentState.summary
            if pickerStateMatches(currentState, text) {
                if !requireChange || currentState != previousState {
                    return
                }
                matchedUnchanged = true
            }
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    if matchedUnchanged {
        throw DriverError.unexpectedText(
            "specific picker value remained unchanged: \(text)"
        )
    }
    throw DriverError.timeout(
        "specific picker value: \(text) (actual: \(lastValue))"
    )
}

func scrollSurface(for path: AccessibilityPath) -> AXUIElement? {
    let informationLabels = ["Workspace information", "工作区信息"]
    if let informationSurface = path.ancestors.reversed().first(where: { element in
        visibleAttribute(element, "AXHidden") &&
            informationLabels.contains { label in
                nodeText(element).localizedCaseInsensitiveContains(label)
            }
    }) {
        return informationSurface
    }
    return path.ancestors.reversed().first { element in
        let role = stringAttribute(element, "AXRole")
        let accessibilityName = nodeText(element).localizedLowercase
        let isHorizontalTimelineRegion =
            accessibilityName.contains("scroll horizontally to view both lanes") ||
            accessibilityName.contains("横向滚动可查看两栏")
        return visibleAttribute(element, "AXHidden") &&
            !isHorizontalTimelineRegion &&
            (role == "AXScrollArea" ||
            (role != "AXWebArea" && role != "AXWindow" &&
                attribute(element, "AXVerticalScrollBar") != nil))
    }
}

func assertDestinationInset(
    _ application: AXUIElement,
    _ destination: String
) throws {
    let normalizedDestination = destination.lowercased()
    guard normalizedDestination == "history" || normalizedDestination == "settings" else {
        throw DriverError.usage
    }
    let boundaryLabel = normalizedDestination == "history"
        ? "History content"
        : "Settings content"
    guard let boundaryPath = findTextPath(
        application,
        boundaryLabel,
        contains: true
    ), visibleAttribute(boundaryPath.element, "AXHidden") else {
        throw DriverError.timeout("destination content boundary: \(destination)")
    }
    guard let boundaryFrame = frame(boundaryPath.element),
          boundaryFrame.width > 0,
          boundaryFrame.height > 0 else {
        throw DriverError.timeout("destination content boundary frame: \(destination)")
    }
    guard let surface = scrollSurface(for: boundaryPath),
          let surfaceFrame = frame(surface),
          surfaceFrame.width > 0,
          surfaceFrame.height > 0 else {
        throw DriverError.timeout("destination information surface frame: \(destination)")
    }

    let compactViewport = mainWindow(application).flatMap(windowSize).map {
        $0.width <= 680
    } ?? false
    let minimumInset: CGFloat = compactViewport ? 12 : 20
    let leftInset = boundaryFrame.minX - surfaceFrame.minX
    let rightInset = surfaceFrame.maxX - boundaryFrame.maxX
    guard boundaryFrame.minX >= surfaceFrame.minX,
          boundaryFrame.maxX <= surfaceFrame.maxX,
          leftInset >= minimumInset,
          rightInset >= minimumInset else {
        throw DriverError.unexpectedText(
            "\(destination) content boundary is flush or asymmetric " +
                "(left=\(Int(leftInset)), right=\(Int(rightInset)), " +
                "minimum=\(Int(minimumInset)))"
        )
    }
    print(
        "\(destination) content boundary inset passed: " +
            "left=\(Int(leftInset)) right=\(Int(rightInset))"
    )
}

func assertVisibleFocus(
    _ application: AXUIElement,
    _ text: String,
    timeout: TimeInterval
) throws {
    try waitForFocusedText(application, text, timeout: timeout)
    guard let focused = focusedElement(application),
          let window = mainWindow(application),
          let focusedFrame = frame(focused),
          let windowFrame = frame(window),
          focusedFrame.width > 0,
          focusedFrame.height > 0,
          focusedFrame.intersects(windowFrame) else {
        throw DriverError.timeout("visible focused control: \(text)")
    }
}

func roleCounts(_ application: AXUIElement) -> [String: Int] {
    var counts: [String: Int] = [:]
    _ = walk(application) { element in
        let role = stringAttribute(element, "AXRole")
        if !role.isEmpty {
            counts[role, default: 0] += 1
        }
        return false
    }
    return counts
}

func assertSemanticContract(
    _ application: AXUIElement,
    _ mode: String
) throws {
    if mode.hasPrefix("dashboard-2-") {
        try assertDashboard2SemanticContract(application, mode)
        return
    }

    let counts = roleCounts(application)
    let compactViewport = mainWindow(application).flatMap(windowSize).map { $0.width <= 680 } ?? false
    let todayMode = mode == "today" || mode == "today-daytime" || mode == "today-evening"
    let calendarMode = mode == "calendar"
    let habitsMode = mode == "habits"
    let dashboardDestinationMode = calendarMode || habitsMode
    let compactMode = mode == "compact" || mode == "detail-compact" ||
        mode == "settings" || mode == "recording" || todayMode || calendarMode || habitsMode
    let minimumButtonCount = compactViewport ? 1 : 4
    let buttonDescriptions = findRolesWithin(application, ["AXButton"]).map(nodeText)
    guard (counts["AXWindow"] ?? 0) > 0,
          (counts["AXWebArea"] ?? 0) > 0,
          (counts["AXButton"] ?? 0) >= minimumButtonCount,
          (counts["AXStaticText"] ?? 0) > 0,
          compactMode || (counts["AXList"] ?? 0) > 0 else {
        throw DriverError.timeout(
            "semantic workspace roles " +
                "(window=\(counts["AXWindow"] ?? 0), " +
                "webArea=\(counts["AXWebArea"] ?? 0), " +
                "button=\(counts["AXButton"] ?? 0), " +
                "staticText=\(counts["AXStaticText"] ?? 0), " +
                "list=\(counts["AXList"] ?? 0), " +
                "minimumButtons=\(minimumButtonCount), " +
                "buttons=\(buttonDescriptions))"
        )
    }

    let requiresDestinationSwitcher = Set([
        "default", "compact", "settings", "calendar", "habits", "today", "today-daytime", "today-evening",
    ]).contains(mode)
    if compactViewport && requiresDestinationSwitcher && !dashboardDestinationMode {
        let expectedDestination = mode == "settings"
            ? "Settings"
            : calendarMode ? "Calendar"
            : habitsMode ? "Habits"
            : todayMode ? "Today" : "This Week"
        let switcherRoles = Set(["AXComboBox", "AXPopUpButton"])
        let switcherDescriptions = findRolesWithin(application, switcherRoles).map(nodeText)
        let hasExpectedSwitcher = switcherDescriptions.contains {
            $0.localizedCaseInsensitiveContains(expectedDestination)
        }
        guard hasExpectedSwitcher,
              findText(application, "Destination") != nil else {
            throw DriverError.timeout(
                "compact destination switcher (expected: \(expectedDestination), found: \(switcherDescriptions))"
            )
        }
    }

    if dashboardDestinationMode || !compactViewport {
        let destinations = dashboardDestinationMode
            ? ["Today", "Calendar", "Habits"]
            : ["Today", "Calendar", "Habits", "This Week", "History", "Settings"]
        for text in destinations {
            guard findPressable(application, text, contains: true) != nil else {
                throw DriverError.timeout("semantic navigation control: \(text)")
            }
        }
    }

    if mode == "default" {
        for text in ["Primary departures", "Open capacity", "Log workout now"] {
            guard findText(application, text) != nil else {
                throw DriverError.timeout("semantic default workspace content: \(text)")
            }
        }
    } else if calendarMode {
        guard findText(application, "Month view") != nil,
              findText(application, "Selected day") != nil,
              findPressable(application, "上个月", contains: true) != nil,
              findPressable(application, "下个月", contains: true) != nil,
              findPressable(application, "今天", contains: true) != nil else {
            throw DriverError.timeout("semantic Calendar reading surface")
        }
        let calendarHeadings = findRolesWithin(application, ["AXHeading"])
            .filter { nodeText($0) == "Calendar" }
        guard calendarHeadings.count == 1 else {
            throw DriverError.timeout(
                "semantic Calendar heading hierarchy (expected 1, found \(calendarHeadings.count))"
            )
        }
    } else if habitsMode {
        guard findText(application, "本周统计") != nil,
              findText(application, "每日锚点") != nil,
              findText(application, "本周习惯在今天") != nil,
              findPressable(application, "刷新快照", contains: true) != nil else {
            throw DriverError.timeout("semantic Habits snapshot surface")
        }
    } else if todayMode {
        for text in ["Morning", "Daytime", "Evening"] {
            guard findPressable(application, text, contains: true) != nil else {
                throw DriverError.timeout("semantic Today phase control: \(text)")
            }
        }
        guard findPressable(application, "刷新", contains: true) != nil else {
            throw DriverError.timeout("semantic Today refresh control")
        }
        if mode == "today" {
            guard findText(application, "当天的初始安排") != nil,
                  findPressable(application, "初始计划依据", contains: true) != nil else {
                throw DriverError.timeout("semantic Today morning baseline")
            }
        } else if mode == "today-daytime" {
            let todaySurface = findTextPath(application, "时间轴 + 记录")
                .flatMap(scrollSurface)
            guard findText(application, "时间轴 + 记录") != nil,
                  findText(application, "现在怎么走") != nil,
                  findText(application, "已发生 / 已确认") != nil,
                  findText(application, "当前安排 · 未按时间推断") != nil,
                  findText(application, "接下来计划") != nil,
                  findText(application, "当日简短记录") != nil,
                  findText(application, "安排变化") != nil,
                  todaySurface != nil,
                  findPressable(todaySurface!, "完成", contains: true) == nil,
                  findPressable(todaySurface!, "Habit", contains: true) == nil else {
                throw DriverError.timeout("semantic Today daytime reading surface")
            }
        } else if mode == "today-evening" {
            guard findText(application, "Agent 整理的今日记录") != nil else {
                throw DriverError.timeout("semantic Today evening reading surface")
            }
        }
    } else if mode == "detail" || mode == "detail-compact" {
        let hasWorkoutText = findText(application, "workout") != nil
        let hasCloseOrBack = findPressable(application, "Close", contains: true) != nil ||
            findPressable(application, "Back", contains: true) != nil
        guard hasWorkoutText, hasCloseOrBack else {
            throw DriverError.timeout(
                "semantic detail surface (workout=\(hasWorkoutText), close-or-back=\(hasCloseOrBack))"
            )
        }
    } else if mode == "compact" {
        guard findText(application, "Destination") != nil else {
            throw DriverError.timeout("semantic compact navigation label: Destination")
        }
    } else if mode == "settings" {
        guard (counts["AXTextField"] ?? 0) > 0,
              findText(application, "Profile & data") != nil else {
            throw DriverError.timeout("semantic settings form")
        }
    } else if mode == "recording" {
        guard findText(application, "What activity did you do?") != nil,
              findPressable(application, "Elliptical", contains: true) != nil else {
            throw DriverError.timeout("semantic workout recording form")
        }
    } else if mode == "warning" {
        guard findText(application, "overlaps") != nil,
              (counts["AXStaticText"] ?? 0) > 0 else {
            throw DriverError.timeout("semantic conflict warning")
        }
    } else {
        throw DriverError.usage
    }
}

func assertDashboard2SemanticContract(
    _ application: AXUIElement,
    _ mode: String
) throws {
    let counts = roleCounts(application)
    let compactViewport = mainWindow(application).flatMap(windowSize).map { $0.width <= 680 } ?? false
    let todayMode = mode == "dashboard-2-today" ||
        mode == "dashboard-2-today-daytime" ||
        mode == "dashboard-2-today-evening"
    let calendarMode = mode == "dashboard-2-calendar"
    let habitsMode = mode == "dashboard-2-habits"
    let minimumButtonCount = compactViewport ? 1 : 4

    guard (counts["AXWindow"] ?? 0) > 0,
          (counts["AXWebArea"] ?? 0) > 0,
          (counts["AXButton"] ?? 0) >= minimumButtonCount,
          (counts["AXStaticText"] ?? 0) > 0 else {
        throw DriverError.timeout(
            "dashboard-2 semantic workspace roles " +
                "(window=\(counts["AXWindow"] ?? 0), " +
                "webArea=\(counts["AXWebArea"] ?? 0), " +
                "button=\(counts["AXButton"] ?? 0), " +
                "staticText=\(counts["AXStaticText"] ?? 0), " +
                "minimumButtons=\(minimumButtonCount))"
        )
    }

    for text in ["Today", "Calendar", "Habits"] {
        guard findPressable(application, text, contains: true) != nil else {
            throw DriverError.timeout("dashboard-2 navigation control: \(text)")
        }
    }

    if calendarMode {
        guard findText(application, "Month view") != nil,
              findText(application, "Selected day") != nil,
              findPressable(application, "上个月", contains: true) != nil,
              findPressable(application, "下个月", contains: true) != nil,
              findPressable(application, "今天", contains: true) != nil else {
            throw DriverError.timeout("dashboard-2 Calendar reading surface")
        }
        return
    }

    if habitsMode {
        guard findText(application, "本周统计") != nil,
              findText(application, "每日锚点") != nil,
              findText(application, "本周习惯在今天") != nil,
              findPressable(application, "刷新快照", contains: true) != nil else {
            throw DriverError.timeout("dashboard-2 Habits snapshot surface")
        }
        return
    }

    guard todayMode else {
        throw DriverError.usage
    }
    for text in ["Morning", "Daytime", "Evening"] {
        guard findPressable(application, text, contains: true) != nil else {
            throw DriverError.timeout("dashboard-2 Today phase control: \(text)")
        }
    }
    guard findPressable(application, "刷新", contains: true) != nil else {
        throw DriverError.timeout("dashboard-2 Today refresh control")
    }
    if mode == "dashboard-2-today" {
        guard findText(application, "当天的初始安排") != nil,
              findPressable(application, "初始计划依据", contains: true) != nil else {
            throw DriverError.timeout("dashboard-2 Today morning baseline")
        }
    } else if mode == "dashboard-2-today-daytime" {
        guard findText(application, "时间轴 + 记录") != nil,
              findText(application, "现在怎么走") != nil,
              findText(application, "已发生 / 已确认") != nil,
              findText(application, "当前安排 · 未按时间推断") != nil,
              findText(application, "接下来计划") != nil,
              findText(application, "当日简短记录") != nil,
              findText(application, "安排变化") != nil else {
            throw DriverError.timeout("dashboard-2 Today daytime reading surface")
        }
    } else {
        guard findText(application, "晚间复盘") != nil else {
            throw DriverError.timeout("dashboard-2 Today evening reading surface")
        }
    }
}

func waitForSemanticContract(
    _ application: AXUIElement,
    _ mode: String,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    var lastError: Error = DriverError.timeout("semantic contract: \(mode)")
    repeat {
        do {
            try assertSemanticContract(application, mode)
            return
        } catch {
            lastError = error
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw lastError
}

func normalizedAttributeValue(_ raw: CFTypeRef) -> String {
    if let value = raw as? Bool {
        return value ? "true" : "false"
    }
    if let value = raw as? NSNumber {
        return value.boolValue ? "true" : "false"
    }
    if let value = raw as? String {
        return value.lowercased()
    }
    return String(describing: raw).lowercased()
}

func assertState(
    _ application: AXUIElement,
    _ text: String,
    _ expected: String
) throws {
    guard let element = findPressable(application, text, contains: true) else {
        throw DriverError.timeout("stateful rendered control: \(text)")
    }
    let expectedState = expected.lowercased()
    let stateAttributes = expectedState == "current"
        ? ["AXCurrent", "AXSelected", "AXPressed", "AXValue"]
        : ["AXSelected", "AXPressed", "AXValue"]
    let values = stateAttributes.compactMap {
        attribute(element, $0).map(normalizedAttributeValue)
    }
    let matches: Set<String>
    switch expectedState {
    case "current":
        matches = ["true", "1", "page", "current", "selected", "pressed"]
    case "pressed", "selected":
        matches = ["true", "1", "pressed", "selected"]
    default:
        throw DriverError.usage
    }
    guard values.contains(where: { value in
        matches.contains(value) || matches.contains(where: { value.contains($0) })
    }) else {
        let details = stateAttributes.map { name in
            "\(name)=\(attribute(element, name).map(normalizedAttributeValue) ?? "<none>")"
        }.joined(separator: ", ")
        throw DriverError.unexpectedText(
            "\(text) did not expose state \(expected) (role=\(stringAttribute(element, "AXRole")); \(details))"
        )
    }
}

func assertCenteredElement(
    _ application: AXUIElement,
    label: String,
    tolerance: CGFloat
) throws {
    guard let element = visibleRenderedElement(application, label: label),
          let elementFrame = frame(element),
          let window = mainWindow(application),
          let windowFrame = frame(window) else {
        throw DriverError.timeout("centered rendered element with measurable bounds: \(label)")
    }
    let distance = abs(elementFrame.midY - windowFrame.midY)
    guard distance <= tolerance else {
        throw DriverError.unexpectedText(
            "rendered element is not near the window center: \(label) " +
                "distance=\(distance) tolerance=\(tolerance) frame=\(elementFrame) window=\(windowFrame)"
        )
    }
}

func waitForCenteredElement(
    _ application: AXUIElement,
    label: String,
    tolerance: CGFloat,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    var lastError: Error = DriverError.timeout("centered rendered element: \(label)")
    repeat {
        do {
            try assertCenteredElement(application, label: label, tolerance: tolerance)
            return
        } catch {
            lastError = error
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw lastError
}

func waitForState(
    _ application: AXUIElement,
    _ text: String,
    _ expected: String,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    var lastError: Error = DriverError.timeout("stateful rendered control: \(text)")
    repeat {
        do {
            try assertState(application, text, expected)
            return
        } catch {
            lastError = error
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw lastError
}

func assertLiveSemantics(
    _ application: AXUIElement,
    _ text: String,
    _ expected: String
) throws {
    guard let expectedToken = ["alert", "status"].first(where: {
              $0 == expected.lowercased()
          }) else {
        throw DriverError.usage
    }
    let tokens = expectedToken == "alert"
        ? ["alert", "assertive"]
        : ["status", "polite"]
    let exposesExpectedSemantics = findTextPaths(application, text).contains { path in
        let candidates = [path.element] + path.ancestors.reversed()
        let values = candidates.flatMap { element in
            [
                "AXRole",
                "AXSubrole",
                "AXRoleDescription",
                "AXLive",
                "AXDescription",
                "AXHelp",
            ].compactMap { attribute(element, $0).map(normalizedAttributeValue) }
        }
        return values.contains { value in
            tokens.contains { value.contains($0) }
        }
    }
    guard exposesExpectedSemantics else {
        let details = findTextPaths(application, text).map { path in
            let candidates = [path.element] + path.ancestors.reversed()
            return candidates.map { element in
                let role = stringAttribute(element, "AXRole")
                let live = ["AXLive", "AXRoleDescription", "AXDescription", "AXHelp"]
                    .compactMap { name in
                        attribute(element, name).map { "\(name)=\(normalizedAttributeValue($0))" }
                    }
                    .joined(separator: ",")
                return "\(role){\(live)}"
            }.joined(separator: " <- ")
        }.joined(separator: " | ")
        throw DriverError.unexpectedText(
            "\(text) did not expose live semantics \(expectedToken) (\(details))"
        )
    }
}

func visibleAttribute(_ element: AXUIElement, _ name: String) -> Bool {
    guard let raw = attribute(element, name) else {
        return true
    }
    let value = normalizedAttributeValue(raw)
    return value != "true"
}

func hasVisibleVerticalScrollBar(_ element: AXUIElement) -> Bool {
    guard let rawScrollBar = attribute(element, "AXVerticalScrollBar") else {
        return false
    }
    let scrollBar = unsafeDowncast(rawScrollBar, to: AXUIElement.self)
    return visibleAttribute(scrollBar, "AXHidden")
}

func numberAttribute(_ element: AXUIElement, _ name: String) -> Double? {
    guard let raw = attribute(element, name),
          let value = raw as? NSNumber else {
        return nil
    }
    return value.doubleValue
}

func focusableSurfaceElement(_ surface: AXUIElement) -> AXUIElement? {
    let focusableRoles = Set([
        "AXButton",
        "AXCheckBox",
        "AXComboBox",
        "AXDisclosureTriangle",
        "AXRadioButton",
        "AXTextField",
        "AXTextArea",
    ])
    var match: AXUIElement?
    _ = walk(surface) { element in
        guard focusableRoles.contains(stringAttribute(element, "AXRole")),
              let elementFrame = frame(element),
              elementFrame.width > 0,
              elementFrame.height > 0 else {
            return false
        }
        match = element
        return true
    }
    return match
}

func pressPageDown(_ pid: pid_t) throws {
    guard let source = CGEventSource(stateID: .combinedSessionState),
          let keyDown = CGEvent(
              keyboardEventSource: source,
              virtualKey: 121,
              keyDown: true
          ),
          let keyUp = CGEvent(
              keyboardEventSource: source,
              virtualKey: 121,
              keyDown: false
          ) else {
        throw DriverError.actionFailed("page down", .failure)
    }
    keyDown.postToPid(pid)
    keyUp.postToPid(pid)
    Thread.sleep(forTimeInterval: 0.25)
}

func assertDocumentFixed(_ application: AXUIElement) throws {
    var webAreaFound = false
    var documentScrolls = false
    _ = walk(application) { element in
        guard stringAttribute(element, "AXRole") == "AXWebArea" else {
            return false
        }
        webAreaFound = true
        if hasVisibleVerticalScrollBar(element) {
            documentScrolls = true
        }
        return false
    }
    guard webAreaFound else {
        throw DriverError.timeout("rendered web area")
    }
    guard !documentScrolls else {
        throw DriverError.unexpectedText("document/body scroll")
    }
}

func clickElement(
    _ element: AXUIElement,
    pid: pid_t,
    mirroredY: Bool = false
) throws {
    guard let elementFrame = frame(element),
          elementFrame.width > 0,
          elementFrame.height > 0,
          let source = CGEventSource(stateID: .combinedSessionState) else {
        throw DriverError.actionFailed("click menu option", .failure)
    }
    let screenHeight = NSScreen.screens.first?.frame.maxY ?? 0
    let clickPoint = CGPoint(
        x: elementFrame.midX,
        y: mirroredY ? screenHeight - elementFrame.midY : elementFrame.midY
    )
    guard let move = CGEvent(
              mouseEventSource: source,
              mouseType: .mouseMoved,
              mouseCursorPosition: clickPoint,
              mouseButton: .left
          ),
          let mouseDown = CGEvent(
              mouseEventSource: source,
              mouseType: .leftMouseDown,
              mouseCursorPosition: clickPoint,
              mouseButton: .left
          ),
          let mouseUp = CGEvent(
              mouseEventSource: source,
              mouseType: .leftMouseUp,
              mouseCursorPosition: clickPoint,
              mouseButton: .left
          ) else {
        throw DriverError.actionFailed("click menu option", .failure)
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    move.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.1)
    mouseDown.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.05)
    mouseUp.post(tap: .cghidEventTap)
}

func scrollMenuOptionIntoView(
    _ menu: AXUIElement,
    _ option: AXUIElement,
    pid: pid_t
) throws {
    let screen = NSScreen.screens.first?.frame ?? CGDisplayBounds(CGMainDisplayID())
    for _ in 0..<60 {
        guard let optionFrame = frame(option),
              let menuFrame = frame(menu) else {
            throw DriverError.timeout("menu option frame")
        }
        let center = CGPoint(x: optionFrame.midX, y: optionFrame.midY)
        if center.y >= screen.minY + 24 && center.y <= screen.maxY - 24 {
            return
        }
        let scrollAction = center.y > screen.maxY
            ? "AXScrollDownByPage"
            : "AXScrollUpByPage"
        if AXUIElementPerformAction(menu, scrollAction as CFString) == .success {
            Thread.sleep(forTimeInterval: 0.1)
            continue
        }
        let pointer = CGPoint(
            x: menuFrame.midX,
            y: min(max(menuFrame.minY + 80, screen.minY + 80), screen.maxY - 80)
        )
        guard let source = CGEventSource(stateID: .combinedSessionState),
              let move = CGEvent(
                  mouseEventSource: source,
                  mouseType: .mouseMoved,
                  mouseCursorPosition: pointer,
                  mouseButton: .left
              ),
              let scroll = CGEvent(
                  scrollWheelEvent2Source: source,
                  units: .pixel,
                  wheelCount: 1,
                  wheel1: center.y > screen.maxY ? -12 : 12,
                  wheel2: 0,
                  wheel3: 0
              ) else {
            throw DriverError.actionFailed("scroll menu option", .failure)
        }
        _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
        move.post(tap: .cghidEventTap)
        scroll.post(tap: .cghidEventTap)
        Thread.sleep(forTimeInterval: 0.1)
    }
    throw DriverError.timeout("menu option visible")
}

func assertScrollableSurface(
    _ application: AXUIElement,
    _ label: String,
    pid: pid_t
) throws {
    let anchorText: String
    switch label.lowercased() {
    case "agenda":
        anchorText = "Primary departures"
    case "settings":
        anchorText = "Profile & data"
    case "exception detail":
        anchorText = "Change this workout time"
    case "workout detail":
        anchorText = "About how long was the workout?"
    case "today":
        anchorText = "晚间复盘"
    default:
        throw DriverError.usage
    }
    let surfaceAndAnchor: (AXUIElement, AXUIElement, CGRect)? = findTextPaths(
        application,
        anchorText
    ).compactMap { path in
        guard let surface = scrollSurface(for: path) else {
            return nil
        }
        guard let anchorFrame = frame(path.element), anchorFrame.width > 0, anchorFrame.height > 0 else {
            return nil
        }
        return (surface, path.element, anchorFrame)
    }.max { left, right in
        left.2.minY < right.2.minY
    }
    guard let (surface, anchor, beforeAnchorFrame) = surfaceAndAnchor,
          let beforeSurfaceFrame = frame(surface),
          beforeSurfaceFrame.width > 0,
          beforeSurfaceFrame.height > 0,
          beforeSurfaceFrame.contains(
              CGPoint(x: beforeAnchorFrame.midX, y: beforeAnchorFrame.midY)
          ) else {
        throw DriverError.timeout("scrollable active surface: \(label)")
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    var anchorFrameChanged = false
    enum ScrollAttemptResult {
        case moved
        case unsupported(String)
    }

    func anchorHasMoved() -> Bool {
        guard let afterAnchorFrame = frame(anchor) else {
            return false
        }
        return abs(afterAnchorFrame.origin.x - beforeAnchorFrame.origin.x) > 1 ||
            abs(afterAnchorFrame.origin.y - beforeAnchorFrame.origin.y) > 1
    }

    func postMouseScroll(toProcess: Bool) throws -> ScrollAttemptResult {
        guard let source = CGEventSource(stateID: .combinedSessionState),
              let move = CGEvent(
                  mouseEventSource: source,
                  mouseType: .mouseMoved,
                  mouseCursorPosition: CGPoint(
                      x: beforeAnchorFrame.midX,
                      y: beforeAnchorFrame.midY
                  ),
                  mouseButton: .left
              ),
              let scroll = CGEvent(
                  scrollWheelEvent2Source: source,
                  units: .pixel,
                  wheelCount: 1,
                  wheel1: -8,
                  wheel2: 0,
                  wheel3: 0
              ) else {
            return .unsupported("mouse event source unavailable")
        }
        if toProcess {
            move.postToPid(pid)
            Thread.sleep(forTimeInterval: 0.05)
            scroll.postToPid(pid)
        } else {
            move.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.05)
            scroll.post(tap: .cghidEventTap)
        }
        Thread.sleep(forTimeInterval: 0.25)
        guard anchorHasMoved() else {
            throw DriverError.timeout(
                "scroll action did not move the \(label) anchor"
            )
        }
        return .moved
    }

    let attempts: [() throws -> ScrollAttemptResult] = [
        {
            guard let rawScrollBar = attribute(surface, "AXVerticalScrollBar") else {
                return .unsupported("AX vertical scrollbar unavailable")
            }
            let scrollBar = unsafeDowncast(rawScrollBar, to: AXUIElement.self)
            guard let current = numberAttribute(scrollBar, "AXValue"),
                  let maximum = numberAttribute(scrollBar, "AXMaxValue"),
                  maximum > current else {
                return .unsupported("AX vertical scrollbar has no scroll range")
            }
            let step = max(1, min(maximum - current, 0.75 * beforeSurfaceFrame.height))
            let target = min(maximum, current + step)
            let error = AXUIElementSetAttributeValue(
                scrollBar,
                "AXValue" as CFString,
                NSNumber(value: target)
            )
            if isExplicitlyUnsupported(error) {
                return .unsupported("AX vertical scrollbar value is unsupported")
            }
            guard error == .success else {
                throw DriverError.actionFailed("scroll \(label)", error)
            }
            Thread.sleep(forTimeInterval: 0.25)
            guard anchorHasMoved() else {
                throw DriverError.timeout(
                    "scroll action did not move the \(label) anchor"
                )
            }
            return .moved
        },
        {
            guard let focusTarget = focusableSurfaceElement(surface) else {
                return .unsupported("no focusable scroll target")
            }
            let focusError = AXUIElementSetAttributeValue(
                focusTarget,
                "AXFocused" as CFString,
                kCFBooleanTrue
            )
            if isExplicitlyUnsupported(focusError) {
                return .unsupported("scroll target does not expose focus")
            }
            guard focusError == .success else {
                throw DriverError.actionFailed("focus scroll \(label)", focusError)
            }
            try pressPageDown(pid)
            guard anchorHasMoved() else {
                throw DriverError.timeout(
                    "scroll action did not move the \(label) anchor"
                )
            }
            return .moved
        },
        {
            let error = AXUIElementPerformAction(
                surface,
                "AXScrollDownByPage" as CFString
            )
            if isExplicitlyUnsupported(error) {
                return .unsupported("AX page scroll action is unsupported")
            }
            guard error == .success else {
                throw DriverError.actionFailed("scroll \(label)", error)
            }
            Thread.sleep(forTimeInterval: 0.25)
            guard anchorHasMoved() else {
                throw DriverError.timeout(
                    "scroll action did not move the \(label) anchor"
                )
            }
            return .moved
        },
        {
            try postMouseScroll(toProcess: false)
        },
        {
            try postMouseScroll(toProcess: true)
        },
    ]
    var unsupportedAttempts: [String] = []
    for attempt in attempts {
        switch try attempt() {
        case .moved:
            anchorFrameChanged = true
        case let .unsupported(reason):
            unsupportedAttempts.append(reason)
            continue
        }
        break
    }
    guard let afterSurfaceFrame = frame(surface),
          abs(afterSurfaceFrame.origin.x - beforeSurfaceFrame.origin.x) <= 1,
          abs(afterSurfaceFrame.origin.y - beforeSurfaceFrame.origin.y) <= 1,
          abs(afterSurfaceFrame.width - beforeSurfaceFrame.width) <= 1,
          abs(afterSurfaceFrame.height - beforeSurfaceFrame.height) <= 1 else {
        throw DriverError.timeout("scrollable surface moved: \(label)")
    }
    guard anchorFrameChanged else {
        let details = unsupportedAttempts.isEmpty
            ? "no supported scroll method changed the anchor"
            : unsupportedAttempts.joined(separator: "; ")
        throw DriverError.timeout(
            "scroll position changed: \(label) (\(details))"
        )
    }
    try assertDocumentFixed(application)
}

func scrollSurfaceToBottom(
    _ application: AXUIElement,
    _ label: String,
    pid: pid_t
) throws {
    guard label.lowercased() == "today" else {
        throw DriverError.usage
    }
    let surfaceAndFrame = findTextPaths(application, "晚间复盘")
        .compactMap { path -> (AXUIElement, CGRect)? in
            guard let surface = scrollSurface(for: path),
                  let surfaceFrame = frame(surface),
                  surfaceFrame.width > 0,
                  surfaceFrame.height > 0 else {
                return nil
            }
            return (surface, surfaceFrame)
        }
        .max { left, right in
            left.1.minY < right.1.minY
        }
    guard let (surface, surfaceFrame) = surfaceAndFrame else {
        throw DriverError.timeout("scrollable active surface: \(label)")
    }

    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    for _ in 0..<8 {
        let pageError = AXUIElementPerformAction(
            surface,
            "AXScrollDownByPage" as CFString
        )
        if pageError == .success {
            Thread.sleep(forTimeInterval: 0.15)
            continue
        }
        guard let source = CGEventSource(stateID: .combinedSessionState),
              let move = CGEvent(
                  mouseEventSource: source,
                  mouseType: .mouseMoved,
                  mouseCursorPosition: CGPoint(
                      x: surfaceFrame.midX,
                      y: surfaceFrame.midY
                  ),
                  mouseButton: .left
              ),
              let scroll = CGEvent(
                  scrollWheelEvent2Source: source,
                  units: .pixel,
                  wheelCount: 1,
                  wheel1: -8,
                  wheel2: 0,
                  wheel3: 0
              ) else {
            throw DriverError.actionFailed("scroll \(label) to bottom", pageError)
        }
        move.postToPid(pid)
        Thread.sleep(forTimeInterval: 0.05)
        scroll.postToPid(pid)
        Thread.sleep(forTimeInterval: 0.2)
    }
    try assertDocumentFixed(application)
}

func selectOption(
    _ application: AXUIElement,
    _ text: String,
    pid: pid_t,
    timeout: TimeInterval,
    allowUnchanged: Bool = false
) throws {
    let destinationOption = Set([
        "History",
        "Settings",
        "This Week",
        "Today",
        "Calendar",
        "Habits",
    ]).contains(text)
    let calendarField = text.hasSuffix(" 年")
        ? "年份"
        : text.hasSuffix(" 月")
            ? "月份"
            : nil
    let taskStateOption = Set([
        "全部未删除",
        "待办",
        "已完成",
        "已放弃",
        "已删除",
        "All active",
        "Pending",
        "Completed",
        "Abandoned",
        "Deleted",
    ]).contains(text)
    let pickers: [AXUIElement]
    if destinationOption {
        guard let destinationPicker = findDestinationPicker(application) else {
            throw DriverError.timeout("destination picker")
        }
        pickers = [destinationPicker]
    } else if let calendarField {
        pickers = findRolesWithin(application, ["AXPopUpButton"]).filter {
            nodeText($0).localizedCaseInsensitiveContains(calendarField)
        }
    } else if taskStateOption {
        let taskFilterPickers = findRolesWithin(
            application,
            ["AXComboBox", "AXPopUpButton"]
        ).filter { picker in
            visibleAttribute(picker, "AXHidden") &&
                (nodeText(picker).localizedCaseInsensitiveContains("任务筛选") ||
                    nodeText(picker).localizedCaseInsensitiveContains("Task filter"))
        }
        pickers = taskFilterPickers.isEmpty
            ? try waitForExceptionSchedulePickers(application, timeout: timeout)
            : taskFilterPickers
    } else {
        pickers = try waitForExceptionSchedulePickers(
            application,
            timeout: timeout
        )
    }
    guard !pickers.isEmpty else {
        throw DriverError.timeout("schedule picker")
    }

    if destinationOption, let destinationPicker = pickers.first {
        let previousState = pickerState(destinationPicker)
        try setAccessibilityAttribute(
            destinationPicker,
            "AXFocused",
            kCFBooleanTrue,
            "focus destination picker"
        )
        try performAccessibilityAction(
            destinationPicker,
            "AXPress",
            "open destination picker"
        )
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if let menu = findVisibleMenu(application),
               let option = findMenuItem(menu, text) {
                try performAccessibilityAction(
                    option,
                    "AXPress",
                    "select destination \(text)"
                )
                try waitForPickerValue(
                    destinationPicker,
                    text,
                    timeout: timeout,
                    changedFrom: previousState,
                    requireChange: !allowUnchanged
                )
                return
            }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
        if findVisibleMenu(application) != nil {
            try pressKey(pid, "escape")
        }
        throw DriverError.timeout("destination option: \(text)")
    }

    if calendarField != nil, let calendarPicker = pickers.first {
        let previousState = pickerState(calendarPicker)
        try performAccessibilityAction(calendarPicker, "AXPress", "open Calendar picker")
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if let menu = findVisibleMenu(application),
               let option = findMenuItem(menu, text) {
                try performAccessibilityAction(option, "AXPress", "select Calendar option \(text)")
                try waitForPickerValue(
                    calendarPicker,
                    text,
                    timeout: timeout,
                    changedFrom: previousState,
                    requireChange: !allowUnchanged
                )
                return
            }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
        if findVisibleMenu(application) != nil {
            try pressKey(pid, "escape")
        }
        throw DriverError.timeout("Calendar option: \(text)")
    }

    for pickerIndex in pickers.indices {
        let currentPickers = try waitForExceptionSchedulePickers(
            application,
            timeout: timeout
        )
        guard currentPickers.indices.contains(pickerIndex) else {
            throw DriverError.timeout("exception schedule picker at index \(pickerIndex)")
        }
        let picker = currentPickers[pickerIndex]
        let previousState = pickerState(picker)
        try performAccessibilityAction(picker, "AXPress", "open schedule picker")
        let deadline = Date().addingTimeInterval(timeout)
        var menuAppeared = false
        repeat {
            if let menu = findVisibleMenu(application) {
                menuAppeared = true
                if let option = findMenuItem(menu, text) {
                    try scrollMenuOptionIntoView(menu, option, pid: pid)
                    try performAccessibilityAction(
                        option,
                        "AXPress",
                        "select schedule option \(text)"
                    )
                    if findVisibleMenu(application) != nil {
                        try pressKey(pid, "return")
                    }
                    if taskStateOption {
                        Thread.sleep(forTimeInterval: 0.25)
                        return
                    }
                    try waitForExceptionPickerValue(
                        application,
                        pickerIndex: pickerIndex,
                        text: text,
                        timeout: timeout,
                        changedFrom: previousState,
                        requireChange: !allowUnchanged
                    )
                    return
                }
                break
            }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
        if menuAppeared {
            try pressKey(pid, "escape")
        } else {
            throw DriverError.timeout("visible schedule picker")
        }
    }

    let currentPickers = try waitForExceptionSchedulePickers(
        application,
        timeout: timeout
    )
    for (pickerIndex, picker) in currentPickers.enumerated() {
        let previousState = pickerState(picker)
        try setAccessibilityAttribute(
            picker,
            "AXValue",
            text as CFTypeRef,
            "set schedule picker to \(text)"
        )
        try waitForExceptionPickerValue(
            application,
            pickerIndex: pickerIndex,
            text: text,
            timeout: timeout,
            changedFrom: previousState,
            requireChange: !allowUnchanged
        )
        return
    }

    throw DriverError.timeout("select option: \(text)")
}

enum OptionExpectation {
    case present
    case absent
}

func findExceptionSchedulePickers(_ application: AXUIElement) -> [AXUIElement] {
    let pickerRoles = Set(["AXComboBox", "AXPopUpButton"])
    var matches: [AXUIElement] = []
    for label in ["Weekday / date", "Time"] {
        for labelPath in findTextPaths(application, label, contains: false) {
            for context in labelPath.ancestors.reversed() {
                let pickers = findRolesWithin(context, pickerRoles)
                if !pickers.isEmpty {
                    for picker in pickers where !matches.contains(where: { CFEqual($0, picker) }) {
                        matches.append(picker)
                    }
                    break
                }
            }
        }
    }
    if !matches.isEmpty {
        return matches
    }
    for editorPath in findTextPaths(application, "Change this workout time", contains: false) {
        for context in editorPath.ancestors.reversed() {
            let pickers = findRolesWithin(context, pickerRoles)
            if !pickers.isEmpty {
                return pickers
            }
        }
    }
    return []
}

func findExceptionSchedulePicker(_ application: AXUIElement) -> AXUIElement? {
    findExceptionSchedulePickers(application).first
}

func findDestinationPicker(_ application: AXUIElement) -> AXUIElement? {
    let pickerRoles = Set(["AXComboBox", "AXPopUpButton"])
    for labelPath in findTextPaths(application, "Destination", contains: false) {
        for context in labelPath.ancestors.reversed() {
            if let picker = findRoleWithin(context, pickerRoles) {
                return picker
            }
        }
    }
    return nil
}

func waitForExceptionSchedulePickers(
    _ application: AXUIElement,
    timeout: TimeInterval
) throws -> [AXUIElement] {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        let pickers = findExceptionSchedulePickers(application)
        if !pickers.isEmpty {
            return pickers
        }
        let globalPickers = findRolesWithin(
            application,
            Set(["AXComboBox", "AXPopUpButton"])
        )
        if !globalPickers.isEmpty {
            return globalPickers
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("exception schedule picker")
}

func waitForExceptionSchedulePicker(
    _ application: AXUIElement,
    timeout: TimeInterval
) throws -> AXUIElement {
    guard let picker = try waitForExceptionSchedulePickers(application, timeout: timeout).first else {
        throw DriverError.timeout("exception schedule picker")
    }
    return picker
}

func findVisibleMenu(_ application: AXUIElement) -> AXUIElement? {
    var match: AXUIElement?
    _ = walk(application) { element in
        guard stringAttribute(element, "AXRole") == "AXMenu",
              visibleAttribute(element, "AXHidden") else {
            return false
        }
        match = element
        return true
    }
    return match
}

func findMenuItem(_ menu: AXUIElement, _ text: String) -> AXUIElement? {
    var match: AXUIElement?
    _ = walk(menu) { element in
        guard stringAttribute(element, "AXRole") == "AXMenuItem",
              nodeText(element).localizedCaseInsensitiveContains(text) else {
            return false
        }
        match = element
        return true
    }
    return match
}

func assertSelectOption(
    _ application: AXUIElement,
    _ text: String,
    expectation: OptionExpectation,
    pid: pid_t,
    timeout: TimeInterval
) throws {
    let pickers = try waitForExceptionSchedulePickers(
        application,
        timeout: timeout
    )
    guard !pickers.isEmpty else {
        throw DriverError.timeout("exception schedule picker")
    }
    var sawVisibleMenu = false
    for picker in pickers {
        try performAccessibilityAction(picker, "AXPress", "open schedule picker")
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if let menu = findVisibleMenu(application) {
                sawVisibleMenu = true
                if let option = findMenuItem(menu, text) {
                    try pressKey(pid, "escape")
                    if case .present = expectation {
                        return
                    }
                    throw DriverError.unexpectedText("select option: \(nodeText(option))")
                }
                try pressKey(pid, "escape")
                break
            }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
    }
    guard case .absent = expectation else {
        throw DriverError.timeout("select option: \(text)")
    }
    guard sawVisibleMenu else {
        throw DriverError.timeout("visible schedule picker menu")
    }
}

func dumpText(_ application: AXUIElement) {
    _ = walk(application) { element in
        let text = nodeText(element)
        if !text.isEmpty {
            print("\(stringAttribute(element, "AXRole")): \(text)")
        }
        return false
    }
}

func dumpPicker(_ application: AXUIElement, pid: pid_t) throws {
    guard let picker = findExceptionSchedulePicker(application) else {
        throw DriverError.timeout("exception schedule picker")
    }
    let pressError = AXUIElementPerformAction(picker, "AXPress" as CFString)
    guard pressError == .success else {
        throw DriverError.actionFailed("open exception schedule picker", pressError)
    }
    Thread.sleep(forTimeInterval: 0.5)
    print("picker role=\(stringAttribute(picker, "AXRole")) title=\(stringAttribute(picker, "AXTitle")) value=\(stringAttribute(picker, "AXValue")) frame=\(String(describing: frame(picker)))")
    if let menu = findVisibleMenu(application) {
        print("menu frame=\(String(describing: frame(menu)))")
        if let option = findMenuItem(menu, "Sunday · August 16") {
            var optionPid: pid_t = 0
            AXUIElementGetPid(option, &optionPid)
            print("target pid=\(optionPid) before=\(String(describing: frame(option)))")
            try scrollMenuOptionIntoView(menu, option, pid: pid)
            print("target after=\(String(describing: frame(option)))")
            try clickElement(option, pid: pid)
            Thread.sleep(forTimeInterval: 0.5)
            print("picker after click=\(stringAttribute(picker, "AXValue"))")
        }
    }
}

func mainWindow(_ application: AXUIElement) -> AXUIElement? {
    if let focused = attribute(application, "AXFocusedWindow") {
        return unsafeDowncast(focused, to: AXUIElement.self)
    }
    return (attribute(application, "AXWindows") as? [AXUIElement])?.first
}

func parseWindowSize(_ text: String) -> CGSize? {
    let dimensions = text.split(separator: "x", omittingEmptySubsequences: true)
    guard dimensions.count == 2,
          let width = Double(dimensions[0]),
          let height = Double(dimensions[1]),
          width >= 640,
          height >= 520 else {
        return nil
    }
    return CGSize(width: width, height: height)
}

func windowSize(_ window: AXUIElement) -> CGSize? {
    guard let rawValue = attribute(window, "AXSize") else {
        return nil
    }
    let value = unsafeDowncast(rawValue, to: AXValue.self)
    var size = CGSize.zero
    guard AXValueGetValue(value, .cgSize, &size) else {
        return nil
    }
    return size
}

func resizeWindow(
    _ application: AXUIElement,
    pid: pid_t,
    _ text: String
) throws {
    guard var size = parseWindowSize(text) else {
        throw DriverError.usage
    }
    guard let window = mainWindow(application) else {
        throw DriverError.timeout("main application window")
    }
    guard let value = AXValueCreate(.cgSize, &size) else {
        throw DriverError.actionFailed("resize \(text)", .failure)
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    var position = CGPoint(x: 40, y: 40)
    if let positionValue = AXValueCreate(.cgPoint, &position) {
        try setAccessibilityAttribute(
            window,
            "AXPosition",
            positionValue,
            "position window for resize"
        )
    }
    var resized = false
    for _ in 0..<20 {
        let error = AXUIElementSetAttributeValue(window, "AXSize" as CFString, value)
        guard error == .success else {
            throw DriverError.actionFailed("resize \(text)", error)
        }
        Thread.sleep(forTimeInterval: 0.1)
        if let actual = windowSize(window),
           abs(actual.width - size.width) < 1,
           abs(actual.height - size.height) < 1 {
            resized = true
            break
        }
    }
    guard resized else {
        throw DriverError.timeout("resize window: \(text)")
    }
    Thread.sleep(forTimeInterval: 0.15)
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
}

func assertWindowSize(
    _ application: AXUIElement,
    _ text: String,
    timeout: TimeInterval
) throws {
    guard let expected = parseWindowSize(text),
          mainWindow(application) != nil else {
        throw DriverError.usage
    }
    let deadline = Date().addingTimeInterval(timeout)
    var lastActual = "<none>"
    repeat {
        if let window = mainWindow(application),
           let actual = windowSize(window) {
            lastActual = "\(Int(actual.width))x\(Int(actual.height))"
            if abs(actual.width - expected.width) < 1,
               abs(actual.height - expected.height) < 1 {
                return
            }
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("window size: \(text) (actual: \(lastActual))")
}

func requireArguments() throws -> (pid_t, String, String, TimeInterval) {
    guard CommandLine.arguments.count >= 4 else {
        throw DriverError.usage
    }
    let pidText = CommandLine.arguments[1]
    guard let pid = pid_t(pidText) else {
        throw DriverError.invalidPid(pidText)
    }
    let command = CommandLine.arguments[2]
    let text = CommandLine.arguments[3]
    let timeout = CommandLine.arguments.count >= 5
        ? TimeInterval(CommandLine.arguments[4]) ?? 10
        : 10
    return (pid, command, text, timeout)
}

do {
    let (pid, command, text, timeout) = try requireArguments()
    let application = AXUIElementCreateApplication(pid)
    if command != "choose-folder" && command != "choose-file" && command != "hide" &&
        command != "make-image-fixture" && command != "assert-capture-non-overwrite" {
        try activateApplication(application, pid: pid, timeout: timeout)
    }
    Thread.sleep(forTimeInterval: 0.05)

    switch command {
    case "hide":
        let runningApplication = NSRunningApplication(processIdentifier: pid)
        guard runningApplication != nil else {
            throw DriverError.actionFailed("hide packaged application", .failure)
        }
        let hideApplication = Process()
        hideApplication.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        hideApplication.arguments = [
            "-e",
            "tell application \"System Events\" to set visible of " +
                "(first process whose unix id is \(pid)) to false",
        ]
        let hideOutput = Pipe()
        hideApplication.standardOutput = hideOutput
        hideApplication.standardError = hideOutput
        try hideApplication.run()
        hideApplication.waitUntilExit()
        guard hideApplication.terminationStatus == 0 else {
            let output = String(
                data: hideOutput.fileHandleForReading.readDataToEndOfFile(),
                encoding: .utf8
            ) ?? ""
            throw DriverError.actionFailed("hide packaged application: \(output)", .failure)
        }
        print("Hid packaged application: \(text)")
    case "wait-text":
        try waitForText(application, text, timeout: timeout)
        print("Found rendered text: \(text)")
    case "assert-text":
        try waitForText(application, text, timeout: 0.5)
        print("Visible rendered state contains: \(text)")
    case "assert-absent-text":
        try assertAbsentText(application, text)
        print("Rendered state does not contain: \(text)")
    case "wait-active-text":
        try waitForVisibleText(application, text, timeout: timeout)
        print("Found visible active-destination text: \(text)")
    case "assert-active-text":
        try waitForVisibleText(application, text, timeout: 0.5)
        print("Visible active-destination state contains: \(text)")
    case "assert-active-absent-text":
        try assertAbsentVisibleText(application, text)
        print("Visible active-destination state does not contain: \(text)")
    case "assert-focused-text":
        try activateApplication(application, pid: pid, timeout: min(2, timeout))
        try waitForFocusedText(application, text, timeout: timeout)
        print("Focused rendered control contains: \(text)")
    case "assert-centered":
        let parts = text.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2, let tolerance = Double(parts[1]), tolerance >= 0 else {
            throw DriverError.usage
        }
        try waitForCenteredElement(
            application,
            label: parts[0],
            tolerance: CGFloat(tolerance),
            timeout: timeout
        )
        print("Rendered element is near the window center: \(parts[0])")
    case "assert-axis-entry-card":
        let parts = text.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 3 else {
            throw DriverError.usage
        }
        try assertAxisEntryCard(
            application,
            startLabel: parts[0],
            endLabel: parts[1],
            title: parts[2]
        )
        print("Rendered card text and true time bounds are visible: \(parts[0])–\(parts[1]) \(parts[2])")
    case "assert-axis-cards-fit":
        try assertAxisCardsFit(application, pid: pid, specifications: text)
    case "assert-axis-overlap-stack":
        let parts = text.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 2 else {
            throw DriverError.usage
        }
        try assertAxisOverlapStack(application, firstTitle: parts[0], secondTitle: parts[1])
    case "cycle-axis-stack":
        try cycleAxisStack(application)
    case "click-axis-card":
        try clickAxisCard(application, pid: pid, title: text)
    case "focus-axis-card":
        try focusAxisCard(application, pid: pid, title: text)
    case "scroll-axis-horizontal":
        let parts = text.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 2 else {
            throw DriverError.usage
        }
        try scrollAxisHorizontally(application, pid: pid, direction: parts[0], targetTitle: parts[1])
    case "assert-window-visible":
        try assertWindowVisibleText(application, text: text)
        print("Rendered text is visible in the app window: \(text)")
    case "assert-window-visible-link":
        try assertWindowVisibleLink(application, text: text)
        print("Rendered link is visible in the app window: \(text)")
    case "click-visible-link":
        try clickVisibleLink(application, pid: pid, text: text)
    case "focus":
        try focusPressable(application, pid: pid, text: text, contains: true, timeout: timeout)
        print("Focused rendered control: \(text)")
    case "focus-contains":
        try focusPressable(application, pid: pid, text: text, contains: true, timeout: timeout)
        print("Focused rendered control containing: \(text)")
    case "press-key":
        try pressKey(pid, text)
        print("Sent keyboard activation: \(text)")
    case "type-text":
        let parts = text.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2 else {
            throw DriverError.usage
        }
        try typeText(
            application,
            pid: pid,
            label: parts[0],
            value: parts[1],
            timeout: timeout
        )
        print("Entered text in rendered control: \(parts[0])")
    case "choose-folder", "choose-file":
        try chooseFolder(
            application,
            pid: pid,
            path: text,
            isFile: command == "choose-file",
            timeout: timeout
        )
        print("Selected native path: \(text)")
    case "cancel-folder":
        try cancelFolder(application, pid: pid, timeout: timeout)
        print("Cancelled native folder selection")
    case "assert-picker-title":
        try assertPickerTitle(application, title: text, timeout: timeout)
        print("Native folder picker title is localized: \(text)")
    case "assert-visible-focus":
        try activateApplication(application, pid: pid, timeout: min(2, timeout))
        try assertVisibleFocus(application, text, timeout: timeout)
        print("Focused rendered control is visible: \(text)")
    case "assert-semantic":
        try waitForSemanticContract(application, text, timeout: timeout)
        print("Rendered semantic contract passed: \(text)")
    case "assert-state":
        let parts = text.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2 else {
            throw DriverError.usage
        }
        try waitForState(
            application,
            parts[0],
            parts[1],
            timeout: timeout
        )
        print("Rendered state passed: \(parts[0]) is \(parts[1])")
    case "assert-live":
        let parts = text.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2 else {
            throw DriverError.usage
        }
        try assertLiveSemantics(application, parts[0], parts[1])
        print("Rendered live semantics passed: \(parts[0]) is \(parts[1])")
    case "assert-same-rendered-color":
        let parts = text.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2 else {
            throw DriverError.usage
        }
        try waitForMatchingRenderedColors(
            application,
            firstLabel: parts[0],
            secondLabel: parts[1],
            timeout: timeout
        )
        print("Rendered colors match: \(parts[0]) and \(parts[1])")
    case "assert-rendered-variation":
        let parts = text.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2, let minimumDistance = Int(parts[1]) else {
            throw DriverError.usage
        }
        try assertRenderedVariation(
            application,
            label: parts[0],
            minimumDistance: minimumDistance
        )
        print("Rendered image variation passed: \(parts[0])")
    case "content-background-signature":
        print(try renderedContentBackgroundSignature(application, workspaceLabel: text))
    case "assert-calendar-cells-transparent":
        let parts = text.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2, let tolerance = Int(parts[1]) else {
            throw DriverError.usage
        }
        try assertCalendarCellsTransparent(application, label: parts[0], tolerance: tolerance)
        print("Calendar cells preserve the translucent page background: \(parts[0])")
    case "capture-window":
        try captureWindow(application, pid: pid, outputPath: text)
        print("Captured rendered app window: \(text)")
    case "assert-capture-non-overwrite":
        try assertCaptureNonOverwrite(text)
        print("Capture write rejected a destination created after its availability check")
    case "make-image-fixture":
        try makeImageFixture(text)
        print("Created synthetic background image fixture")
    case "scroll-text-visible":
        try scrollTextIntoWindow(application, text: text, pid: pid)
        print("Scrolled rendered text into the visible window: \(text)")
    case "assert-long-text-fits":
        try assertLongTextFits(application, text: text)
        print("Long rendered text wraps within the visible window: \(text)")
    case "assert-document-fixed":
        try assertDocumentFixed(application)
        print("Rendered document has no visible vertical scroll")
    case "assert-scroll-surface":
        try assertScrollableSurface(application, text, pid: pid)
        print("Rendered active surface scrolled without document scroll: \(text)")
    case "scroll-to-bottom":
        try scrollSurfaceToBottom(application, text, pid: pid)
        print("Rendered active surface moved to bottom without document scroll: \(text)")
    case "assert-destination-inset":
        try assertDestinationInset(application, text)
    case "assert-select-option":
        try assertSelectOption(application, text, expectation: .present, pid: pid, timeout: timeout)
        print("Rendered select contains option: \(text)")
    case "assert-select-absent-option":
        try assertSelectOption(application, text, expectation: .absent, pid: pid, timeout: timeout)
        print("Rendered select excludes option: \(text)")
    case "dump-text":
        dumpText(application)
    case "dump-picker":
        try dumpPicker(application, pid: pid)
    case "press":
        let deadline = Date().addingTimeInterval(timeout)
        var pressed = false
        repeat {
            if let element = findVisiblePressable(application, text, contains: true),
               (attribute(element, "AXEnabled") as? NSNumber)?.boolValue == true {
                _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
                Thread.sleep(forTimeInterval: 0.05)
                let error = AXUIElementPerformAction(element, "AXPress" as CFString)
                guard error == .success else {
                    throw DriverError.actionFailed(text, error)
                }
                pressed = true
                break
            }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
        guard pressed else {
            throw DriverError.timeout("pressable control: \(text)")
        }
        print("Pressed rendered control: \(text)")
    case "press-contains":
        let deadline = Date().addingTimeInterval(timeout)
        var pressed = false
        repeat {
            if let element = findVisiblePressable(application, text, contains: true),
               (attribute(element, "AXEnabled") as? NSNumber)?.boolValue == true {
                _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
                Thread.sleep(forTimeInterval: 0.05)
                let error = AXUIElementPerformAction(element, "AXPress" as CFString)
                guard error == .success else {
                    throw DriverError.actionFailed(text, error)
                }
                pressed = true
                break
            }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
        guard pressed else {
            throw DriverError.timeout("pressable control containing: \(text)")
        }
        print("Pressed rendered control containing: \(text)")
    case "select-contains":
        try selectOption(application, text, pid: pid, timeout: timeout)
        print("Selected rendered option containing: \(text)")
    case "select-contains-allow-unchanged":
        try selectOption(
            application,
            text,
            pid: pid,
            timeout: timeout,
            allowUnchanged: true
        )
        print("Selected rendered option containing (unchanged allowed): \(text)")
    case "set-size":
        try resizeWindow(application, pid: pid, text)
        print("Resized rendered window to: \(text)")
    case "assert-size":
        try assertWindowSize(application, text, timeout: timeout)
        print("Rendered window size is: \(text)")
    default:
        throw DriverError.usage
    }
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
