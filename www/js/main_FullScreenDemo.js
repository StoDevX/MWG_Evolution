requirejs.config({
    // The shim loads Box2D as if it were a
    // module written for require.js.
    shim: {
        'lib/Box2dWeb': {
                //Once loaded, use the global 'Box2D' as the
                //module value.
                exports: 'Box2D'
        }
      , 'lib/Box2dWeb_dev': {
                //Once loaded, use the global 'Box2D' as the
                //module value.
                exports: 'Box2D'
        }
    },

    paths: {
        jquery: "https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min"
    }

});

"use strict";
require([
      "jquery"
    , "lib/Box2dWeb_dev"
    , "lib/pixi"
    , "lib/Utils"
    , "app/Mind"
    , "app/Body"
    , "app/Creature"
    , "app/Wall"
    , "app/Generation/Generator"
    ], function ($, Box2D, PIXI, Utils, Mind, Body, Creature, Wall, Generator) {


    // console.log($);
    // console.log(Box2D);
    // console.log(PIXI);
    // console.log(PhysicsBox);
    // console.log(Mind);
    // console.log(Body);
    // console.log(Wall);



// PIXI Setup

    function init() {


        // ----------
        // Box2D Init
        // ----------

        // Variable Simplification
        var                     b2Vec2 = Box2D.Common.Math.b2Vec2
            ,                   b2AABB = Box2D.Collision.b2AABB
            ,                b2BodyDef = Box2D.Dynamics.b2BodyDef
            ,                   b2Body = Box2D.Dynamics.b2Body
            ,             b2FixtureDef = Box2D.Dynamics.b2FixtureDef
            ,                b2Fixture = Box2D.Dynamics.b2Fixture
            ,                  b2World = Box2D.Dynamics.b2World
            ,               b2MassData = Box2D.Collision.Shapes.b2MassData
            ,           b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
            ,            b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
            ,              b2DebugDraw = Box2D.Dynamics.b2DebugDraw
            ,          b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef
            ;


        // Create World
        var world = new b2World( new b2Vec2(0, 10), true);

/*
        The world will be the full width of the screen and the full height of the screen.
        The meter size in pixels will depend on the ratio of the screen height in pixels
        to the fixed height of the world in meters.
*/
        var pixelWidth  = window.innerWidth;
        var pixelHeight = window.innerHeight;
        var aspectRatio = pixelWidth / pixelHeight;

        var worldHeight = 17; // meters
        var worldWidth  = worldHeight * aspectRatio;

        var METER = pixelHeight / worldHeight; // pixels per meter


        var fixDef = new b2FixtureDef;
        fixDef.shape = new b2PolygonShape;
        fixDef.density = 1.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;

        var bodyDef = new b2BodyDef;
        bodyDef.type = b2Body.b2_staticBody;


        // create ground
        fixDef.shape.SetAsBox(worldWidth, 2);
        bodyDef.position.Set(worldWidth / 2, worldHeight + 1.8);
        world.CreateBody(bodyDef).CreateFixture(fixDef);

        // create ceiling
        bodyDef.position.Set(worldWidth / 2, -1.8);
        world.CreateBody(bodyDef).CreateFixture(fixDef);

        // create backstop
        fixDef.shape.SetAsBox(2, worldHeight);
        bodyDef.position.Set(-1.8, worldHeight / 2);
        world.CreateBody(bodyDef).CreateFixture(fixDef);


        // create frontstop
        bodyDef.position.Set(worldWidth + 1.8, worldHeight / 2);
        world.CreateBody(bodyDef).CreateFixture(fixDef);


        // --------------- Assert: Basic World Is Initialized -------------------


        var testWall = new Wall.BasicWall(worldWidth - worldWidth / 40, worldHeight / 2, worldWidth / 20, worldHeight);
        testWall.addToWorld(world);

        testGenerator = new Generator();
        var dat = testGenerator.GenerateRandData(2)
        var parent1 = new Creature.Scorpion(dat[0], testWall);
        var parent2 = new Creature.Scorpion(dat[1], testWall);

        console.log(testGenerator.GenerateRandData(5));
        var testCreature = new Creature.Scorpion(testGenerator.Generate1(parent1, parent2), testWall);
        console.log(testCreature.props);

        testCreature.addToWorld(world);

        //---------------------------------------------------




        // PIXI Init stuff
        var paused = true; // Start paused

        var interactive = true;
        var stage = new PIXI.Stage(0x66FF99, interactive);
        var renderer = PIXI.autoDetectRenderer(pixelWidth, pixelHeight);
        document.body.appendChild(renderer.view);

        testCreature.addToStage(stage, METER);
        testWall.addToStage(stage, METER);


        // Add buttons:

        var testButton = new PIXI.Graphics();
        testButton.beginFill(0x000000, 1);
        testButton.drawRect(0, 0, 3 * METER, 1.2 * METER);
        testButton.endFill();
        testButton.position.x = 0;
        testButton.position.y = 0;
        testButton.interactive = interactive;

        var buttonText = new PIXI.Text("Play", {font: METER + "px Arial", fill:"red"});
        testButton.addChild(buttonText);
        buttonText

        testButton.click = function() {
            if (buttonText.text === "Play") {
                buttonText.setText("Pause");
                paused = false;
                requestAnimFrame( animate );
            }
            else {
                buttonText.setText("Play");
                paused = true;
            }

        }

        stage.addChild(testButton);




        var entityData = testCreature.bodyPartData().concat( testWall.data() );

        requestAnimFrame( animate );

        function animate() {
            if (!paused) {
                requestAnimFrame( animate );
            }


            world.Step(1 / 60, 10, 10);
            testCreature.brain.think();

            world.DrawDebugData();
            entityData.forEach( function (datum) {
                if (datum.body != null && datum.graphics != null) {
                    var pos = datum.body.GetPosition();
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
        init();
    });


});