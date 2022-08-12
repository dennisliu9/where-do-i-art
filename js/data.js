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

function equalArrays(first, second) {
  if (first.length !== second.length) return false;
  for (var i = 0; i < first.length; i++) {
    if (first[i] !== second[i]) return false;
  }
  return true;
}

if (localStorage.getItem(localStorageKey) !== null) {
  var referenceDataKeys = Object.keys(data);
  var tmpData = JSON.parse(localStorage.getItem(localStorageKey));
  var tmpDataKeys = Object.keys(tmpData);
  if (equalArrays(referenceDataKeys, tmpDataKeys)) {
    // Only load data from storage if the keys in storage match what the program now needs
    // Note: Users will lose their Likes between versions
    data = tmpData;
  }

  // If there are null values that somehow make it into the liked data, remove it
  data.likedObjects = data.likedObjects.filter(element => element !== null);
}

window.addEventListener('beforeunload', function (event) {
  if (devLocalStorageOverrideFlag) {
    return;
  }
  this.localStorage.setItem(localStorageKey, JSON.stringify(data));
});

window.addEventListener('pagehide', function (event) {
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
