// This is a dirty hack to ignore the require of connect.mime,
// which is included by Express as of Express 3.0.0
require.modules.connect = function() {
  return {mime: null}
}

var Route = require('express/lib/router/route')
  , History = require('./History')
  , router = module.exports = require('./router')
  , isTransitional = router._isTransitional

router.setup = setup

function setup(app, createPage, onRoute) {
  var routes = {
    queue: {}
  , transitional: {}
  }
  app.history = new History(createPage, routes)

  ;['get', 'post', 'put', 'del', 'enter', 'exit'].forEach(function(method) {
    var queue = routes.queue[method] = []
      , transitional = routes.transitional[method] = []

    app[method] = function(pattern, callback, callback2) {
      if (Array.isArray(pattern)) {
        pattern.forEach(function(item) {
          app[method](item, callback, callback2)
        })
        return app
      }

      var callbacks = {onRoute: onRoute}

      if (isTransitional(pattern)) {
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
