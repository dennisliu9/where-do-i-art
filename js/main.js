/* global data, metadata */

//           //
// variables //
//           //

var metEndpoint = 'https://collectionapi.metmuseum.org/public/collection/v1/';
var metDepts = [];
var metSearchResults = {};
var metArtObj = {};
var artObjCache = [];
var cacheItemsNum = 10;
var maxRetries = 20;
var displayArtObj = {};
var nextArtObj = {};
var searchType = 'random';
var similarNumOfProperties = 1; // for simplicity, sticking with 1 value from 1 department from now
var similarNumOfValues = 1;
var loaderTimerId;
var deleteMode = false;
var deleteModeInfoBoxTimerId;
var spinnerColorSchemes = [
  ['#53bf9d', '#f94c66', '#bd4291', '#ffc54d'],
  ['#480032', '#005792', '#FC92E3', '#F2F4C3'],
  ['#99B898', '#FECEAB', '#FF847C', '#E84A5F'],
  ['#F39DE5', '#9B77DA', '#4E6B9F', '#6FA5B1'],
  ['#41D3BD', '#FFFFF2', '#791E94', '#DE6449'],
  ['#151515', '#E7441C', '#0363A6', '#F9A102']
];

// DOM objects
var $topLogo = document.querySelector('#top-logo');
var $mainAppArea = document.querySelector('#main-app-area');

var $showSomething = document.querySelector('#show-something');
var $displayImage = document.querySelector('#display-image');
var $dislikeButton = document.querySelector('#dislike-button');
var $likeButton = document.querySelector('#like-button');
var $imageLoader = document.querySelector('#image-loader-container');

var $bottomSheet = document.querySelector('#bottom-sheet');
var $bottomSheetHeader = document.querySelector('#bottom-sheet-header');
var $bottomSheetGallery = document.querySelector('#bottom-sheet-gallery');
var $bottomSheetHeaderText = document.querySelector('#bottom-sheet-header-text');
var $bottomSheetButtons = document.querySelector('#bottom-sheet-buttons');
var $bottomSheetExpandButton = document.querySelector('#bottom-sheet-expand-button');
var $bottomSheetDeleteModeButton = document.querySelector('#bottom-sheet-delete-mode-button');

var $detailModalContainer = document.querySelector('#detail-container');
var $detailModalImage = document.querySelector('#detail-image');

var $deleteModalContainer = document.querySelector('#delete-container');
var $deleteModalImage = document.querySelector('#delete-image');
var $deletingGalleryImage;
var $deleteConfirmButton = document.querySelector('#delete-confirm-button');
var $deleteModeInfoBox = document.querySelector('#delete-mode-info');

var $artPlacardToggleButton = document.querySelector('#art-placard-toggle-button');
var $artPlacard = document.querySelector('#art-placard');

var $searchTypeChipsContainer = document.querySelector('#search-type-chips');

//                                            //
// event listeners (that aren't in functions) //
//                                            //

$topLogo.addEventListener('click', function (event) {
  swapView(event.target.dataset.viewLink);
});

$showSomething.addEventListener('click', function (event) {
  if ($showSomething.classList.contains('button-main-disabled')) {
    return;
  }
  swapView(event.target.dataset.viewLink);
  for (var i = 1; i <= cacheItemsNum; i++) {
    getArtwork(false, searchType);
  }
});

$dislikeButton.addEventListener('click', function (event) {
  event.preventDefault();
  if ($dislikeButton.classList.contains('button-main-disabled')) {
    return;
  }
  if (artObjCache.length === 0) {
    return;
  }
  data.dislikedObjects.push(displayArtObj);
  nextArtObj = artObjCache.shift();
  getArtwork(false, searchType);
  setImage(nextArtObj);
});

$likeButton.addEventListener('click', function (event) {
  event.preventDefault();
  if ($likeButton.classList.contains('button-main-disabled')) {
    return;
  }
  if (artObjCache.length === 0) {
    return;
  }
  data.likedObjects.push(displayArtObj);
  addObjToMetadata(displayArtObj, 'likedMetadata');
  appendImageToGallery(renderImage(displayArtObj), $bottomSheetGallery);
  nextArtObj = artObjCache.shift();
  getArtwork(false, searchType);
  setImage(nextArtObj);
});

