// Adds a shadow for the top nav when the masthead is scrolled off the top.
function initScroller() {
  var header = document.querySelector("header");
  var title = document.querySelector(".title-description");
  var selfName = document.querySelector('nav .self-name');

  window.addEventListener('scroll', function(e) {
    var position = window.pageYOffset || document.documentElement.scrollTop;

    if (header) {
      if (position >= 122) {
        header.classList.add("header-fixed");
      } else if (header.classList.contains("header-fixed")) {
        header.classList.remove("header-fixed");
      }
    }

    if (selfName) {
      if (position >= 122) {
        selfName.classList.add('visible-xs-inline');
      } else {
        selfName.classList.remove('visible-xs-inline');
      }
    }
  });
}

function initSideNav() {
  var leftNavToggle = document.getElementById('sidenav-left-toggle');
  var leftDrawer = document.querySelector('.sidebar-offcanvas-left');
  var overlay = document.getElementById('overlay-under-drawer');

  function toggleBoth() {
    if (leftDrawer) {
      leftDrawer.classList.toggle('active');
    }

    if (overlay) {
      overlay.classList.toggle('active');
    }
  }

  if (overlay) {
    overlay.addEventListener('click', function(e) {
      toggleBoth();
    });
  }

  if (leftNavToggle) {
    leftNavToggle.addEventListener('click', function(e) {
      toggleBoth();
    });
  }
}

// Make sure the anchors scroll past the fixed page header (#648).
function shiftWindow() {
  scrollBy(0, -68);
}

function initSearch() {
  var searchIndex;  // the JSON data

  var weights = {
    'library' : 2,
    'class' : 2,
    'typedef' : 3,
    'method' : 4,
    'accessor' : 4,
    'operator' : 4,
    'property' : 4,
    'constructor' : 4
  };

  function findMatches(q, cb) {
    var allMatches = []; // list of matches

    function score(element, num) {
      var weightFactor = weights[element.type] || 4;
      return {e: element, score: (num / weightFactor) >> 0};
    }

    $.each(searchIndex, function(i, element) {
      // TODO: prefer matches in the current library
      // TODO: help prefer a named constructor

      var lowerName = element.name.toLowerCase();
      var lowerQualifiedName = element.qualifiedName.toLowerCase();
      var lowerQ = q.toLowerCase();
      var previousMatchCount = allMatches.length;

      if (element.name === q || element.qualifiedName === q) {
        // exact match, maximum score
        allMatches.push(score(element, 2000));
      } else if (element.name === 'dart:'+q) {
        // exact match for a dart: library
        allMatches.push(score(element, 2000));
      } else if (lowerName === 'dart:'+lowerQ) {
        // case-insensitive match for a dart: library
        allMatches.push(score(element, 1800));
      } else if (lowerName === lowerQ || lowerQualifiedName === lowerQ) {
        // case-insensitive exact match
        allMatches.push(score(element, 1700));
      }

      // only care about exact matches if length is 2 or less
      // and only continue if we didn't find a match above
      if (q.length <= 2 || previousMatchCount < allMatches.length) return;

      if (element.name.indexOf(q) === 0 || element.qualifiedName.indexOf(q) === 0) {
        // starts with
        allMatches.push(score(element, 750));
      } else if (lowerName.indexOf(lowerQ) === 0 || lowerQualifiedName.indexOf(lowerQ) === 0) {
        // case-insensitive starts with
        allMatches.push(score(element, 650));
      } else if (element.name.indexOf(q) >= 0 || element.qualifiedName.indexOf(q) >= 0) {
        // contains
        allMatches.push(score(element, 500));
      } else if (lowerName.indexOf(lowerQ) >= 0 || lowerQualifiedName.indexOf(lowerQ) >= 0) {
        // case insensitive contains
        allMatches.push(score(element, 400));
      }
    });

    allMatches.sort(function(a, b) {
      var x = b.score - a.score;
      if (x === 0) {
        // tie-breaker: shorter name wins
        return a.e.name.length - b.e.name.length;
      } else {
        return x;
      }
    });

    var sortedMatches = [];
    for (var i = 0; i < allMatches.length; i++) {
      sortedMatches.push(allMatches[i].e);
    }

    cb(sortedMatches);
  };

  function initTypeahead() {
    $('#search-box').prop('disabled', false);
    $('#search-box').prop('placeholder', 'Search');
    $(document).keypress(function(event) {
      if (event.which == 47 /* / */) {
        event.preventDefault();
        $('#search-box').focus();
      }
    });

    $('#search-box.typeahead').typeahead({
      hint: true,
      highlight: true,
      minLength: 1
    },
    {
      name: 'elements',
      limit: 10,
      source: findMatches,
      display: function(element) { return element.name; },
      templates: {
        suggestion: function(match) {
          return [
            '<div>',
              match.name,
              ' ',
              match.type.toLowerCase(),
              (match.enclosedBy ? [
              '<div class="search-from-lib">from ',
              match.enclosedBy.name,
              '</div>'].join('') : ''),
            '</div>'
          ].join('');
        }
      }
    });

    $('#search-box.typeahead').bind('typeahead:select', function(ev, suggestion) {
        window.location = suggestion.href;
    });
  }

  var jsonReq = new XMLHttpRequest();
  jsonReq.open('GET', 'index.json', true);
  jsonReq.addEventListener('load', function() {
    searchIndex = JSON.parse(jsonReq.responseText);
    initTypeahead();
  });
  jsonReq.addEventListener('error', function() {
    $('#search-box').prop('placeholder', 'Error loading search index');
  });
  jsonReq.send();
}

// copied from https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#A_little_framework_a_complete_cookies_readerwriter_with_full_unicode_support
var docCookies = {
  getItem: function (sKey) {
    if (!sKey) { return null; }
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    if (!sKey) { return false; }
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};

var cookie_key = 'dartdoc.showInherited';
var inheritedShow = 'inherited-show';
var inheritedDim = 'inherited-dim';
var inheritedHide = 'inherited-hide';

function setInheritView(value) {
  docCookies.setItem(cookie_key, value, Infinity, '/');
  initInheritView();
}

function getInheritView() {
  var thing = docCookies.getItem(cookie_key);
  if (!thing) {
    return null;
  }
  return thing;
}

function initInheritView() {
  var value = getInheritView();

  var items = $('.inherited');

  switch (value) {
    case inheritedDim:
      items.removeClass(inheritedHide).addClass(inheritedDim);
      break;
    case inheritedHide:
      items.removeClass(inheritedDim).addClass(inheritedHide);
      break;
    default:
      items.removeClass(inheritedDim).removeClass(inheritedHide);
      value = inheritedShow;
      break;
  }

  var selector = 'input[name=inherited-view][value=' + value + ']';
  $(selector).attr('checked', true);
}

document.addEventListener("DOMContentLoaded", function() {
  prettyPrint();
  initScroller();
  initSideNav();
  initSearch();

  // remove nested inherited classes – ensures fade works correctly
  $('.inherited .inherited').removeClass("inherited");
  initInheritView();

  $('input:radio[name="inherited-view"]').change(function(){
    var selectedValue = $(this).val();
    setInheritView(selectedValue);
  });

  // Make sure the anchors scroll past the fixed page header (#648).
  if (location.hash) shiftWindow();
  window.addEventListener("hashchange", shiftWindow);
});
