import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    // Not webViewConfiguration(for:): Capacitor replaces that configuration's userContentController afterward, so scripts added there never run.
    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        if let store = ProgressStore() {
            configuration.userContentController.addUserScript(WKUserScript(source: store.restoreScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))
            configuration.userContentController.add(store, name: ProgressStore.handlerName)
        }
        return super.webView(with: frame, configuration: configuration)
    }

    override func capacitorDidLoad() {
        let canvas = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0x0b / 255, green: 0x0d / 255, blue: 0x11 / 255, alpha: 1)
                : UIColor(red: 0xf2 / 255, green: 0xf2 / 255, blue: 0xf7 / 255, alpha: 1)
        }
        view.backgroundColor = canvas
        webView?.isOpaque = false
        webView?.backgroundColor = canvas
        webView?.scrollView.backgroundColor = canvas
        let edgeSwipe = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(swipedBack(_:)))
        edgeSwipe.edges = .left
        webView?.addGestureRecognizer(edgeSwipe)
    }

    @objc private func swipedBack(_ gesture: UIScreenEdgePanGestureRecognizer) {
        guard let view = gesture.view else { return }
        let phase: String
        switch gesture.state {
        case .began: phase = "start"
        case .changed: phase = "move"
        case .ended: phase = "end"
        case .cancelled, .failed: phase = "cancel"
        default: return
        }
        let x = gesture.translation(in: view).x, speed = gesture.velocity(in: view).x
        webView?.evaluateJavaScript("window.sudokuSwipe?.('\(phase)', \(x), \(speed))")
    }
}

final class ProgressStore: NSObject, WKScriptMessageHandler {
    static let handlerName = "sudokuStorage"
    private let folder: URL
    private let queue = DispatchQueue(label: "dev.seanoliver.sudoku.progress")
    private var pending: [String: String?] = [:]
    private var flushScheduled = false

    init?(fileManager: FileManager = .default) {
        guard let support = try? fileManager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true) else { return nil }
        folder = support.appendingPathComponent("Progress", isDirectory: true)
        guard (try? fileManager.createDirectory(at: folder, withIntermediateDirectories: true)) != nil else { return nil }
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(flushNow), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(flushNow), name: UIScene.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(flushNow), name: UIApplication.willTerminateNotification, object: nil)
    }

    private static func isProgressKey(_ key: String) -> Bool {
        key.hasPrefix("sudoku.") && key.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "." || $0 == "-" || $0 == "_") }
    }

    private func saved() -> [String: String] {
        let files = (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? []
        var values: [String: String] = [:]
        for file in files where ProgressStore.isProgressKey(file.lastPathComponent) {
            if let value = try? String(contentsOf: file, encoding: .utf8) { values[file.lastPathComponent] = value }
        }
        return values
    }

    func restoreScript() -> String {
        let json = (try? JSONSerialization.data(withJSONObject: saved())).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        return """
        (function (saved) {
          var ours = function (key) { return typeof key === 'string' && key.indexOf('sudoku.') === 0; };
          var post = function (key, value) { try { webkit.messageHandlers.\(ProgressStore.handlerName).postMessage({ key: key, value: value }); } catch (e) {} };
          try {
            var wiped = true;
            for (var j = 0; j < localStorage.length; j++) if (ours(localStorage.key(j))) wiped = false;
            if (wiped) Object.keys(saved).forEach(function (key) { localStorage.setItem(key, saved[key]); });
            for (var i = 0; i < localStorage.length; i++) {
              var key = localStorage.key(i), value = localStorage.getItem(key);
              if (ours(key) && saved[key] !== value) post(key, value);
            }
          } catch (e) {}
          var setItem = Storage.prototype.setItem, removeItem = Storage.prototype.removeItem, clear = Storage.prototype.clear;
          Storage.prototype.setItem = function (key, value) { setItem.call(this, key, value); if (this === window.localStorage && ours(key)) post(key, String(value)); };
          Storage.prototype.removeItem = function (key) { removeItem.call(this, key); if (this === window.localStorage && ours(key)) post(key, null); };
          Storage.prototype.clear = function () {
            var keys = [];
            if (this === window.localStorage) for (var k = 0; k < this.length; k++) if (ours(this.key(k))) keys.push(this.key(k));
            clear.call(this);
            keys.forEach(function (key) { post(key, null); });
          };
        })(\(json));
        """
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let key = body["key"] as? String, ProgressStore.isProgressKey(key) else { return }
        let value = body["value"] as? String
        let backgrounded = UIApplication.shared.applicationState != .active
        queue.async {
            self.pending.updateValue(value, forKey: key)
            guard !backgrounded else { return }
            guard !self.flushScheduled else { return }
            self.flushScheduled = true
            self.queue.asyncAfter(deadline: .now() + 15) { self.flush() }
        }
        if backgrounded { flushNow() }
    }

    @objc private func flushNow() {
        let task = UIApplication.shared.beginBackgroundTask(withName: "Save progress")
        queue.sync { flush() }
        if task != .invalid { UIApplication.shared.endBackgroundTask(task) }
    }

    private func flush() {
        flushScheduled = false
        for (key, value) in pending {
            let file = folder.appendingPathComponent(key)
            if let value { try? value.write(to: file, atomically: true, encoding: .utf8) } else { try? FileManager.default.removeItem(at: file) }
        }
        pending.removeAll()
    }
}