$bottomSheetHeader.addEventListener('click', function (event) {
  if (['close', 'expand_more'].includes(event.target.textContent.trim()) && event.target.tagName !== 'DIV') {
    // close bottom sheet
    $bottomSheet.classList.add('light-round-border');
    $bottomSheet.classList.add('drop-shadow-up');
    $bottomSheet.classList.add('minimized');
    $bottomSheet.classList.add('no-scroll');
    $bottomSheet.classList.remove('inner-scroll');
    $bottomSheetButtons.classList.add('invisible');
    $bottomSheetExpandButton.textContent = 'expand_less';
    $mainAppArea.classList.remove('no-scroll');
    $mainAppArea.classList.add('inner-scroll');
    toggleDeleteMode(false);
  } else if (['delete_forever'].includes(event.target.textContent.trim())) {
    // turn on delete mode
    clearTimeout(deleteModeInfoBoxTimerId);
    toggleDeleteMode();
    // show info box and set timer to hide it
    $deleteModeInfoBox.classList.remove('invisible');
    $deleteModeInfoBox.textContent = updateDeleteInfoBox();
    deleteModeInfoBoxTimerId = setTimeout(hideDeleteModeInfoBox, 1000);
  } else {
    // open bottom sheet
    $bottomSheet.classList.remove('light-round-border');
    $bottomSheet.classList.remove('drop-shadow-up');
    $bottomSheet.classList.remove('minimized');
    $bottomSheet.classList.remove('no-scroll');
    $bottomSheet.classList.add('inner-scroll');
    $bottomSheetButtons.classList.remove('invisible');
    $bottomSheetExpandButton.textContent = 'expand_more';
    $mainAppArea.classList.add('no-scroll');
    $mainAppArea.classList.remove('inner-scroll');
  }
});

window.addEventListener('click', handleImageClick);

$artPlacardToggleButton.addEventListener('click', toggleArtPlacard);

$deleteConfirmButton.addEventListener('click', function (event) {
  // Move object from data.likedObjects to data.dislikedObjects
  var idxOfDeletion = data.likedObjects.indexOf(data.deleting);
  var deleteObj = data.likedObjects.splice(idxOfDeletion, 1)[0];
  data.dislikedObjects.push(deleteObj);
  $deletingGalleryImage.remove();
  data.deleting = null;
  $deletingGalleryImage = null;
  $deleteModalContainer.classList.add('hidden');
});

$searchTypeChipsContainer.addEventListener('click', handleSelectionChipClick);

window.addEventListener('offline', () => {
  window.alert('It looks like you\'re offline! Please check your connection and try again.');
});

// If image URL leads to 404, dislike and move to the next
$displayImage.addEventListener('error', () => {
  data.dislikedObjects.push(displayArtObj);
  if (artObjCache.length === 0) {
    getArtwork(true, searchType);
    return;
  }
  nextArtObj = artObjCache.shift();
  getArtwork(false, searchType);
  setImage(nextArtObj);
});

$displayImage.addEventListener('load', () => {
  if ($displayImage.getAttribute('src') === 'images/imageplaceholder.PNG') {
    return;
  }
  clearTimeout(loaderTimerId);
  enableLikeButtons(true);
});

//           //
// functions //
//           //

