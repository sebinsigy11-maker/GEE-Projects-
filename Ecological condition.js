//Define a Location Using Coordinates
var roi :Polygon,4 vertices
// Study Area
Map.centerObject(roi, 7);
// Time Period
var start = '2023-04-01';
var end = '2023-10-01';

// 1. NDVI (Sentinel-2)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate(start, end)
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
  .median();

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndvi_norm = ndvi.unitScale(0.2, 0.9).clamp(0, 1);

// 2. LST (MODIS)
var lst = ee.ImageCollection('MODIS/061/MOD11A2')
  .filterDate(start, end)
  .select('LST_Day_1km')
  .mean()
  .multiply(0.02) // Scale factor
  .subtract(273.15) // Kelvin to Celsius
  .rename('LST');

var lst_norm = lst.unitScale(20, 45).clamp(0, 1).subtract(1).multiply(-1); // Invert: low LST = healthy

// 3. Precipitation (CHIRPS)
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
  .filterDate(start, end)
  .filterBounds(roi)
  .sum()
  .rename('Precip');

var precip_norm = chirps.unitScale(100, 800).clamp(0, 1);

// 4. LULC (ESA WorldCover) – Binary natural vs non-natural
var lulc = ee.Image('ESA/WorldCover/v100/2020').clip(roi);
var natural = lulc.remap([10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100],
                         [1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0]).rename('Natural'); // simple classification

// 5. Combine all indices into ECI
var eci = ndvi_norm.multiply(0.4)
           .add(lst_norm.multiply(0.2))
           .add(precip_norm.multiply(0.2))
           .add(natural.multiply(0.2)); // total weight = 1

Map.addLayer(eci.clip(roi), {min: 0, max: 1, palette: ['red', 'yellow', 'green']}, 'Ecological Condition Index');

// Export ECI
Export.image.toDrive({
  image: eci,
  description: 'Ecological_Condition_Index_2023',
  folder: 'GEE_Exports',
  region: roi,
  scale: 500,
  maxPixels: 1e13
});
