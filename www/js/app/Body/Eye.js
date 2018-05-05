"use strict";
define([
        "app/Body/BodyPart"
      , "app/Mind"

      , "lib/Box2dWeb_dev"
      , "lib/pixi"
       ], function (BodyPart, Mind, Box2D, PIXI) {

  var Eye = BodyPart.extend({
    init: function(width, height, groupIndex) {
      /*
        The eye has one attachment point by default.
        0: Left-side Midpoint
      */
      var b2Vec2 = Box2D.Common.Math.b2Vec2;
      var attachments = [
        {
          anchorPoint: new b2Vec2(-width/2, 0)
        , bodyPart: null
        , complement: null
        }
      ];

      var junctions = [
        new Mind.AfferentJunction(this, function () {
          if (this.bodyPart.wall != null) {
            var rightEdge = this.bodyPart.body.GetWorldPoint( new b2Vec2(width/2, 0) );
            var wallLeftEdge = this.bodyPart.wall.body.GetWorldPoint( new b2Vec2(-this.bodyPart.wall.width/2, 0) );
            var distanceToWall = wallLeftEdge.x - rightEdge.x;
            return distanceToWall;
          }
          return Infinity;

        })
      ];

      this._super(attachments, junctions, groupIndex);

      this.width = width;
      this.height = height;

      this.body = null;
      this.graphics = null;

      this.wall = null; // the wall object

      this.name = "Eye";
    }
  , addToWorld: function (world) {
      if (this.world != null) { return; }

      this.world = world;

      var bodyDef = new Box2D.Dynamics.b2BodyDef();
      bodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;

      var polyFixture = new Box2D.Dynamics.b2FixtureDef();
      polyFixture.shape = new Box2D.Collision.Shapes.b2PolygonShape();
      polyFixture.density = 0.01;
      polyFixture.friction = 0.1;
      polyFixture.shape.SetAsBox(this.width/2, this.height/2);
      polyFixture.filter.groupIndex = this.groupIndex;

      var body = world.CreateBody(bodyDef);
      body.CreateFixture(polyFixture);

      var pos = new Box2D.Common.Math.b2Vec2(this.initialX, this.initialY);
      body.SetPosition(pos);
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

      // Fill
      graphics.beginFill(0xFFFFFF, 1);
      graphics.drawRect(0, 0, this.width * METER, this.height * METER);
      graphics.endFill();

      // Center Pivot
      graphics.pivot = new PIXI.Point(this.width * METER/2, this.height * METER/2);

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
      , type: "Eye"
      }];
    }

  });

  return Eye;

});