function startup() {
  // Set random color scheme for spinner
  var spinnerScheme = spinnerColorSchemes[Math.floor(Math.random() * spinnerColorSchemes.length)];
  var $root = document.documentElement;
  $root.style.setProperty('--spinner-color-1', spinnerScheme[0]);
  $root.style.setProperty('--spinner-color-2', spinnerScheme[1]);
  $root.style.setProperty('--spinner-color-3', spinnerScheme[2]);
  $root.style.setProperty('--spinner-color-4', spinnerScheme[3]);

  enableLikeButtons(false);

  renderAllLiked();
  addAllToMetadata(data.likedObjects, 'likedMetadata');

  // Get departments, assuming departments will not change in single session
  // (but may change in the future)
  var getMetDeptsRequest = getMetDepartments();
  getMetDeptsRequest.addEventListener('load', function (event) {
    metDepts = getMetDeptsRequest.response.departments;

    // Enable start button once departments have been received
    $showSomething.classList.add('button-main');
    $showSomething.classList.add('bg-color-accent');
    $showSomething.classList.add('color-white');
    $showSomething.setAttribute('data-view-link', 'selection');
    $showSomething.textContent = 'Show me something!';
    $showSomething.classList.remove('button-main-disabled');

    // Pull first image to be shown immediately
    getArtwork(true, searchType);
  });
  getMetDeptsRequest.send();
}

function swapView(dataView) {
  var $views = document.querySelectorAll('[data-view]');
  for (var vwIdx = 0; vwIdx < $views.length; vwIdx++) {
    if ($views[vwIdx].dataset.view === dataView) {
      $views[vwIdx].classList.remove('hidden');
    } else {
      $views[vwIdx].classList.add('hidden');
    }
  }
}

function shuffleArray(array) {
  // Fisher–Yates shuffle, guide from https://bost.ocks.org/mike/shuffle/
  var arrayCopy = array.slice();
  var m = arrayCopy.length;
  var i;
  var t;

  while (m > 0) {
    i = Math.floor(Math.random() * m--);
    t = arrayCopy[m];
    arrayCopy[m] = arrayCopy[i];
    arrayCopy[i] = t;
  }

  return arrayCopy;
}

function enableLikeButtons(enable) {
  // Allow/disallow users to interact with shown image
  if (enable) {
    $likeButton.classList.add('button-main');
    $dislikeButton.classList.add('button-main');
    $likeButton.classList.remove('button-main-disabled');
    $dislikeButton.classList.remove('button-main-disabled');
    $imageLoader.classList.add('hidden');
  } else if (!enable) {
    $likeButton.classList.add('button-main-disabled');
    $dislikeButton.classList.add('button-main-disabled');
    $likeButton.classList.remove('button-main');
    $dislikeButton.classList.remove('button-main');
    $imageLoader.classList.remove('hidden');
  }
}

//                                //
// Metropolitan Museum of Art API //
//                                //

function getMetDepartments() {
  var deptXhr = new XMLHttpRequest();
  deptXhr.open('GET', metEndpoint + 'departments');
  deptXhr.responseType = 'json';

  return deptXhr;
}

// Functions for searching and returning art objects

function metSearch(deptId, specificURL) {
  // returns configured XHR, but still waiting for onload function and sending
  // if specificURL is supplied, deptID has no effect
  var getUrl = '';
  if (specificURL !== undefined) {
    getUrl = specificURL;
  } else {
    getUrl = metEndpoint + 'objects?departmentIds=' + deptId;
  }
  getUrl = getUrl.replace(' ', '%20');
  var searchXhr = new XMLHttpRequest();
  searchXhr.open('GET', getUrl);
  searchXhr.responseType = 'json';

  return searchXhr;
}

function metAcquireArt(objectId) {
  // returns configured XHR, but still waiting for onload function and sending
  var acquireXhr = new XMLHttpRequest();
  acquireXhr.open('GET', metEndpoint + 'objects/' + objectId);
  acquireXhr.responseType = 'json';

  return acquireXhr;
}

