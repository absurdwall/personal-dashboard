import AppKit
import WebKit

// Runs async production DOM event scenarios in macOS WebKit.
// Native IPC remains a test boundary; no user Vault or installed App is used.
final class LayoutProbe: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    let webView: WKWebView
    let window: NSWindow
    let script: String
    var finished = false
    var failed = false

    init(width: Double, height: Double = 900, script: String) {
        self.webView = WKWebView(frame: CGRect(x: 0, y: 0, width: width, height: height))
        self.window = NSWindow(contentRect: CGRect(x: 0, y: 0, width: width, height: height), styleMask: [.titled, .resizable], backing: .buffered, defer: false)
        self.script = script
        super.init()
        window.contentView = webView
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.configuration.userContentController.add(self, name: "resizeViewport")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let size = message.body as? [String: Double], let width = size["width"], let height = size["height"] else { return }
        window.setContentSize(NSSize(width: width, height: height))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page, completionHandler: { result in
            if case .failure(let error) = result {
                fputs("WebKit layout probe: \(error)\n", stderr)
                self.failed = true
            } else if case .success(let value as String) = result {
                print(value)
            } else {
                fputs("WebKit layout probe returned no geometry\n", stderr)
                self.failed = true
            }
            self.finished = true
        })
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fputs("WebKit page load: \(error)\n", stderr)
        failed = true
        finished = true
    }
}

_ = NSApplication.shared
let page = URL(fileURLWithPath: CommandLine.arguments[1])
let script = try String(contentsOfFile: CommandLine.arguments[2], encoding: .utf8)
let height = CommandLine.arguments.count > 4 ? Double(CommandLine.arguments[4])! : 900
let width = CommandLine.arguments.count > 3 ? Double(CommandLine.arguments[3])! : 830
let probe = LayoutProbe(width: width, height: height, script: script)
probe.webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
let deadline = Date().addingTimeInterval(20)
while !probe.finished && Date() < deadline {
    RunLoop.current.run(until: Date().addingTimeInterval(0.02))
}
if !probe.finished { fputs("WebKit layout probe timed out: \(probe.webView.title ?? "untitled")\n", stderr) }
exit(probe.finished && !probe.failed ? 0 : 1)
