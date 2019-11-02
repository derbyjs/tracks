var expect, router, tracks;

expect = require('expect.js');

global.window = {
  location: {},
  history: {}
};

tracks = require('../lib/browser');

router = require('../lib/router');

describe('enter/exit', function() {
  it('enter should not trigger change in params', function(done) {
    var app, createPage, history, onRoute, options, routes, check;
    this.timeout(2000);
    app = {};
    createPage = function(req, res) {
      return {
          model: {}
        , params: {
              url: '/b'
          }
      };
    };
    onRoute = function(callback, page, params, next, isTransitional, done) {
      expect(page.params.url).to.be.equal('/b');
      return done();
    };
    routes = tracks.setup(app, createPage, onRoute);
    app.enter('/a', function() {});
    history = app.history;
    options = {
        method: 'enter'
      , url: '/a'
      , noNavigate: true
    }
    return router.render(history.page(), options);
  });

  return it('exit should not trigger change in params', function(done) {
    var app, createPage, history, onRoute, options, routes, check;
    this.timeout(2000);
    app = {};
    createPage = function(req, res) {
      return {
          model: {}
        , params: {
              url: '/b'
          }
      };
    };
    onRoute = function(callback, page, params, next, isTransitional, done) {
      expect(page.params.url).to.be.equal('/b');
      return done();
    };
    routes = tracks.setup(app, createPage, onRoute);
    app.exit('/a', function() {});
    history = app.history;
    options = {
        method: 'exit'
      , url: '/a'
      , noNavigate: true
    }
    return router.render(history.page(), options);
  });
});
