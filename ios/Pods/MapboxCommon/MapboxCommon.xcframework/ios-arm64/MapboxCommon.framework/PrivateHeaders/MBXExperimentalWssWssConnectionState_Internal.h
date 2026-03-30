// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBXExperimentalWssWssConnectionState)
{
    /** WebSocket session initiated but not started yet. */
    MBXExperimentalWssWssConnectionStatePending,
    /** WebSocket session is in connected, may send data. */
    MBXExperimentalWssWssConnectionStateConnected,
    /** WebSocket session failed. */
    MBXExperimentalWssWssConnectionStateFailed,
    /** WebSocket session successfully finished. */
    MBXExperimentalWssWssConnectionStateFinished
} NS_SWIFT_NAME(WssConnectionState);

NSString* MBXExperimentalWssWssConnectionStateToString(MBXExperimentalWssWssConnectionState wss_connection_state);
