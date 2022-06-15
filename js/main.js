//           //
// variables //
//           //

var metEndpoint = 'https://collectionapi.metmuseum.org/public/collection/v1/';
var metDepts = [];
var metSearchResults = {};
var metArtObj = {};
var artObjCache = []; // holds cacheItemsNum amount of pre-fetched metArtObj's
var cacheItemsNum = 10;
var displayArtObj = {};
var nextArtObj = {};

// DOM objects
var $topLogo = document.querySelector('#top-logo');
var $showSomething = document.querySelector('#show-something');
var $displayImage = document.querySelector('#display-image');
var $dislikeButton = document.querySelector('#dislike-button');
var $likeButton = document.querySelector('#like-button');

//                 //
// event listeners //
//                 //

// Logo text switches to landing view
$topLogo.addEventListener('click', function (event) {
  swapView(event.target.dataset.viewLink);
});

// Show Something button switches to selection view
$showSomething.addEventListener('click', function (event) {
  // (future optimization point)
  // When clicked, grab one and set it immediately
  getArtwork(true); // passing true to isStart parameter
  swapView(event.target.dataset.viewLink);
  // Then start building cache of images
  for (var i = 1; i <= cacheItemsNum; i++) {
    // console.log('building cache, item #: ', i);
    getArtwork();
  }
  // console.log('%cFinished sending cache building requests', 'color: white; background-color: black; padding: 5px; border-radius: 5px;');
});

$dislikeButton.addEventListener('click', function (event) {
  // categorize displayed one as dislike
  data.dislikedObjects.push(displayArtObj);
  // retrieve the next from cache list
  nextArtObj = artObjCache.shift();
  // fetch another artwork to replace the missing one
  getArtwork();
  // show the next object while the next artwork is being fetched
  setImage(nextArtObj);
});

$likeButton.addEventListener('click', function (event) {
  data.likedObjects.push(displayArtObj);
  nextArtObj = artObjCache.shift();
  getArtwork();
  setImage(nextArtObj);
});

//           //
// functions //
//           //

// Swap view
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

// Fisher–Yates shuffle, guide from https://bost.ocks.org/mike/shuffle/
function shuffleArray(array) {
  /*
  Shuffles an array by creating a "front side of the deck" and a "back side of the deck."
  Array begins with all items in the front and 0 in the back.
  Item is picked randomly from the front of the deck (i).
  This item is then swapped with the first item in the "back side"
    Putting the first element into the "back side", our shuffled array begins
  Now our "front side" is smaller by one element, and we pick another random item from this smaller "front"
  Repeat the swapping process until we have removed everything from the front side and they are all in the back side
    The back side is assembled by randomly picking, so we have a shuffled array!
  (Number of values in the array could potentially be large, so I had to
    outsource the sorting algorithm)

  Create a copy of the array to work on
  Create a variable to store the index of the end of the front size of the array
    Assign it the length of the array to start out (It will be incremented down on first iteration, so it should be .length)
  Create placeholder variable for the array item index that will be drawn
  Create placeholder variable for the array item at the end of the front side that will be replaced
  While iterating our place downwards from the end of the array to index 0
    Get an index that can be anywhere from index 0 to the end of the front
    Store the item at the last index of the front side of the array in a variable
    Set the item at the last index of the front side of the array to the value at the picked index
    Set the value at the picked index to the item that was at the end of the front side
  return the array
  */

  var arrayCopy = array.slice();
  var m = arrayCopy.length;
  var i;
  var t;

  while (m > 0) {
    // Pick from the front side of the array
    i = Math.floor(Math.random() * m--);
    // Item at the end of the front side will be replaced, so save it
    t = arrayCopy[m];
    // Put our picked item at the end of the front side
    arrayCopy[m] = arrayCopy[i];
    // We need to put the item from the end back in, put it where we got our picked item
    arrayCopy[i] = t;
  }

  return arrayCopy;
}

//                                //
// Metropolitan Museum of Art API //
//                                //

function getMetDepartments() {
  var deptXhr = new XMLHttpRequest();
  deptXhr.open('GET', metEndpoint + 'departments');
  deptXhr.responseType = 'json';
  deptXhr.addEventListener('load', function (event) {
    metDepts = deptXhr.response.departments;
  });
  deptXhr.send();
}

// Functions for searching and returning art objects

function metSearch(deptId, query) {
  // sets up the XHR but still waiting for onload function and sending
  var getUrl = '';
  if (query !== undefined) {
    getUrl = metEndpoint + 'search?' +
      'hasImages=true' +
      '&departmentId=' + deptId +
      '&q=' + query;
  } else {
    getUrl = metEndpoint + 'objects?departmentIds=' + deptId;
  }
  var searchXhr = new XMLHttpRequest();
  searchXhr.open('GET', getUrl);
  searchXhr.responseType = 'json';

  return searchXhr;
}

