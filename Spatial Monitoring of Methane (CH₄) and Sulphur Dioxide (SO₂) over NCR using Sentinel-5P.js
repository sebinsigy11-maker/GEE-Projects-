
var start = '2025-01-01';
var end   = '2026-01-01';


var delhi = ee.FeatureCollection('projects/modular-design-474605-j6/assets/Delhi');
var noida = ee.FeatureCollection('projects/modular-design-474605-j6/assets/Noida');
var gurugram = ee.FeatureCollection('projects/modular-design-474605-j6/assets/Gurugram');

var region = delhi.merge(noida).merge(gurugram);

Map.centerObject(region, 8);

var ch4 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4')
  .select('CH4_column_volume_mixing_ratio_dry_air')
  .filterDate(start, end)
  .filterBounds(region)
  .mean()
  .clip(region);

var so2 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_SO2')
  .select('SO2_column_number_density')
  .filterDate(start, end)
  .filterBounds(region)
  .mean()
  .clip(region);

var ch4Vis = {
  min: 1750,
  max: 1950,
  palette: [
    '#2c7bb6',
    '#00a6ca',
    '#00ccbc',
    '#90eb9d',
    '#ffff8c',
    '#f29e2e',
    '#d7191c'
  ]
};

var so2Vis = {
  min: 0.00005,
  max: 0.0005,
  palette: [
    '#313695',
    '#74add1',
    '#ffffbf',
    '#f46d43',
    '#a50026'
  ]
};

Map.addLayer(ch4, ch4Vis, 'CH4 Mean 2025');
Map.addLayer(so2, so2Vis, 'SO2 Mean 2025');

var boundaryStyle = {
  color: 'white',
  fillColor: '00000000',
  width: 2
};

Map.addLayer(region.style(boundaryStyle), {}, 'NCR Boundary');

Export.image.toDrive({
  image: ch4,
  description: 'CH4_2025_NCR',
  folder: 'GEE_Exports',
  region: region.geometry(),
  scale: 1000,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: so2,
  description: 'SO2_2025_NCR',
  folder: 'GEE_Exports',
  region: region.geometry(),
  scale: 1000,
  maxPixels: 1e13
});


var ch4Stats = ch4.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: region,
  scale: 1000,
  maxPixels: 1e13
});

var so2Stats = so2.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: region,
  scale: 1000,
  maxPixels: 1e13
});

var statsTable = ee.Feature(null, {
  CH4_mean: ch4Stats.get('CH4_column_volume_mixing_ratio_dry_air'),
  SO2_mean: so2Stats.get('SO2_column_number_density')
});

Export.table.toDrive({
  collection: ee.FeatureCollection([statsTable]),
  description: 'CH4_SO2_2025_Stats',
  fileFormat: 'CSV'
});

var legend = ui.Panel({
  style: {position: 'bottom-left', padding: '8px 15px'}
});

legend.add(ui.Label({
  value: 'Pollution Intensity',
  style: {fontWeight: 'bold', fontSize: '14px'}
}));

function addLegendRow(color, name) {
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
}

legend.add(addLegendRow('#2c7bb6', 'Low'));
legend.add(addLegendRow('#ffff8c', 'Moderate'));
legend.add(addLegendRow('#d7191c', 'High'));

Map.add(legend);
