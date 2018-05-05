/*
Code Dump:

Use this file to dump code snippets of unfinished/experimental things that
you don't want to delete when you clean up source files.

*/


  // TODO: THIS CLASS IS UNFINISHED
  Body.WheelJoint = Body.BodyPart.extend({
    // I ported the Box2D wheel joint into our copy of Box2DWeb
    // from a newer version of Box2D C++. -- Mike

    /*
      The wheel joint has two attachments, one for the top
      body and one for the bottom body. The axis of the joint
      is always defined in terms of the top body (this makes sense
      if you think of a wheel joint as the suspension of the car,
      where the axis of the joint would be defined
      in terms of the chassis).

      0: topBodyPart,
      1: bottomBodyPart

      Note that attachment points on joints do not need anchor points.
    */

    init: function (axis) {
      var b2Vec2 = Box2D.Common.Math.b2Vec2;
      axis = axis || new b2Vec2(1.0, 0.0); // default

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
      var junctions = [];
      this._super(attachments, junctions);

      this.axis = axis;
      this.joint = null; // Joint body parts have a Box2D "joint" instead of a "body".
    }
  , addToWorld: function (world) {
      if (this.world != null) { return; }
      this.world = world;

      var topAttach = this.attachments[0];
      var bottomAttach = this.attachments[1];

      // Ensure both body parts attached to the joint are non-null
      // and that both are added to the world before proceeding,
      // but if one attachment point is empty, don't add the joint.
      // We MUST have a single Box2D body on each body part to connect the joint.
      if (topAttach.bodyPart != null && bottomAttach.bodyPart != null
        && topAttach.complement != null && bottomAttach.complement != null) {

        topAttach.bodyPart.addToWorld(world);
        bottomAttach.bodyPart.addToWorld(world);
        // And now we may proceed.

        var jointDef = new Box2D.Dynamics.Joints.b2WheelJointDef();

        jointDef.bodyA = topAttach.bodyPart.body;
        jointDef.bodyB = bottomAttach.bodyPart.body;
        jointDef.localAnchorA = topAttach.complement.anchorPoint;
        jointDef.localAnchorB = bottomAttach.complement.anchorPoint;
        jointDef.localAxisA = topAttach.bodyPart.body.GetLocalVector(this.axis);

        //jointDef.frequencyHz = 0.0;
        //jointDef.dampingRatio = 1.0;

        var joint = world.CreateJoint(jointDef);

        this.joint = joint;


      }

    }
  , addToStage: function (stage, METER) {
      if (this.stage != null) { return; }
      this.stage = stage;

      var topAttach = this.attachments[0];
      var bottomAttach = this.attachments[1];
      // As with addToWorld(world), both body parts must be properly
      // attached to this joint in order for us to allow traversal
      // of the attachment graph. Even though the complement attachments
      // are not strictly necessary for adding anything to the stage,
      // we requrie them anyway so it is immediately apparent that
      // something is wrong when supposedly connected body parts
      // don't show up in the renderer.
      if (topAttach.bodyPart != null && bottomAttach.bodyPart != null
        && topAttach.complement != null && bottomAttach.complement != null) {
        topAttach.bodyPart.addToStage(stage, METER);
        topAttach.bodyPart.addToStage(stage, METER);
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
