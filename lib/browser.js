// This is a hack to get browserify to ignore mime, which is included by express
require.modules.mime = function() {}

var Route = require('express/lib/router/route')
  , History = require('./History')
  , router = module.exports = require('./router')

router.setup = setup

function setup(app, createPage, onRoute) {
  var routes = {
        queue: {}
      , transitional: {}
      }
    , page = createPage()
    , history = page._history = app.history = new History(page)
  page.redirect = redirect
  page._routes = routes

  ;['get', 'post', 'put', 'del'].forEach(function(method) {
    var queue = routes.queue[method] = []
      , transitional = routes.transitional[method] = []

    app[method] = function(pattern, callback, callback2) {
      var callbacks = {onRoute: onRoute}

      if (typeof pattern === 'object') {
        var from = pattern.from
          , to = pattern.to
          , forward = pattern.forward || callback.forward || callback
          , back = pattern.back || callback.back || callback2 || forward
          , backCallbacks = {onRoute: onRoute, callback: back}
          , forwardCallbacks = {onRoute: onRoute, callback: forward}
          , fromRoute = new Route(method, from, backCallbacks)
          , toRoute = new Route(method, to, forwardCallbacks)
        transitional.push({
          from: fromRoute
        , to: toRoute
        }, {
          from: toRoute
        , to: fromRoute
        })
        callbacks.forward = forward
        callbacks.from = from
        queue.push(new Route(method, to, callbacks))
        return app
      }

      callbacks.callback = callback
      queue.push(new Route(method, pattern, callbacks))
      return app
    }
  })
}

function redirect(url) {
  if (url === 'back') return this._history.back()
  // TODO: Add support for `basepath` option like Express
  if (url === 'home') url = '\\'
  this._history.replace(url, true)
}