function handleAcquireResponse(acquireRequest, isStart, searchResultsIdx, searchRequest, areResultsShuffled, deptId) {
  /*
  Variable sources:
  acquireRequest - passed in from handleSearchResponse()
  searchRequest - passed in from handleSearchResponse() from getArtwork()
  searchResultsIdx - passed in from handleSearchResponse() from getArtwork()
  isStart - passed in from handleSearchResponse() from getArtwork()
  metArtObj - global
  data - global
  artObjCache - global
  */
  metArtObj = acquireRequest.response;

  if (deptId === -1) {
    // Backfill deptId if possible
    if (data.departmentLookup[metArtObj.department] !== undefined) {
      metArtObj.departmentId = data.departmentLookup[metArtObj.department];
    } else {
      metArtObj.departmentId = -1;
    }
  } else {
    metArtObj.departmentId = deptId;
    // Add department and departmentID to lookup object, because these end up differing from metDepts
    // This is assuming a department name is only ever associated with one departmentID (unverified assumption)
    if (data.departmentLookup[metArtObj.department] === undefined) {
      data.departmentLookup[metArtObj.department] = deptId;
    }
  }

  if (metArtObj.primaryImage !== '') {
    if (isStart) {
      // If this is the first time running, go straight to showing it rather than caching it
      setImage(metArtObj);
    } else {
      // put new objects at the front so effects of changing selectType start taking place sooner
      // (artObjCache has stack-like behavior)
      artObjCache.unshift(metArtObj);

      (artObjCache.length > 2) ? enableLikeButtons(true) : enableLikeButtons(false);
    }
  } else {
    searchResultsIdx++;
    handleSearchResponse(searchRequest, searchResultsIdx, isStart, areResultsShuffled, deptId); // This will use the new value of searchResultsIdx since handleSearchResponse calls searchResultsIdx from a higher scope than itself
  }
}

function handleSearchResponse(searchRequest, searchResultsIdx, isStart, areResultsShuffled, deptId) {
  /*
  Variable sources:
  searchRequest - passed in from getArtwork()
  searchResultsIdx - passed in from getArtwork()
  isStart - pass in from getArtwork()
  currentObjId - created in this function
  acquireRequest - created in this function
  metSearchResults - global
  data - global
  */
  metSearchResults = searchRequest.response;

  // objectIDs is null when there are 0 results
  if (metSearchResults.objectIDs === null) {
    getArtwork(false, searchType);
    // exit out of the function call because this metSearchResults is no longer useful
    return;
  }

  if (areResultsShuffled === false) {
    metSearchResults.objectIDs = shuffleArray(metSearchResults.objectIDs);
    areResultsShuffled = true;
  }

  var currentObjId = metSearchResults.objectIDs[searchResultsIdx];

  // Skip artwork that has already been shown
  while (data.shownObjectIds.includes(currentObjId) && searchResultsIdx < metSearchResults.objectIDs.length) {
    searchResultsIdx++;
    currentObjId = metSearchResults.objectIDs[searchResultsIdx];
  }

  // If we exhausted the list of id's, pull again
  // If we have a department with many consecutive no-image IDs on first
  // image pull, then start a new search after maxRetries attempts
  // (only on isStart, finding these IDs during caching is desired)
  if (searchResultsIdx >= metSearchResults.objectIDs.length || (isStart && searchResultsIdx >= maxRetries)) {
    getArtwork(isStart, searchType);
    return;
  }

  var acquireRequest = metAcquireArt(currentObjId);
  data.shownObjectIds.push(currentObjId);
  acquireRequest.addEventListener('load', function (event) {
    handleAcquireResponse(acquireRequest, isStart, searchResultsIdx, searchRequest, areResultsShuffled, deptId);
  });
  acquireRequest.send();
}

function getArtwork(isStart, searchType) {
  /*
  getArtwork:
    (runs when any of the three main buttons are clicked)
  This function calls the functions that get artwork and put them into the artObjCache
  if they have an accessible URL. When isStart=true, the artwork will be immediately displayed
  and not put into artObjCache
  */
  if (artObjCache.length >= cacheItemsNum) {
    return;
  }

  var searchRequest;
  var deptId;
  if (searchType === 'similar') {
    var similarURL = generateSearchURL(similarNumOfProperties, similarNumOfValues);
    deptId = -1;
    searchRequest = metSearch(deptId, similarURL);
  } else {
    var randDeptIdx = Math.floor(Math.random() * metDepts.length);
    // Department id's are not continuous, some are missing (from 1 - 21, 2 and 20 are missing). Access by index
    deptId = metDepts[randDeptIdx].departmentId;
    searchRequest = metSearch(deptId);
  }

  var searchResultsIdx = 0;
  var areResultsShuffled = false;
  searchRequest.addEventListener('load', function (event) {
    handleSearchResponse(searchRequest, searchResultsIdx, isStart, areResultsShuffled, deptId);
  });
  searchRequest.send();
}

