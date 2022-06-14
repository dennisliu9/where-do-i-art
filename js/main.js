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

// Metropolitan Museum of Art API

var metEndpoint = 'https://collectionapi.metmuseum.org/public/collection/v1/';
var metSearchResults = {};

function metSearch(query) {
  var searchXhr = new XMLHttpRequest();
  searchXhr.open('GET', metEndpoint + 'search?hasImages=true&q=' + query);
  searchXhr.responseType = 'json';
  searchXhr.addEventListener('load', function (event) {
    console.log('searchXhr.status: ', searchXhr.status);
    metSearchResults = searchXhr.response;
    console.log('metSearchResults: ', metSearchResults);
  });
  searchXhr.send();
}

function metAcquireArt(objectID) {}

function checkHasImage(artObj) {}
