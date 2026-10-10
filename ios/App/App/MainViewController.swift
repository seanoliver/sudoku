import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
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
