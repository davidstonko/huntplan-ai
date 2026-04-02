#ifdef __OBJC__
#import <UIKit/UIKit.h>
#else
#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif
#endif

#import "FBReactNativeSpec/FBReactNativeSpec.h"
#import "FBReactNativeSpecJSI.h"
#import "RCTModulesConformingToProtocolsProvider.h"
#import "react/renderer/components/rnmapbox_maps_specs/ComponentDescriptors.h"
#import "react/renderer/components/rnmapbox_maps_specs/EventEmitters.h"
#import "react/renderer/components/rnmapbox_maps_specs/Props.h"
#import "react/renderer/components/rnmapbox_maps_specs/RCTComponentViewHelpers.h"
#import "react/renderer/components/rnmapbox_maps_specs/ShadowNodes.h"
#import "react/renderer/components/rnmapbox_maps_specs/States.h"
#import "react/renderer/components/rnpicker/ComponentDescriptors.h"
#import "react/renderer/components/rnpicker/EventEmitters.h"
#import "react/renderer/components/rnpicker/Props.h"
#import "react/renderer/components/rnpicker/RCTComponentViewHelpers.h"
#import "react/renderer/components/rnpicker/ShadowNodes.h"
#import "react/renderer/components/rnpicker/States.h"
#import "react/renderer/components/rnscreens/ComponentDescriptors.h"
#import "react/renderer/components/rnscreens/EventEmitters.h"
#import "react/renderer/components/rnscreens/Props.h"
#import "react/renderer/components/rnscreens/RCTComponentViewHelpers.h"
#import "react/renderer/components/rnscreens/ShadowNodes.h"
#import "react/renderer/components/rnscreens/States.h"
#import "react/renderer/components/safeareacontext/ComponentDescriptors.h"
#import "react/renderer/components/safeareacontext/EventEmitters.h"
#import "react/renderer/components/safeareacontext/Props.h"
#import "react/renderer/components/safeareacontext/RCTComponentViewHelpers.h"
#import "react/renderer/components/safeareacontext/ShadowNodes.h"
#import "react/renderer/components/safeareacontext/States.h"
#import "rnasyncstorage/rnasyncstorage.h"
#import "rnasyncstorageJSI.h"
#import "RNBackgroundGeolocation/RNBackgroundGeolocation.h"
#import "RNBackgroundGeolocationJSI.h"
#import "RNCGeolocationSpec/RNCGeolocationSpec.h"
#import "RNCGeolocationSpecJSI.h"
#import "RNCNetInfoSpec/RNCNetInfoSpec.h"
#import "RNCNetInfoSpecJSI.h"
#import "rnmapbox_maps_specs/rnmapbox_maps_specs.h"
#import "rnmapbox_maps_specsJSI.h"
#import "rnscreens/rnscreens.h"
#import "rnscreensJSI.h"
#import "RNVectorIconsSpec/RNVectorIconsSpec.h"
#import "RNVectorIconsSpecJSI.h"
#import "safeareacontext/safeareacontext.h"
#import "safeareacontextJSI.h"

FOUNDATION_EXPORT double ReactCodegenVersionNumber;
FOUNDATION_EXPORT const unsigned char ReactCodegenVersionString[];

