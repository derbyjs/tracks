var ExpressRouter = require('express/lib/router')
  , router = module.exports = require('./router')
  , mapRoute = router._mapRoute

router.setup = setup

function setup(app, createPage, onRoute) {
  var routes = []
  ;['get', 'post', 'put', 'del'].forEach(function(method) {
    return app[method] = function(pattern, callback) {
      routes.push([method, pattern, callback])
      return app
    }
  })

  function pageParams(req) {
    var reqParams = req.params
      , params = {
          url: req.url
        , body: req.body
        , query: req.query
        }
      , key
    for (key in reqParams) {
      params[key] = reqParams[key]
    }
    return params
  }

  // router options default to:
  //   caseSensitive: false
  //   strict: false
  app.router = function(options) {
    var expressRouter = new ExpressRouter(options)

    // Middleware must be wrapped so that it can be called anonymously
    function middleware(req, res, next) {
      var page = createPage(req, res)
      page.res = res
      page.redirect = redirect

      previousPage = req._tracksPage
      req._tracksPage = page
      expressRouter._dispatch(req, res, function(err) {
        // Cleanup then continue
        if (previousPage != null) {
          req._tracksPage = previousPage
        } else {
          delete req._tracksPage
        }
        next(err)
      })
    }

    routes.forEach(function(route) {
      var method = route[0]
        , pattern = route[1]
        , callback = route[2]

      // Create route for 'to' callback of transitional route
      if (typeof pattern === 'object') {
        var from = pattern.from
          , to = pattern.to
        callback = pattern.forward || callback.forward || callback
        expressRouter.route(method, to, function(req, res, next) {
          var page = req._tracksPage
            , params = pageParams(req)
            , render = page.render
            , previousPage

          // Wrap the render function to run the forward callback
          // immediately before rendering
          page.render = function() {
            onRoute(callback, null, params, next)
            page.render = render
            render.apply(page, arguments)
          }
          req.url = mapRoute(from, params)
          // Reroute with the new URL
          middleware(req, res, next)          
        })
        return
      }

      // Create a normal route
      expressRouter.route(method, pattern, function(req, res, next) {
        var page = req._tracksPage
          , params = pageParams(req)
        return onRoute(callback, page, params, next)
      })
    })

    return middleware
  }
}

function redirect(url, status) {
  // TODO: Appears there is a bug that Express throws when an undefined
  // status is passed. Fix bug and remove this condition
  if (status) {
    this.res.redirect(url, status)
  } else {
    this.res.redirect(url)
  }
}
