var qs = require('qs')
  , url = require('url')
  , parseUrl = url.parse
  , resolveUrl = url.resolve
  , renderRoute = require('./router').render
  , win = window
  , winHistory = win.history
  , winLocation = win.location
  , doc = win.document
  , currentPath = winLocation.pathname + winLocation.search

// Replace the initial state with the current URL immediately,
// so that it will be rendered if the state is later popped
if (winHistory.replaceState) {
  winHistory.replaceState({
    $render: true,
    $method: 'get'
  }, null, winLocation.href)
}

module.exports = History

function History(createPage, routes) {
  this._createPage = createPage
  this._routes = routes

  if (winHistory.pushState) {
    addListeners(this)
    return
  }
  this.push = function(url) {
    winLocation.assign(url)
  }
  this.replace = function(url) {
    winLocation.replace(url)
  }
  this.refresh = function() {
    winLocation.reload()
  }
}

History.prototype = {
  push: function(url, render, state, e) {
    this._update('pushState', url, render, state, e)
  }

, replace: function(url, render, state, e) {
    this._update('replaceState', url, render, state, e)
  }

  // Rerender the current url locally
, refresh: function() {
    var path = routePath(winLocation.href)
    renderRoute(this.page(), {url: path, previous: path, method: 'get'})
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

    // Update the URL
    options = renderOptions(e, path)
    state.$render = true
    state.$method = options.method
    winHistory[historyMethod](state, null, url)
    currentPath = winLocation.pathname + winLocation.search
    if (render) renderRoute(this.page(), options, e)
  }

, page: function() {
    if (this._page) return this._page

    var page = this._page = this._createPage()
      , history = this

    function redirect(url) {
      if (url === 'back') return history.back()
      // TODO: Add support for `basepath` option like Express
      if (url === 'home') url = '\\'
      history.replace(url, true)
    }

    page.redirect = redirect
    page._routes = this._routes
    return page
  }
}

// Get the pathname if it is on the same protocol and domain
function routePath(url) {
  var match = parseUrl(url)
  return match &&
    match.protocol === winLocation.protocol &&
    match.host === winLocation.host &&
    match.pathname + (match.search || '')
}

function renderOptions(e, path) {
  var form, elements, query, name, value, override, method, body

  // If this is a form submission, extract the form data and
  // append it to the url for a get or params.body for a post
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
  , previous: winLocation.pathname + winLocation.search
  , body: body
  , form: form
  }
}

function addListeners(history) {

  // Detect clicks on links
  function onClick(e) {
    var el = e.target
      , url, hashIndex

    // Ignore command click, control click, and non-left click
    if (e.metaKey || e.which !== 1) return

    // Ignore if already prevented
    if (e.defaultPrevented || e.returnValue === false) return

    // Also look up for parent links (<a><img></a>)
    while (el) {
      if (url = el.href) {

        // Ignore links meant to open in a different window or frame
        if (el.target && el.target !== '_self') return

        // Ignore hash links to the same page
        hashIndex = url.indexOf('#')
        if (~hashIndex && url.slice(0, hashIndex) === winLocation.href.replace(/#.*/, '')) {
          return
        }

        history.push(url, true, null, e)
        return
      }

      el = el.parentNode
    }
  }

  function onSubmit(e) {
    var target = e.target
      , url

    // Ignore if already prevented
    if (e.defaultPrevented || e.returnValue === false) return

    // Only handle if emitted on a form element that isn't multipart
    if (target.tagName.toLowerCase() !== 'form') return
    if (target._forceSubmit || target.enctype === 'multipart/form-data') return

    // Use the url from the form action, defaulting to the current url
    url = target.action || winLocation.href
    history.push(url, true, null, e)
  }

  function onPopState(e) {
    var previous = currentPath
      , state = e.state
      , options
    currentPath = winLocation.pathname + winLocation.search

    options = {
      previous: previous
    , url: currentPath
    }

    if (state) {
      if (!state.$render) return
      options.method = state.$method
      // Note that the post body is only sent on the initial reqest
      // and it is empty if the state is later popped
      return renderRoute(history.page(), options)
    }

    // The state object will be null for states created by jump links.
    // window.location.hash cannot be used, because it returns nothing
    // if the url ends in just a hash character
    var url = winLocation.href
      , hashIndex = url.indexOf('#')
      , el, id
    if (~hashIndex && currentPath !== previous) {
      options.method = 'get'
      renderRoute(history.page(), options)
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
