// This is a dirty hack to ignore the require of connect.mime,
// which is included by Express as of Express 3.0.0
require.modules.connect = function() {
  return {mime: null}
}

var Route = require('express/lib/router/route')
var History = require('./History')
var router = module.exports = require('./router')
var isTransitional = router._isTransitional

router.setup = setup

function setup(app, createPage, onRoute) {
  var routes = {
    queue: {}
  , transitional: {}
  }
  app.history = new History(createPage, routes)

  ;['get', 'post', 'put', 'del', 'enter', 'exit'].forEach(function(method) {
    var queue = routes.queue[method] = []
    var transitional = routes.transitional[method] = []

    app[method] = function(pattern, callback) {
      if (Array.isArray(pattern)) {
        pattern.forEach(function(item) {
          app[method](item, callback)
        })
        return app
      }

      if (isTransitional(pattern)) {
        var from = pattern.from
        var to = pattern.to
        var forward = pattern.forward || callback.forward || callback
        var back = pattern.back || callback.back
        var backCallbacks = {onRoute: onRoute, callback: back || forward}
        var forwardCallbacks = {onRoute: onRoute, callback: forward}
        var fromRoute = new Route(method, from, backCallbacks)
        var toRoute = new Route(method, to, forwardCallbacks)
        fromRoute.isTransitional = true
        toRoute.isTransitional = true
        transitional.push({
          from: fromRoute
        , to: toRoute
        })
        if (back) transitional.push({
          from: toRoute
        , to: fromRoute
        })
        return app
      }

      var callbacks = {onRoute: onRoute, callback: callback}
      queue.push(new Route(method, pattern, callbacks))
      return app
    }
  })
}