function addImageToImg(artObj, $img, requestFullSize) {
  var objectName = (artObj.objectName === '') ? 'Untitled' : artObj.objectName;
  var artistName = (artObj.artistDisplayName === '') ? 'Unknown' : artObj.artistDisplayName;
  var objectDate = (artObj.objectDate === '') ? 'Unknown Date' : String(artObj.objectDate);
  var altString = objectName + ' by ' + artistName + ' (' + objectDate + ')';

  if (requestFullSize) {
    $img.setAttribute('src', artObj.primaryImage);
  } else {
    $img.setAttribute('src', artObj.primaryImageSmall);
  }
  $img.setAttribute('alt', altString);
  $img.setAttribute('objectId', artObj.objectID);
}

function setImage(artObj) {
  // Disable the buttons and show the loader as the image gets updated
  // Set timer so loader only appears on cases where image loads slowly
  loaderTimerId = setTimeout(() => enableLikeButtons(false), 200);
  // displayArtObj holds the data for the image being decided on
  displayArtObj = artObj;
  addImageToImg(artObj, $displayImage);
}

function renderImage(artObj) {
  var $imageContainer = document.createElement('div');
  $imageContainer.className = 'img-gallery-container col-1-3 flex-col jc-center ai-center';
  $imageContainer.setAttribute('data-objectid', artObj.objectID);

  var $image = document.createElement('img');
  addImageToImg(artObj, $image);

  $imageContainer.appendChild($image);

  // Light up gallery text on add
  $bottomSheetHeaderText.classList.add('color-flash');
  setTimeout(function () {
    $bottomSheetHeaderText.classList.remove('color-flash');
  }, 250);

  return $imageContainer;
}

function appendImageToGallery($imgContainer, $gallery) {
  $gallery.prepend($imgContainer);
}

function renderAllLiked() {
  // Function to append all liked images to the gallery
  $bottomSheetGallery.replaceChildren();

  for (var i = 0; i < data.likedObjects.length; i++) {
    var $imageContainer = renderImage(data.likedObjects[i]);
    appendImageToGallery($imageContainer, $bottomSheetGallery);
  }
}

function handleImageClick(event) {
  if (event.target.tagName === 'IMG' && !['detail-image', 'delete-image'].includes(event.target.id)) {
    // In theory, Delete Mode cannot be active when the bottom sheet is closed
    // We don't need to worry about clicking display-image when Delete Mode is on
    if (deleteMode === false) {
      // Delete Mode off, show detail modal
      if (event.target.id === 'display-image') {
        // Clicked on the image being decided
        data.viewingInDetail = displayArtObj;
      } else {
        // Clicked on an image in the Likes gallery
        for (var i = 0; i < data.likedObjects.length; i++) {
          if (String(data.likedObjects[i].objectID) === String(event.target.getAttribute('objectId'))) {
            data.viewingInDetail = data.likedObjects[i];
            break;
          }
        }
      }
      // Setting requestFullSize to false, images are VERY large
      addImageToImg(data.viewingInDetail, $detailModalImage, false);
      addArtPlacard(data.viewingInDetail);
      $detailModalContainer.classList.remove('hidden');
    } else if (deleteMode === true) {
      // Delete Mode on, show delete modal

      // Put the selected image's data into data.deleting
      for (var d = 0; d < data.likedObjects.length; d++) {
        if (String(data.likedObjects[d].objectID) === String(event.target.getAttribute('objectId'))) {
          data.deleting = data.likedObjects[d];
          break;
        }
      }

      // Point delete img to the selected image's url
      addImageToImg(data.deleting, $deleteModalImage, false);
      $deleteModalContainer.classList.remove('hidden');
      $deletingGalleryImage = event.target.closest('div');
    }
  // Something other than an image (excl detail-image) was clicked
  } else if (data.viewingInDetail !== null && event.target.tagName === 'DIV') {
    // If the detail modal is open and anything other than the image or one of the text elements was clicked, close the detail modal
    $detailModalContainer.classList.add('hidden');
    data.viewingInDetail = null;
  } else if (event.target.id === 'detail-image') {
    // Detail image was clicked, open the full res in a new window/tab
    this.window.open(data.viewingInDetail.primaryImage, '_blank');
  } else if (event.target.id === 'delete-overlay' || event.target.id === 'delete-cancel-button') {
    // Close the delete modal
    $deleteModalContainer.classList.add('hidden');
    data.deleting = null;
    $deletingGalleryImage = null;
  } else if (event.target.id === 'delete-image') {
    // Image to be deleted was clicked, show user high res to decide
    this.window.open(data.deleting.primaryImage, '_blank');
  }
}