function metAcquireArt(objectId) {
  // sets up the XHR but still waiting for onload function and sending
  var acquireXhr = new XMLHttpRequest();
  acquireXhr.open('GET', metEndpoint + 'objects/' + objectId);
  acquireXhr.responseType = 'json';

  return acquireXhr;
}

/* Acquiring art from an array of objectIds
  > note: assuming that an entire department will always have at least one object with an accessible image
    aka, we will never reach the end of the objectIDs array
    This will **not** hold true when the results are more narrow

  Outside function:
    Instantiate an index i at 0
  Function:

  Check that the index isn't >= objectIDs.length
    If it is, then we have reached the end of the array of objects
      return false, and handle the false outside
    If it isn't, then proceed
  Set up a request for the 0th item in objectIDs
  Here's what should happen when it's done loading
    Get the response and store it in metArtObj
    If it has an image URL
      (In the future, save the info about the painting)
      We're done, return the URL and exit
    If it doesn't have a URL
      Set the index from the 0th item to the 1st item
      Call this function again with the new index
  Now send it and let's see what happens
*/
function getArtwork(isStart) {
  // This function gets artwork and puts it into the artObjCache if it has an accessible URL
  if (artObjCache.length >= cacheItemsNum) {
    // Don't keep sending requests if the cache is full, prevent button spamming to abuse API
    return;
  }

  var randDept = Math.floor(Math.random() * metDepts.length);
  // Department id's are not continuous, some are missing (from 1 - 21, 2 and 20 are missing). Access by index
  var searchRequest = metSearch(metDepts[randDept].departmentId);
  var searchResultsIdx = 0; // this is declared outside of the search results, making it suitable for iterating through search results

  function handleSearchResponse() {
    metSearchResults = searchRequest.response;
    metSearchResults.objectIDs = shuffleArray(metSearchResults.objectIDs);
    if (metSearchResults.objectIDs === null) {
      // if results were bad, exit for now
      return;
    } else if (searchResultsIdx >= metSearchResults.objectIDs.length) {
      // if we exhausted the list of id's, pull again
      getArtwork();
    }

    var currentObjId = metSearchResults.objectIDs[searchResultsIdx];
    // if this artwork been shown already, skip it
    while (data.shownObjectIds.includes(currentObjId)) {
      searchResultsIdx++;
      currentObjId = metSearchResults.objectIDs[searchResultsIdx];
    }

    // Now that we have a new, never before seen currentObjId, we can attempt to acquire it.
    var acquireRequest = metAcquireArt(currentObjId);
    // acquireRequest.onload = function () {
    acquireRequest.addEventListener('load', function handleAcquireReponse() {
      // console.log('target', currentObjId, ' acquired');
      metArtObj = acquireRequest.response;
      // Store the acquired object ID so we know we've seen it already
      data.shownObjectIds.push(metArtObj.objectID);
      if (metArtObj.primaryImage !== '') {
        // console.log('found valid artwork for target', currentObjId, ': ', metArtObj.primaryImage);
        if (isStart) {
          // If this is the first time running, go straight to showing it rather than caching it
          setImage(metArtObj);
        } else {
          // console.log('%cTarget pushed to cache!', 'color: white; background-color: green; padding: 5px; border-radius: 5px;');
          artObjCache.push(metArtObj);
        }
      } else {
        searchResultsIdx++;
        handleSearchResponse(); // This will use the new value of searchResultsIdx since handleSearchResponse calls searchResultsIdx from a higher scope than itself
      }
      acquireRequest.removeEventListener('load', handleAcquireReponse);
    });
    acquireRequest.send();
    searchRequest.removeEventListener('load', handleSearchResponse);
  }

  searchRequest.addEventListener('load', handleSearchResponse);
  searchRequest.send();
}

function setImage(artObj) {
  displayArtObj = artObj;
  var objectName = (artObj.objectName === '') ? 'Untitled' : artObj.objectName;
  var artistName = (artObj.artistDisplayName === '') ? 'Unknown' : artObj.artistDisplayName;
  var objectDate = (artObj.objectDate === '') ? 'Unknown Date' : String(artObj.objectDate);
  var altString = objectName + ' by ' + artistName + ' (' + objectDate + ')';
  $displayImage.setAttribute('src', artObj.primaryImageSmall);
  $displayImage.setAttribute('alt', altString);
}

//           //
// Execution //
//           //

// Get departments, assuming departments will not change in single session
// but may change in the future.
getMetDepartments();
