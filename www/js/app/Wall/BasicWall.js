"use strict";
define([
        "app/Body/BodyPart"
      , "app/Mind"

      , "lib/Class"
      , "lib/Box2dWeb_dev"
      , "lib/pixi"
       ], function (BodyPart, Mind, Class, Box2D, PIXI) {

  var BasicWall = Class.extend({
    init: function (initialX, initialY, width, height) {
      this.name = "BasicWall";

      this.initialX = initialX;
      this.initialY = initialY;
      this.width    = width;
      this.height   = height;

      this.world = null;
      this.body = null;

      this.stage = null;
      this.graphics = null;

      this.wallCollision = new Box2D.Dynamics.b2ContactListener;
      this.totalForce=0;
      /*this.wallCollision.BeginContact = function(contact) {
        if (contact.GetFixtureA().GetBody()==this.body)
            console.log("Wall is Fixture A")
        if (contact.GetFixtureB().GetBody()==this.body)
            console.log("Wall is Fixture B")

      };*/
      //this.hasCollided = false;
      this.wallCollision.PostSolve = function(contact, impulse) {
        if ((contact.GetFixtureA().GetBody()==this.body) || (contact.GetFixtureB().GetBody()==this.body)){
            var x = Math.abs(impulse.normalImpulses[0]);
            var y = Math.abs(impulse.tangentImpulses[0]);
            var z = Math.sqrt(x*x+y*y);
            if (z>4){
                this.totalForce+=z;//create cutoff for tiny amounts of force!
                //console.log(this.totalForce);
            }
      }}.bind(this);


    }
  , addToWorld: function (world) {
      if (this.world != null) { return; }
      this.world = world;

      var bodyDef = new Box2D.Dynamics.b2BodyDef();
      bodyDef.type = Box2D.Dynamics.b2Body.b2_staticBody;

      var polyFixture = new Box2D.Dynamics.b2FixtureDef();
      polyFixture.shape = new Box2D.Collision.Shapes.b2PolygonShape();
      polyFixture.density = 1;
      polyFixture.friction = 0.01;
      polyFixture.restitution = .05;
      polyFixture.shape.SetAsBox(this.width/2, this.height/2);
      polyFixture.filter.groupIndex = this.groupIndex;

      var body = world.CreateBody(bodyDef);
      body.CreateFixture(polyFixture);

      var pos = new Box2D.Common.Math.b2Vec2(this.initialX, this.initialY);
      body.SetPosition(pos);
      body.SetAngle(this.initialAngle);

      this.body = body;
      this.body.mobileWebGraphicsName = "BasicWall";

      world.SetContactListener(this.wallCollision);

    }
  , addToStage: function (stage, METER) {
      if (this.stage != null) { return; }
      this.stage = stage;

      var graphics = new PIXI.Graphics();

      // Fill
      graphics.beginFill(0x809696, 1);
      graphics.drawRect(0, 0, this.width * METER, this.height * METER);
      graphics.endFill();

      // Center Pivot
      graphics.pivot = new PIXI.Point(this.width * METER/2, this.height * METER/2);

      this.graphics = graphics;

      stage.addChild(graphics);
    }
  , data: function () {
      return [{
        body: this.body
      , graphics: this.graphics
      }];
    }
  });

  return BasicWall;

});