// This callback function is called when the content script has been
// injected and returned its results

var svgData = [],
    imgType = "svg",
    jpegQuality = 0.8,
    svgList,
    convertionQueue = [];


var _AnalyticsCode = 'UA-38396933-2';

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', _AnalyticsCode, 'auto');
ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
ga('require', 'displayfeatures');
ga('send', 'pageview', '/popup.html');

function sendDownloadEvent(){
  ga('send', 'event', 'SVG', 'download', imgType);
}

//Updates individual SVG element on list
function generateSVGList(action, imgData) {
    var iconImage = (imgType === "jpeg") ? imgData.jpegURL : imgData.pngURL,
        imageName = (imgType === "png" || imgType === "svg") ? imgData.title+'.'+imgType : imgData.title+'.jpg',
        hrefVal;

    switch (imgType) {
      case "png":
        hrefVal = imgData.pngURL;
      break;
      case "jpeg":
        hrefVal = imgData.jpegURL;
      break;
      default:
        hrefVal = imgData.src;
    }

    if(action === "add") {
      svgList.insertAdjacentHTML('beforeend', '<div id="image-'+imgData.id+'"><div class="img-container"><img src="'+iconImage+'" /></div><p>'+imageName+'</p><a href="'+hrefVal+'" download="'+imageName+'" class="download-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" class="icon"/><path fill="none" d="M0 0h24v24H0z"/></svg></a><input type="checkbox" name="include-'+imgData.id+'" id="image-checkbox-'+imgData.id+'" checked="checked"/><label for="image-checkbox-'+imgData.id+'"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="10" viewBox="0 0 14 10"><path fill="#fff" d="M5 10L0 5.19l1.4-1.34L5 7.31 12.6 0 14 1.35 5 10"/></svg></label></div>');

      if(convertionQueue.length > 0){
        var downloadLinks = document.getElementsByClassName('download-link');
        for (var i = 0, len = downloadLinks.length; i < len; i++) {
          downloadLinks[i].addEventListener('click', sendDownloadEvent);
        }
      }
    } else if(action === "update") {
      var imageElement = document.getElementById('image-'+imgData.id),
          downloadLink = imageElement.querySelectorAll('.download-link')[0];

      imageElement.querySelectorAll('.img-container > img')[0].src = iconImage;
      imageElement.querySelectorAll('.img-container + p')[0].innerText = imageName;
      downloadLink.href = hrefVal;
      downloadLink.download = imageName;
    }
}

function generateSVGData(callbackAction, callback){
  if(convertionQueue.length === 0){return;}

  var currentData = convertionQueue[0];
      canvas = document.createElement('canvas');

      canvas.width = currentData.width;
      canvas.height = currentData.height;

      var context = canvas.getContext("2d");

      var image = new Image;
      image.src = currentData.src;
      image.onload = function() {
        context.drawImage(image, 0, 0);
        convertionQueue.shift();

        var convertedData = {
          id: currentData.id,
          title: currentData.title,
          width: currentData.width,
          height: currentData.height,
          pngURL: canvas.toDataURL('image/png'),
          jpegURL: canvas.toDataURL('image/jpeg', jpegQuality),
          src: currentData.src
        };

        svgData.push(convertedData);

        callback(callbackAction, convertedData);

        if(convertionQueue.length > 0){generateSVGData(callbackAction, callback);}
     };
}

//This outputs the displayed SVGs that are received from content.js
function displayReceviedSVGs(receivedData)  {
    originalSVGData = receivedData.svgData;

    if(originalSVGData.length === 0){
        svgList.insertAdjacentHTML('beforeend', "<p class='null-message'>Could not find any SVGs on this site</p>");
    }

    for(var i = 0, len = originalSVGData.length; i < len; i++){
        originalSVGData[i].id = i;
    }

    convertionQueue = originalSVGData.slice();
    generateSVGData("add", generateSVGList);
}

//Handles changing output between PNG, JPEG and SVG
function changeOutputType(event){
    if(event.target.getAttribute("class") === 'active'){return;}

    var settingsElement = document.getElementById('settings');
    event.target.setAttribute('class', 'active');
    imgType = event.target.id;

    if(event.target.id === 'png'){
        document.getElementById('jpeg').setAttribute('class', '');
        document.getElementById('svg').setAttribute('class', '');
        settingsElement.setAttribute('class', 'png');
    } else if(event.target.id === 'jpeg'){
        document.getElementById('png').setAttribute('class', '');
        document.getElementById('svg').setAttribute('class', '');
        settingsElement.setAttribute('class', 'jpeg');
    } else if(event.target.id === 'svg'){
        document.getElementById('png').setAttribute('class', '');
        document.getElementById('jpeg').setAttribute('class', '');
        settingsElement.setAttribute('class', 'svg');
    }

    for(var i = 0, len = svgData.length; i < len; i++){
        generateSVGList("update", svgData[i]);
    }
}

//Handles changing the quality of the JPEG
function changeQuality(event){
    if(event.target.value >= 100){
        jpegQuality = 1;
    } else if(event.target.value <= 0){
        jpegQuality = 0;
    } else {
        jpegQuality = event.target.value/100;
    }

    convertionQueue.length = 0;
    convertionQueue = svgData.slice();
    svgData.length = 0;
    generateSVGData("update", generateSVGList);
}

//For downloading all SVGs that are checked
function downloadSVGs() {
    if(convertionQueue.length > 0){
        setTimeout(function(){
            downloadSVGs();
        },100);
    } else {
        for(var i = 0, len = svgData.length; i < len; i++){
            if(document.getElementById('image-checkbox-'+svgData[i].id).checked){
                document.getElementById('image-'+svgData[i].id).querySelectorAll('a.download-link')[0].click();
                sendDownloadEvent();
            }
        }
    }
}

// When the popup HTML has loaded
window.addEventListener('load', function(evt) {

    svgList = document.getElementById('svg-list');

    document.getElementById('png').addEventListener('click', changeOutputType);
    document.getElementById('jpeg').addEventListener('click', changeOutputType);
    document.getElementById('svg').addEventListener('click', changeOutputType);
    document.getElementById('quality-val').addEventListener('change', changeQuality);

    document.getElementById('download').addEventListener('click', downloadSVGs);

    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
      var currentURL = tabs[0].url;
      if(currentURL.indexOf('chrome://') !== -1 || currentURL.indexOf('chrome-extension://') !== -1 || currentURL.indexOf('chrome.google.com/webstore') !== -1){
        svgList.insertAdjacentHTML('beforeend', "<p class='null-message'>Could not find any SVGs on this site</p>");
      }
    });

    // Get the event page
    chrome.runtime.getBackgroundPage(function(eventPage) {
        // Call the getPageInfo function in the event page, passing in
        // our onPageDetailsReceived function as the callback. This injects
        // content.js into the current tab's HTML
        eventPage.getSVGs(displayReceviedSVGs);
    });
});
