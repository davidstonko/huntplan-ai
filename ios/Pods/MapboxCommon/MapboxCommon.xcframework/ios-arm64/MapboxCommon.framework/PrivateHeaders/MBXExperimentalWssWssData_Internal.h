// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBXExperimentalWssWssDataType)
{
    MBXExperimentalWssWssDataTypeNSData,
    MBXExperimentalWssWssDataTypeNSString
} NS_SWIFT_NAME(WssDataType);

NS_SWIFT_NAME(WssData)
__attribute__((visibility ("default")))
@interface MBXExperimentalWssWssData : NSObject

- (nonnull instancetype)initWithValue:(nonnull id)value __attribute__((deprecated("Please use: '+from{TypeName}:' instead.")));

+ (nonnull instancetype)fromNSData:(nonnull NSData *)value;
+ (nonnull instancetype)fromNSString:(nonnull NSString *)value;

- (BOOL)isNSData;
- (BOOL)isNSString;

- (nonnull NSData *)getNSData __attribute((ns_returns_retained));
- (nonnull NSString *)getNSString __attribute((ns_returns_retained));

@property (nonatomic, nonnull) id value;

@property (nonatomic, readonly) MBXExperimentalWssWssDataType type;

@end
