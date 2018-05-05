import Box2D from './lib/Box2dWeb_dev.js'
import 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js'

import PIXI from './lib/pixi.js'
import Utils from './lib/Utils.js'

import Mind from './app/Mind.js'
import Body from './app/Body.js'
import Creature from './app/Creature.js'
import Wall from './app/Wall.js'

// ----------
// Box2D Init
// ----------

// Variable Simplification
let b2Vec2 = Box2D.Common.Math.b2Vec2
let b2AABB = Box2D.Collision.b2AABB
let b2BodyDef = Box2D.Dynamics.b2BodyDef
let b2Body = Box2D.Dynamics.b2Body
let b2FixtureDef = Box2D.Dynamics.b2FixtureDef
let b2Fixture = Box2D.Dynamics.b2Fixture
let b2World = Box2D.Dynamics.b2World
let b2MassData = Box2D.Collision.Shapes.b2MassData
let b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
let b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
let b2DebugDraw = Box2D.Dynamics.b2DebugDraw
let b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef

// Create World (In the simulation, we will create a new world for each creature)
let world = new b2World( new b2Vec2(0, 10), true);

let fixDef = new b2FixtureDef;
fixDef.density = 1.0;
fixDef.friction = 0.5;
fixDef.restitution = 0.2;

let bodyDef = new b2BodyDef;

//create ground
bodyDef.type = b2Body.b2_staticBody;
fixDef.shape = new b2PolygonShape;
fixDef.shape.SetAsBox(20, 2);
bodyDef.position.Set(10, 400 / 30 + 1.8);
world.CreateBody(bodyDef).CreateFixture(fixDef);
bodyDef.position.Set(10, -1.8);
world.CreateBody(bodyDef).CreateFixture(fixDef);
fixDef.shape.SetAsBox(2, 14);
bodyDef.position.Set(-1.8, 13);
world.CreateBody(bodyDef).CreateFixture(fixDef);
bodyDef.position.Set(21.8, 13);
world.CreateBody(bodyDef).CreateFixture(fixDef);


// --------------- Assert: Basic World Is Initialized -------------------


// Add test objects
let testWall = new Wall.BasicWall(18, 7, 3, 15);
testWall.wallCollision = new Box2D.Dynamics.b2ContactListener;
testWall.totalForce=0;
testWall.wallCollision.BeginContact = function(contact) {
    if ((contact.GetFixtureA().GetBody()==testWall.body) || (contact.GetFixtureB().GetBody()==testWall.body))
        console.log("Wall Collision")
};
testWall.wallCollision.PostSolve = function(contact, impulse) {
    if ((contact.GetFixtureA().GetBody()==testWall.body) || (contact.GetFixtureB().GetBody()==testWall.body)){
        let x = Math.abs(impulse.normalImpulses[0]);
        let y = Math.abs(impulse.tangentImpulses[0]);
        let z = Math.sqrt(x*x+y*y);
        if (z>5){
            testWall.totalForce+=z;//create cutoff for tiny amounts of force!
            console.log(testWall.totalForce);
    }
}}
world.SetContactListener(testWall.wallCollision);
testWall.addToWorld(world);

let testCreature = new Creature.Car(4, 10, testWall);
testCreature.addToWorld(world);

//---------------------------------------------------

function debugRendererInit() {

    //setup debug draw
    let debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(document.getElementById("canvas").getContext("2d"));
    debugDraw.SetDrawScale(30.0);
    debugDraw.SetFillAlpha(0.5);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit | b2DebugDraw.e_centerOfMassBit);
    world.SetDebugDraw(debugDraw);

    window.setInterval(update, 1000 / 60);

    //mouse

    let mouseX, mouseY, mousePVec, isMouseDown, selectedBody, mouseJoint;
    let canvasPosition = getElementPosition(document.getElementById("canvas"));

    document.addEventListener("mousedown", function(e) {
         isMouseDown = true;
         handleMouseMove(e);
         document.addEventListener("mousemove", handleMouseMove, true);
    }, true);

    document.addEventListener("mouseup", function() {
         document.removeEventListener("mousemove", handleMouseMove, true);
         isMouseDown = false;
         mouseX = undefined;
         mouseY = undefined;
    }, true);

    function handleMouseMove(e) {
         mouseX = (e.clientX - canvasPosition.x) / 30;
         mouseY = (e.clientY - canvasPosition.y) / 30;
    };

    function getBodyAtMouse() {
         mousePVec = new b2Vec2(mouseX, mouseY);
         let aabb = new b2AABB();
         aabb.lowerBound.Set(mouseX - 0.001, mouseY - 0.001);
         aabb.upperBound.Set(mouseX + 0.001, mouseY + 0.001);

         // Query the world for overlapping shapes.

         selectedBody = null;
         world.QueryAABB(getBodyCB, aabb);
         return selectedBody;
    }

    function getBodyCB(fixture) {
         if(fixture.GetBody().GetType() != b2Body.b2_staticBody) {
                if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mousePVec)) {
                     selectedBody = fixture.GetBody();
                     return false;
                }
         }
         return true;
    }

    //update

    function update() {

         if(isMouseDown && (!mouseJoint)) {
                let body = getBodyAtMouse();
                if(body) {
                     let md = new b2MouseJointDef();
                     md.bodyA = world.GetGroundBody();
                     md.bodyB = body;
                     md.target.Set(mouseX, mouseY);
                     md.collideConnected = true;
                     md.maxForce = 300.0 * body.GetMass();
                     mouseJoint = world.CreateJoint(md);
                     body.SetAwake(true);
                }
         }

         if(mouseJoint) {
                if(isMouseDown) {
                     mouseJoint.SetTarget(new b2Vec2(mouseX, mouseY));
                } else {
                     world.DestroyJoint(mouseJoint);
                     mouseJoint = null;
                }
         }

    };

    //helpers

    //http://js-tut.aardon.de/js-tut/tutorial/position.html
    function getElementPosition(element) {
         let elem=element, tagname="", x=0, y=0;

         while((typeof(elem) == "object") && (typeof(elem.tagName) != "undefined")) {
                y += elem.offsetTop;
                x += elem.offsetLeft;
                tagname = elem.tagName.toUpperCase();

                if(tagname == "BODY")
                     elem=0;

                if(typeof(elem) == "object") {
                     if(typeof(elem.offsetParent) == "object")
                            elem = elem.offsetParent;
                }
         }

         return {x: x, y: y};
    }
};


//---------------------------------------------------

// PIXI Setup

function pixiRendererInit() {
    // PIXI Init stuff
    let METER = 30; // 30px per meter
    let stage = new PIXI.Stage(0x66FF99);
    let renderer = PIXI.autoDetectRenderer(600, 400);
    document.body.appendChild(renderer.view);

    testCreature.addToStage(stage, METER);
    testWall.addToStage(stage, METER);

    let entityData = testCreature.bodyPartData().concat( testWall.data() );

    requestAnimFrame( animate );

    function animate() {
        requestAnimFrame( animate );

        world.Step(1 / 60, 10, 10);
        testCreature.brain.think();

        world.DrawDebugData();
        entityData.forEach( function (datum) {
            if (datum.body != null && datum.graphics != null) {
                let pos = datum.body.GetPosition();
                datum.graphics.position.x = pos.x * METER;
                datum.graphics.position.y = pos.y * METER;
                datum.graphics.rotation = datum.body.GetAngle();
            }
        });



        renderer.render( stage );

        world.ClearForces();
    }

}

$( document ).ready(function(){
    debugRendererInit();
    pixiRendererInit();
});
