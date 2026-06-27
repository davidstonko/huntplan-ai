/**
 * @file mapStyles.ts
 * @description Single source of truth for the Mapbox style URLs used across
 * every map screen AND the offline tile downloader.
 *
 * WHY THIS EXISTS: Mapbox caches offline tiles keyed by the EXACT styleURL
 * string. Before this file, MapScreen/ScoutScreen used the literal
 * 'mapbox://styles/mapbox/outdoors-v12' while Fish/Camp/Hike and the offline
 * downloader used `MapboxGL.StyleURL.Outdoors`, which resolves to
 * 'mapbox://styles/mapbox/outdoors-v11'. A v11 offline pack does NOT serve
 * tiles to a v12 map — so the downloaded tiles were silently unused on the
 * Hunt/Scout maps. Routing every screen and the downloader through these two
 * constants guarantees the offline packs actually match what the maps render.
 *
 * @module constants/mapStyles
 */

export const MAP_STYLE_OUTDOORS = 'mapbox://styles/mapbox/outdoors-v12';
export const MAP_STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';
