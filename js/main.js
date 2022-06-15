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

// Logo text switches to landing view
var $topLogo = document.querySelector('#top-logo');
$topLogo.addEventListener('click', function (event) {
  swapView(event.target.dataset.viewLink);
});

// Show Something button switches to selection view
var $showSomething = document.querySelector('#show-something');
$showSomething.addEventListener('click', function (event) {
  swapView(event.target.dataset.viewLink);
});

//                                //
// Metropolitan Museum of Art API //
//                                //

var metEndpoint = 'https://collectionapi.metmuseum.org/public/collection/v1/';

// Get departments, assuming departments will not change in single session
// but may change in the future.
var metDepts = [];

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
getMetDepartments();

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

// starts here
var metSearchResults = {};
var metArtObj = {};

function getRandomArtwork() {
  var randDept = Math.floor(Math.random() * metDepts.length);
  // console.log('%cRandom department id: ', 'color: red', randDept);
  var searchRequest = metSearch(randDept);
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
      return;
    }

    var acquireRequest = metAcquireArt(metSearchResults.objectIDs[searchResultsIdx]);
    // acquireRequest.onload = function () {
    acquireRequest.addEventListener('load', function () {
      metArtObj = acquireRequest.response;
      if (metArtObj.primaryImage !== '') {
        // console.log('found artwork: ', metArtObj.primaryImage);
      } else {
        searchResultsIdx++;
        // console.log('did not find artwork, trying index ', searchResultsIdx);
        handleSearchResponse(); // This will use the new value of searchResultsIdx since handleSearchResponse calls searchResultsIdx from a higher scope than itself
      }
    });
    acquireRequest.send();
    // console.log('%cAcquire art request event listener set and request sent', 'color: purple');
  }

  searchRequest.addEventListener('load', handleSearchResponse);
  // console.log('%cSearch event listener added', 'color: yellow; background-color: black');
  searchRequest.send();
  // console.log('%cSearch request sent', 'green');
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
