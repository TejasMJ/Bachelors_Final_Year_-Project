
var sent = ee.ImageCollection("COPERNICUS/S2");
var trueColour = {
  bands: ["B4", "B3", "B2"],
  min: 0,
  max: 3000
};

// USDA Data Start *****************************************************************
var dataset_usda = ee.ImageCollection('USDA/NASS/CDL')
                  .filter(ee.Filter.date('2018-01-01', '2019-12-31'))
                  .first();
var cropLandcover = dataset_usda.select('cropland');
var image_rice = sent
            .filter(ee.Filter.date('2018-09-01', '2018-10-01'))
            .filterBounds(POI)
            .select(['B4', 'B3', 'B2', 'B8'])
            .sort("CLOUD_COVERAGE_ASSESSMENT")
            .first();
var NDVI_rice = image_rice.expression("(NIR - RED) / (NIR + RED)",
          {
            RED: image_rice.select("B4"),    //  RED
            NIR: image_rice.select("B8"),    // NIR
            BLUE: image_rice.select("B2")    // BLUE
          });
var classNames = Rice.merge(Other).merge(Water).merge(Urban);
var bands = ['B8'];
var training = NDVI_rice.select(bands).sampleRegions({
  collection: classNames,
  properties: ['crop'],
  scale: 30
});


// USDA Data End +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// AAFC Data Start *******************************************************************

var dataset_AAFC = ee.ImageCollection('AAFC/ACI');
var crop2018 = dataset_AAFC
              .filter(ee.Filter.date('2018-01-01', '2018-12-31'))
              .first();
var image_wheat = sent
            .filter(ee.Filter.date('2018-07-01', '2018-08-01'))
            .filterBounds(POI2)
            .select(['B4', 'B3', 'B2', 'B8'])
            .sort("CLOUD_COVERAGE_ASSESSMENT")
            .first();
var NDVI_wheat = image_wheat.expression("(NIR - RED) / (NIR + RED)",
          {
            RED: image_wheat.select("B4"),    //  RED
            NIR: image_wheat.select("B8"),    // NIR
            BLUE: image_wheat.select("B2")    // BLUE
          });
var classNames2 = Wheat.merge(Other2).merge(Water2).merge(Urban2);
var training2 = NDVI_wheat.select(bands).sampleRegions({
  collection: classNames2,
  properties: ['crop'],
  scale: 30
});

// AAFC Data End +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

var lon = ui.Textbox("Enter Here");
var lat = ui.Textbox("Enter Here");
var button = ui.Button("\tGO\t");

