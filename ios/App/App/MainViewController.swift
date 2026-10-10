import UIKit
import Capacitor

/// The app's web view controller. A swipe in from the left edge drives the web app's swipe-back, which follows the finger.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
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
