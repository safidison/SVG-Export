var untitledElements = 0,
    svgData = [],
    elementsLength = 0,
    currentElement = 0;

function sendData() {
  chrome.runtime.sendMessage({
      svgData: svgData
  });
}

function isDuplicate(dataArray, dataObject) {
    for (var i = 0; i < dataArray.length; i++){
        if(dataArray[i].height === dataObject.height && dataArray[i].width === dataObject.width && dataArray[i].src === dataObject.src){
            return true;
        }
    }
    return false;
}

function pushIfUnique(svgObject) {
  if(!isDuplicate(svgData, svgObject)){
      svgData.push(svgObject);
  } else if(svgObject.title.indexOf('svgexport-') >= 1) {
      untitledElements--;
  }

  if(currentElement >= elementsLength-1){
    sendData();
  }

}

function processSVG (element, elementOuterHTML, callback){
    var imageTitle,
        titleSearch = elementOuterHTML.match(/<title>([\S]+)<\/title>/),
        viewBoxSearch = elementOuterHTML.match(/viewBox="[\.0-9]+ [\.0-9]+ ([\.0-9]+) ([\.0-9]+)"/),
        widthSearch = elementOuterHTML.match(/width="([\.0-9]+)"/),
        heightSearch = elementOuterHTML.match(/height="([\.0-9]+)"/),
        imageWidth = 0,
        imageHeight = 0;

    //Search for title
    if(titleSearch){
        imageTitle = titleSearch[1];
    } else {
        imageTitle = 'svgexport-'+untitledElements;
        untitledElements++;
    }

    // Search for dimentions in SVG element
    if(viewBoxSearch){
        imageWidth = viewBoxSearch[1];
        imageHeight = viewBoxSearch[2];
    } else if(widthSearch && heightSearch){
        imageWidth = elementOuterHTML.match(/width="([\.0-9]+)"/)[1];
        imageHeight = elementOuterHTML.match(/height="([\.0-9]+)"/)[1];
    } else {
        imageWidth = element.clientWidth;
        imageHeight = element.clientHeight;
    }

    //Check for xmlns
    if(elementOuterHTML.indexOf('xmlns') === -1){
      elementOuterHTML = elementOuterHTML.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    callback({
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: "data:image/svg+xml;base64,"+window.btoa(elementOuterHTML)
    });

}

function processImg (element, elementOuterHTML, callback){
    var imageTitle,
        titleSearch = elementOuterHTML.match(/alt=['"]([\S]+)['"]/),
        imageWidth = (element.naturalWidth > 0) ? element.naturalWidth : element.clientWidth;
        imageHeight = (element.naturalHeight > 0) ? element.naturalHeight : element.clientHeight;

    //Search for title
    if(titleSearch){
        imageTitle = titleSearch[1];
    } else {
        imageTitle = 'svgexport-'+untitledElements;
        untitledElements++;
    }

    callback({
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: element.src
    });
}

function processObject (element, elementOuterHTML, callback){
    var imageTitle = imageTitle = 'svgexport-'+untitledElements,
        imageWidth = element.clientWidth;
        imageHeight = element.clientHeight;

    callback({
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: element.data
    });
}

(function (){
    var elements = document.querySelectorAll('svg, img, object');
        elementsLength = elements.length;

    for (currentElement = 0; currentElement < elementsLength; currentElement++) {

        var element = elements[currentElement];
        var elementType = element.localName;
        var elementOuterHTML = element.outerHTML;

        if(elementType === 'svg') {
            processSVG(element, elementOuterHTML, pushIfUnique);
        } else if (elementType === 'img' && elementOuterHTML.match(/src=['"]\S+\.svg['"]/)) {
            processIMG(element, elementOuterHTML, pushIfUnique);
        } else if(elementType === 'object' && elementOuterHTML.match(/data=['"]\S+\.svg['"]/)) {
            processObject(element, elementOuterHTML, pushIfUnique);
        } else if(currentElement === elementsLength-1) {
          sendData();
        }
    }
})();
