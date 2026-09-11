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
            return "usage: macos-ui-driver <pid> <wait-text|assert-text|assert-absent-text|assert-focused-text|focus|focus-contains|press-key|type-text|choose-folder|assert-visible-focus|assert-semantic|assert-state|assert-live|assert-document-fixed|assert-scroll-surface|scroll-to-bottom|assert-destination-inset|assert-select-option|assert-select-absent-option|dump-text|dump-picker|press|press-contains|select-contains|select-contains-allow-unchanged|set-size|assert-size> <text> [timeout-seconds]"
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
        if let element = findPressable(application, text, contains: contains) {
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

func typeText(
    _ application: AXUIElement,
    pid: pid_t,
    label: String,
    value: String,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let element = findTextPaths(application, label).first(where: { path in
            Set(["AXTextField", "AXTextArea"]).contains(
                stringAttribute(path.element, "AXRole")
            )
        })?.element {
            _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
            try setAccessibilityAttribute(
                element,
                "AXFocused",
                kCFBooleanTrue,
                "focus text field \(label)"
            )
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

func waitForFocusedPickerTextField(
    _ application: AXUIElement,
    picker: AXUIElement,
    timeout: TimeInterval
) throws -> AXUIElement {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let field = focusedElement(application),
           stringAttribute(field, "AXRole") == "AXTextField" {
            let pickerTextFields = findRolesWithin(picker, ["AXTextField"])
            if pickerTextFields.contains(where: { CFEqual($0, field) }) {
                return field
            }
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("focused native folder path field")
}

func openPickerPathField(
    _ application: AXUIElement,
    picker: AXUIElement,
    pid: pid_t,
    timeout: TimeInterval
) throws -> AXUIElement {
    let deadline = Date().addingTimeInterval(timeout)
    var lastError: Error = DriverError.timeout("focused native folder path field")
    for _ in 1...3 {
        try activateApplication(
            application,
            pid: pid,
            timeout: min(2, max(0.1, deadline.timeIntervalSinceNow))
        )
        try postGlobalShortcut(keyCode: 5, flags: [.maskCommand, .maskShift])
        do {
            return try waitForFocusedPickerTextField(
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
    }
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
    try waitForPickerTarget(
        picker,
        targetName: targetName,
        timeout: max(0.1, deadline.timeIntervalSinceNow)
    )
    reportNativePickerTransition("folder target visible name=\(targetName)")
    try postGlobalKey("return")
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

func characterKeyCode(_ character: Character) -> CGKeyCode? {
    switch character.lowercased() {
    case "a": return 0
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
    if let informationSurface = path.ancestors.reversed().first(where: { element in
        visibleAttribute(element, "AXHidden") &&
            nodeText(element).localizedCaseInsensitiveContains("Workspace information")
    }) {
        return informationSurface
    }
    return path.ancestors.reversed().first { element in
        let role = stringAttribute(element, "AXRole")
        return visibleAttribute(element, "AXHidden") &&
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
    if command != "choose-folder" {
        try activateApplication(application, pid: pid, timeout: timeout)
    }
    Thread.sleep(forTimeInterval: 0.05)

    switch command {
    case "wait-text":
        try waitForText(application, text, timeout: timeout)
        print("Found rendered text: \(text)")
    case "assert-text":
        try waitForText(application, text, timeout: 0.5)
        print("Visible rendered state contains: \(text)")
    case "assert-absent-text":
        try assertAbsentText(application, text)
        print("Rendered state does not contain: \(text)")
    case "assert-focused-text":
        try activateApplication(application, pid: pid, timeout: min(2, timeout))
        try waitForFocusedText(application, text, timeout: timeout)
        print("Focused rendered control contains: \(text)")
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
    case "choose-folder":
        try chooseFolder(application, pid: pid, path: text, timeout: timeout)
        print("Selected native folder: \(text)")
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
            if let element = findPressable(application, text, contains: true) {
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
            if let element = findPressable(application, text, contains: true) {
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
