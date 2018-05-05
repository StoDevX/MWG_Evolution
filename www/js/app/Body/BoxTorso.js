"use strict";
define([ "app/Body/BodyPart"
       , "lib/Box2dWeb_dev"
       , "lib/pixi"
       , "lib/Utils"
       ], function (BodyPart, Box2D, PIXI, Utils) {

        /*
          Default data options:
          initialX     (default: 4)
          initialY     (default: 10)
          initialAngle (default: 0)
          width        (default: 4)
          height       (default: 1)
          density      (default: 1)
          friction     (default: 0.01)
        */

  var BoxTorso = BodyPart.extend({
    init: function (data, groupIndex, ID) {
      /*
        The BoxTorso has attachment points at each corner and
        at the midpoints of each side.

        The attachment indices proceed clockwise from the top-left corner:
        0: Top-Left Corner
        1: Top Midpoint
        2: Top-Right Corner
        3: Right Midpoint
        4: Bottom-Right Corner
        5: Bottom Midpoint
        6: Bottom-Left Corner
        7: Left Midpoint

        As far as I can tell, the Y-Axis points down for a Box2D
        body's local coordinates.

      */

      // Initialize properties:
      if ( typeof(data) === 'undefined' ) { data = {}; }
      this.props = {
        initialX: 4
      , initialY: 10
      , initialAngle: 0
      , width: 4
      , height: 1
      , density: 1
      , friction: 0.01
      };

      for (var key in data) {
        if (typeof(data[key]) !== 'undefined' ) { this.props[key] = data[key] };
      }



      var b2Vec2 = Box2D.Common.Math.b2Vec2;
      var attachments = [
        {
          anchorPoint: new b2Vec2(-this.props.width/2, -this.props.height/2) // Top-Left Corner
        , bodyPart:    null
        , complement: null
        }
      , {
          anchorPoint: new b2Vec2(0, -this.props.height/2) // Top Midpoint
        , bodyPart:    null
        , complement: null
        }
      , {
          anchorPoint: new b2Vec2(this.props.width/2, -this.props.height/2) // Top-Right Corner
        , bodyPart:    null
        , complement: null
        }
      , {
          anchorPoint: new b2Vec2(this.props.width/2, 0) // Right Midpoint
        , bodyPart:    null
        , complement: null
        }
      , {
          anchorPoint: new b2Vec2(this.props.width/2, this.props.height/2) // Bottom-Right Corner
        , bodyPart:    null
        , complement: null
        }
      , {
          anchorPoint: new b2Vec2(0, this.props.height/2) // Bottom Midpoint
        , bodyPart:    null
        , complement: null
        }
      , {
          anchorPoint: new b2Vec2(-this.props.width/2, this.props.height/2) // Bottom-Left Corner
        , bodyPart:    null
        , complement: null
        }
      , {
          anchorPoint: new b2Vec2(-this.props.width/2, 0) // Left Midpoint
        , bodyPart:    null
        , complement: null
        }
      ];

      // Note: There is nothing to control on this torso, so it has no junctions.
      this._super(attachments, [], groupIndex, ID);


      this.initialX = this.props.initialX;
      this.initialY = this.props.initialY;
      this.initialAngle = this.props.initialAngle;

      this.body = null;
      this.graphics = null;

      this.name = "BoxTorso";
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

      // Draw variables:
      var MOUTH_HEIGHT_FACTOR        = 0.8; // mouth height as a percentage of torso height
      var MOUTH_CORNER_HEIGHT_FACTOR = 0.4; // as a percentage of torso height
      var MOUTH_CORNER_WIDTH_FACTOR  = 0.6; // as a percentage of torso width
      var MOUTH_BOTTOM_WIDTH_FACTOR  = 0.4; // as a percentage of torso width

      var TONGUE_HEIGHT_FACTOR = MOUTH_HEIGHT_FACTOR / 3; // The tongue top will always interesect with the mouth corner, but this sets the height on the torso edge.

      var TEETH_TOP_NUM                = this.props.width * 2.5;
      var TEETH_TOP_REDUCTION_FACTOR   = 0.9;
      var TEETH_TOP_ROOT_HEIGHT_FACTOR = 0.3;
      var TEETH_TOP_ROOT_WIDTH_FACTOR  = MOUTH_CORNER_WIDTH_FACTOR * (1 - TEETH_TOP_REDUCTION_FACTOR) / (1 - Math.pow(TEETH_TOP_REDUCTION_FACTOR, TEETH_TOP_NUM));

      var TEETH_BOT_NUM                = this.props.width * 2;
      var TEETH_BOT_REDUCTION_FACTOR   = 0.9;
      var TEETH_BOT_ROOT_HEIGHT_FACTOR = 0.4;
      var TEETH_BOT_ROOT_WIDTH_FACTOR  = MOUTH_BOTTOM_WIDTH_FACTOR * (1 - TEETH_BOT_REDUCTION_FACTOR) / (1 - Math.pow(TEETH_BOT_REDUCTION_FACTOR, TEETH_BOT_NUM));


      // Base fill:
      graphics.beginFill(0x4B5320, 1);
      graphics.drawRect(0, 0, this.props.width * METER, this.props.height * METER);
      graphics.endFill();

      // Mouth background fill:
      var mouthTopX      = this.props.width  * METER
        , mouthTopY      = this.props.height * METER * (1 - MOUTH_HEIGHT_FACTOR)
        , mouthCornerX   = this.props.width  * METER * (1 - MOUTH_CORNER_WIDTH_FACTOR)
        , mouthCornerY   = this.props.height * METER * (1 - MOUTH_CORNER_HEIGHT_FACTOR)
        , mouthBottomX_1 = this.props.width  * METER * (1 - MOUTH_BOTTOM_WIDTH_FACTOR)
        , mouthBottomY_1 = this.props.height * METER
        , mouthBottomX_2 = this.props.width  * METER
        , mouthBottomY_2 = this.props.height * METER
        ;
      var mouth_top_cp1_X = mouthTopX
        , mouth_top_cp1_Y = mouthTopY
        , mouth_top_cp2_X = mouthCornerX   + this.props.width * METER * MOUTH_CORNER_WIDTH_FACTOR / 2
        , mouth_top_cp2_Y = mouthTopY
        , mouth_bot_cp1_X = mouthCornerX
        , mouth_bot_cp1_Y = mouthCornerY
        , mouth_bot_cp2_X = mouthBottomX_1 - (mouthBottomX_1 - mouthCornerX) / 2
        , mouth_bot_cp2_Y = mouthBottomY_2
        ;

      graphics.beginFill(0x000000, 1);
      graphics.moveTo(mouthTopX, mouthTopY);
      graphics.bezierCurveTo(mouth_top_cp1_X, mouth_top_cp1_Y, mouth_top_cp2_X, mouth_top_cp2_Y, mouthCornerX, mouthCornerY);
      graphics.bezierCurveTo(mouth_bot_cp1_X, mouth_bot_cp1_Y, mouth_bot_cp2_X, mouth_bot_cp2_Y, mouthBottomX_1, mouthBottomY_1);
      graphics.lineTo(mouthBottomX_2, mouthBottomY_2);
      graphics.endFill();

      // Tongue fill:
      var tongueTopX = this.props.width  * METER
        , tongueTopY = this.props.height * METER * (1 - TONGUE_HEIGHT_FACTOR)
        ;
      var tongue_top_cp1_X = mouthCornerX + this.props.width * METER * MOUTH_CORNER_WIDTH_FACTOR / 2
        , tongue_top_cp1_Y = mouthTopY + this.props.height * METER / 4
        , tongue_top_cp2_X = mouthCornerX + this.props.width * METER * MOUTH_CORNER_WIDTH_FACTOR / 2
        , tongue_top_cp2_Y = mouthBottomY_1 + this.props.height * METER / 3
        ;

      graphics.beginFill(0xCF2727, 1);
      graphics.moveTo(tongueTopX, tongueTopY);
      graphics.bezierCurveTo(tongue_top_cp1_X, tongue_top_cp1_Y, tongue_top_cp2_X, tongue_top_cp2_Y, mouthCornerX, mouthCornerY);
      graphics.bezierCurveTo(mouth_bot_cp1_X, mouth_bot_cp1_Y, mouth_bot_cp2_X, mouth_bot_cp2_Y, mouthBottomX_1, mouthBottomY_1);
      graphics.lineTo(mouthBottomX_2, mouthBottomY_2);
      graphics.endFill();

      // Top teeth fill:
      var curToothWidth  = 0
        , curToothHeight = 0
        , frontX = mouthTopX
        , frontY = mouthTopY
        , tipX   = 0
        , tipY   = 0
        , backX  = 0
        , backY  = 0
        , teeth_cp1_X = 0
        , teeth_cp1_Y = 0
        , teeth_cp2_X = 0
        , teeth_cp2_Y = 0
        , teeth_drop = (mouthCornerY - mouthTopY) / TEETH_TOP_NUM // drop between the relative fronts of each tooth
        ;
      graphics.beginFill(0xFFFFFF, 1);
      for (var i = 0; i < TEETH_TOP_NUM; ++i) {
        curToothWidth = this.props.width * METER * TEETH_TOP_ROOT_WIDTH_FACTOR * Math.pow(TEETH_TOP_REDUCTION_FACTOR, i);
        curToothHeight = this.props.height * METER * TEETH_TOP_ROOT_HEIGHT_FACTOR * Math.pow(TEETH_TOP_REDUCTION_FACTOR, i);

        backX = frontX - curToothWidth;
        backY = frontY + teeth_drop;
        tipX  = frontX - (frontX - backX) / 2;
        tipY  = frontY + curToothHeight; // TODO: Bezier curve calculation + height

        teeth_cp1_X = frontX + curToothWidth / 3;
        teeth_cp1_Y = frontY + curToothHeight / 3;
        teeth_cp2_X = teeth_cp1_X;
        teeth_cp2_Y = teeth_cp1_Y;

        // Draw tooth:
        graphics.moveTo(frontX, frontY);
        graphics.bezierCurveTo(teeth_cp1_X, teeth_cp1_Y, teeth_cp2_X, teeth_cp2_Y, tipX, tipY);

        teeth_cp1_X = backX + curToothWidth / 3;
        teeth_cp1_Y = backY + curToothHeight / 3;
        teeth_cp2_X = teeth_cp1_X;
        teeth_cp2_Y = teeth_cp1_Y;

        graphics.bezierCurveTo(teeth_cp1_X, teeth_cp1_Y, teeth_cp2_X, teeth_cp2_Y, backX, backY);


        // Set front of next tooth
        frontX = backX;
        frontY = backY;
      }
      graphics.endFill();

      // Bottom teeth fill:

      frontX = mouthBottomX_2;
      frontY = mouthBottomY_2;
      backY = frontY;

      graphics.beginFill(0xFFFFFF, 1);
      for (var i = 0; i < TEETH_BOT_NUM; ++i) {
        curToothWidth = this.props.width * METER * TEETH_BOT_ROOT_WIDTH_FACTOR * Math.pow(TEETH_BOT_REDUCTION_FACTOR, i);
        curToothHeight = this.props.height * METER * TEETH_BOT_ROOT_HEIGHT_FACTOR * Math.pow(TEETH_BOT_REDUCTION_FACTOR, i);

        backX = frontX - curToothWidth;
        tipX  = frontX - (frontX - backX) / 2;
        tipY  = frontY - curToothHeight; // TODO: Bezier curve calculation + height

        teeth_cp1_X = frontX + curToothWidth / 3;
        teeth_cp1_Y = frontY - curToothHeight / 3;
        teeth_cp2_X = teeth_cp1_X;
        teeth_cp2_Y = teeth_cp1_Y;

        // Draw tooth:
        graphics.moveTo(frontX, frontY);
        graphics.bezierCurveTo(teeth_cp1_X, teeth_cp1_Y, teeth_cp2_X, teeth_cp2_Y, tipX, tipY);

        teeth_cp1_X = backX + curToothWidth / 3;
        teeth_cp1_Y = backY - curToothHeight / 3;
        teeth_cp2_X = teeth_cp1_X;
        teeth_cp2_Y = teeth_cp1_Y;

        graphics.bezierCurveTo(teeth_cp1_X, teeth_cp1_Y, teeth_cp2_X, teeth_cp2_Y, backX, backY);

        // Set front of next tooth
        frontX = backX;
      }
      graphics.endFill();


      // Eye fill
      // Eye positioning and size depends on the mouth corner

      var eyeX     = mouthCornerX
        , eyeY     = mouthCornerY / 2
        , eyeRad   = mouthCornerY / 6
        , pupilRad = eyeRad / 2
        ;
      graphics.beginFill(0xFFFFFF, 1);
      graphics.drawCircle(eyeX, eyeY, eyeRad);
      graphics.endFill();
      graphics.beginFill(0x000000, 1);
      graphics.drawCircle(eyeX, eyeY, pupilRad);
      graphics.endFill();

      // Gills fill
      // Gills positioning depends on the mouth corner
      var numGills = 5;
      var gillRootX = mouthCornerX / (numGills + 2)
        , gillRootY = mouthCornerY / 2
        , gillWidth = 2
        ;
      graphics.lineStyle(gillWidth, 0x000000, 1);
      for (var i = 0; i < numGills; ++i) {
        graphics.moveTo(gillRootX + i * gillRootX, gillRootY);
        graphics.lineTo(gillRootX + (1+ i) * gillRootX, mouthCornerY);
      }



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
        type: "BoxTorso"
      , body: this.body
      , graphics: this.graphics
      }];
    }
  });

  return BoxTorso;

});