//           //
// variables //
//           //

var metEndpoint = 'https://collectionapi.metmuseum.org/public/collection/v1/';
var metDepts = [];
var metSearchResults = {};
var metArtObj = {};

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
  getArtwork();
  swapView(event.target.dataset.viewLink);
});

$dislikeButton.addEventListener('click', function (event) {
  data.dislikedObjects.push(metArtObj);
  getArtwork();
});

$likeButton.addEventListener('click', function (event) {
  data.likedObjects.push(metArtObj);
  getArtwork();
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

//                                //
// Metropolitan Museum of Art API //
//                                //

function getMetDepartments() {
  var deptXhr = new XMLHttpRequest();
  deptXhr.open('GET', metEndpoint + 'departments');
  deptXhr.responseType = 'json';
  deptXhr.addEventListener('load', function (event) {
    // console.log('deptXhr.status: ', deptXhr.status);
    // console.log('deptXhr.response: ', deptXhr.response);
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
  // console.log('search URL: ', getUrl);
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
function getArtwork() {

  var randDept = Math.floor(Math.random() * metDepts.length);
  // console.log('%cRandom department id: ', 'color: red', randDept);
  // Department id's are not continuous, some are missing (from 1 - 21, 2 and 20 are missing). Access by index
  var searchRequest = metSearch(metDepts[randDept].departmentId);
  var searchResultsIdx = 0; // this is declared outside of the search results, making it suitable for iterating through search results
  // console.log('%cSearch request and searchResultsIdx instantiated', 'color: orange');

  function handleSearchResponse() {
    // console.log('%cSearch has loaded', 'color: blue');
    metSearchResults = searchRequest.response;
    // console.log('%cmetSearchResults: ', 'color: blue', metSearchResults);
    if (metSearchResults.objectIDs === null) {
      // console.log('no results returned from query');
      return;
    } else if (searchResultsIdx >= metSearchResults.objectIDs.length) {
      // console.log('reached end of metSearchResults');
      getArtwork();
    }

    var currentObjId = metSearchResults.objectIDs[searchResultsIdx];
    while (data.shownObjectIds.includes(currentObjId)) {
      // if it's in there, check the next one
      searchResultsIdx++;
      currentObjId = metSearchResults.objectIDs[searchResultsIdx];
    }

    // Now that we have a new, never before seen currentObjId, we can attempt to acquire it.
    var acquireRequest = metAcquireArt(currentObjId);
    // acquireRequest.onload = function () {
    acquireRequest.addEventListener('load', function handleAcquireReponse() {
      metArtObj = acquireRequest.response;
      // Store the acquired object ID so we know we've seen it already
      data.shownObjectIds.push(metArtObj.objectID);
      if (metArtObj.primaryImage !== '') {
        // console.log('found artwork: ', metArtObj.primaryImage);
        // Set image to this
        var objectName = (metArtObj.objectName === '') ? 'Untitled' : metArtObj.objectName;
        var artistName = (metArtObj.artistDisplayName === '') ? 'Unknown' : metArtObj.artistDisplayName;
        var objectDate = (metArtObj.objectDate === '') ? 'Unknown Date' : String(metArtObj.objectDate);
        var altString = objectName + ' by ' + artistName + ' (' + objectDate + ')';
        $displayImage.setAttribute('src', metArtObj.primaryImageSmall);
        $displayImage.setAttribute('alt', altString);
      } else {
        searchResultsIdx++;
        // console.log('did not find artwork, trying index ', searchResultsIdx);
        handleSearchResponse(); // This will use the new value of searchResultsIdx since handleSearchResponse calls searchResultsIdx from a higher scope than itself
      }
      acquireRequest.removeEventListener('load', handleAcquireReponse);
    });
    acquireRequest.send();
    // console.log('%cAcquire art request event listener set and request sent', 'color: purple');
    searchRequest.removeEventListener('load', handleSearchResponse);
  }

  searchRequest.addEventListener('load', handleSearchResponse);
  // console.log('%cSearch event listener added', 'color: yellow; background-color: black');
  searchRequest.send();
  // console.log('%cSearch request sent', 'green');
}

//           //
// Execution //
//           //

// Get departments, assuming departments will not change in single session
// but may change in the future.
getMetDepartments();
