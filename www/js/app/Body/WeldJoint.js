"use strict";
define([ "app/Body/BodyPart"

       , "lib/Box2dWeb_dev"
       , "lib/pixi"
       , "lib/Utils"
       ], function (BodyPart, Box2D, PIXI, Utils) {

  // ----------------------------------------------------------------------------
  // Note: Any body part that attaches to a joint must have a .body
  // property that contains a Box2D body.
  // ----------------------------------------------------------------------------

  var WeldJoint = BodyPart.extend({
    /*
    Attachmentsl
      0: bodyPartA,
      1: bodyPartB

    The initialJointData argument is an object containing information used
    to set up the joint, but every parameter is optional (defaults
    exist for all paraneters).
    Parameters you may wish to add to it include:
    - referenceAngle

      Note that attachment points on joints do not need anchor points.

      Also note that joints never need a groupIndex.


    */

    init: function (initialJointData) {
      if (typeof(initialJointData) === 'undefined') { initialJointData = {}; }
      var attachments = [
        {
          bodyPart: null
        , complement: null
        }
      , {
          bodyPart: null
        , complement: null
        }
        ];

      this._super(attachments);

      // Defaults
      this.initialJointData = {
        referenceAngle: 0
      };
      for (var key in initialJointData) {
        if (typeof(initialJointData[key]) !== 'undefined' ) { this.initialJointData[key] = initialJointData[key] };
      }

      this.joint = null; // Joint body parts have a Box2D "joint" instead of a "body".

      this.name = "WeldJoint";
    }
  , setInitialBodyValues: function (attachA, attachB) {
      // Assumes A is in the world and B is not.
      var A_anchor_world = attachA.bodyPart.body.GetWorldPoint(attachA.complement.anchorPoint);
      var A_angle = attachA.bodyPart.body.GetAngle();
      attachB.bodyPart.initialAngle = A_angle + this.initialJointData.referenceAngle;
      var B_anchor_rot = Utils.Box2D.b2Math.RotV( attachB.complement.anchorPoint, attachB.bodyPart.initialAngle );
      attachB.bodyPart.initialX = A_anchor_world.x - B_anchor_rot.x;
      attachB.bodyPart.initialY = A_anchor_world.y - B_anchor_rot.y;
    }
  , addToWorld: function (world) {
      if (this.world != null) { return; }
      this.world = world;

      var attachA = this.attachments[0];
      var attachB = this.attachments[1];

      // Ensure both body parts attached to the joint are non-null
      // and that both are added to the world before proceeding,
      // but if one attachment point is empty, don't add the joint.
      // We MUST have a single Box2D body on each body part to connect the joint.

      // We do assume, however, that at least one of the body part's bodies is
      // in the world already
      if (attachA.bodyPart !== null && attachB.bodyPart !== null
        && attachA.complement !== null && attachB.complement !== null) {

        if (attachA.bodyPart.body !== null && attachB.bodyPart.body === null) {
          this.setInitialBodyValues(attachA, attachB);
          attachB.bodyPart.addToWorld(world);
        }
        else if (attachA.bodyPart.body === null && attachB.bodyPart.body !== null) {
          this.setInitialBodyValues(attachB, attachA);
          attachA.bodyPart.addToWorld(world);
        }

        // And now we may proceed.

        // Since the body parts should be positioned at the joint
        // already, we can use the standard Box2D way of initializing
        // a joint definition.
        var world_anchor = attachA.bodyPart.body.GetWorldPoint(attachA.complement.anchorPoint);
        var jointDef = new Box2D.Dynamics.Joints.b2WeldJointDef();
        jointDef.Initialize(attachA.bodyPart.body
                          , attachB.bodyPart.body
                          , world_anchor);
        jointDef.referenceAngle = this.initialJointData.referenceAngle;


        var joint = world.CreateJoint(jointDef);
        this.joint = joint;

      }

    }
  , addToStage: function (stage, METER) {
      if (this.stage != null) { return; }
      this.stage = stage;

      var attachA = this.attachments[0];
      var attachB = this.attachments[1];
      // As with addToWorld(world), both body parts must be properly
      // attached to this joint in order for us to allow traversal
      // of the attachment graph. Even though the complement attachments
      // are not strictly necessary for adding anything to the stage,
      // we requrie them anyway so it is immediately apparent that
      // something is wrong when supposedly connected body parts
      // don't show up in the renderer.
      if (attachA.bodyPart != null && attachB.bodyPart != null
        && attachA.complement != null && attachB.complement != null) {
        attachA.bodyPart.addToStage(stage, METER);
        attachB.bodyPart.addToStage(stage, METER);
        // TODO: For now, we don't add joints to the stage for rendering.
        //       We might choose to do so in the future, but it looks like
        //       the data to draw them needs to be derived from the attached
        //       Box2D bodies.
      }
    }
  , data: function () {
      throw "Joints do not contain render data.";
    }
  });

  return WeldJoint;

});