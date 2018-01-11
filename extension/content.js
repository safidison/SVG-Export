var untitledElements = 0,
    svgData = [],
    elementsLength = 0,
    currentElement = 0,
    siteOrigin = window.location.origin,
    svgCSSProperties = [
        'stroke',
        'fill',
        'stroke-width'
    ];

function sendData() {
    chrome.runtime.sendMessage({
        svgData: svgData
    });
}

function isDuplicate(dataArray, dataObject) {
    dataArray.forEach(data => {
        if (data.height === dataObject.height && data.width === dataObject.width && data.src === dataObject.src) {
            return true;
        }
    });
    return false;
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }
    ));
}

function colorToHex(color) {
    if (color.substr(0, 1) === '#') {
        return color;
    }

    var rgb = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color).slice(2, 5);

    return rgb.reduce((final, digit) => {
        var hex = Number(digit).toString(16);
        if (hex.length < 2) hex = "0" + hex;
        return final + hex;
    }, '#');
};

function pushIfUnique(svgObject) {
    if (!isDuplicate(svgData, svgObject)) {
        svgData.push(svgObject);
    } else if (svgObject.title.indexOf('svgexport-') === 0) {
        untitledElements--;
    }

    if (currentElement >= elementsLength - 1) {
        sendData();
    }
}

function swapUse(useNode) {
    var link = useNode.getAttributeNS('http://www.w3.org/1999/xlink', 'href');

    if(link.indexOf('#') === 0) {
        var id = link.substring(1),
            parent = useNode.parentNode;
            linkedNode = document.getElementById(id);

        if(useNode.closest("svg") == linkedNode.closest("svg")) return;
        
        var viewBox = linkedNode.getAttribute('viewBox');
        if(viewBox) useNode.closest("svg").setAttribute("viewBox", viewBox);

        var replacementNode;

        if(linkedNode.tagName === 'symbol') {
            var newGroup = document.createElement('g');
            newGroup.innerHTML = linkedNode.innerHTML;
            replacementNode = newGroup;
        } else {
            replacementNode = linkedNode;
        }

        parent.replaceChild(replacementNode, useNode);
    }
}

function inlineCSS(element) {
    if(element.closest('mask') || element.closest('defs')) return;

    var styleElements = window.getComputedStyle(element);

    svgCSSProperties.forEach(property => {
        if(styleElements[property]) {
            var convertedProperty = (styleElements[property] &&  styleElements[property].indexOf('rgb(') === 0) ? colorToHex(styleElements[property]) : styleElements[property];
            element.setAttribute(property, convertedProperty);
            element.style[property] = '';
        }
    });

    element.childNodes.forEach(child => {
        if(child.nodeName !== '#text') inlineCSS(child);
    });
}

function processSVG(element, callback) {
    //Check if it has a use element
    element.querySelectorAll('use').forEach(useNode => swapUse(useNode));

    //Inline child styles
    var elementChildren = element.getElementsByTagName("*");

    for(var i = 0, len = elementChildren.length; i < len; i++) {
        inlineCSS(elementChildren[i]);
    }

    var imageTitle,
        elementOuterHTML = element.outerHTML,
        titleSearch = elementOuterHTML.match(/<title>([\S]+)<\/title>/),
        viewBoxSearch = elementOuterHTML.match(/viewBox="[\.0-9]+ [\.0-9]+ ([\.0-9]+) ([\.0-9]+)"/),
        widthSearch = elementOuterHTML.match(/width="([\.0-9]+)"/),
        heightSearch = elementOuterHTML.match(/height="([\.0-9]+)"/),
        imageWidth = 0,
        imageHeight = 0;

    //Search for title
    if (titleSearch) {
        imageTitle = titleSearch[1];
    } else {
        imageTitle = 'svgexport-' + untitledElements;
        untitledElements++;
    }

    // Search for dimentions in SVG element
    if (widthSearch && heightSearch) {
        imageWidth = widthSearch[1];
        imageHeight = heightSearch[1];
    } else if (viewBoxSearch) {
        imageWidth = viewBoxSearch[1];
        imageHeight = viewBoxSearch[2];
    } else {
        imageWidth = element.clientWidth;
        imageHeight = element.clientHeight;
    }

    //Check for xmlns
    if (elementOuterHTML.indexOf('xmlns') === -1) {
        elementOuterHTML = elementOuterHTML.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    callback({
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: "data:image/svg+xml;base64," + b64EncodeUnicode(elementOuterHTML)
    });

}

function processImg(element, elementOuterHTML, callback) {
    var imageTitle,
        titleSearch = elementOuterHTML.match(/alt=['"]([\S]+)['"]/),
        imageWidth = (element.naturalWidth > 0) ? element.naturalWidth : element.clientWidth,
        imageHeight = (element.naturalHeight > 0) ? element.naturalHeight : element.clientHeight;

    //Search for title
    if (titleSearch) {
        imageTitle = titleSearch[1];
    } else {
        imageTitle = 'svgexport-' + untitledElements;
        untitledElements++;
    }

    callback({
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: element.src
    });
}

function processObject(element, elementOuterHTML, callback) {
    var imageTitle = imageTitle = 'svgexport-' + untitledElements,
        imageWidth = element.clientWidth,
        imageHeight = element.clientHeight;
        untitledElements++;

    callback({
        title: imageTitle,
        width: imageWidth,
        height: imageHeight,
        src: element.data
    });
}

function processBg(element, elementBGURL, callback) {

    var imageObject = {
        title: 'svgexport-' + untitledElements,
        width: (element.naturalWidth > 0) ? element.naturalWidth : element.clientWidth,
        height: (element.naturalHeight > 0) ? element.naturalHeight : element.clientHeight
    };

    untitledElements++;

    if(elementBGURL.slice(-4) === ".svg" || elementBGURL.indexOf('data:image/svg+xml;base64') === 0) {
        imageObject.src = elementBGURL;
        callback(imageObject);
    } else if (elementBGURL.indexOf('data:image/svg+xml;base64') === 0) {
        //imageObject.src = elementBGURL;
    }
}

(function () {
    var elements = document.body.getElementsByTagName('*');
        elementsLength = elements.length;

    for (currentElement = 0; currentElement < elementsLength; currentElement++) {
        var element = elements[currentElement];

        if(element === undefined) continue;

        var elementType = element.localName,
            elementOuterHTML = element.outerHTML,
            elementBGURL = window.getComputedStyle(element)['background-image'];

        elementBGURL = (elementBGURL.indexOf("url(") === 0) ? elementBGURL.slice(5, -2) : null;

        if (elementType === 'svg') {
            processSVG(element, pushIfUnique);
        } else if (elementType === 'img' && elementOuterHTML.match(/src=['"]\S+\.svg['"]/)) {
            processImg(element, elementOuterHTML, pushIfUnique);
        } else if (elementType === 'object' && elementOuterHTML.match(/data=['"]\S+\.svg['"]/)) {
            processObject(element, elementOuterHTML, pushIfUnique);
        } else if (elementBGURL && ((elementBGURL.slice(-4) === ".svg" && elementBGURL.indexOf(siteOrigin) === 0) || elementBGURL.indexOf("data:image/svg+xml") === 0 )) {
            processBg(element, elementBGURL, pushIfUnique);
        } else if (currentElement === elementsLength - 1) {
            sendData();
        }
    }
})();
