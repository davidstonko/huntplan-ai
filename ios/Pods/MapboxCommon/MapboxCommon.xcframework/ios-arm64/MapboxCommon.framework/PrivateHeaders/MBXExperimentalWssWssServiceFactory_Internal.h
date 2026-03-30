// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@protocol MBXExperimentalWssWssServiceInterface;

NS_SWIFT_NAME(WssServiceFactory)
__attribute__((visibility ("default")))
@interface MBXExperimentalWssWssServiceFactory : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (nonnull id<MBXExperimentalWssWssServiceInterface>)getInstance __attribute((ns_returns_retained));
/**
 * Releases the implementation of the WssService.
 *
 * The strong reference from the factory to a custom WssService implementation will be released. This can be
 * used to release the WssService implementation once it is no longer needed. It may otherwise be kept until
 * the end of the program.
 */
+ (void)reset;
+ (void)setUserDefinedForCustom:(nonnull id<MBXExperimentalWssWssServiceInterface>)custom;

@end
