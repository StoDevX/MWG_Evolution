import Box2D from '../lib/box2d.min.js'

import PIXI from '../lib/pixi.min.js'
import Utils from '../lib/Utils.js'

import Mind from '../app/Mind.js'
import Body from '../app/Body.js'
import Creature from '../app/Creature.js'
import Wall from '../app/Wall.js'
import Generator from '../app/Generation/Generator.js'

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
var world = new b2World(new b2Vec2(0, 10), true)
var fixDef = new b2FixtureDef()
fixDef.density = 1.0
fixDef.friction = 0.5
fixDef.restitution = 0.2

var bodyDef = new b2BodyDef()

//create ground
bodyDef.type = b2Body.b2_staticBody
fixDef.shape = new b2PolygonShape()
fixDef.shape.SetAsBox(20, 2)
bodyDef.position.Set(10, 400 / 30 + 1.8)
world.CreateBody(bodyDef).CreateFixture(fixDef)
bodyDef.position.Set(10, -1.8)
//world.CreateBody(bodyDef).CreateFixture(fixDef);
fixDef.shape.SetAsBox(2, 14)
bodyDef.position.Set(-1.8, 13)
world.CreateBody(bodyDef).CreateFixture(fixDef)
bodyDef.position.Set(21.8, 13)
world.CreateBody(bodyDef).CreateFixture(fixDef)

var testWall = new Wall.BasicWall(18, 7, 3, 15)
testWall.wallCollision = new Box2D.Dynamics.b2ContactListener()
testWall.wallCollision.PostSolve = function(contact, impulse) {
	var force = calcForce(impulse)
	if (contact.GetFixtureA().GetBody() == testWall.body && force > 5) {
		creatureCollisionTotals[contact.GetFixtureB().GetBody().ID] += force
		// console.log(contact.GetFixtureB().GetBody());
		//creatureCollisionTotals[0] += force;
	} else if (contact.GetFixtureB().GetBody() == testWall.body && force > 5) {
		creatureCollisionTotals[contact.GetFixtureA().GetBody().ID] += force
		// console.log(contact.GetFixtureA().GetBody());
		//creatureCollisionTotals[0] += force;
	}
}

world.SetContactListener(testWall.wallCollision)
testWall.addToWorld(world)

var makeWorld = function() {
	world = new b2World(new b2Vec2(0, 10), true)
	fixDef = new b2FixtureDef()
	fixDef.density = 1.0
	fixDef.friction = 0.5
	fixDef.restitution = 0.2

	var bodyDef = new b2BodyDef()

	//create ground
	bodyDef.type = b2Body.b2_staticBody
	fixDef.shape = new b2PolygonShape()
	fixDef.shape.SetAsBox(20, 2)
	bodyDef.position.Set(10, 400 / 30 + 1.8)
	world.CreateBody(bodyDef).CreateFixture(fixDef)
	bodyDef.position.Set(10, -1.8)
	//world.CreateBody(bodyDef).CreateFixture(fixDef);
	fixDef.shape.SetAsBox(2, 14)
	bodyDef.position.Set(-1.8, 13)
	world.CreateBody(bodyDef).CreateFixture(fixDef)
	bodyDef.position.Set(21.8, 13)
	world.CreateBody(bodyDef).CreateFixture(fixDef)

	testWall = new Wall.BasicWall(18, 7, 3, 15)
	testWall.wallCollision = new Box2D.Dynamics.b2ContactListener()
	testWall.wallCollision.PostSolve = function(contact, impulse) {
		var force = calcForce(impulse)
		if (contact.GetFixtureA().GetBody() == testWall.body && force > 5) {
			creatureCollisionTotals[contact.GetFixtureB().GetBody().ID] += force
			// console.log(contact.GetFixtureB().GetBody());
			//creatureCollisionTotals[0] += force;
		} else if (contact.GetFixtureB().GetBody() == testWall.body && force > 5) {
			creatureCollisionTotals[contact.GetFixtureA().GetBody().ID] += force
			// console.log(contact.GetFixtureA().GetBody());
			//creatureCollisionTotals[0] += force;
		}
	}

	world.SetContactListener(testWall.wallCollision)
	testWall.addToWorld(world)
}

// --------------- Assert: Basic World Is Initialized -------------------

//Set up variables
var numcreatures = 3
var creatures = []
var creatureCollisionTotals = []
var data

//Initialize creatureCollisionTotals
for (var i = 0; i < numcreatures; ++i) {
	creatureCollisionTotals.push(0)
}
// Add test objects
var calcForce = function(impulse) {
	//Helper function for calculating force
	var x = Math.abs(impulse.normalImpulses[0])
	var y = Math.abs(impulse.tangentImpulses[0])
	return Math.sqrt(x * x + y * y)
}

var testGenerator = new Generator()

var evolve = function(seed) {
	var tempData = testGenerator.GenerateRandData(numcreatures)
	tempData.forEach(function(item) {
		item = testGenerator.GenerateData(seed, item)
	})
	tempData[0] = seed
	return tempData
}

var makeGeneration = function(data) {
	for (var i = 0; i < numcreatures; ++i) {
		creatures[i] = new Creature.Scorpion(data[i], testWall, -1, i)
		creatures[i].addToWorld(world)
	}
}

//Generate the creatures
var creatureData = testGenerator.GenerateRandData(numcreatures)
makeGeneration(creatureData)

