"use strict";
define([ "app/Body/BodyPart"
       , "lib/Box2dWeb_dev"
       , "lib/pixi"
       ], function (BodyPart, Box2D, PIXI) {

    /*
    Optional data settings for the wheel:

    radius       (default: 0.7)
    initialAngle (default: 0)
    density      (default: 1)
    friction     (default: 0.9)

    */

    var Wheel = BodyPart.extend({
    init: function (data, groupIndex, ID) {
      /*
        The wheel has a single attachment point at its center.
      */
      var b2Vec2 = Box2D.Common.Math.b2Vec2;
      var attachments = [{
          anchorPoint: new b2Vec2(0, 0)
        , bodyPart:    null
        , complement: null
        }];
      this._super(attachments, [], groupIndex, ID);

      if ( typeof(data) === 'undefined' ) { data = {}; }
      this.props = { // groupIndex default is handled by superclass
        radius: 0.7
      , initialAngle: 0
      , density: 1
      , friction: 0.9
      };

      for (var key in data) {
        if (typeof(data[key]) !== 'undefined' ) { this.props[key] = data[key] };
      }

      this.initialAngle = this.props.initialAngle; // addToWorld for joints expects this.initialAngle if the wheel is the source of that stage of addToWorld traversal

      this.body = null;
      this.graphics = null;
    }
  , addToWorld: function (world) {
      if (this.world != null) { return; }

      this.world = world;

      var bodyDef = new Box2D.Dynamics.b2BodyDef();
      bodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;

      var circleFixture = new Box2D.Dynamics.b2FixtureDef();
      circleFixture.shape = new Box2D.Collision.Shapes.b2CircleShape();
      circleFixture.density = this.props.density;
      circleFixture.friction = this.props.friction;
      circleFixture.shape.SetRadius(this.props.radius)
      circleFixture.filter.groupIndex = this.groupIndex;

      var body = world.CreateBody(bodyDef);
      body.CreateFixture(circleFixture);
      body.ID = this.ID;

      if (this.initialX !== null && this.initialY !== null) {
        var pos = new Box2D.Common.Math.b2Vec2(this.initialX, this.initialY);
        body.SetPosition(pos);
      }
      body.SetAngle(this.initialAngle);

      this.body = body;


      // Add any not-yet-added attached body parts to the world as well.
      this.attachments.forEach(function (attachment) {
        if (attachment.bodyPart != null) {
          attachment.bodyPart.addToWorld(world);
        }
      });
    }
  , addToStage: function (stage, METER) {
      if (this.stage != null) { return; }
      this.stage = stage;

      var graphics = new PIXI.Graphics();

      // Draw vars:
      var TIRE_WIDTH           = this.props.radius * METER / 6;
      var HUB_CAP_RADIUS       = this.props.radius * METER / 5;
      var HUB_CAP_BORDER_WIDTH = 1;
      var SPOKE_V_ARC_ANGLE    = 80 * Math.PI / 180;

      // Break pad
      graphics.beginFill(0xCCCCCC, 1);
      graphics.drawCircle(0, 0, this.props.radius * METER / 2);
      graphics.endFill();

      // Spokes
      graphics.lineStyle(1, 0x000000, 1);
      for (var i = 0; i < 8; ++i) {
        var a = i*2*Math.PI/8;
        var hubX  = HUB_CAP_RADIUS * Math.cos(a)
          , hubY  = HUB_CAP_RADIUS * Math.sin(a)
          , tireX = (this.props.radius * METER - TIRE_WIDTH) * Math.cos(a)
          , tireY = (this.props.radius * METER - TIRE_WIDTH) * Math.sin(a);

        var startX = HUB_CAP_RADIUS * Math.cos(a)
          , startY = HUB_CAP_RADIUS * Math.sin(a)
          , endX_1 = (this.props.radius * METER - TIRE_WIDTH) * Math.cos(a + SPOKE_V_ARC_ANGLE / 2)
          , endY_1 = (this.props.radius * METER - TIRE_WIDTH) * Math.sin(a + SPOKE_V_ARC_ANGLE / 2)
          , endX_2 = (this.props.radius * METER - TIRE_WIDTH) * Math.cos(a - SPOKE_V_ARC_ANGLE / 2)
          , endY_2 = (this.props.radius * METER - TIRE_WIDTH) * Math.sin(a - SPOKE_V_ARC_ANGLE / 2)
          ;

          graphics.moveTo(startX, startY);
          graphics.lineTo(endX_1, endY_1);

          graphics.moveTo(startX, startY);
          graphics.lineTo(endX_2, endY_2);
      }


      // Tire
      graphics.lineStyle(TIRE_WIDTH, 0x000000, 1);
      graphics.drawCircle(0, 0, this.props.radius * METER - TIRE_WIDTH / 2);

      // Hub cap
      graphics.lineStyle(HUB_CAP_BORDER_WIDTH, 0x000000, 1);
      graphics.beginFill(0xEEEEEE, 1);
      graphics.drawCircle(0, 0, HUB_CAP_RADIUS - HUB_CAP_BORDER_WIDTH / 2);
      graphics.endFill();

      this.graphics = graphics;

      stage.addChild(graphics);

      // Add any not-yet-added attached body parts to the stage as well.
      this.attachments.forEach(function (attachment) {
        if (attachment.bodyPart != null) {
          attachment.bodyPart.addToStage(stage, METER);
        }
      });
    }
  , data: function () {
      return [{
        body: this.body
      , graphics: this.graphics
      , type: "Wheel"
      }];
    }
  });

  return Wheel;

});