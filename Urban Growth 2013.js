// Load basemaps
var snazzy = require("users/aazuspan/snazzy:styles");
snazzy.addStyle("https://snazzymaps.com/style/132/light-gray", "Grayscale");


// Define color palette
var palette = [
  "#ffff64", "#ffff64", "#ffff00", "#aaf0f0", "#4c7300", "#006400", "#a8c800", "#00a000", 
  "#005000", "#003c00", "#286400", "#285000", "#a0b432", "#788200", "#966400", "#964b00", 
  "#966400", "#ffb432", "#ffdcd2", "#ffebaf", "#ffd278", "#ffebaf", "#00a884", "#73ffdf", 
  "#9ebb3b", "#828282", "#f57ab6", "#66cdab", "#444f89", "#c31400", "#fff5d7", "#dcdcdc", 
  "#fff5d7", "#0046c8", "#ffffff", "#ffffff"
];

// Function to remap class values and clip to ROI
var recodeClasses = function(image) {
  var classes = [10, 11, 12, 20, 51, 52, 61, 62, 71, 72, 81, 82, 91, 92, 120, 121, 122, 
                 130, 140, 150, 152, 153, 181, 182, 183, 184, 185, 186, 187, 190, 200, 
                 201, 202, 210, 220, 0];
  var reclassed = image.remap(classes, ee.List.sequence(1, classes.length)).clip(roi);
  return reclassed;
};

// Function to add a layer with visualization settings
var addLayer = function(image, name) {
  Map.addLayer(image, {palette: palette}, name, false);
};

// Load and process the 5-year dataset
addLayer(recodeClasses(five_year.mosaic().select('b1')), 'GLC FCS 1985 (ROI)');
addLayer(recodeClasses(five_year.mosaic().select('b2')), 'GLC FCS 1990 (ROI)');
addLayer(recodeClasses(five_year.mosaic().select('b3')), 'GLC FCS 1995 (ROI)');

// Load and process the annual dataset
var image = annual.mosaic().clip(roi);

// Iterate over each year and process
for (var i = 1; i <= 23; i++) {
  var year = 1999 + i; // Starts at year 2000
  var layerName = "GLC FCS " + year.toString() + " (ROI)";
  var band = image.select("b" + i);
  addLayer(recodeClasses(band), layerName);
}

// Define legend details
var dict = {
  "names": [
    "Rainfed cropland", "Herbaceous cover cropland", "Tree or shrub cover (Orchard) cropland",
    "Irrigated cropland", "Open evergreen broadleaved forest", "Closed evergreen broadleaved forest",
    "Open deciduous broadleaved forest (0.15<fc<0.4)", "Closed deciduous broadleaved forest (fc>0.4)",
    "Open evergreen needle-leaved forest (0.15< fc <0.4)", "Closed evergreen needle-leaved forest (fc >0.4)",
    "Open deciduous needle-leaved forest (0.15< fc <0.4)", "Closed deciduous needle-leaved forest (fc >0.4)",
    "Open mixed leaf forest (broadleaved and needle-leaved)", "Closed mixed leaf forest (broadleaved and needle-leaved)",
    "Shrubland", "Evergreen shrubland", "Deciduous shrubland", "Grassland",
    "Lichens and mosses", "Sparse vegetation (fc<0.15)", "Sparse shrubland (fc<0.15)",
    "Sparse herbaceous (fc<0.15)", "Swamp", "Marsh", "Flooded flat", "Saline",
    "Mangrove", "Salt marsh", "Tidal flat", "Impervious surfaces", "Bare areas",
    "Consolidated bare areas", "Unconsolidated bare areas", "Water body",
    "Permanent ice and snow", "Filled value"
  ],
  "colors": [
    "#ffff64", "#ffff64", "#ffff00", "#aaf0f0", "#4c7300", "#006400", "#a8c800",
    "#00a000", "#005000", "#003c00", "#286400", "#285000", "#a0b432", "#788200",
    "#966400", "#964b00", "#966400", "#ffb432", "#ffdcd2", "#ffebaf", "#ffd278",
    "#ffebaf", "#00a884", "#73ffdf", "#9ebb3b", "#828282", "#f57ab6", "#66cdab",
    "#444f89", "#c31400", "#fff5d7", "#dcdcdc", "#fff5d7", "#0046c8", "#ffffff",
    "#ffffff", "#ffffff"
  ]
};

// Create legend panel
var legend = ui.Panel({
  style: {
    position: 'middle-right',
    padding: '8px 15px'
  }
});

// Create legend title
var legendTitle = ui.Label({
  value: 'GLC FCS Classes',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

// Loading message
var loading = ui.Label('Loading legend...', {margin: '2px 0 4px 0'});
legend.add(loading);

// Function to create a legend row
var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });

  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// Add legend entries
var palette = dict['colors'];
var names = dict['names'];
loading.style().set('shown', false);

for (var i = 0; i < names.length; i++) {
  legend.add(makeRow(palette[i], names[i]));
}

// Display legend
print(legend);
// Iterate over each band (year) in the image and export
for (var i = 1; i <= 23; i++) {
  var year = 1999 + i; // Starts at year 2000
  var band = image.select("b" + i); // Select the correct band
  var processedImage = recodeClasses(band);
  
  // Define export parameters
  var task = Export.image.toDrive({
    image: processedImage,
    description: "GLC_FCS_" + year,
    folder: "GLC_FCS_Exports", // Google Drive folder
    fileNamePrefix: "GLC_FCS_" + year,
    scale: 30, // Adjust resolution if needed
    region: roi,
    maxPixels: 1e13,
    fileFormat: "GeoTIFF"
  });

  // Print task details for verification
  print("Exporting GLC FCS for year:", year, task);
}
// Iterate over each band (year) in the image and export
for (var i = 1; i <= 23; i++) {
  var year = 1990 + i; // Starts at year 2000
  var band = image.select("b" + i); // Select the correct band
  var processedImage = recodeClasses(band);
  
  // Define export parameters
  var task = Export.image.toDrive({
    image: processedImage,
    description: "GLC_FCS_" + year,
    folder: "GLC_FCS_Exports", // Google Drive folder
    fileNamePrefix: "GLC_FCS_" + year,
    scale: 30, // Adjust resolution if needed
    region: roi,
    maxPixels: 1e13,
    fileFormat: "GeoTIFF"
  });

  // Print task details for verification
  print("Exporting GLC FCS for year:", year, task);
}
