"use strict";
define([
    "lib/Class"
  , "app/Mind"
  , "app/Body" ], function (Class, Mind, Body) {

  /* This is a creature that drives around like a car, but
  has a scorpion-like tail to attack with and an eye to measure
  the distance to the wall.

  The data parameter for the scorpion may provide the following settings,
  all are optional:

  groupIndex          (default: -1)

  torsoData           (default: see defaults on the BoxTorso class)

  leftWheelData       (default: see defaults on the Wheel class)
  leftWheelJointData  (default: see defaults on the RevoluteJoint class)

  rightWheelData      (default: see defaults on the RevoluteJoint class)
  rightWheelJointData (default: see defaults on the Wheel class)

  tailData            (default: see defaults on the Tail class)
  tailNeuronData      (default: dee defaults on the TailNeuron class)


  TODO: Provide a method that gets the data object that was used to create the creature.
  could probably just read this.props after init
  */
  var Scorpion = Class.extend({
    init: function (data, targetWall, groupIndex, creatureID) {
      if (typeof groupIndex == "undefined") { groupIndex = -1; }
      if (typeof creatureID == "undefined") { creatureID = -1; }

      var b2Vec2 = Box2D.Common.Math.b2Vec2;

      // Initialize properties:
      if ( typeof(data) === 'undefined' ) { data = {}; }
      this.props = {
        torsoData: {}
      , leftWheelData: {}
      , leftWheelJointData: {}
      , rightWheelData: {}
      , rightWheelJointData: {}
      , tailData: {}
      , tailNeuronData: {}
      };
      for (var key in data) {
        if (typeof(data[key]) !== 'undefined' ) { this.props[key] = data[key] };
      }
      this.ID = creatureID;

      // TORSO
      this.torso = new Body.BoxTorso(this.props.torsoData, groupIndex, creatureID);

      // LEFT WHEEL
      //console.log("left wheel");
      this.leftWheel = new Body.Wheel(this.props.leftWheelData, groupIndex, creatureID);
      this.leftWheelJoint = new Body.RevoluteJoint(this.props.leftWheelJointData);

      this.torso.attach(6, this.leftWheelJoint, 0);
      this.leftWheel.attach(0, this.leftWheelJoint, 1); // attach left wheel center to left wheel joint top

      // RIGHT WHEEL
      //console.log("right wheel");
      this.rightWheel = new Body.Wheel(this.props.rightWheelData, groupIndex, creatureID);
      this.rightWheelJoint = new Body.RevoluteJoint(this.props.rightWheelJointData);
      this.torso.attach(4, this.rightWheelJoint, 0);
      this.rightWheel.attach(0, this.rightWheelJoint, 1);

      // EYE
      this.eye = new Body.Eye(0.2, 0.2, groupIndex);
      this.eye.wall = targetWall;
      this.eyeJoint = new Body.WeldJoint();
      this.torso.attach(3, this.eyeJoint, 0);
      this.eye.attach(0, this.eyeJoint, 1);
      var eyeDistanceJunction = this.eye.junctions[0];

      // TAIL
      this.tail = new Body.Tail(this.props.tailData, groupIndex, creatureID);
      this.torso.attach(1, this.tail, 0);
      var tailJointAngleJunctions = this.tail.joints.map(function (joint) { return joint.junctions[6]; });
      var tailJointSpeedJunctions = this.tail.joints.map(function (joint) { return joint.junctions[3]; });

      // TAIL NEURON
      this.tailNeuron = new Mind.TailNeuron(this.props.tailNeuronData);
      this.tailNeuron.linkToTail(this.tail);
      this.tailNeuron.linkToEye(this.eye);

      // BRAIN
      var afferents = [ eyeDistanceJunction ].concat(tailJointAngleJunctions);
      var efferents = [].concat(tailJointSpeedJunctions);
      this.brain = new Mind.Brain(afferents, efferents);

      // Class name parameter for debugging use
      this.name = "Scorpion";
    }
  , addToWorld: function (world) {
      this.torso.addToWorld(world);
    }
  , addToStage: function (stage, METER) {
      this.torso.addToStage(stage, METER);
    }
  , bodyPartData: function () {

      var data = [
                  this.torso.data()
                , this.leftWheel.data()
                , this.rightWheel.data()
                , this.eye.data()
                , this.tail.data()
                ];
      return [].concat.apply([], data);

    }
  });


  return Scorpion;
});