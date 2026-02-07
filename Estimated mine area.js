var aoi = ee.Geometry.Polygon([[ 
  [77.841466, 12.762636],
  [78.588295, 12.762636],
  [78.588295, 13.596367],
  [77.841466, 13.596367],
  [77.841466, 12.762636]
]]);

var start = '2023-01-01';
var end   = '2023-12-31';
var s2Scale = 10;
var cloudProbThreshold = 40; // tweak 20-50
var miningThreshold = 0.12;  // tweak per site
var exportFolder = 'GEE_exports';
var exportPrefix = 'kolar_gold_mining_' + start + '_' + end;
var maxPixels = 1e13;

// Print AOI for confirmation
print('AOI (Kolar bbox):', aoi);
Map.centerObject(aoi, 10);
Map.addLayer(aoi, {color: 'ff0000'}, 'Kolar AOI');

// =========================
// Attempt S2_SR + cloud probability; fallback to S2 L1C if needed
// =========================
var s2sr = ee.ImageCollection('COPERNICUS/S2_SR')
             .filterBounds(aoi).filterDate(start, end);

var s2Cloud = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
               .filterBounds(aoi).filterDate(start, end);

print('S2_SR count:', s2sr.size());
print('S2_CLOUD_PROB count:', s2Cloud.size());

// Join S2_SR + cloudprob with saveFirst
var joinFilter = ee.Filter.equals({
  leftField: 'system:time_start',
  rightField: 'system:time_start'
});
var saveFirstJoin = ee.Join.saveFirst('cloudProb');
var s2JoinedSR = saveFirstJoin.apply(s2sr, s2Cloud, joinFilter);

// Safe mask for S2_SR images
function maskS2sr(image) {
  image = ee.Image(image);
  var cloudProbRaw = image.get('cloudProb');
  var cloudProbImage = ee.Image(
    ee.Algorithms.If(cloudProbRaw,
      ee.Image(cloudProbRaw).select('probability'),
      ee.Image(0).rename('probability')
    )
  );
  var scl = ee.Algorithms.If(image.bandNames().contains('SCL'),
                             image.select('SCL'),
                             ee.Image(0).rename('SCL'));
  scl = ee.Image(scl);

  var cloudFromProb = cloudProbImage.gt(cloudProbThreshold);
  var cloudFromSCL = scl.eq(3).or(scl.eq(8)).or(scl.eq(9)).or(scl.eq(10));
  var isCloud = cloudFromProb.or(cloudFromSCL);
  var mask = isCloud.not();

  // ensure bands exist (fallback to zero bands if missing)
  var b2 = ee.Image(ee.Algorithms.If(image.bandNames().contains('B2'), image.select('B2'), ee.Image(0))).rename('B2');
  var b3 = ee.Image(ee.Algorithms.If(image.bandNames().contains('B3'), image.select('B3'), ee.Image(0))).rename('B3');
  var b4 = ee.Image(ee.Algorithms.If(image.bandNames().contains('B4'), image.select('B4'), ee.Image(0))).rename('B4');
  var b8 = ee.Image(ee.Algorithms.If(image.bandNames().contains('B8'), image.select('B8'), ee.Image(0))).rename('B8');
  var b11 = ee.Image(ee.Algorithms.If(image.bandNames().contains('B11'), image.select('B11'), ee.Image(0))).rename('B11');
  var b12 = ee.Image(ee.Algorithms.If(image.bandNames().contains('B12'), image.select('B12'), ee.Image(0))).rename('B12');

  var bands = b2.addBands([b3,b4,b8,b11,b12]).divide(10000);
  return bands.updateMask(mask).copyProperties(image, image.propertyNames());
}

var s2srClean = s2JoinedSR.map(maskS2sr);
print('S2_SR cleaned count:', s2srClean.size());

// Evaluate whether S2_SR produced images; if none, fallback to L1C
s2srClean.size().evaluate(function(c){
  if (c > 0) {
    var s2Med = s2srClean.median().clip(aoi);
    print('Using S2_SR median composite');
    runWorkflow(s2Med);
  } else {
    print('No S2_SR images -> falling back to COPERNICUS/S2 (L1C)');
    // Fallback to L1C
    var s2l1 = ee.ImageCollection('COPERNICUS/S2').filterBounds(aoi).filterDate(start, end);
    print('S2 L1C count:', s2l1.size());
    function maskL1C(img) {
      img = ee.Image(img);
      var names = img.bandNames();
      var masked = ee.Algorithms.If(names.contains('QA60'),
        img.updateMask(img.select('QA60').bitwiseAnd(1<<10).eq(0).and(img.select('QA60').bitwiseAnd(1<<11).eq(0))).divide(10000),
        ee.Algorithms.If(names.contains('MSK_CLASSI_OPAQUE'),
          img.updateMask(img.select('MSK_CLASSI_OPAQUE').eq(0).and(img.select('MSK_CLASSI_CIRRUS').eq(0))).divide(10000),
          img.divide(10000)
        )
      );
      masked = ee.Image(masked);
      var b2 = ee.Image(ee.Algorithms.If(names.contains('B2'), img.select('B2'), ee.Image(0))).rename('B2');
      var b3 = ee.Image(ee.Algorithms.If(names.contains('B3'), img.select('B3'), ee.Image(0))).rename('B3');
      var b4 = ee.Image(ee.Algorithms.If(names.contains('B4'), img.select('B4'), ee.Image(0))).rename('B4');
      var b8 = ee.Image(ee.Algorithms.If(names.contains('B8'), img.select('B8'), ee.Image(0))).rename('B8');
      var b11 = ee.Image(ee.Algorithms.If(names.contains('B11'), img.select('B11'), ee.Image(0))).rename('B11');
      var b12 = ee.Image(ee.Algorithms.If(names.contains('B12'), img.select('B12'), ee.Image(0))).rename('B12');
      return b2.addBands([b3,b4,b8,b11,b12]).divide(10000).copyProperties(img, img.propertyNames());
    }
    var s2l1Clean = s2l1.map(maskL1C);
    s2l1Clean.size().evaluate(function(cnt){
      if (cnt > 0) {
        var s2MedL1 = s2l1Clean.median().clip(aoi);
        print('Using S2 L1C median composite');
        runWorkflow(s2MedL1);
      } else {
        print('ERROR: No Sentinel-2 (SR or L1C) images found for AOI/date. Try widening date range.');
      }
    });
  }
});

