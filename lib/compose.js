var router = module.exports = require('./router')

module.exports = {
  transition: transition
}

function transition(add, calls, from, to, forward, back) {
  if (from === to) return
  for (var i = 0, len = calls.length; i < len; i++) {
    var call = calls[i]
    if (call.from === to) {
      if (hasTransition(calls, from, call.to)) continue
      var composedForward = composeCallbacks(forward, call.forward, to)
      if (back && call.back) {
        var composedBack = composeCallbacks(call.back, back, to)
      }
      add({
        from: from
      , to: call.to
      , forward: composedForward
      , back: composedBack
      })
    } else if (call.to === from) {
      if (hasTransition(calls, call.from, to)) continue
      var composedForward = composeCallbacks(call.forward, forward, from)
      if (back && call.back) {
        var composedBack = composeCallbacks(back, call.back, from)
      }
      add({
        from: call.from
      , to: to
      , forward: composedForward
      , back: composedBack
      })
    }
  }
}

function hasTransition(calls, from, to) {
  for (var i = calls.length; i--;) {
    var call = calls[i];
    if (call.from === from && call.to === to) return true
  }
  return false
}

// TODO: Async support
function composeCallbacks(first, second, intermediatePath) {
  return function(model, params, next) {
    var skipped = false
    function wrapNext(err) {
      skipped = true
      next(err)
    }

    var intermediateUrl = router.mapRoute(intermediatePath, params)
    var url = params.url
    params.url = intermediateUrl
    first.call(this, model, params, wrapNext)
    if (skipped) return
    params.previous = intermediateUrl
    params.url = url
    second.call(this, model, params, next)
  }
}