function handleSelectionChipClick(event) {
  if (event.target.tagName !== 'BUTTON') {
    return;
  }
  searchType = event.target.dataset.searchType;

  for (var i = 0; i < $searchTypeChipsContainer.children.length; i++) {
    if (event.target === $searchTypeChipsContainer.children[i]) {
      $searchTypeChipsContainer.children[i].classList.add('chips-main-selected');
    } else {
      $searchTypeChipsContainer.children[i].classList.remove('chips-main-selected');
    }
  }
}

function addObjToMetadata(artObj, metadataProperty) {
  for (var artProperty in metadata[metadataProperty]) {
    var likedMetadataPropertyObj;
    var newValue;
    // handle nested geoLocation properties
    if (artProperty === 'geoLocation') {
      for (var geoProperty in metadata[metadataProperty].geoLocation) {
        likedMetadataPropertyObj = metadata[metadataProperty].geoLocation[geoProperty];
        newValue = artObj[geoProperty];
        if (newValue === '') {
          newValue = 'null';
        }
        if (newValue in likedMetadataPropertyObj) {
          likedMetadataPropertyObj[newValue] += 1;
        } else {
          likedMetadataPropertyObj[newValue] = 1;
        }
      }
    } else if (artProperty === 'date') {
      for (var dateProperty in metadata[metadataProperty].date) {
        likedMetadataPropertyObj = metadata[metadataProperty].date[dateProperty];
        newValue = artObj[dateProperty];
        if (newValue === '') {
          newValue = 'null';
        }
        if (newValue in likedMetadataPropertyObj) {
          likedMetadataPropertyObj[newValue] += 1;
        } else {
          likedMetadataPropertyObj[newValue] = 1;
        }
      }
    } else {
      likedMetadataPropertyObj = metadata[metadataProperty][artProperty]; // object storing possible values as keys, counts as values, e.g. {true: 0, false: 0}
      newValue = String(artObj[artProperty]); // value of current property in the passed in artObj, e.g. "Vincent van Gogh"
      if (newValue === '') {
        newValue = 'null';
      }

      if (newValue in likedMetadataPropertyObj) {
        likedMetadataPropertyObj[newValue] += 1;
      } else {
        likedMetadataPropertyObj[newValue] = 1;
      }
    }
  }
}

function getSearchTerms(numProps) {
  var searchParams = [];
  var availableParams = Object.keys(metadata.likedMetadata);
  availableParams = shuffleArray(availableParams);
  searchParams = availableParams.slice(0, numProps);

  return searchParams;
}

