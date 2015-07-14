angular.module('hahaki', []).constant('IMG_RE', /\.(?:jpe?g|png|gif)$/).filter('size', function() {
  return function(tabs) {
    return (_.filter(tabs, function(tab) {
      return tab.remove === false;
    })).length;
  };
}).filter('base64', function() {
  return function(tab) {
    if (tab != null) {
      return "data:image/" + tab.extname + ";base64," + tab.img;
    }
  };
}).filter('allValid', function() {
  return function(forms) {
    return (_.filter(forms, function(form) {
      return !form.$valid;
    })).length === 0;
  };
}).factory('base64', function($window, $http, $q) {
  return {
    get: function(url) {
      return $q(function(resolve, reject) {
        return $http.get(url, {
          responseType: 'arraybuffer'
        }).success(function(data, a) {
          var base64, binaryString, i, uInt8Array;
          uInt8Array = new Uint8Array(data);
          i = uInt8Array.length;
          binaryString = new Array(i);
          while (i--) {
            binaryString[i] = String.fromCharCode(uInt8Array[i]);
          }
          data = binaryString.join('');
          base64 = $window.btoa(data);
          return resolve(base64);
        }).error(function() {
          return reject();
        });
      });
    }
  };
}).controller('HahakiController', function($scope, $q, base64, IMG_RE) {
  var hahaki;
  hahaki = this;
  hahaki.foldername = "images";
  hahaki.loaded = false;
  hahaki.tabs = [];
  hahaki.fullView = null;
  hahaki.forms = [];
  chrome.tabs.query({
    currentWindow: true
  }, function(tabs) {
    var imgTabs, promises;
    imgTabs = _.chain(tabs).filter(function(tab) {
      return IMG_RE.test(tab.url);
    }).uniq(function(tab) {
      return tab.title;
    }).map(function(tab) {
      return _.pick(tab, ['id', 'title', 'url']);
    }).value();
    promises = _.map(imgTabs, function(tab) {
      return base64.get(tab.url);
    });
    return $q.all(promises).then(function(base64List) {
      hahaki.tabs = _.map(imgTabs, function(tab, i) {
        var pickedName;
        pickedName = tab.title.match(/^([^.]+)\.(jpe?g|png|gif)/);
        return {
          id: tab.id,
          path: {
            filename: pickedName[1],
            extname: pickedName[2]
          },
          img: base64List[i],
          remove: false,
          enterWithRemove: false
        };
      });
      return hahaki.loaded = true;
    });
  });
  hahaki.fullscreen = function(idx) {
    return hahaki.fullView = this.tabs[idx];
  };
  hahaki.closeFullView = function() {
    return hahaki.fullView = null;
  };
  hahaki.download = function(foldername, tabs, isClose, size, isValid) {
    var delIds, folder, images, zip;
    if (size > 0 && isValid) {
      zip = new JSZip();
      folder = zip.folder(foldername || 'images');
      _.each(tabs, function(tab, i) {
        if (tab.remove === false) {
          return folder.file(tab.path.filename + "." + tab.path.extname, tab.img, {
            base64: true
          });
        }
      });
      images = zip.generate({
        type: 'blob'
      });
      saveAs(images, foldername + ".zip");
      if (isClose) {
        delIds = _.pluck(hahaki.tabs, 'id');
        return chrome.tabs.remove(delIds, function() {
          return hahaki.tabs = [];
        });
      }
    }
  };
  hahaki.remove = function(idx) {
    var removeTab;
    removeTab = hahaki.tabs[idx];
    return removeTab.remove = true;
  };
  hahaki.undo = function(idx) {
    var undoTab;
    undoTab = hahaki.tabs[idx];
    return undoTab.remove = false;
  };
  return hahaki;
}).directive('card', function() {
  return {
    restrict: 'A',
    templateUrl: 'component/card.html'
  };
}).directive('cardImg', function() {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      return elm.css('backgroundImage', "url(data:image/jpg;base64," + attrs.cardImg + ")");
    }
  };
}).directive('uniq', function() {
  return {
    restrict: 'A',
    scope: false,
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      scope.$parent.hahaki.forms.push(ctrl);
      return ctrl.$validators.uniq = function(modelValue, viewValue) {
        var tabs;
        tabs = _.chain(scope.$parent.hahaki.tabs).filter(function(tab) {
          return tab.id !== scope.tab.id;
        }).filter(function(tab) {
          return tab.path.filename === viewValue;
        }).value();
        return tabs.length === 0;
      };
    }
  };
});

//# sourceMappingURL=index.js.map