// =========================
// Main workflow using a valid s2Med image
// =========================
function runWorkflow(s2MedImage) {
  var s2Med = ee.Image(s2MedImage);
  print('s2Med bands:', s2Med.bandNames());

  // Check B8 present
  s2Med.bandNames().contains('B8').evaluate(function(hasB8){
    if (!hasB8) {
      print('ERROR: s2Med has no B8 band. Aborting.');
      return;
    }

    // Sentinel-1 processing (VV & VH) -> dB approx
    var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
               .filterBounds(aoi).filterDate(start, end)
               .filter(ee.Filter.eq('instrumentMode','IW'))
               .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
               .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'))
               .select(['VV','VH'])
               .map(function(img){
                 var vv = img.select('VV').log10().multiply(10.0);
                 var vh = img.select('VH').log10().multiply(10.0);
                 return vv.addBands(vh);
               });

    var s1Med = s1.median().clip(aoi).unmask();

    // Indices
    var ndvi = s2Med.normalizedDifference(['B8','B4']).rename('NDVI');
    var ndbi = s2Med.normalizedDifference(['B11','B8']).rename('NDBI');
    var bsi = s2Med.expression(
      '((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))',
      {
        'SWIR1': s2Med.select('B11'),
        'RED':   s2Med.select('B4'),
        'NIR':   s2Med.select('B8'),
        'BLUE':  s2Med.select('B2')
      }).rename('BSI');

    var vv = s1Med.select('VV');
    var vh = s1Med.select('VH');
    var vv_vh = vv.divide(vh.add(1e-6)).rename('VV_VH_ratio');

    var dem = ee.Image('USGS/SRTMGL1_003').clip(aoi);
    var slope = ee.Terrain.slope(dem).rename('slope');

    // Heuristic score
    var score = bsi.multiply(0.4)
                 .add(ndbi.multiply(0.25))
                 .add(vv_vh.multiply(0.25))
                 .subtract(ndvi.multiply(0.4))
                 .rename('gold_mining_score');

    // Mask & threshold
    var minedMask = score.gt(miningThreshold).and(slope.lt(30)).selfMask().rename('minedMask');

    // Visualize
    Map.addLayer(s2Med, {bands:['B4','B3','B2'], min:0, max:0.3}, 'S2 RGB (median)');
    Map.addLayer(ndvi, {min:-1, max:1, palette:['white','green']}, 'NDVI');
    Map.addLayer(bsi, {min:-1, max:1, palette:['brown','white','blue']}, 'BSI');
    Map.addLayer(vv_vh, {min:0.5, max:3, palette:['white','purple','black']}, 'VV/VH ratio');
    Map.addLayer(score, {min:-0.5, max:0.8, palette:['blue','white','red']}, 'Gold mining score');
    Map.addLayer(minedMask, {palette:['red']}, 'Potential mined areas (mask)');

    // Area (ha)
    var pixelArea = ee.Image.pixelArea();
    var minedAreaImage = pixelArea.updateMask(minedMask);
    var minedArea = minedAreaImage.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: aoi,
      scale: s2Scale,
      maxPixels: maxPixels
    });

    minedArea.evaluate(function(res){
      if (res && res.area) {
        var ha = res.area / 10000.0;
        print('Estimated mined area (ha) in AOI:', ha);
      } else {
        print('No mined pixels detected or reduceRegion returned nothing.');
      }
    });

    // Prepare export image (RGB + NDVI + BSI + score + minedMask)
    var outImage = s2Med.select(['B4','B3','B2'])
                  .addBands([ndvi.rename('NDVI'), bsi.rename('BSI'), score.rename('gold_mining_score'), minedMask.rename('minedMask')])
                  .toFloat();

    Export.image.toDrive({
      image: outImage,
      description: exportPrefix + '_export',
      folder: exportFolder,
      fileNamePrefix: exportPrefix,
      region: aoi,
      scale: s2Scale,
      crs: 'EPSG:4326',
      maxPixels: maxPixels
    });

    print('Export task created — check Tasks panel to run it.');
  }); // end hasB8 evaluate
} // end runWorkflow
