angular.module 'hahaki', []#, ($httpProvider) ->
.constant 'IMG_RE', /\.(?:jpe?g|png|gif)$/
.filter 'size', ->
  (tabs) -> (_.filter tabs, (tab) -> tab.remove is false).length
.filter 'base64', ->
  (tab) ->
    "data:image/#{tab.extname};base64,#{tab.img}" if tab?
.filter 'allValid', ->
  (forms) ->
    (_.filter forms, (form) -> not form.$valid).length is 0
.factory 'base64', ($window, $http, $q) ->
  {
    get: (url) ->
      $q (resolve, reject) ->
        $http.get url, {responseType: 'arraybuffer'}
        .success (data, a) ->
          uInt8Array = new Uint8Array data
          i = uInt8Array.length
          binaryString = new Array i
          while (i--)
            binaryString[i] = String.fromCharCode(uInt8Array[i])
          data = binaryString.join ''
          base64 = $window.btoa(data)
          resolve base64
        .error ->
          reject()
  }

.controller 'HahakiController', ($scope, $q, base64, IMG_RE) ->
  hahaki = @
  hahaki.foldername = do ->
    n = new Date()
    year = n.getFullYear().toString()
    month = ('0' + (n.getMonth()+1))[-2..]
    date = ('0' + n.getDate())[-2..]
    hour = ('0' + n.getHours())[-2..]
    min = ('0' + n.getMinutes())[-2..]
    sec = ('0' + n.getSeconds())[-2..]
    year + month + date + hour + min + sec
  hahaki.loaded = false
  hahaki.tabs = []
  hahaki.fullView = null
  hahaki.forms = []
  chrome.tabs.query {currentWindow: true}, (tabs) ->
    imgTabs = _.chain tabs
      .filter (tab) -> IMG_RE.test tab.url
      .uniq (tab) -> tab.title
      .map (tab) -> _.pick tab, ['id', 'title', 'url']
      .value()

    promises = _.map imgTabs, (tab) -> base64.get tab.url
    $q.all promises
    .then (base64List) ->
      hahaki.tabs = _.map imgTabs, (tab, i) ->
        pickedName = tab.title.match /^([^.]+)\.(jpe?g|png|gif)/i
        {
          id: tab.id
          path:
            filename: pickedName[1]
            extname: pickedName[2]
          img: base64List[i]
          remove: false
          enterWithRemove: false
        }
      hahaki.loaded = true

  hahaki.fullscreen = (idx) ->
    hahaki.fullView = @tabs[idx]
  hahaki.closeFullView = ->
    hahaki.fullView = null

  hahaki.download = (foldername, tabs, isClose, size, isValid) ->
    if size  > 0 and isValid
      zip = new JSZip()
      folder = zip.folder (foldername or 'images')
      _.each tabs, (tab, i) ->
        if tab.remove is false
          folder.file(
            "#{tab.path.filename}.#{tab.path.extname}"
            tab.img
            {base64: true}
          )
      images = zip.generate {type: 'blob'}
      saveAs images, "#{foldername}.zip"

      if isClose
        delIds = _.pluck hahaki.tabs, 'id'
        chrome.tabs.remove delIds, ->
          hahaki.tabs = []


  hahaki.remove = (idx) ->
    removeTab = hahaki.tabs[idx]
    removeTab.remove = true
  hahaki.undo = (idx) ->
    undoTab = hahaki.tabs[idx]
    undoTab.remove = false

  hahaki

.directive 'card', ->
  restrict: 'A'
  templateUrl: 'component/card.html'

.directive 'cardImg', ->
  restrict: 'A'
  link: (scope, elm, attrs) ->
    elm.css 'backgroundImage', "url(data:image/jpg;base64,#{attrs.cardImg})"

.directive 'uniq', ->
  restrict: 'A'
  scope: false
  require: 'ngModel'
  link: (scope, elm, attrs, ctrl) ->
    scope.$parent.hahaki.forms.push ctrl
    ctrl.$validators.uniq = (modelValue, viewValue) ->
      tabs = _.chain scope.$parent.hahaki.tabs
        .filter (tab) -> tab.id isnt scope.tab.id
        .filter (tab) ->
          tab.path.filename is viewValue
        .value()
      tabs.length is 0
