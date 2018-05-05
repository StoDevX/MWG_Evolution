"use strict";
define(["lib/Class"], function (Class) {

  // ----------------------------------------------------------------------------
  // BodyPart:
  // ----------------------------------------------------------------------------

  /* The idea of the body part is somewhat fluid. It
   * could be an arm, or an eye, or a wheel, etc.

   * A key thing to remember is that each body part
   * needs to implement the data() method to
   * provide information about its Box2D bodies
   * and Pixi graphics objects.

   * --------
   * Values:
   * --------

   * attachments
   *  An array of attachment points.
   *  An attachment point looks like this
   *  when it is first initialized:
   *
   *  {
   *    anchorPoint: new Box2D.b2Vec2(x, y)
   *  , bodyPart: null
   *  , complement: null
   *  }
   *
   *  The anchor point is the physical location of
   *  this attachment point on the box2D body. It is a
   *  b2Vec2 object.
   *
   *  You should set the anchor points inside the
   *  constructor for a subclass.
   *
   *  The complement is the corresponding attachment point
   *  on the bodyPart.
   *
   *  Note that attachment points on joints do not need anchor points.
   *
   *  As a futher node, if an attachment point is on
   *  a part represented by a Box2D body, its bodyPart
   *  reference should lead to a part represented by a
   *  Box2D joint, and vice versa. This is because, as far as I can
   *  tell there is no way to connect two Box2D bodies without a joint,
   *  and no way to connect two Box2D joints without a body.
   *

   * junctions
   *  An array of junctions that interface with the body part.

   * initialX
   *  See below.

   * initialY
   *  See below.

   * initialAngle
   *  See below.

   *-----
   *  The initial position and angle values are applied to the Box2D body
   *  immediately after the Box2D body is added to the Box2D world.
   *  They are null (or 0, in the case of initialAngle) by default,
   *  but if set, certain joints will try to use them to extrapolate the
   *  positions of connected body parts.
   *  The extrapolation process is described below in general pseudocode for a
   *  joint with an initial reference angle, but you should note that certain
   *  joints may clamp the angle within their limits if limits are set,
   *  etc, depending on the joint.
   *
   *  Position Extrapolation Process:
   *
   *  Given two body parts A and B, connected by a joint body part J at
   *  attachment points attachA and attachB, respectively:
   *
   *  IMPORTANT:
   *  It is assumed that creatures are always added through the world
   *  through a body part represented by a Box2D body, and not through
   *  a joint.
   *
   *  // A function to set up the initialX, initialY, and initialAngle
   *  // properties of the next body part based on the body part
   *  // already added to the world. This should be defined as a
   *  // method on the joint object.
   *  // Assumes A is in the world, and B is not in the world.
   *  function setInitialBodyValues(attachA, attachB) {
   *    // See Body.WeldJoint for an example implementation
   *  }
   *
   *  // Detect the bodyPart not yet added to the world
   *  If A.body is not null and B.body is null:
   *    // the reference angle of the joint is applied to
   *    // the initial angle of B
   *    setInitialBodyValues(A, B)
   *  Else:
   *    Both body parts are already in the world, so assume that
   *    they are already placed as intended.
   * -----

   * world
   *  The Box2D world object that contains this body part.
   *  If world is null, it is assumed that addToWorld has not
   *  yet been called on this body part. This is important, because
   *  the addToWorld(world) function traverses the attachment graph and
   *  needs to avoid calling addToWorld(world) on body parts that have
   *  already been added. Remember to always set this.world in your
   *  overridden addToWorld(world) functions when your immediate
   *  superclass is the BodyPart abstract base class.

   * stage
   *  The PIXI Stage that renders the body part. If stage is null,
   *  it is assumed that addToStage has not yet been called on this
   *  body part. This is important for the same reasons as world.

   * groupIndex
   *  The index of the collision group for this object. This is used
   *  to set up collision filtering on fixtures during addToWorld.
   *  Two fixtures with the same negative groupIndex will never collide,
   *  but two fixtures with the same positive groupIndex will always collide.
   *  Setting collideConnected (true/false) on joint definitions can also affect
   *  whether connected bodies collide. collideConnected is false by default
   *  for most joints.

   * --------
   * Methods:
   * --------

   * data()
   *  Returns an array of objects containing
   *  the Box2D bodies and Pixi Graphics objhects subordinate
   *  to this body part by recursively calling data() on all
   *  subordinate body parts.
   *  A data object looks like this:
   *  {
   *    body: the Box2D body,
   *    graphics: the Pixi Graphics object
   *  }

   * attach (this_attach_index, other_bodyPart, other_attach_index)
   *  Attaches other_bodyPart to this body part at this_attach_index
   *  on this body part and this body part to other_bodyPart at
   *  other_attach_index on other_bodyPart by setting the appropriate
   *  references in each bodyPart's attachments array.

   * addToWorld (world)
   *  Adds this body part to the specified Box2D world by creating
   *  the necessary bodies using the world factory object.
   *  This abstract method should be overridden in a subclass.
   *  If you implement addToWorld(world) on a bodyPart represented
   *  by a joint in the Box2D world, you should first ensure that its
   *  attached body parts are added to the world, then create the joint using
   *  the Box2D bodies for those body parts, then add the joint to the world.

   * addToStage (stage, METER)
   *  Adds this body part to the specified Pixi stage by creating
   *  the necessary graphics objects and adding them to the stage.
   *  The pixel size of each graphics object is determined by
   *  multiplying the size of its corresponding Box2D body by METER.
   *  This abstract method should be overridden in a subclass.
   *  Like, addToWorld(world), addToStage(stage, METER) traverses
   *  the attachment graph to ensure all attached body parts are
   *  added to the stage.

   */

  var BodyPart = Class.extend({
    init: function (attachments, junctions, groupIndex, ID) {
      this.attachments = attachments || [];
      this.junctions = junctions || [];
      if (typeof(groupIndex) === 'undefined') { groupIndex = 0; }

      this.ID = ID;
      this.initialX = null;
      this.initialY = null;
      this.initialAngle = 0;

      this.groupIndex = groupIndex;

      this.world = null;
      this.stage = null;

      this.name = "BodyPart";
    }
  , attach: function (this_attach_index, other_bodyPart, other_attach_index) {
      var local = this.attachments[this_attach_index];
      var other = other_bodyPart.attachments[other_attach_index];

      /*
         More complex body parts can set up body part forwarding for
         each attachment point. To set up body part forwarding, add a
         bodyPartForwarding array as a property of your custom
         body part object. The array should contain references to
         body parts that correspond to attachment points by index.

         The array is allowed to be discontinuous if, for example,
         you wanted to forward body parts for only attachment points
         0 and 15.

         If you are setting up forwarding, you should also make sure that
         the attachment point for a forwarded index on the forwarding body
         part is set to an attachment point on the corresponding, forwarded-to
         body part. The attach() function will look for attachment points on
         the body part you call it on and on the other body part you pass as
         an argument.
      */

      var localForwards = this.bodyPartForwarding || [];
      var otherForwards = other_bodyPart.bodyPartForwarding || [];

      // Set body part references.
      local.bodyPart = otherForwards[other_attach_index] || other_bodyPart;
      other.bodyPart = localForwards[this_attach_index] || this;

      // Set complement references.
      local.complement = other;
      other.complement = local;
    }
  , addToWorld: function (world) { throw "Abstract method on superclass requires override."; }
  , addToStage: function (stage, METER) { throw "Abstract method on superclass requires override."; }
  , data: function () { throw "Abstract method on superclass requires override."; }
  });

  return BodyPart;

});