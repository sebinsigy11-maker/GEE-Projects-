// Define Region of Interest (ROI) for Guwahati
var roi = ee.Geometry.Rectangle([91.5, 26.0, 92.0, 26.3]);

// Center the map on the ROI
Map.centerObject(roi, 10);

// Define the time period for analysis
var start = '2023-01-01';
var end = '2023-12-31';

// Load Sentinel-5P NO₂ data
var no2 = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
  .filterBounds(roi)
  .filterDate(start, end)
  .mean()
  .select('tropospheric_NO2_column_number_density')
  .multiply(1e18) // Convert to molecules per cm²
  .rename('NO₂');

// Visualize the NO₂ data
Map.addLayer(no2, {
  min: 0,
  max: 1e16,
  palette: ['blue', 'green', 'yellow', 'red']
}, 'NO₂ Concentration');

// Export the NO₂ data to Google Drive
Export.image.toDrive({
  image: no2,
  description: 'NO2_Guwahati_2023',
  folder: 'GEE_Exports',
  region: roi,
  scale: 1000,
  maxPixels: 1e8
});
