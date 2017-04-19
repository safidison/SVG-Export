var untitledElements = 0;

function isDuplicate(dataArray, dataObject){
    for (var i = 0; i < dataArray.length; i++){
        if(dataArray[i].height === dataObject.height && dataArray[i].width === dataObject.width && dataArray[i].src === dataObject.src){
            return true;
        }
    }
    return false;
}

function processSVG (element, elementOuterHTML){
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

    return {
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: "data:image/svg+xml;base64,"+window.btoa(elementOuterHTML)
    }

}

function processImg (element, elementOuterHTML){
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

    return {
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: element.src
    };
}

function processObject (element, elementOuterHTML){
    var imageTitle = imageTitle = 'svgexport-'+untitledElements,
        imageWidth = element.clientWidth;
        imageHeight = element.clientHeight;

    return {
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: element.data
    };
}

function getSVGs(callback){
    var elements = document.querySelectorAll('svg, img, object'),
        svgData = [];

    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var elementType = element.localName;
        var elementOuterHTML = element.outerHTML,
            svgObject;
        if(elementType === 'svg') {
            svgObject = processSVG(element, elementOuterHTML);
        } else if (elementType === 'img' && elementOuterHTML.match(/src=['"]\S+\.svg['"]/)) {
            svgObject = processIMG(element, elementOuterHTML);
        } else if(elementType === 'object' && elementOuterHTML.match(/data=['"]\S+\.svg['"]/)) {
            svgObject = processObject(element, elementOuterHTML);
        }

        if(!isDuplicate(svgData, svgObject)){
            svgData.push(svgObject);
        } else if(svgObject.title.indexOf('svgexport-') >= 1) {
            untitledElements--;
        }

    }
    callback(svgData);
}

getSVGs(function (data){
    chrome.runtime.sendMessage({
        svgData: data
    });
});
