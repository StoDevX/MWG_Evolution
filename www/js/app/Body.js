"use strict";
define([
    "app/Body/BodyPart"
  , "app/Body/BoxTorso"
  , "app/Body/Wheel"
  , "app/Body/WeldJoint"
  , "app/Body/RevoluteJoint"
  , "app/Body/Eye"
  , "app/Body/Vertebra"
  , "app/Body/Tail"
  ], function (BodyPart, BoxTorso, Wheel, WeldJoint, RevoluteJoint, Eye, Vertebra, Tail) {

  var Body = {};

  Body.BodyPart      = BodyPart;
  Body.BoxTorso      = BoxTorso;
  Body.Wheel         = Wheel;
  Body.WeldJoint     = WeldJoint;
  Body.RevoluteJoint = RevoluteJoint;
  Body.Eye           = Eye;
  Body.Vertebra      = Vertebra;
  Body.Tail          = Tail;


  return Body;
});