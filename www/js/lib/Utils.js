// Utility functions
define(["lib/Box2dWeb_dev"], function (Box2D) {

  var Utils = {};

  Utils.Box2D = {};
  Utils.Box2D.b2Math = {};

  Utils.Box2D.b2Math.RotV = function (v, a) {
    var b2Vec2 = Box2D.Common.Math.b2Vec2;
    var c = Math.cos(a);
    var s = Math.sin(a);
    return new b2Vec2(c * v.x - s * v.y, s * v.x + c * v.y);
  }

  Utils.Math = {};
  Utils.Math.signedRemainder = function (a, b) {
    // returns the signed floating point remainder of dividing a by b
    if (a === 0) { return b; }
    var aa = Math.abs(a);
    var bb = Math.abs(b);
    var ret = aa - (Math.floor(aa/bb) * bb);
    ret *= ((a/aa) * (b/bb)); // sign
    return ret;
  }

  Utils.Math.randRange = function (a, b) {
    // returns the signed floating point remainder of dividing a by b
    return Math.random() * (b-a) + a;
  }

  Utils.Data = {};
  Utils.Data.copyThing = function (obj) {
  var retObj = {};
  if (obj instanceof Object) {
    for (var key in obj) {
      retObj[key] = Utils.Data.copyThing(obj[key]);
    }
    return retObj;
  }
  else {
    return obj;
  }
}

  return Utils;
});