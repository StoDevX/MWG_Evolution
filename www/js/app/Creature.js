"use strict";
define([
    "app/Creature/Car"
  , "app/Creature/Scorpion"

  ], function (Car, Scorpion) {
  var Creature = {};

  Creature.Car = Car;
  Creature.Scorpion = Scorpion;

  return Creature;
});