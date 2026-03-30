import React_RCTAppDelegate

@objc
public class ReactAppDependencyProvider: NSObject, RCTAppDependencyProvider {
  @objc public func extraModules(for bridge: RCTBridge) -> [RCTBridgeModule] {
    return []
  }
}
