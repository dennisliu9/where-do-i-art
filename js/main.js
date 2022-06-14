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
