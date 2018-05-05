"use strict";
define([ "app/Body/BodyPart"
       , "lib/Box2dWeb_dev"
       , "lib/pixi"
       ], function (BodyPart, Box2D, PIXI) {

  var Vertebra = BodyPart.extend({
    init: function (data, groupIndex, ID) {

      /*
        The Vertebra has attachment points at the top and bottom.

        The attachment indices proceed clockwise from the top-left corner:
        0: Bottom
        1: Top

        The data argument can be used to set the following values:
        width
        height
        density
        friction

      */

      // Initialize properties:
      if ( typeof(data) === 'undefined' ) { data = {}; }
      this.props = {
           width: 0.1
      ,   height: 0.5
      ,  density: 1.0
      , friction: 0.5
      }

      for (var key in data) {
        if (typeof(data[key]) !== 'undefined' ) { this.props[key] = data[key] };
      }

      this.body = null;
      this.graphics = null;

      var b2Vec2 = Box2D.Common.Math.b2Vec2;
      var attachments = [
        {
          anchorPoint: new b2Vec2(0, this.props.height/2) // Bottom
        , bodyPart:    null
        , complement: null
        }
      , {
          anchorPoint: new b2Vec2(0, -this.props.height/2) // Top
        , bodyPart:    null
        , complement: null
        }
      ];

      this._super(attachments, [], groupIndex, ID);

      this.name = "Vertebra";
    }
  , addToWorld: function (world) {
      if (this.world != null) { return; }

      this.world = world;

      var bodyDef = new Box2D.Dynamics.b2BodyDef();
      bodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;

      var polyFixture = new Box2D.Dynamics.b2FixtureDef();
      polyFixture.shape = new Box2D.Collision.Shapes.b2PolygonShape();
      polyFixture.density = this.props.density;
      polyFixture.friction = this.props.friction;
      polyFixture.shape.SetAsBox(this.props.width/2, this.props.height/2);
      polyFixture.filter.groupIndex = this.groupIndex;

      var body = world.CreateBody(bodyDef);
      body.CreateFixture(polyFixture);
      body.ID = this.ID;
      
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
      var tipHeight = this.props.height * METER * 0.2;
      var topLeftX = 0
        , topLeftY = tipHeight
        , topTipX = this.props.width * METER / 2
        , topTipY = 0
        , topRightX = this.props.width * METER
        , topRightY = tipHeight
        , botRightX = this.props.width * METER
        , botRightY = this.props.height * METER
        , botTipX = this.props.width * METER / 2
        , botTipY = this.props.height * METER - tipHeight
        , botLeftX = 0
        , botLeftY = this.props.height * METER
        ;

      graphics.lineStyle(1, 0x000000, 1);
      graphics.beginFill(0xFFFFFF, 1);
      graphics.moveTo( topLeftX, topLeftY );
      graphics.lineTo( topTipX, topTipY );
      graphics.lineTo( topRightX, topRightY );
      graphics.lineTo( botRightX, botRightY );
      graphics.lineTo( botTipX, botTipY );
      graphics.lineTo( botLeftX, botLeftY );
      graphics.lineTo( topLeftX, topLeftY );

      graphics.endFill();

      // Center Pivot
      graphics.pivot = new PIXI.Point(this.props.width * METER/2, this.props.height * METER/2);

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
      , type: "Vertebra"
      }];
    }
  });

  return Vertebra;

});