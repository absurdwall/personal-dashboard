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
            return "usage: macos-ui-driver <pid> <wait-text|assert-text|assert-absent-text|assert-focused-text|focus|focus-contains|press-key|assert-visible-focus|assert-semantic|assert-state|assert-live|assert-document-fixed|assert-scroll-surface|assert-select-option|assert-select-absent-option|press|press-contains|select-contains|set-size|assert-size> <text> [timeout-seconds]"
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
    repeat {
        if let element = focusedElement(application),
           nodeText(element).localizedCaseInsensitiveContains(text) {
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("focused rendered control: \(text)")
}

func focusPressable(
    _ application: AXUIElement,
    _ text: String,
    contains: Bool,
    timeout: TimeInterval
) throws {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let element = findPressable(application, text, contains: contains) {
            let error = AXUIElementSetAttributeValue(
                element,
                "AXFocused" as CFString,
                kCFBooleanTrue
            )
            guard error == .success else {
                throw DriverError.actionFailed("focus \(text)", error)
            }
            try waitForFocusedText(application, text, timeout: 1)
            return
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
    default:
        return nil
    }
}

func pressKey(_ pid: pid_t, _ text: String) throws {
    guard let code = keyCode(text) else {
        throw DriverError.usage
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(
        options: []
    )
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
    let counts = roleCounts(application)
    let compactViewport = mainWindow(application).flatMap(windowSize).map { $0.width <= 680 } ?? false
    let compactMode = mode == "compact" || mode == "detail-compact" || mode == "settings"
    let minimumButtonCount = compactViewport ? 1 : 4
    guard (counts["AXWindow"] ?? 0) > 0,
          (counts["AXWebArea"] ?? 0) > 0,
          (counts["AXButton"] ?? 0) >= minimumButtonCount,
          (counts["AXStaticText"] ?? 0) > 0,
          compactMode || (counts["AXList"] ?? 0) > 0 else {
        throw DriverError.timeout("semantic workspace roles")
    }

    if compactViewport {
        let expectedDestination = mode == "settings" ? "Settings" : "This Week"
        guard let switcher = findRole(application, Set(["AXComboBox", "AXPopUpButton"])),
              nodeText(switcher).localizedCaseInsensitiveContains(expectedDestination),
              findText(application, "Destination") != nil else {
            throw DriverError.timeout("compact destination switcher")
        }
    }

    if !compactViewport {
        for text in ["This Week", "History", "Settings"] {
            guard findPressable(application, text) != nil else {
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
    } else if mode == "detail" || mode == "detail-compact" {
        guard findText(application, "workout") != nil,
              findPressable(application, "Close") != nil ||
                findPressable(application, "Back") != nil else {
            throw DriverError.timeout("semantic detail surface")
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
              findPressable(application, "Elliptical") != nil else {
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
    let values = [
        "AXSelected",
        "AXPressed",
        "AXCurrent",
        "AXValue",
        "AXDescription",
        "AXHelp",
    ].compactMap {
        attribute(element, $0).map(normalizedAttributeValue)
    }
    let matches: Set<String>
    switch expected.lowercased() {
    case "current":
        matches = ["true", "1", "page", "current", "selected"]
    case "pressed", "selected":
        matches = ["true", "1", "pressed", "selected"]
    default:
        throw DriverError.usage
    }
    guard values.contains(where: { value in
        matches.contains(value) || matches.contains(where: { value.contains($0) })
    }) else {
        throw DriverError.unexpectedText("\(text) did not expose state \(expected)")
    }
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
        throw DriverError.unexpectedText("\(text) did not expose live semantics \(expectedToken)")
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
    default:
        throw DriverError.usage
    }
    let surfaceAndAnchor: (AXUIElement, AXUIElement, CGRect)? = findTextPaths(
        application,
        anchorText
    ).compactMap { path in
        guard let surface = path.ancestors.reversed().first(where: { element in
                  let role = stringAttribute(element, "AXRole")
                  return role == "AXScrollArea" ||
                      (role != "AXWebArea" && role != "AXWindow" &&
                        attribute(element, "AXVerticalScrollBar") != nil)
              }) else {
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
        throw DriverError.actionFailed("scroll \(label)", .failure)
    }
    _ = NSRunningApplication(processIdentifier: pid)?.activate(options: [])
    move.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.05)
    scroll.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.25)
    guard let afterSurfaceFrame = frame(surface),
          abs(afterSurfaceFrame.origin.x - beforeSurfaceFrame.origin.x) <= 1,
          abs(afterSurfaceFrame.origin.y - beforeSurfaceFrame.origin.y) <= 1,
          abs(afterSurfaceFrame.width - beforeSurfaceFrame.width) <= 1,
          abs(afterSurfaceFrame.height - beforeSurfaceFrame.height) <= 1 else {
        throw DriverError.timeout("scrollable surface moved: \(label)")
    }
    let anchorFrameChanged: Bool
    if let afterAnchorFrame = frame(anchor) {
        anchorFrameChanged =
            abs(afterAnchorFrame.origin.x - beforeAnchorFrame.origin.x) > 1 ||
                abs(afterAnchorFrame.origin.y - beforeAnchorFrame.origin.y) > 1
    } else {
        anchorFrameChanged = false
    }
    guard anchorFrameChanged else {
        throw DriverError.timeout("scroll position changed: \(label)")
    }
    try assertDocumentFixed(application)
}

func selectOption(
    _ application: AXUIElement,
    _ text: String,
    timeout: TimeInterval
) throws {
    guard let picker = findExceptionSchedulePicker(application)
        ?? findRole(application, Set(["AXComboBox", "AXPopUpButton"])) else {
        throw DriverError.timeout("schedule picker")
    }

    let pressError = AXUIElementPerformAction(picker, "AXPress" as CFString)
    if pressError == .success {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if let option = findPressable(application, text, contains: true) {
                let optionError = AXUIElementPerformAction(option, "AXPress" as CFString)
                guard optionError == .success else {
                    throw DriverError.actionFailed(text, optionError)
                }
                return
            }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
    }

    let setError = AXUIElementSetAttributeValue(
        picker,
        "AXValue" as CFString,
        text as CFTypeRef
    )
    guard setError == .success else {
        throw DriverError.actionFailed("select \(text)", setError)
    }
}

enum OptionExpectation {
    case present
    case absent
}

func findExceptionSchedulePicker(_ application: AXUIElement) -> AXUIElement? {
    guard let newTimePath = findTextPath(application, "New time") else {
        return nil
    }
    let pickerRoles = Set(["AXComboBox", "AXPopUpButton"])
    for context in newTimePath.ancestors.reversed() {
        if let picker = findRoleWithin(context, pickerRoles) {
            return picker
        }
    }
    return nil
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
    guard let picker = findExceptionSchedulePicker(application) else {
        throw DriverError.timeout("exception schedule picker")
    }
    let pressError = AXUIElementPerformAction(picker, "AXPress" as CFString)
    guard pressError == .success else {
        throw DriverError.actionFailed("open exception schedule picker", pressError)
    }

    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let menu = findVisibleMenu(application),
           let option = findMenuItem(menu, text) {
            try pressKey(pid, "escape")
            if case .present = expectation {
                return
            }
            throw DriverError.unexpectedText("select option: \(nodeText(option))")
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline

    try pressKey(pid, "escape")
    guard case .absent = expectation else {
        throw DriverError.timeout("select option: \(text)")
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
    let error = AXUIElementSetAttributeValue(window, "AXSize" as CFString, value)
    guard error == .success else {
        throw DriverError.actionFailed("resize \(text)", error)
    }
    Thread.sleep(forTimeInterval: 0.25)
}

func assertWindowSize(
    _ application: AXUIElement,
    _ text: String,
    timeout: TimeInterval
) throws {
    guard let expected = parseWindowSize(text),
          let window = mainWindow(application) else {
        throw DriverError.usage
    }
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let actual = windowSize(window),
           abs(actual.width - expected.width) < 1,
           abs(actual.height - expected.height) < 1 {
            return
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline
    throw DriverError.timeout("window size: \(text)")
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
        try waitForFocusedText(application, text, timeout: timeout)
        print("Focused rendered control contains: \(text)")
    case "focus":
        try focusPressable(application, text, contains: false, timeout: timeout)
        print("Focused rendered control: \(text)")
    case "focus-contains":
        try focusPressable(application, text, contains: true, timeout: timeout)
        print("Focused rendered control containing: \(text)")
    case "press-key":
        try pressKey(pid, text)
        print("Sent keyboard activation: \(text)")
    case "assert-visible-focus":
        try assertVisibleFocus(application, text, timeout: timeout)
        print("Focused rendered control is visible: \(text)")
    case "assert-semantic":
        try assertSemanticContract(application, text)
        print("Rendered semantic contract passed: \(text)")
    case "assert-state":
        let parts = text.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2 else {
            throw DriverError.usage
        }
        try assertState(application, parts[0], parts[1])
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
    case "assert-select-option":
        try assertSelectOption(application, text, expectation: .present, pid: pid, timeout: timeout)
        print("Rendered select contains option: \(text)")
    case "assert-select-absent-option":
        try assertSelectOption(application, text, expectation: .absent, pid: pid, timeout: timeout)
        print("Rendered select excludes option: \(text)")
    case "press":
        let deadline = Date().addingTimeInterval(timeout)
        var pressed = false
        repeat {
            if let element = findPressable(application, text) {
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
        try selectOption(application, text, timeout: timeout)
        print("Selected rendered option containing: \(text)")
    case "set-size":
        try resizeWindow(application, text)
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
