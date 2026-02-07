// You can draw and import a custom ROI, or use this example (Bangalore area)
var roi = ee.Geometry.Rectangle([91.50, 26.10, 91.65, 26.25]);

// 2. Load Sentinel-5P CH₄ Dataset
var ch4 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4')
  .select('CH4_column_volume_mixing_ratio_dry_air')
  .filterDate('2025-02-01', '2025-05-31')  // Choose your analysis period
  .filterBounds(roi);

// 3. Calculate the Mean CH₄ for the Time Period
var meanCH4 = ch4.mean().clip(roi);

// 4. Visualization Parameters
var visParams = {
  min: 1850,
  max: 2100,
  palette: ['blue', 'green', 'yellow', 'orange', 'red']
};

// 5. Display on the Map
Map.centerObject(roi, 9);
Map.addLayer(meanCH4, visParams, 'Mean CH₄ May 2024');

// 6. Export CH₄ Image to Google Drive as TIFF
Export.image.toDrive({
  image: meanCH4,
  description: 'Mean_CH4_May2024',
  folder: 'GEE_exports',  // Replace with your Drive folder name
  fileNamePrefix: 'CH4_May2024_Bangalore',
  region: roi,
  scale: 1000,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