document.addEventListener(
	'keypress',
	function(e) {
		if (e.charCode == 101) {
			var total = 0
			var best = 0
			for (var i = 0; i < numcreatures; ++i) {
				if (creatureCollisionTotals[i] > total) {
					total = creatureCollisionTotals[i]
					best = i
				}
			}
			creatureData = evolve(creatureData[best])
			for (var i = 0; i < numcreatures; ++i) {
				creatureCollisionTotals[i] = 0
			}
			makeWorld()
			makeGeneration(creatureData)
			debugRendererInit()
			//pixiRendererInit();
		} else {
			console.log(creatureCollisionTotals)
			// console.log(e);
		}
	},
	true
)

//---------------------------------------------------

function debugRendererInit() {
	//setup debug draw
	var debugDraw = new b2DebugDraw()
	debugDraw.SetSprite(document.getElementById('canvas').getContext('2d'))
	debugDraw.SetDrawScale(30.0)
	debugDraw.SetFillAlpha(0.5)
	debugDraw.SetLineThickness(1.0)
	debugDraw.SetFlags(
		b2DebugDraw.e_shapeBit |
			b2DebugDraw.e_jointBit |
			b2DebugDraw.e_centerOfMassBit
	)
	world.SetDebugDraw(debugDraw)

	window.setInterval(update, 1000 / 60)

	//mouse

	var mouseX, mouseY, mousePVec, isMouseDown, selectedBody, mouseJoint
	var canvasPosition = getElementPosition(document.getElementById('canvas'))

	document.addEventListener(
		'mousedown',
		function(e) {
			isMouseDown = true
			handleMouseMove(e)
			document.addEventListener('mousemove', handleMouseMove, true)
		},
		true
	)

	document.addEventListener(
		'mouseup',
		function() {
			document.removeEventListener('mousemove', handleMouseMove, true)
			isMouseDown = false
			mouseX = undefined
			mouseY = undefined
		},
		true
	)

	function handleMouseMove(e) {
		mouseX = (e.clientX - canvasPosition.x) / 30
		mouseY = (e.clientY - canvasPosition.y) / 30
	}

	function getBodyAtMouse() {
		mousePVec = new b2Vec2(mouseX, mouseY)
		var aabb = new b2AABB()
		aabb.lowerBound.Set(mouseX - 0.001, mouseY - 0.001)
		aabb.upperBound.Set(mouseX + 0.001, mouseY + 0.001)

		// Query the world for overlapping shapes.

		selectedBody = null
		world.QueryAABB(getBodyCB, aabb)
		return selectedBody
	}

	function getBodyCB(fixture) {
		if (fixture.GetBody().GetType() != b2Body.b2_staticBody) {
			if (
				fixture
					.GetShape()
					.TestPoint(fixture.GetBody().GetTransform(), mousePVec)
			) {
				selectedBody = fixture.GetBody()
				return false
			}
		}
		return true
	}

	//update

	function update() {
		if (isMouseDown && !mouseJoint) {
			var body = getBodyAtMouse()
			if (body) {
				var md = new b2MouseJointDef()
				md.bodyA = world.GetGroundBody()
				md.bodyB = body
				md.target.Set(mouseX, mouseY)
				md.collideConnected = true
				md.maxForce = 300.0 * body.GetMass()
				mouseJoint = world.CreateJoint(md)
				body.SetAwake(true)
			}
		}

		if (mouseJoint) {
			if (isMouseDown) {
				mouseJoint.SetTarget(new b2Vec2(mouseX, mouseY))
			} else {
				world.DestroyJoint(mouseJoint)
				mouseJoint = null
			}
		}
	}

	//helpers

	//http://js-tut.aardon.de/js-tut/tutorial/position.html
	function getElementPosition(element) {
		var elem = element,
			tagname = '',
			x = 0,
			y = 0

		while (typeof elem == 'object' && typeof elem.tagName != 'undefined') {
			y += elem.offsetTop
			x += elem.offsetLeft
			tagname = elem.tagName.toUpperCase()

			if (tagname == 'BODY') elem = 0

			if (typeof elem == 'object') {
				if (typeof elem.offsetParent == 'object') elem = elem.offsetParent
			}
		}

		return { x: x, y: y }
	}
}

//---------------------------------------------------

// PIXI Setup

function pixiRendererInit() {
	// PIXI Init stuff
	var METER = 30 // 30px per meter
	var stage = new PIXI.Stage(0x66ff99)
	var renderer = PIXI.autoDetectRenderer(600, 400)
	document.body.appendChild(renderer.view)
	testWall.addToStage(stage, METER)

	var data = [testWall.data()]
	creatures.forEach(function(creature, index, arr) {
		creature.addToStage(stage, METER)
		data.push(creature.bodyPartData())
	})

	var entityData = [].concat.apply([], data)

	requestAnimFrame(animate)

	function animate() {
		requestAnimFrame(animate)

		world.Step(1 / 60, 5, 5)
		creatures.forEach(function(creature, index, arr) {
			creature.brain.think()
		})

		world.DrawDebugData()
		entityData.forEach(function(datum) {
			if (datum.body != null && datum.graphics != null) {
				var pos = datum.body.GetPosition()
				datum.graphics.position.x = pos.x * METER
				datum.graphics.position.y = pos.y * METER
				datum.graphics.rotation = datum.body.GetAngle()
			}
		})

		renderer.render(stage)

		world.ClearForces()
	}
}

debugRendererInit()
pixiRendererInit()
