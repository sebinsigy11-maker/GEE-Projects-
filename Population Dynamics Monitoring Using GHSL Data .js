// 1. Define a Location Using Coordinates
var pointCoords = [91.7069149515961, 26.134447056246458];
var targetPoint = ee.Geometry.MultiPoint(pointCoords); // MultiPoint for flexibility

var countryBoundary = ee.FeatureCollection("FAO/GAUL/2015/level1")
Map.addLayer(countryBoundary, {}, 'countryBoundary', false);

// 2. Load and Filter Your Administrative Boundary (example: a country or province)
var regionBoundary = ee.FeatureCollection("FAO/GAUL/2015/level1")  // Replace with your own asset if needed
  .filterBounds(targetPoint);  // Filter to only the region intersecting your point

Map.centerObject(regionBoundary);  // Center the map on the filtered region
Map.addLayer(regionBoundary, {color: 'blue'}, 'Administrative Region');

// 3. Load Global Human Settlement Layer Population Dataset
var populationData = ee.ImageCollection("JRC/GHSL/P2023A/GHS_POP");

// 4. Visualize Population Data as a Stacked Band Image (Optional)
var populationCountVis = {
  min: 0.0,
  max: 100.0,
  palette: [
    '#f7fbff', // very low
    '#deebf7',
    '#c6dbef',
    '#9ecae1',
    '#6baed6',
    '#4292c6',
    '#2171b5',
    '#08519c',
    '#08306b'  // very high
  ]
};

// 5. Add layer and Visualize
Map.addLayer(populationData, populationCountVis, 'Global Population', false);
Map.addLayer(populationData.toBands().clip(regionBoundary), {}, 'Population Bands (Stacked)', false);

// 6. Create a Detailed Population Time Series Chart
var populationChart = ui.Chart.image.series({
  imageCollection: populationData,
  region: regionBoundary,
  reducer: ee.Reducer.sum(),  // Sum total population per image date
  scale: 100,  // Spatial resolution in meters
  xProperty: 'system:time_start'  // Use time metadata from GHSL
})
.setChartType('LineChart')
.setOptions({
  title: 'Population Change Over Time (GHSL)',
  titleTextStyle: {bold: true, fontSize: 16},
  hAxis: {
    title: 'Year',
    titleTextStyle: {italic: false, bold: true},
    format: 'yyyy',
    gridlines: {count: 5}
  },
  vAxis: {
    title: 'Estimated Population',
    titleTextStyle: {italic: false, bold: true},
    gridlines: {count: 6}
  },
  lineWidth: 3,
  pointSize: 6,
  colors: ['#D32F2F'],  // Red tone
  legend: {position: 'none'},
  curveType: 'function'
});

// 7. Display chart in the console
print(populationChart);
// 8. Select a specific year image from the collection (e.g., 2015)
var population2015 = populationData
  .filter(ee.Filter.calendarRange(2015, 2015, 'year'))
  .first()
  .clip(regionBoundary);  // Clip to your region

// Optional visualization to confirm
Map.addLayer(population2015, populationCountVis, 'Population 2015');

// 9. Export to Google Drive as GeoTIFF
Export.image.toDrive({
  image: population2015,
  description: 'Population_2015_GHSL',
  folder: 'GEE_Exports',  // Replace with your desired Drive folder name
  fileNamePrefix: 'population_2015_ghsl',
  region: regionBoundary.geometry(),  // Export region
  scale: 100,  // Resolution in meters (GHSL native resolution)
  crs: 'EPSG:4326',  // Optional: export in WGS84
  maxPixels: 1e13
});

