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
        testWall.wallCollision = new Box2D.Dynamics.b2ContactListener;
        testWall.wallCollision.PostSolve = function(contact, impulse) {
            var force = calcForce(impulse)
            if ((contact.GetFixtureA().GetBody()==testWall.body && force>4)){
                creatureCollisionTotals[contact.GetFixtureB().GetBody().ID] += force;

            }
            else if (contact.GetFixtureB().GetBody()==testWall.body && force>4){
                creatureCollisionTotals[contact.GetFixtureA().GetBody().ID] += force;
            }
        }

        world.SetContactListener(testWall.wallCollision);
        testWall.addToWorld(world);

        var makeWorld = function(){
            world = new b2World( new b2Vec2(0, 10), true);


            pixelWidth  = window.innerWidth;
            pixelHeight = window.innerHeight;
            aspectRatio = pixelWidth / pixelHeight;

            worldHeight = 17; // meters
            worldWidth  = worldHeight * aspectRatio;

            METER = pixelHeight / worldHeight; // pixels per meter


            fixDef = new b2FixtureDef;
            fixDef.shape = new b2PolygonShape;
            fixDef.density = 1.0;
            fixDef.friction = 0.5;
            fixDef.restitution = 0.2;

            bodyDef = new b2BodyDef;
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


            testWall = new Wall.BasicWall(worldWidth - worldWidth / 40, worldHeight / 2, worldWidth / 20, worldHeight);
            testWall.wallCollision = new Box2D.Dynamics.b2ContactListener;
            testWall.wallCollision.PostSolve = function(contact, impulse) {
                var force = calcForce(impulse)
                if ((contact.GetFixtureA().GetBody()==testWall.body && force>5)){
                    creatureCollisionTotals[contact.GetFixtureB().GetBody().ID] += force;

                }
                else if (contact.GetFixtureB().GetBody()==testWall.body && force>5){
                    creatureCollisionTotals[contact.GetFixtureA().GetBody().ID] += force;
                }
            }

            world.SetContactListener(testWall.wallCollision);
            testWall.addToWorld(world);
        }

        //Set up variables
        var numcreatures = 12;
        var creatures = [];
        var creatureCollisionTotals = []
        var data;
        var testGenerator = new Generator(.5);
        var creatureData = testGenerator.GenerateRandData(numcreatures); // first generation is random

        //Initialize creatureCollisionTotals
        for(var i=0;i<numcreatures;++i){
            creatureCollisionTotals.push(0);
        }
        // Add test objects
        //Helper function for calculating force
        var calcForce = function(impulse){
            var x = Math.abs(impulse.normalImpulses[0]);
            var y = Math.abs(impulse.tangentImpulses[0]);
            return Math.sqrt(x*x+y*y);
        };

        var evolve = function(seed){
            var tempData = testGenerator.GenerateRandData(numcreatures);
            seed.forEach(function(item,i){
                tempData[i]=item;
            });
            tempData[3]=testGenerator.GenerateData(seed[0],seed[1]);
            tempData[4]=testGenerator.GenerateData(seed[0],seed[2]);
            tempData[5]=testGenerator.GenerateData(seed[1],seed[2]);
            tempData[6]=testGenerator.GenerateData(seed[0],seed[1]);
            tempData[7]=testGenerator.GenerateData(seed[0],seed[2]);
            tempData[8]=testGenerator.GenerateData(seed[1],seed[2]);
            return tempData;
        }

        var makeGeneration = function(data){
            for (var i=0; i<numcreatures; ++i){
                creatures[i] = new Creature.Scorpion(data[i], testWall, -1, i);
                creatures[i].addToWorld(world);
            }
        }


        //Generate the creatures
        makeGeneration(creatureData);

        var timeAccelerationFactor = 1;

        // PIXI Init stuff
        var paused = true; // Start paused
        var interactive = true;
        var stage = new PIXI.Stage(0x00AEFF, interactive);

        var renderer = PIXI.autoDetectRenderer(pixelWidth, pixelHeight);
        document.body.appendChild(renderer.view);
        testWall.addToStage(stage, METER);

        var data = [testWall.data()];
        creatures.forEach(function(creature, index, arr){
            creature.addToStage(stage, METER);
            data.push(creature.bodyPartData());
        });
        var entityData = [].concat.apply([], data);

        var playPauseButton;
        var evolveButton;
        var timeButton;

        var evolveButtonClick = function() {
            var fitness = creatureCollisionTotals.map(function (total, index) {
                return {
                    total: total
                    ,   index: index
                };
            });

            fitness.sort(function (a, b) {
                if (a.total < b.total) {
                   return -1;
               }
               else if (a.total > b.total) {
                return 1;
            }
            return 0;
            });

            var top3 = [];
            for (var i = 0; i < 3; ++i) {
                top3.push(fitness.pop().index);
            }

            // Assert: top3 has the top 3 fittest creatures' indices

            var seed = [];
            top3.forEach(function (index) {
                seed.push(creatureData[index]);
            });
            creatureData = evolve(seed);
            for(var i=0;i<numcreatures;++i){
                creatureCollisionTotals[i] = 0;
            }
            makeWorld();
            for (var i = stage.children.length - 1; i >= 0; i--) {
                stage.removeChild(stage.children[i]);
            };
            makeGeneration(creatureData);
            testWall.addToStage(stage, METER);
            // makeButtons();
            stage.addChild(playPauseButton);
            stage.addChild(evolveButton);
            stage.addChild(timeButton);

            data = [testWall.data()];
            creatures.forEach(function (creature, index, arr) {
                creature.addToStage(stage, METER);
                data.push(creature.bodyPartData());
            });

            entityData = [].concat.apply([], data);

        }; // end evolveButtonClick()


        var makeButtons = function(){
            playPauseButton = new PIXI.Graphics();
            playPauseButton.beginFill(0x000000, 1);
            playPauseButton.drawRect(0, 0, 3 * METER, 1.2 * METER);
            playPauseButton.endFill();
            playPauseButton.position.x = 0;
            playPauseButton.position.y = 0;
            playPauseButton.interactive = interactive;

            var playPauseButtonText = new PIXI.Text("Play", {font: METER + "px Arial", fill:"white"});
            playPauseButton.addChild(playPauseButtonText);
            var playPauseButtonClick = function() {
                if (playPauseButtonText.text === "Play") {
                    playPauseButtonText.setText("Pause");
                    paused = false;
                    requestAnimFrame( animate );
                }
                else {
                    playPauseButtonText.setText("Play");
                    paused = true;
                }

            };
            playPauseButton.click = playPauseButtonClick;
            playPauseButton.tap = playPauseButtonClick;

            evolveButton = new PIXI.Graphics();
            evolveButton.beginFill(0x000000, 1);
            evolveButton.drawRect(0, 0, 3 * METER, 1.2 * METER);
            evolveButton.endFill();
            evolveButton.position.x = 4*METER;
            evolveButton.position.y = 0;
            evolveButton.interactive = interactive;
            var evolveButtonText = new PIXI.Text("Evolve", {font: METER + "px Arial", fill:"white"});
            evolveButton.addChild(evolveButtonText);


            evolveButton.click = evolveButtonClick;
            evolveButton.tap = evolveButtonClick;


            var timeButtonClick = function () {
                if (timeButtonText.text === "1x") {
                    timeButtonText.setText("2.5x");
                    timeAccelerationFactor = 2.5;
                }
                else if (timeButtonText.text === "2.5x") {
                    timeButtonText.setText("5x");
                    timeAccelerationFactor = 5;
                }
                else { // 5x
                    timeButtonText.setText("1x");
                    timeAccelerationFactor = 1;
                }
            };

            timeButton = new PIXI.Graphics();
            timeButton.beginFill(0x000000, 1);
            timeButton.drawRect(0, 0, 3 * METER, 1.2 * METER);
            timeButton.endFill();
            timeButton.position.x = 10*METER;
            timeButton.position.y = 0;
            timeButton.interactive = interactive;
            var timeButtonText = new PIXI.Text("1x", {font: METER + "px Arial", fill:"white"});
            timeButton.addChild(timeButtonText);

            timeButton.click = timeButtonClick;
            timeButton.tap = timeButtonClick;



          stage.addChild(playPauseButton);
          stage.addChild(evolveButton);
          stage.addChild(timeButton);

        }; // end makeButtons() definition

        makeButtons();
        requestAnimFrame( animate );

        var startTime = Date.now();

        function animate() {
            var curTime = Date.now();

            if (curTime - startTime >= 25 * 1000 / timeAccelerationFactor) {
                evolveButtonClick();
                startTime = curTime;
            }

            world.Step(timeAccelerationFactor / 60, Math.ceil(10 * timeAccelerationFactor), Math.ceil(10 * timeAccelerationFactor));
            creatures.forEach(function(creature, index, arr){
                creature.brain.think();
            });


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

            if (!paused) {
                requestAnimFrame( animate );
            }
        }

    }




    $( document ).ready(function(){
        init();
    });


});