function getSearchValues(searchParams, numVals) {
  // Currently specific to likedMetadata only
  var searchVals = {};
  for (var i = 0; i < searchParams.length; i++) {
    var fullValues = [];
    var currentSearchParam = searchParams[i]; // e.g. currentSearchParam = 'artistDisplayName'
    var paramVal;
    var j;

    // If we selected geoLocation, we want to use a specific kind of geoLocation (city, country, region, etc)
    if (currentSearchParam === 'geoLocation') {
      currentSearchParam = shuffleArray(Object.keys(metadata.likedMetadata.geoLocation))[0];
    }

    // If we selected date, use either dateBegin or dateEnd
    if (currentSearchParam === 'date') {
      currentSearchParam = (Math.random() < 0.5) ? 'objectBeginDate' : 'objectEndDate';
    }

    if (metadata.likedMetadata.geoLocation[currentSearchParam] !== undefined) {
      for (paramVal in metadata.likedMetadata.geoLocation[currentSearchParam]) { // e.g. paramVal = 'Tokyo'
        if (paramVal === 'null') {
          continue;
        }
        for (j = 0; j < metadata.likedMetadata.geoLocation[currentSearchParam][paramVal]; j++) {
          fullValues.push(paramVal);
        }
      }
    } else if (metadata.likedMetadata.date[currentSearchParam] !== undefined) {
      for (paramVal in metadata.likedMetadata.date[currentSearchParam]) { // e.g. paramVal = '1842'
        if (paramVal === 'null') {
          continue;
        }
        for (j = 0; j < metadata.likedMetadata.date[currentSearchParam][paramVal]; j++) {
          fullValues.push(paramVal);
        }
      }
    } else {
      for (paramVal in metadata.likedMetadata[currentSearchParam]) { // e.g. paramVal = 'Vincent van Gogh'
        if (paramVal === 'null') {
          continue;
        }
        for (j = 0; j < metadata.likedMetadata[currentSearchParam][paramVal]; j++) { // e.g. ...[paramVal] = 23
          fullValues.push(paramVal);
        }
      }
    }
    // Create an object with keys of the metadata type and values of arrays of the unique metadata values to search
    // e.g. {artistDisplayName = ['van Gogh', 'Monet'], medium = ['oil', 'watercolor'] }
    searchVals[currentSearchParam] = [...new Set(shuffleArray(fullValues).slice(0, numVals))];
  }
  return searchVals;
}

function generateSearchURL(numProps, numVals) {
  var valuesToSearch = getSearchValues(getSearchTerms(numProps), numVals);
  // number of years to look back if year is before...
  var dateSearchRanges = {
    0: 500,
    1300: 200,
    1800: 100,
    1900: 50,
    3030: 20
  };

  var searchURL = metEndpoint + 'search?hasImages=true';
  var qQuery = '&q=*';

  // currently using simplified solution with just 1 property, 1 value
  for (var key in valuesToSearch) {
    if (metadata.likedMetadata.geoLocation[key] !== undefined) {
      searchURL += '&geoLocation=' + valuesToSearch[key][0];
    } else if (['artistDisplayName', 'culture'].includes(key)) {
      searchURL += '&artistOrCulture=true';
      qQuery = '&q=' + valuesToSearch[key][0];
    } else if (key === 'medium') {
      // handle complex medium values (can have multiple separated by commas)
      var outputMediumStr = '';
      var splitMediums = valuesToSearch[key][0].split(',');
      // Stop at first three mediums, some works can have many more but they are too specific to search on
      // API is expecting '...&medium=Silk|Metal|Pine&q=...
      for (var i = 0; i < splitMediums.length && i < 3; i++) {
        splitMediums[i] = splitMediums[i].replace(' ', '');
        outputMediumStr += splitMediums[i][0].toUpperCase() + splitMediums[i].slice(1).toLowerCase();
        outputMediumStr += '|';
      }
      searchURL += '&medium=' + outputMediumStr.slice(0, -1);
    } else if (metadata.likedMetadata.date[key] !== undefined) {
      var flooredDate = 100 * Math.floor(valuesToSearch[key][0] / 100);
      var adjustmentAmt = 0;
      var startDate;
      var endDate;
      for (var dateKey in dateSearchRanges) {
        if (flooredDate <= dateKey) {
          adjustmentAmt = dateSearchRanges[dateKey];
          break;
        }
      }
      if (key === 'objectBeginDate') {
        startDate = flooredDate;
        endDate = flooredDate + adjustmentAmt;
      } else if (key === 'objectEndDate') {
        startDate = flooredDate - adjustmentAmt;
        endDate = flooredDate;
      }
      searchURL += '&dateBegin=' + startDate + '&dateEnd=' + endDate;
    } else {
      searchURL += '&' + key + '=' + valuesToSearch[key][0];
    }
  }

  searchURL += qQuery;
  return searchURL;
}

