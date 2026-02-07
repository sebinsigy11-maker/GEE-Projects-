var aoi = ee.Geometry.Rectangle([80.5, 27.0, 81.0, 27.5]); // Change as needed
Map.centerObject(aoi, 9);

// 2. Load SRTM DEM and calculate slope
var dem = ee.Image("USGS/SRTMGL1_003").clip(aoi);
var slope = ee.Terrain.slope(dem);

// Reclassify slope suitability: flatter = more suitable
var slopeSuitability = slope.expression(
  "(b('slope') <= 5) ? 3" +
  ": (b('slope') <= 15) ? 2" +
  ": 1"
).rename('slope_suitability');

// 3. Load MODIS Land Cover (IGBP classification)
var modis = ee.ImageCollection("MODIS/006/MCD12Q1")
              .filterDate('2020-01-01', '2020-12-31')
              .first()
              .select('LC_Type1')
              .clip(aoi);

// Reclassify land cover: cropland (12) = 3, shrubland (6,7) = 2, others = 1
var lcSuitability = modis.expression(
  "(b('LC_Type1') == 12) ? 3" +
  ": ((b('LC_Type1') == 6 || b('LC_Type1') == 7)) ? 2" +
  ": 1"
).rename('lc_suitability');

// 4. Load Soil Organic Carbon from OpenLandMap
var soil = ee.Image("OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02")
              .select('b0')
              .clip(aoi);

// Reclassify soil: higher OC is more suitable
var soilSuitability = soil.expression(
  "(b('b0') >= 5) ? 3" +
  ": (b('b0') >= 2) ? 2" +
  ": 1"
).rename('soil_suitability');

// 5. Combine all three criteria using average
var totalSuitability = slopeSuitability
  .add(lcSuitability)
  .add(soilSuitability)
  .divide(3)
  .rename('land_suitability');

// 6. Visualize layers
Map.addLayer(slope, {min: 0, max: 60}, 'Slope');
Map.addLayer(modis, {}, 'Land Cover (MODIS)');
Map.addLayer(soil, {min: 0, max: 10}, 'Soil Organic Carbon (%)');
Map.addLayer(totalSuitability, {min: 1, max: 3, palette: ['red', 'yellow', 'green']}, 'Land Suitability');

// 7. Export to Google Drive (GeoTIFF in specific folder)
Export.image.toDrive({
  image: totalSuitability,
  description: 'Land_Suitability_Export',
  folder: 'GEE_Exports', // Change to your Google Drive folder
  fileNamePrefix: 'land_suitability_2020',
  region: aoi,
  scale: 30,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13
});
