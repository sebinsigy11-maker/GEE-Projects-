var aoi : import your shapefile
// Load the WorldCover dataset
var dataset = ee.ImageCollection('ESA/WorldCover/v100').first();


// Clip the dataset to the ROI
var clippedDataset = dataset.clip(roi);

// Visualization parameters
var visualization = {
  bands: ['Map'],
  min: 10,   // Adjust these values as needed for better visualization
  max: 100,
  palette: ['green', 'blue', 'yellow', 'brown'] // Customize the color palette
};

// Center the map on your ROI
Map.centerObject(roi);

// Add the clipped land cover layer to the map
Map.addLayer(clippedDataset, visualization, 'Clipped Landcover');

// Get the current date
var currentDate = ee.Date(Date.now()).format('YYYY-MM-dd').getInfo();

// Export the clipped dataset to Google Drive with date in the filename
Export.image.toDrive({
  image: clippedDataset,
  description: 'WorldCover_Clipped_ROI_' + currentDate,  // Add the date to the filename
  scale: 10,  // Set scale (in meters) based on dataset resolution (10 meters for WorldCover)
  region: roi.geometry().bounds(),  // Ensure the export is limited to your ROI
  maxPixels: 1e13,  // Adjust this if you encounter max pixel error
  folder: 'EarthEngineExports',  // Optional: specify the folder in Google Drive
  fileFormat: 'GeoTIFF',  // Export format (GeoTIFF is recommended for raster data)
  crs: 'EPSG:4326'  // Specify the CRS (optional, default is WGS 84)
});
