import AppKit
import WebKit

// Production page/modal probe. Await real DOM events with only synthetic IPC fixtures.
final class LayoutProbe: NSObject, WKNavigationDelegate {
    let webView: WKWebView
    let script: String
    var finished = false
    var failed = false

    init(width: Double, script: String) {
        self.webView = WKWebView(frame: CGRect(x: 0, y: 0, width: width, height: 900))
        self.script = script
        super.init()
        webView.navigationDelegate = self
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
            let value: Any?
            let error: Error?
            switch result {
            case .success(let returned): value = returned; error = nil
            case .failure(let failure): value = nil; error = failure
            }
            if let error = error {
                fputs("WebKit layout probe: \(error)\n", stderr)
                self.failed = true
            } else if let value = value as? String {
                print(value)
            } else {
                fputs("WebKit layout probe returned no geometry\n", stderr)
                self.failed = true
            }
            self.finished = true
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fputs("WebKit page load: \(error)\n", stderr)
        failed = true
        finished = true
    }
}

_ = NSApplication.shared
let page = URL(string: CommandLine.arguments[1])!
let script = try String(contentsOfFile: CommandLine.arguments[2], encoding: .utf8)
let probe = LayoutProbe(width: Double(CommandLine.arguments[3])!, script: script)
probe.webView.load(URLRequest(url: page))
let deadline = Date().addingTimeInterval(20)
while !probe.finished && Date() < deadline {
    RunLoop.current.run(until: Date().addingTimeInterval(0.02))
}
if !probe.finished { fputs("WebKit layout probe timed out\n", stderr) }
exit(probe.finished && !probe.failed ? 0 : 1)
