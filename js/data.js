/* exported data, metadata */

var localStorageKey = 'ajax-data';
var devLocalStorageOverrideFlag = false;
var data = {
  shownObjectIds: [],
  likedObjects: [],
  dislikedObjects: [],
  viewingInDetail: null,
  deleting: null,
  departmentLookup: {} // used to store department names from responses along with the id used to find it (these do not match the departments query)
};
var metadata = {
  likedMetadata: {
    isHighlight: {
      true: 0,
      false: 0
    },
    departmentId: {},
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
    },
    date: {
      objectBeginDate: {},
      objectEndDate: {}
    }

  }
};

if (localStorage.getItem(localStorageKey) !== null) {
  var referenceDataKeys = Object.keys(data);
  var tmpData = JSON.parse(localStorage.getItem(localStorageKey));
  if (JSON.stringify(referenceDataKeys) === JSON.stringify(Object.keys(tmpData))) {
    // Only load data from storage if the keys in storage match what the program now needs
    // TODO: This is a TERRIBLE solution as users will lose their Likes between versions!
    data = tmpData;
  }
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
