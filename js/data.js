/* exported data, metadata */

var localStorageKey = 'ajax-data';
var devLocalStorageOverrideFlag = false;
var data = {
  shownObjectIds: [],
  likedObjects: [],
  dislikedObjects: [],
  viewingInDetail: null
};
var metadata = {
  likedMetadata: {
    isHighlight: {
      true: 0,
      false: 0
    },
    deparmentId: {},
    artistDisplayName: {},
    culture: {},
    medium: {},
    geoLocation: {
      city: {},
      state: {},
      county: {},
      country: {},
      region: {},
      subregion: {}
    }
    // dateBegin and dateEnd later
  }
};

if (localStorage.getItem(localStorageKey) !== null) {
  data = JSON.parse(localStorage.getItem(localStorageKey));
}

window.addEventListener('beforeunload', function (event) {
  if (devLocalStorageOverrideFlag) {
    return;
  }
  this.localStorage.setItem(localStorageKey, JSON.stringify(data));
});

// eslint-disable-next-line no-unused-vars
function devOverrideLocalStorage() {
  // Clears out data and prevents data from being persisted in localStorage
  // To be manually run in the console
  devLocalStorageOverrideFlag = true;
  localStorage.removeItem(localStorageKey);
}