// Function Start ********************************************************************
button.onClick(function() {
  Map.clear();
  Map.setCenter(parseFloat(lon.getValue()), parseFloat(lat.getValue()), 10);
  var point = ee.Geometry.Point([parseFloat(lon.getValue()), parseFloat(lat.getValue())]);
  var sDate = new Date(startDate.getValue());
  var eDate = new Date(endDate.getValue());
  var image = sent
//            .filter(ee.Filter.date('2018-09-01', '2018-10-01'))
            .filter(ee.Filter.date(sDate, eDate))
            .filterBounds(point)
            .select(['B[1-8]'])
            .sort("CLOUD_COVERAGE_ASSESSMENT")
            .first();
  Map.addLayer(image, trueColour, 'Sentinel 2');
  var NDVI = image.expression("(NIR - RED) / (NIR + RED)",
          {
            RED: image.select("B4"),    //  RED
            NIR: image.select("B8"),    // NIR
            BLUE: image.select("B2")    // BLUE
          });
  Map.addLayer(NDVI, {min: 0, max: 1}, "NDVI");
  var op1 = ml_classifier.getValue();
  var op2 = crop.getValue();
  var classifier;
  var classified;
  var train;
  var label_layer;
  var classNames2;
  if (op1 == 'CART') {
    if (op2 == 'Rice') {
      train = training;
      label_layer = 'Rice_CART';
    }
    else if (op2 == 'Wheat') {
      train = training2;
      label_layer = 'Wheat_CART';
    }
    classifier = ee.Classifier.cart().train({
      features: train,
      classProperty: 'crop',
      inputProperties: bands
    });
    classified = NDVI.select(bands).classify(classifier);
    Map.addLayer(classified,
    {min: 0, max: 3, palette: ['green', 'yellow', 'blue', 'black']},
    label_layer);
  }
  else if (op1 == 'RF') {
    if (op2 == 'Rice') {
      train = training;
      label_layer = 'Rice_RF';
    }
    else if (op2 == 'Wheat') {
      train = training2;
      label_layer = 'Wheat_RF';
    }
    classifier = ee.Classifier.randomForest().train({
      features: train,
      classProperty: 'crop',
      inputProperties: bands
    });
    classified = NDVI.select(bands).classify(classifier);
    Map.addLayer(classified,
    {min: 0, max: 3, palette: ['green', 'yellow', 'blue', 'black']},
    label_layer);
  }
  else if (op1 == 'SVM') {
    if (op2 == 'Rice') {
      train = training;
      label_layer = 'Rice_SVM';
    }
    else if (op2 == 'Wheat') {
      train = training2;
      label_layer = 'Wheat_SVM';
    }
    classifier = ee.Classifier.svm().train({
      features: train,
      classProperty: 'crop',
      inputProperties: bands
    });
    classified = NDVI.select(bands).classify(classifier);
    Map.addLayer(classified,
    {min: 0, max: 3, palette: ['green', 'yellow', 'blue', 'black']},
    label_layer);
  }
  
  var image2 = image.select(['B[1-8]']).addBands(classified);
  print(image2);
  
  var wl = [0.44, 0.49, 0.56, 0.66, 0.70, 0.74, 0.78, 0.83];
  
  classNames2 = ee.List([op2, 'Other', 'Water', 'Urban']);

  var options = {
    lineWidth: 1,
    pointSize: 2,
    hAxis: {title: 'Wavelength (micrometers)'},
    vAxis: {title: 'Reflectance'},
    title: 'Spectra in classified regions of image',
    series: { 
              0:{color: '#008001', visibleInLegend: true},
              1:{color: '#FFFF00', visibleInLegend: true},
              2:{color: '#0000FE', visibleInLegend: true},
              3:{color: '#000000', visibleInLegend: true}
            }
  };
  
  // Make the chart, set the options.
  var chart = ui.Chart.image.byClass(
      image2, 'classification', image2.geometry(), ee.Reducer.mean(), 500, classNames2, wl)
      .setOptions(options);
  chart_panel.clear();
  chart_panel.add(chart);
  });

// Function End +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

var main_panel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '450px'}
});
var chart_panel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '450px'}
});
main_panel.add(ui.Label("WELCOME", {textAlign: 'center', fontSize: '20px', fontWeight: 'bold'}));
var panel1 = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  widgets: [ui.Label('Enter Latitude : '), lat]
  
});
main_panel.add(ui.Label("Step 1 : Select the place", {fontWeight: 'bold'}));
main_panel.add(panel1);
var panel2 = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  widgets: [ui.Label('Enter Longitude : '), lon]
});
main_panel.add(panel2);

main_panel.add(ui.Label("Step 2 : Enter the dates", {fontWeight: 'bold'}));
main_panel.add(ui.Label("Enter Start Date (YYYY-MM-DD) : "));
var startDate = ui.Textbox("Start Date");
main_panel.add(startDate);

main_panel.add(ui.Label("Enter End Date (YYYY-MM-DD) : "));
var endDate = ui.Textbox("End Date");
main_panel.add(endDate);

main_panel.add(ui.Label("Step 3 : Select the classifier", {fontWeight: 'bold'}));
var ml_classifier = ui.Select(['CART', 'SVM', 'RF'], "Select ML classifier"); 
main_panel.add(ml_classifier);

main_panel.add(ui.Label("Step 4 : Select the crop", {fontWeight: 'bold'}));
var crop = ui.Select(['Rice', 'Wheat'], "Select the crop");
main_panel.add(crop);

main_panel.add(ui.Label("Final step : Classify", {fontWeight: 'bold'}));
main_panel.add(button);
main_panel.add(chart_panel);
ui.root.add(main_panel);
