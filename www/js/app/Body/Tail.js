"use strict";
define([
        "app/Body/BodyPart"
      , "app/Body/Vertebra"
      , "app/Body/RevoluteJoint"
      , "app/Mind/AfferentJunction"

      , "lib/Box2dWeb_dev"
      , "lib/pixi"
       ], function (BodyPart, Vertebra, RevoluteJoint, AfferentJunction, Box2D, PIXI) {

  var Tail = BodyPart.extend({
    init: function (data, groupIndex, ID) {
      /*
        The tail has a single attachment point on the
        bottom of the root vertebra.

        The data object can be used to set the following values:

        numVertebrae // must be >= 1
        vertebraWidth
        vertebraHeight

        rootDensity
        rootMaxTorque

        densityReductionFactor
        torqueReductionFactor

        friction
      */

      // Super init:
      this._super([], [], groupIndex, ID);

      // Initialize properties:
      if ( typeof(data) === 'undefined' ) { data = {}; }
      this.props = {
        numVertebrae: 10
      , rootWidth: 0.2
      , rootHeight: 1
      , rootDensity: 1
      , rootMaxTorque: 75000
      , widthReductionFactor: 1
      , heightReductionFactor: 1
      , densityReductionFactor: 1
      , torqueReductionFactor: 1
      , friction: 0.5
      };

      for (var key in data) {
        if (typeof(data[key]) !== 'undefined' ) { this.props[key] = data[key] };
      }

      // Initialize vertebrae:
      // TODO: This can be optimized.
      this.vertebrae = [];
      for (var i = 0; i < this.props.numVertebrae; ++i) {
        var vertebra = new Vertebra({
          width: this.props.rootWidth * Math.pow(this.props.widthReductionFactor, i)
        , height: this.props.rootHeight * Math.pow(this.props.heightReductionFactor, i)
        , density: this.props.rootDensity * Math.pow(this.props.densityReductionFactor, i)
        , friction: this.props.friction
        }, this.groupIndex, ID);
        this.vertebrae[i] = vertebra;
      }

      // Initialize joints:
      this.joints = [];
      for (var i = 0; i < this.props.numVertebrae; ++i) {
        var joint = new RevoluteJoint({
          enableMotor: true
        , motorSpeed: 0
        , maxMotorTorque: this.props.rootMaxTorque * Math.pow(this.props.torqueReductionFactor, i)
        });
        this.joints[i] = joint;
      }

      // Attach parts:
      for (var i = 0; i < this.props.numVertebrae; ++i) {
        this.vertebrae[i].attach(0, this.joints[i], 0);
        if (i > 0) {
          this.joints[i].attach(1, this.vertebrae[i-1], 1);
        }
      }

      // Set attachment point that can be used to attach the tail to other body parts
      // This makes the second attachment point on the root joint
      // the attachment point for the tail.
      this.attachments[0] = this.joints[0].attachments[1];
      // Set up body part forwarding so the joint will be associated with the attachment
      // point on whatever body part we decide to attach the tail to.
      this.bodyPartForwarding = [];
      this.bodyPartForwarding[0] = this.joints[0];


      this.name = "Tail";
    }
    // Note: The Tail does not need an add to world or an add to stage function,
    //       because its root joint automatically gets added through attachment
    //       to another body part, like a BoxTorso.
  , data: function () {
      var data = this.vertebrae.map(function (vertebra) {
        return vertebra.data();
      });
      return [].concat.apply([], data);
    }
  });

  return Tail;
});