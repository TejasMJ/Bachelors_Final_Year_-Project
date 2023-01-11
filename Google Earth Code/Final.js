var dataset = ee.ImageCollection('AAFC/ACI');
var crop2018 = dataset
    .filter(ee.Filter.date('2018-01-01', '2018-12-31'))
    .first();
//Map.addLayer(dataset)
//Map.setCenter(-103.8881, 53.0371, 10);
//Map.addLayer(crop2018);
var sen2 = ee.ImageCollection("COPERNICUS/S2");
var image = sen2
    .filter(ee.Filter.date('2019-09-01', '2019-09-30'))
    .filterBounds(bizla)
    .select(['B4', 'B3', 'B2', 'B8'])
    .sort("CLOUD_COVERAGE_ASSESSMENT")
    .first();
var trueColour = {
  bands: ["B4", "B3", "B2"],
  min: 0,
  max: 3000
};
Map.addLayer(image, trueColour);
var NDVI = image.expression("(NIR - RED) / (NIR + RED)",
          {
            RED: image.select("B4"),    //  RED
            NIR: image.select("B8"),    // NIR
            BLUE: image.select("B2")    // BLUE
          });
Map.addLayer(NDVI, {min: 0, max: 1}, "NDVI");