/**
 * CampAreaPickerScreen — Stack-route wrapper around CampAreaPicker.
 *
 * 2026-04-26 (fork merge, fifth-pass Deer Camp create fix): the previous
 * iterations rendered the area picker inside the parent screen as either
 * a nested <Modal presentationStyle="fullScreen"> or an absolute-positioned
 * overlay. Both got blocked or hidden by iOS UIKit modal-stack races.
 *
 * This wrapper makes the picker a real React Navigation Stack screen.
 * The flow:
 *   1. DeerCampScreen → user taps "Next: Draw Area" with a name
 *   2. Closes the name modal, then `navigation.navigate('CampAreaPicker',
 *      { campName, returnRoute: 'DeerCampMain' })`
 *   3. This screen renders <CampAreaPicker visible={true}>
 *   4. On Confirm: store the area in a ref, pop back, parent finishes
 *      createCamp(name, area) on focus
 *   5. On Cancel: pop back, parent clears pendingAreaName
 *
 * Communication back to DeerCampScreen happens via `route.params.onConfirm`
 * and `route.params.onCancel` callbacks — same pattern React Navigation
 * recommends for cross-screen handoffs that don't deserve a global store.
 */

import React from 'react';
import CampAreaPicker from '../components/deercamp/CampAreaPicker';
import { takePendingAreaPickerCallbacks } from '../components/deercamp/campAreaPickerCallbacks';
import type { CampArea } from '../types/deercamp';

interface RouteParams {
  campName: string;
  initialCenter?: { lat: number; lng: number };
  /** Opaque id paired with the callbacks stashed in
   *  campAreaPickerCallbacks. Replaces the previous onConfirm/onCancel
   *  function-on-route-params pattern (task #48, 2026-04-26). */
  reqId: string;
}

export default function CampAreaPickerScreen({
  route,
  navigation,
}: any) {
  const params = route.params as RouteParams;

  // Look up callbacks once on mount. We deliberately don't hold them in
  // state — once the picker resolves we navigate.goBack() and unmount,
  // so a single pull is fine.
  const callbacks = React.useMemo(
    () => takePendingAreaPickerCallbacks(params?.reqId),
    [params?.reqId],
  );

  const handleConfirm = (area: CampArea) => {
    callbacks?.onConfirm(area);
    navigation.goBack();
  };

  const handleCancel = () => {
    callbacks?.onCancel();
    navigation.goBack();
  };

  return (
    <CampAreaPicker
      visible={true}
      campName={params?.campName ?? ''}
      initialCenter={params?.initialCenter}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
