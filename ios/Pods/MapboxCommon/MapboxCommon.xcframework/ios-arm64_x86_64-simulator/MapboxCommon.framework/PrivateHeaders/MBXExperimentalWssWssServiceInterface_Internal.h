// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXExperimentalWssWssStatusCallback_Internal.h>
#import <MapboxCommon/MBXResultCallback.h>

@class MBXExperimentalWssWssData;
@class MBXHttpRequest;

NS_SWIFT_NAME(WssServiceInterface)
@protocol MBXExperimentalWssWssServiceInterface
/**
 * Set ping timeout that will be applied for all newly created connections.
 * Defaults to 20 seconds.
 *
 * @param pingTimeout Ping timeout, 0 to disable pingings.
 */
- (void)setPingTimeoutForPingTimeout:(NSTimeInterval)pingTimeout;
- (uint64_t)connectForRequest:(nonnull MBXHttpRequest *)request
                     callback:(nonnull MBXExperimentalWssWssStatusCallback)callback;
- (void)writeForId:(uint64_t)id
              data:(nonnull MBXExperimentalWssWssData *)data;
/**
 * Close connection.
 *
 * @param id Id of connection to close.
 * @param callback Callback to execute on operation result.
 */
- (void)cancelConnectionForId:(uint64_t)id
                     callback:(nonnull MBXResultCallback)callback;
@end
