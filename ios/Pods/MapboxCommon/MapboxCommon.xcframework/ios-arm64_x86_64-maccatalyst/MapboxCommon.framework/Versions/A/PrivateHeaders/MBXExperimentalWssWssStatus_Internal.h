// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXExperimentalWssWssConnectionState_Internal.h>
@class MBXExpected<__covariant Value, __covariant Error>;

@class MBXExperimentalWssWssData;
@class MBXHttpRequestError;

NS_SWIFT_NAME(WssStatus)
__attribute__((visibility ("default")))
@interface MBXExperimentalWssWssStatus : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithConnectionId:(uint64_t)connectionId
                                       state:(MBXExperimentalWssWssConnectionState)state
                                     wssData:(nullable MBXExpected<MBXExperimentalWssWssData *, MBXHttpRequestError *> *)wssData
                                        code:(nullable NSNumber *)code;

/** Connection id which was created by connection request. */
@property (nonatomic, readwrite) uint64_t connectionId;

@property (nonatomic, readwrite) MBXExperimentalWssWssConnectionState state;
@property (nonatomic, readwrite, nullable) MBXExpected<MBXExperimentalWssWssData *, MBXHttpRequestError *> *wssData;
/** Http code assotiated with status if any. */
@property (nonatomic, readwrite, nullable) NSNumber *code;


@end
