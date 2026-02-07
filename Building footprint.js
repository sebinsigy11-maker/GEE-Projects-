// Load the Open Buildings dataset
var buildings = ee.FeatureCollection('GOOGLE/Research/open-buildings/v3/polygons');

// Define the region of interest (ROI): Kochi (bounding box example)
var kochi = ee.Geometry.Rectangle([76.2, 9.8, 76.4, 10.1]);

// Filter by location and confidence
var filtered = buildings
  .filterBounds(kochi)
  .filter(ee.Filter.gte('confidence', 0.65));

// Remove problematic geometry-type properties like 'longitude_latitude'
var cleaned = filtered.map(function(feature) {
  return feature.select([
    'area', 
    'confidence', 
    'is_partial_building'
    // Exclude 'longitude_latitude' or other geometry-type props
  ]);
});

// Visualize on map
Map.centerObject(kochi, 12);
Map.addLayer(cleaned, {}, 'Kochi Buildings');

// Export the cleaned FeatureCollection to Google Drive
Export.table.toDrive({
  collection: cleaned,
  description: 'Kochi_Building_Polygons_Cleaned',
  folder: 'GEE',
  fileFormat: 'SHP' // Or 'GeoJSON'
});
