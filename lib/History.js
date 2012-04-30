var qs = require('qs')
  , url = require('url')
  , parseUrl = url.parse
  , resolveUrl = url.resolve
  , renderRoute = require('./router').render
  , win = window
  , winHistory = win.history
  , winLocation = win.location
  , doc = win.document
  , currentPath = winLocation.pathname

if (winHistory.replaceState) {
  winHistory.replaceState({
    $render: true,
    $method: 'get'
  }, null, winLocation.href)
}

module.exports = History

function History(page) {
  this.page = page
  if (winHistory.pushState) {
    addListeners(this, page)
  } else {
    // TODO: Calling push, replace, and refresh should update
    // window.location when pushState is not supported
    this.push = this.replace = this.refresh = function() {}
  }
}

History.prototype = {
  push: function(url, render, state, e) {
    this._update('pushState', url, render, state, e)
  }

, replace: function(url, render, state, e) {
    this._update('replaceState', url, render, state, e)
  }

, refresh: function() {
    var path
    path = routePath(winLocation.href)
    renderRoute(this.page, {path: path, method: 'get'})
  }

, back: function() {
    winHistory.back()
  }

, forward: function() {
    winHistory.forward()
  }

, go: function(i) {
    winHistory.go(i)
  }

, _update: function(historyMethod, relativeUrl, render, state, e) {
    var url = resolveUrl(winLocation.href, relativeUrl)
      , path = routePath(url)
      , options

    // TODO: history.push should set the window.location with external urls
    if (!path) return
    if (render == null) render = true
    if (state == null) state = {}

    options = renderOptions(e, path)
    state.$render = true
    state.$method = options.method
    winHistory[historyMethod](state, null, url)
    currentPath = winLocation.pathname
    if (render) renderRoute(this.page, options, e)
  }
}

function routePath(url) {
  var match = parseUrl(url)
  return match &&
    match.protocol === winLocation.protocol &&
    match.host === winLocation.host &&
    match.pathname + (match.search || '')
}

function renderOptions(e, path) {
  var form, elements, query, name, value, override, method
  if (e && e.type === 'submit') {
    form = e.target
    elements = form.elements
    query = []
    for (var i = 0, len = elements.length, el; i < len; i++) {
      el = elements[i]
      if (name = el.name) {
        value = el.value
        query.push(encodeURIComponent(name) + '=' + encodeURIComponent(value))
        if (name === '_method') {
          override = value.toLowerCase()
          if (override === 'delete') {
            override = 'del'
          }
        }
      }
    }
    query = query.join('&')
    if (form.method.toLowerCase() === 'post') {
      method = override || 'post'
      body = qs.parse(query)
    } else {
      method = 'get'
      path += '?' + query
    }
  } else {
    method = 'get'
  }
  return {
    method: method
  , url: path
  , previous: winLocation.pathname
  , body: body
  , form: form
  }
}

function addListeners(history, page) {
  function onClick(e) {
    if (e.target.href && !e.metaKey && e.which === 1) {
      var url = e.target.href
        , hashIndex = url.indexOf('#')
      if (~hashIndex && url.slice(0, hashIndex) === winLocation.href.replace(/#.*/, '')) {
        return
      }
      history.push(url, true, null, e)
    }
  }

  function onSubmit(e) {
    var target = e.target
      , url
    if (target.tagName.toLowerCase() === 'form') {
      url = target.action
      if (!url || target._forceSubmit || target.enctype === 'multipart/form-data') {
        return
      }
      history.push(url, true, null, e)
    }
  }

  function onPopState(e) {
    var previous = currentPath
      , state = e.state
      , options = {
          previous: previous
        , url: currentPath
        }
    currentPath = winLocation.pathname

    if (state) {
      if (!state.$render) return
      options.method = state.$method
      return renderRoute(page, options)
    }

    var url = winLocation.href
      , hashIndex = url.indexOf('#')
      , el, id
    if (~hashIndex && currentPath !== previous) {
      options.method = 'get'
      renderRoute(page, options)
      id = url.slice(hashIndex + 1)
      if (el = doc.getElementById(id) || doc.getElementsByName(id)[0]) {
        el.scrollIntoView()
      }
    }
  }

  doc.addEventListener('click', onClick, false)
  doc.addEventListener('submit', onSubmit, false)
  win.addEventListener('popstate', onPopState, false)
}
