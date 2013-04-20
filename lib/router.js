var qs = require('qs')

exports.render = render
exports._mapRoute = mapRoute

exports._isTransitional = function(pattern) {
  return pattern.hasOwnProperty('from') && pattern.hasOwnProperty('to')
}

function mapRoute(from, params) {
  var i = params.url.indexOf('?')
  var queryString = (~i) ? params.url.slice(i) : ''
  var i = 0
  var path = from.replace(/(?:(?:\:([^?\/:*]+))|\*)\??/g, function(match, key) {
    if (key) return params[key]
    return params[i++]
  })
  return path + queryString
}

function render(page, options, e) {
  var req = new RenderReq(page, options, e)
  req.routeTransitional(0, function() {
    req.routeQueue(0, function() {
      req.routeAndTransition(0, function() {
        // Cancel rendering by this app if no routes match
        req.cancel()
      })
    })
  })
}

function RenderReq(page, options, e) {
  this.page = page
  this.options = options
  this.e = e
  this.setUrl(options.url.replace(/#.*/, ''))
  var queryString = this.url.replace(/^[^?]*\?/, '')
  this.query = queryString ? qs.parse(queryString) : {}
  this.method = options.method
  this.body = options.body || {}
  this.previous = options.previous
  var routes = page._routes
  this.transitional = routes.transitional[this.method]
  this.queue = routes.queue[this.method]
}

RenderReq.prototype.cancel = function() {
  var options = this.options
  // Don't do anything if this is the result of an event, since the
  // appropriate action will happen by default
  if (this.e || options.noNavigate) return
  // Otherwise, manually perform appropriate action
  if (options.form) {
    options.form._tracksForce = true
    options.form.submit()
  } else if (options.link) {
    options.link._tracksForce = true
    options.link.click()
  } else {
    window.location.assign(options.url)
  }
}

RenderReq.prototype.setUrl = function(url) {
  this.url = url
  this.path = this.url.replace(/\?.*/, '')
}

RenderReq.prototype.routeTransitional = function(i, next) {
  i || (i = 0)
  var item
  while (item = this.transitional[i++]) {
    if (!item.to.match(this.path) || !item.from.match(this.previous)) continue
    var req = this
    this.onMatch(item.to, function(err) {
      if (err) return req.cancel()
      req.routeTransitional(i, next)
    })
    return
  }
  next()
}

RenderReq.prototype.routeQueue = function(i, next) {
  i || (i = 0)
  var route
  while (route = this.queue[i++]) {
    if (!route.match(this.path)) continue
    var req = this
    this.onMatch(route, function(err) {
      if (err) return req.cancel()
      req.routeQueue(i, next)
    })
    return
  }
  next()
}

RenderReq.prototype.routeAndTransition = function(i, next) {
  i || (i = 0)
  var item
  while (item = this.transitional[i++]) {
    if (!item.to.match(this.path)) continue
    var url = this.url
    var params = this.routeParams(item.to)
    this.setUrl(mapRoute(item.from.path, params))
    var req = this
    var continued = false
    var continueNext = function() {
      continued = true
      req.setUrl(url)
      req.routeAndTransition(i, next)
    }
    var render = this.page.render
    this.page.render = function() {
      req.setUrl(url)
      req.onMatch(item.to, continueNext)
      if (continued) return
      req.page.render = render
      render.apply(req.page, arguments)
    }
    this.routeQueue(0, continueNext)
    return
  }
  next()
}

RenderReq.prototype.onMatch = function(route, next) {
  // Stop the default browser action, such as clicking a link or submitting a form
  if (this.e) {
    this.e.preventDefault()
    this.e = null
  }

  this.page.params = this.routeParams(route)
  route.callbacks.onRoute(
    route.callbacks.callback
  , this.page
  , this.page.params
  , next
  , route.isTransitional
  )
}

RenderReq.prototype.routeParams = function(route) {
  var routeParams = route.params
  var params = routeParams.slice()
  for (var key in routeParams) {
    params[key] = routeParams[key]
  }
  params.previous = this.previous
  params.url = this.url
  params.body = this.body
  params.query = this.query
  params.method = this.method
  return params
}
