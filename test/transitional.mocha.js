var expect, router, tracks;

expect = require('expect.js');

global.window = {
  location: {},
  history: {}
};

tracks = require('../lib/browser');

router = require('../lib/router');

describe('transitional routes', function() {
  return it('should parse an empty query params when going from -> to, when no querystring in the url', function(done) {
    var app, createPage, history, onRoute, options, routes;
    this.timeout(2000);
    app = {};
    createPage = function(req, res) {
      return {
        model: {}
      };
    };
    onRoute = function(callback, page, params, next, isTransitional, done) {
      if (isTransitional) {
        if (callback.length === 4) {
          callback(page.model, params, next, done);
          return true;
        } else {
          callback(page.model, params, next);
          return;
        }
      }
      return callback(page, page.model, params, next);
    };
    routes = tracks.setup(app, createPage, onRoute);
    app.get({
      from: '/a/b',
      to: '/x/y'
    }, function(model, params, next) {
      expect(params.query).to.eql({});
      return done();
    });
    history = app.history;
    options = {
      method: 'get',
      url: '/x/y',
      previous: '/a/b',
      body: ''
    };
    return router.render(history.page(), options);
  });
});