function addAllToMetadata(artObjArray, metadataProperty) {
  for (var i = 0; i < artObjArray.length; i++) {
    addObjToMetadata(artObjArray[i], metadataProperty);
  }
}

function toggleDeleteMode(deleteBool) {
  if (deleteBool === undefined || deleteBool === null) {
    deleteMode = !deleteMode;
  } else {
    deleteMode = deleteBool;
  }

  if (deleteMode === false) {
    $bottomSheetDeleteModeButton.classList.add('color-grey');
    $bottomSheetDeleteModeButton.classList.remove('color-accent');
  } else {
    $bottomSheetDeleteModeButton.classList.add('color-accent');
    $bottomSheetDeleteModeButton.classList.remove('color-grey');
  }
}

function updateDeleteInfoBox() {
  var deleteModeStatusText = 'Delete Mode ';
  if (deleteMode === true) {
    deleteModeStatusText += 'On';
  } else {
    deleteModeStatusText += 'Off';
  }
  return deleteModeStatusText;
}

function hideDeleteModeInfoBox() {
  $deleteModeInfoBox.classList.add('invisible');
}

function addArtPlacard(artObj) {
  var artistName = artObj.artistDisplayName;
  var artistNationality = (artObj.artistNationality === '') ? artObj.culture : artObj.artistNationality;
  var artistBeginDate = artObj.artistBeginDate;
  var artistEndDate = artObj.artistEndDate;
  var artistYears;
  var artTitle = artObj.title;
  var artBeginDate = artObj.objectBeginDate;
  var artEndDate = artObj.objectEndDate;
  var artYears;
  var artMedium = artObj.medium;
  var artURL = artObj.objectURL;

  if (artistName === '') {
    artistName = 'Unknown Artist';
  }

  // handle artist background exceptions
  if (artistNationality === '') {
    artistNationality = 'Unknown Culture';
  }

  if (artistBeginDate !== '' && artistEndDate !== '') {
    artistYears = ' ' + artistBeginDate + ' - ' + artistEndDate;
  } else if (artistBeginDate === '' && artistEndDate !== '') {
    artistYears = ' ' + 'Unk. - ' + artistEndDate;
  } else if (artistBeginDate !== '' && artistEndDate === '') {
    artistYears = ' ' + artistBeginDate + ' - ';
  } else if (artistBeginDate === '' && artistEndDate === '') {
    artistYears = '';
  }

  if (artBeginDate !== '' && artEndDate !== '' && artBeginDate !== artEndDate) {
    artYears = artBeginDate + ' - ' + artEndDate;
  } else if (artBeginDate !== '' && artEndDate !== '' && artBeginDate === artEndDate) {
    artYears = artBeginDate;
  } else if (artBeginDate !== '' && artEndDate === '') {
    artYears = artBeginDate;
  } else if (artBeginDate === '' && artEndDate !== '') {
    artYears = artEndDate;
  } else if (artBeginDate === '' && artEndDate === '') {
    artYears = '';
  }

  var $placardArtistName = document.querySelector('#placard-artist-name');
  var $placardArtistBG = document.querySelector('#placard-artist-bg');
  var $placardArtTitle = document.querySelector('#placard-art-title');
  var $placardArtYear = document.querySelector('#placard-art-year');
  var $placardArtMedium = document.querySelector('#placard-art-medium');
  var $placardArtLabelLink = document.querySelector('#placard-link');

  $placardArtistName.textContent = artistName;
  $placardArtistBG.textContent = '(' + artistNationality + artistYears + ')';
  $placardArtTitle.textContent = artTitle;
  $placardArtYear.textContent = artYears;
  $placardArtMedium.textContent = artMedium;
  $placardArtLabelLink.setAttribute('href', artURL);
}

function toggleArtPlacard() {
  $artPlacardToggleButton.classList.toggle('material-symbols-rounded');
  $artPlacardToggleButton.classList.toggle('material-symbols-outlined');
  $artPlacard.classList.toggle('hidden');
}

//           //
// Execution //
//           //

startup();
