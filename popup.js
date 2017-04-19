// This callback function is called when the content script has been
// injected and returned its results

var svgData = [],
    imgType = "png",
    jpegQuality = 0.8,
    svgList,
    convertionQueue = [];

//Adds individual SVG element to list
function addToSVGList(imgData) {
    svgList.insertAdjacentHTML('beforeend', '<div id="'+imgData.id+'"><div class="img-container"><img src="'+imgData.bitmapURL+'" /></div><p>'+imgData.name+'</p><a href="'+imgData.bitmapURL+'" download="'+imgData.name+'" class="download-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" class="icon"/><path fill="none" d="M0 0h24v24H0z"/></svg></a><input type="checkbox" name="include-'+imgData.id+'" id="checkbox-'+imgData.id+'" checked="checked"/><label for="checkbox-'+imgData.id+'"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="10" viewBox="0 0 14 10"><path fill="#fff" d="M5 10L0 5.19l1.4-1.34L5 7.31 12.6 0 14 1.35 5 10"/></svg></label></div>');
}

//Updates individual SVG element on list
function updateSVGList(imgData) {
    var imageElement = document.getElementById(imgData.id),
        downloadLink = imageElement.querySelectorAll('.download-link')[0];

    imageElement.querySelectorAll('.img-container > img')[0].src = imgData.bitmapURL;
    imageElement.querySelectorAll('.img-container + p')[0].innerText = imgData.name;
    downloadLink.href = imgData.bitmapURL;
    downloadLink.download = imgData.name;
}

//Converts received SVGs to image type that's selected
function convertSVGToBitmap(callback){
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

        callback({
            id: 'image-'+currentData.id,
            bitmapURL: (imgType === "png") ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', jpegQuality),
            name: (imgType === "png") ? currentData.title+'.png' : currentData.title+'.jpg'
        });

        if(convertionQueue.length > 0){convertSVGToBitmap(callback);}
    };
}

//This outputs the displayed SVGs that are received from content.js
function displayReceviedSVGs(receivedData)  {
    svgData = receivedData.svgData;

    if(svgData.length === 0){
        svgList.insertAdjacentHTML('beforeend', "<p class='null-message'>Could not find any SVGs on this site</p>");
    }

    for(var i = 0, len = svgData.length; i < len; i++){
        svgData[i].id = i;
    }
    convertionQueue = svgData.slice();
    convertSVGToBitmap(addToSVGList);
}

//Handles changing output between JPEG and PNG
function changeOutputType(event){
    if(event.target.getAttribute("class") === 'active'){return;}

    var settingsElement = document.getElementById('settings');
    event.target.setAttribute('class', 'active');
    imgType = event.target.id;

    if(event.target.id === 'png'){
        document.getElementById('jpeg').setAttribute('class', '');
        settingsElement.setAttribute('class', 'png');
    } else if(event.target.id === 'jpeg'){
        document.getElementById('png').setAttribute('class', '');
        settingsElement.setAttribute('class', 'jpeg');
    }

    convertionQueue.length = 0;
    convertionQueue = svgData.slice();
    convertSVGToBitmap(updateSVGList);
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
    convertSVGToBitmap(updateSVGList);
}

//For downloading all SVGs that are checked
function downloadSVGs() {
    if(convertionQueue.length > 0){
        setTimeout(function(){
            downloadSVGs();
        },100)
    } else {
        for(var i = 0, len = svgData.length; i < len; i++){
            if(document.getElementById('checkbox-image-'+svgData[i].id).checked){
                document.getElementById('image-'+svgData[i].id).querySelectorAll('a.download-link')[0].click();
            }
        }
    }
}

// When the popup HTML has loaded
window.addEventListener('load', function(evt) {

    svgList = document.getElementById('svg-list');

    document.getElementById('png').addEventListener('click', changeOutputType);
    document.getElementById('jpeg').addEventListener('click', changeOutputType);
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
