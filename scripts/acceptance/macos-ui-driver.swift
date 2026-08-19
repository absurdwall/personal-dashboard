import ApplicationServices
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
            return "usage: macos-ui-driver <pid> <wait-text|assert-text|assert-absent-text|assert-focused-text|press|press-contains|select-contains|set-size|assert-size> <text> [timeout-seconds]"
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

func selectOption(
    _ application: AXUIElement,
    _ text: String,
    timeout: TimeInterval
) throws {
    guard let picker = findRole(application, Set(["AXComboBox", "AXPopUpButton"])) else {
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
