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
    }

});

"use strict";
require([
      "lib/ready"
    , "lib/Box2dWeb_dev"
    , "lib/pixi"
    , "lib/Utils"
    , "app/Mind"
    , "app/Body"
    , "app/Creature"
    , "app/Wall"
    , "app/Generation/Generator"
    ], function (ready, Box2D, PIXI, Utils, Mind, Body, Creature, Wall, Generator) {

    // ------------------------------------------------------------------------
    // Tuning
    // ------------------------------------------------------------------------

    var NUM_CREATURES      = 12;
    var GENERATION_SECONDS = 25;      // simulated seconds per generation
    var STEP               = 1 / 60;  // physics step, seconds
    var SPEEDS             = [1, 2, 4, 8, 16, 0]; // simulated seconds per real second; 0 is "Max"
    var HIT_THRESHOLD      = 5;       // ignore impulses smaller than this
    var WALL_BASE_HP       = 6000;
    var WALL_HP_GROWTH     = 1.45;    // each wall has this many times the HP of the last
    var AUTO_MUTATION_RATE = 0.5;
    // Records are kept apart for generations bred automatically and by the player.
    // The auto key predates breeder mode, so it keeps its old name.
    var RECORD_KEYS        = { auto: "mwgEvolution.record", breeder: "mwgEvolution.record.breeder" };

    // One color per creature slot. Survivors keep their color across generations.
    var PALETTE = [
        0xE03131, 0x1C7ED6, 0x2F9E44, 0xF08C00, 0x9C36B5, 0x0CA678
      , 0xD6336C, 0x5C940D, 0x3B5BDB, 0xE8590C, 0x495057, 0x862E9C
    ];

    var WALLS = [
        { name: "Cardboard Wall",   color: 0xC4A574 }
      , { name: "Plywood Wall",     color: 0xD9A35B }
      , { name: "Brick Wall",       color: 0xB5523B }
      , { name: "Cinderblock Wall", color: 0x8E9AA6 }
      , { name: "Concrete Wall",    color: 0x6C757D }
      , { name: "Steel Wall",       color: 0x5D7A94 }
      , { name: "Titanium Wall",    color: 0x9AA9C9 }
      , { name: "Diamond Wall",     color: 0x8CE0F2 }
      , { name: "Neutronium Wall",  color: 0x5F3DC4 }
    ];

    var wallInfo = function (level) {
        var info = WALLS[Math.min(level, WALLS.length) - 1];
        var extra = level - WALLS.length;
        return {
            name: extra > 0 ? info.name + " +" + extra : info.name
          , color: info.color
          , hp: Math.round(WALL_BASE_HP * Math.pow(WALL_HP_GROWTH, level - 1))
        };
    };

    var hex = function (color) {
        return "#" + ("000000" + color.toString(16)).slice(-6);
    };

    var formatNumber = function (n) {
        return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // ------------------------------------------------------------------------
    // Names: every creature gets one. Children are named after both parents.
    // ------------------------------------------------------------------------

    var Names = {
        heads: [ "Chomp", "Snap", "Gnash", "Whack", "Thwack", "Bonk", "Crunch", "Smash"
               , "Zap", "Grim", "Fang", "Stab", "Thud", "Clang", "Wham", "Bash"
               , "Klonk", "Biff", "Zonk", "Crush" ]
      , tails: [ "zilla", "inator", "o", "ster", "wick", "tron", "jaw", "fang"
               , "bottom", "worth", "ella", "bert", "nugget", "beak", "tooth", "muncher"
               , "tastic", "osaurus", "ington", "face" ]

      , pick: function (list) { return list[Math.floor(Math.random() * list.length)]; }

      , random: function () {
            return { head: Names.pick(Names.heads), tail: Names.pick(Names.tails) };
        }

        // Head from one parent, tail from the other.
      , child: function (a, b) {
            var name = { head: a.head, tail: b.tail };  // numbered later
            if (name.head === b.head && name.tail === a.tail) { // looks like a clone of a parent
                name.tail = Names.pick(Names.tails);
            }
            return name;
        }

      , roman: function (n) {
            var numerals = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]], out = "";
            numerals.forEach(function (pair) {
                while (n >= pair[0]) { out += pair[1]; n -= pair[0]; }
            });
            return out;
        }

      , text: function (name) {
            return name.head + name.tail + (name.num > 1 ? " " + Names.roman(name.num) : "");
        }

        // Gives each name in the list a number so no two read the same.
        // Names that already have a number keep it.
      , number: function (names) {
            var taken = {};
            names.forEach(function (name) {
                if (name.num) { taken[Names.text(name)] = true; }
            });
            names.forEach(function (name) {
                if (name.num) { return; }
                name.num = 1;
                while (taken[Names.text(name)]) { name.num++; }
                taken[Names.text(name)] = true;
            });
        }
    };

    // ------------------------------------------------------------------------
    // Sound: synthesized with Web Audio so there are no files to load.
    // ------------------------------------------------------------------------

    var Sound = {
        ctx: null
      , noise: null
      , muted: false
      , lastHit: 0

      , start: function () {
            if (Sound.ctx) { return; }
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) { return; }
            Sound.ctx = new AudioContext();

            var length = Math.floor(Sound.ctx.sampleRate * 0.3);
            Sound.noise = Sound.ctx.createBuffer(1, length, Sound.ctx.sampleRate);
            var samples = Sound.noise.getChannelData(0);
            for (var i = 0; i < length; ++i) {
                samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }

      , ready: function () { return Sound.ctx && !Sound.muted; }

        // strength is 0..1
      , hit: function (strength) {
            if (!Sound.ready()) { return; }
            var ctx = Sound.ctx, now = ctx.currentTime;
            if (now - Sound.lastHit < 0.05) { return; }
            Sound.lastHit = now;

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15 + 0.5 * strength, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            gain.connect(ctx.destination);

            var crack = ctx.createBufferSource();
            crack.buffer = Sound.noise;
            var filter = ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 400 + 2400 * strength;
            crack.connect(filter);
            filter.connect(gain);
            crack.start(now);

            var thump = ctx.createOscillator();
            thump.frequency.setValueAtTime(140, now);
            thump.frequency.exponentialRampToValueAtTime(40, now + 0.15);
            thump.connect(gain);
            thump.start(now);
            thump.stop(now + 0.2);
        }

      , tones: function (notes, type, spacing, length) {
            if (!Sound.ready()) { return; }
            var ctx = Sound.ctx, now = ctx.currentTime;
            notes.forEach(function (freq, i) {
                var t = now + i * spacing;
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = type;
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + length + 0.05);
            });
        }

      , explosion: function () {
            if (!Sound.ready()) { return; }
            for (var i = 0; i < 4; ++i) {
                setTimeout(function () { Sound.lastHit = 0; Sound.hit(1); }, i * 70);
            }
            Sound.tones([262, 330, 392, 523, 659, 784], "square", 0.09, 0.3);
        }

      , generation: function () { Sound.tones([392, 523], "triangle", 0.1, 0.25); }
      , record:     function () { Sound.tones([523, 659, 784, 1047], "triangle", 0.08, 0.3); }
    };

    // ------------------------------------------------------------------------
    // Game
    // ------------------------------------------------------------------------

    function init() {

        var b2Vec2          = Box2D.Common.Math.b2Vec2
          , b2BodyDef       = Box2D.Dynamics.b2BodyDef
          , b2Body          = Box2D.Dynamics.b2Body
          , b2FixtureDef    = Box2D.Dynamics.b2FixtureDef
          , b2World         = Box2D.Dynamics.b2World
          , b2PolygonShape  = Box2D.Collision.Shapes.b2PolygonShape
          , b2WorldManifold = Box2D.Collision.b2WorldManifold
          ;

/*
        The world is always 17 meters tall and at least 22 meters wide. On a wide
        screen it fills the screen. On a tall one, like a phone held upright, it
        is zoomed out to fit the width and sits at the bottom of the screen, and
        the sky above holds the HUD. Otherwise a phone would get an arena only
        8 meters wide, with creatures spawning on top of the wall.
*/
        var MIN_WORLD_WIDTH = 22; // meters
        var worldHeight = 17;     // meters
        var pixelWidth, pixelHeight, worldWidth, METER, viewHeight, sceneTop, spawnX;

        var layout = function () {
            pixelWidth  = window.innerWidth;
            pixelHeight = window.innerHeight;
            worldWidth  = Math.max(MIN_WORLD_WIDTH, worldHeight * pixelWidth / pixelHeight);
            METER       = pixelWidth / worldWidth;     // pixels per meter
            viewHeight  = worldHeight * METER;         // pixel height of the world
            sceneTop    = pixelHeight - viewHeight;    // sky above the world, if any
            // Creatures spawn a third of the way across, but no more than 10 m in.
            spawnX = Math.min(10, worldWidth * 0.33);
            document.body.classList.toggle("tall", sceneTop > 1);
        };
        layout();

        // --------------------------------------------------------------------
        // Page helpers
        // --------------------------------------------------------------------

        var byId = function (id) { return document.getElementById(id); };
        var all = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };

        // --------------------------------------------------------------------
        // State
        // --------------------------------------------------------------------

        var worlds = [];   // one physics world per creature
        var wall;          // the wall as drawn; every world has a copy of it
        var generator = new Generator(AUTO_MUTATION_RATE);
        var genomes   = generator.GenerateRandData(NUM_CREATURES); // first generation is random
        var lineage   = genomes.map(function (genome, i) {
            return { name: Names.random(), color: PALETTE[i], origin: "random", streak: 0 };
        });
        Names.number(lineage.map(function (l) { return l.name; }));
        var creatures = [];
        var damage    = [];   // damage dealt by each creature this generation
        var favored   = [];   // creature indices the player wants to breed

        var generation = 1;
        var simTime    = 0;   // seconds into this generation
        var clock      = 0;   // ms of simulated time since the game started
        var level      = 1;
        var wallHP     = wallInfo(1).hp;
        var wallRebuildAt = null; // clock time a broken wall comes back
        var wallSince   = 1;      // generation this wall appeared in

        var history = []; // { best, avg } per generation
        var records = {};
        Object.keys(RECORD_KEYS).forEach(function (key) {
            records[key] = { score: 0, name: "", generation: 0 };
            try {
                records[key] = JSON.parse(localStorage.getItem(RECORD_KEYS[key])) || records[key];
            } catch (e) {}
        });

        var mode     = "auto";  // "auto", or "breeder" where the player picks parents
        var autoLeft = 0;       // generations breeder mode leaves to auto before asking again
        var bredBy   = "auto";  // who bred the generation on screen; its score counts toward that record

        var paused     = true;
        var started    = false;
        var speedIndex = 0;
        var shake      = 0;

        // Attack patterns follow simulated time so they keep pace at any speed.
        Mind.TailNeuron.now = function () { return clock; };

        // --------------------------------------------------------------------
        // Rendering setup
        // --------------------------------------------------------------------

        var stage    = new PIXI.Stage(0x000000, false);
        var renderer = PIXI.autoDetectRenderer(pixelWidth, pixelHeight, { transparent: true, antialias: true });
        document.body.insertBefore(renderer.view, document.body.firstChild);

        // Everything that shakes lives in the scene.
        var scene = new PIXI.DisplayObjectContainer();
        stage.addChild(scene);

        var backdrop = new PIXI.Graphics();
        scene.addChild(backdrop);
        var creatureLayer = new PIXI.DisplayObjectContainer();
        scene.addChild(creatureLayer);
        var wallLayer = new PIXI.DisplayObjectContainer();
        scene.addChild(wallLayer);
        var fx = new PIXI.Graphics();
        scene.addChild(fx);

        var drawBackdrop = function () {
            if (backdrop.cacheAsBitmap) { backdrop.cacheAsBitmap = false; } // redrawn after a resize
            backdrop.clear();
            // Distant hills
            var layers = [ { color: 0x3B4A8C, height: 0.45, bumps: 3 }
                         , { color: 0x2C356B, height: 0.3,  bumps: 5 } ];
            layers.forEach(function (layer, li) {
                backdrop.beginFill(layer.color, 1);
                backdrop.moveTo(-20, viewHeight);
                for (var x = -20; x <= pixelWidth + 20; x += 20) {
                    var t = x / pixelWidth * Math.PI * layer.bumps + li * 1.7;
                    var y = viewHeight * (1 - layer.height) + Math.sin(t) * viewHeight * 0.06
                          + Math.sin(t * 2.3) * viewHeight * 0.025;
                    backdrop.lineTo(x, y);
                }
                backdrop.lineTo(pixelWidth + 20, viewHeight);
                backdrop.endFill();
            });

            // Ground: the top of the ground body sits 0.2 m above the bottom of the world.
            backdrop.beginFill(0x3D2B1F, 1);
            backdrop.drawRect(-20, viewHeight - 0.2 * METER, pixelWidth + 40, 0.2 * METER + 20);
            backdrop.endFill();
            backdrop.beginFill(0x5C940D, 1);
            backdrop.drawRect(-20, viewHeight - 0.2 * METER, pixelWidth + 40, 0.06 * METER);
            backdrop.endFill();
            backdrop.cacheAsBitmap = true;
        };
        drawBackdrop();

        // The wall is drawn here rather than by BasicWall so it can show bricks,
        // cracks, flashes and its destruction.
        var wallView = {
            bricks: new PIXI.Graphics()
          , cracks: new PIXI.Graphics()
          , flash:  new PIXI.Graphics()
          , crackCount: 0
          , flashAlpha: 0
          , dropOffset: 0 // pixels above its resting place, while a new wall drops in
        };
        wallLayer.addChild(wallView.bricks);
        wallLayer.addChild(wallView.cracks);
        wallLayer.addChild(wallView.flash);

        var drawWall = function () {
            var info = wallInfo(level);
            var w = wall.width * METER, h = wall.height * METER;
            var brickH = 0.5 * METER, brickW = w / 2;
            var g = wallView.bricks;
            if (g.cacheAsBitmap) { g.cacheAsBitmap = false; } // PIXI throws when uncaching an uncached object
            g.clear();
            g.beginFill(info.color, 1);
            g.drawRect(0, 0, w, h);
            g.endFill();
            g.lineStyle(2, 0x000000, 0.35);
            for (var row = 0; row * brickH < h; ++row) {
                var y = row * brickH;
                g.moveTo(0, y);
                g.lineTo(w, y);
                for (var x = (row % 2) * brickW / 2; x < w; x += brickW) {
                    g.moveTo(x, y);
                    g.lineTo(x, y + brickH);
                }
            }
            g.lineStyle(3, 0x000000, 0.6);
            g.drawRect(0, 0, w, h);
            g.cacheAsBitmap = true;

            wallView.cracks.clear();
            wallView.crackCount = 0;
            wallView.flash.clear();
            wallView.flash.beginFill(0xFFFFFF, 1);
            wallView.flash.drawRect(0, 0, w, h);
            wallView.flash.endFill();
            wallView.flash.alpha = 0;

            var left = (wall.initialX - wall.width / 2) * METER;
            [wallView.bricks, wallView.cracks, wallView.flash].forEach(function (g) {
                g.position.x = left;
            });
        };

        // Adds cracks as the wall loses HP: one crack per 8% of HP lost.
        var updateCracks = function () {
            var lost = 1 - wallHP / wallInfo(level).hp;
            var wanted = Math.floor(lost / 0.08);
            var w = wall.width * METER, h = wall.height * METER;
            var g = wallView.cracks;
            while (wallView.crackCount < wanted) {
                var x = Math.random() * w * 0.3;
                var y = Math.random() * h;
                g.lineStyle(2 + Math.random() * 2, 0x111111, 0.85);
                g.moveTo(x, y);
                for (var i = 0; i < 5; ++i) {
                    x = Math.min(w, x + Math.random() * w * 0.25);
                    y += (Math.random() - 0.5) * METER * 1.6;
                    g.lineTo(x, y);
                }
                wallView.crackCount++;
            }
        };

        // --------------------------------------------------------------------
        // Physics world
        // --------------------------------------------------------------------

        var hitsThisFrame = []; // per creature: { force, x, y }
        var worldManifold = new b2WorldManifold();

        var calcForce = function (impulse) {
            var x = Math.abs(impulse.normalImpulses[0]);
            var y = Math.abs(impulse.tangentImpulses[0]);
            return Math.sqrt(x*x + y*y);
        };

        // Every creature gets a world of its own, with its own ground and its own
        // copy of the wall. Creatures never touch each other, and keeping them apart
        // spares Box2D from pairing up the parts of twelve creatures that pile up
        // in one spot at the start of every generation.
        var wallHit = function (contact, impulse) {
            var a = contact.GetFixtureA().GetBody();
            var b = contact.GetFixtureB().GetBody();
            var hitter = a.isWall ? b : b.isWall ? a : null;
            if (hitter === null || !(hitter.ID >= 0)) { return; }

            var force = calcForce(impulse);
            if (force <= HIT_THRESHOLD) { return; }

            contact.GetWorldManifold(worldManifold);
            var point = worldManifold.m_points[0];
            var hit = hitsThisFrame[hitter.ID];
            if (!hit) {
                hit = hitsThisFrame[hitter.ID] = { force: 0, peak: 0, x: point.x, y: point.y };
            }
            hit.force += force;
            if (force > hit.peak) {
                hit.peak = force;
                hit.x = point.x;
                hit.y = point.y;
            }
        };

        var buildWorld = function () {
            var world = new b2World(new b2Vec2(0, 10), true);

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

            var worldWall = new Wall.BasicWall(worldWidth - worldWidth / 40, worldHeight / 2, worldWidth / 20, worldHeight);
            worldWall.wallCollision = new Box2D.Dynamics.b2ContactListener;
            worldWall.wallCollision.PostSolve = wallHit;
            worldWall.addToWorld(world); // sets the contact listener
            worldWall.body.isWall = true;

            return { world: world, wall: worldWall };
        };

        var spawnGeneration = function () {
            creatures.forEach(function (creature) {
                creature.bodyPartData().forEach(function (datum) {
                    if (datum.graphics) {
                        creatureLayer.removeChild(datum.graphics);
                        // Frees the cached texture and its canvas, which PIXI would keep forever.
                        if (datum.graphics.cacheAsBitmap) { datum.graphics.cacheAsBitmap = false; }
                    }
                });
            });
            worlds = [];
            creatures = [];
            damage = [];
            hitsThisFrame = [];
            pendingPopup = [];
            for (var i = 0; i < NUM_CREATURES; ++i) {
                genomes[i].torsoData.initialX = spawnX;
                genomes[i].torsoData.initialY = 10;
                genomes[i].torsoData.initialAngle = 0;

                var built = buildWorld();
                worlds.push(built.world);
                wall = built.wall;

                var creature = new Creature.Scorpion(genomes[i], built.wall, -1, i);
                creature.setColor(lineage[i].color);
                creature.addToWorld(built.world);
                creature.addToStage(creatureLayer, METER);
                creature.parts = creature.bodyPartData();
                creatures.push(creature);
                damage.push(0);
            }
            simTime = 0;
            drawWall();
            buildRows();
        };

        // --------------------------------------------------------------------
        // Effects
        // --------------------------------------------------------------------

        var particles = [];
        var pendingPopup = [];   // damage not yet shown in a popup, per creature
        var lastPopup = [];      // real time of the last popup, per creature
        var fxLayer = document.getElementById("fx-layer");

        var spawnParticles = function (x, y, count, color, speed, size, spread) {
            for (var i = 0; i < count && particles.length < 600; ++i) {
                var angle = Math.PI + (Math.random() - 0.5) * (spread || Math.PI * 1.2);
                var v = speed * (0.3 + Math.random());
                particles.push({
                    x: x, y: y
                  , vx: Math.cos(angle) * v
                  , vy: Math.sin(angle) * v - speed * 0.3
                  , life: 1
                  , decay: 0.6 + Math.random() * 0.8
                  , size: size * (0.5 + Math.random())
                  , color: color
                });
            }
        };

        var updateParticles = function (dt) {
            fx.clear();
            for (var i = particles.length - 1; i >= 0; --i) {
                var p = particles[i];
                p.life -= p.decay * dt;
                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }
                p.vy += 900 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.y > viewHeight - 0.2 * METER) { // bounce on the ground
                    p.y = viewHeight - 0.2 * METER;
                    p.vy *= -0.35;
                    p.vx *= 0.7;
                }
                fx.beginFill(p.color, Math.min(1, p.life * 1.5));
                fx.drawRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                fx.endFill();
            }
        };

        var popup = function (x, y, text, color, size) {
            if (fxLayer.childElementCount > 40) { return; }
            var el = document.createElement("div");
            el.className = "popup";
            el.textContent = text;
            el.style.left = x + "px";
            el.style.top = (y + sceneTop) + "px";
            el.style.color = color;
            el.style.fontSize = size + "px";
            el.addEventListener("animationend", function () { el.remove(); });
            fxLayer.appendChild(el);
        };

        var processHits = function () {
            var now = performance.now();
            var wallAlive = wallRebuildAt === null;
            hitsThisFrame.forEach(function (hit, id) {
                if (!hit) { return; }
                damage[id] += hit.force;
                pendingPopup[id] = (pendingPopup[id] || 0) + hit.force;

                var x = hit.x * METER, y = hit.y * METER;
                var strength = Math.min(1, hit.peak / 150);
                spawnParticles(x, y, 2 + Math.round(strength * 14), 0xFFE066, 250 + 500 * strength, 3 + 4 * strength);
                spawnParticles(x, y, 1 + Math.round(strength * 4), lineage[id].color, 200 + 300 * strength, 4);

                if (wallAlive) {
                    wallHP -= hit.force;
                    var chips = Math.round(strength * 6);
                    spawnParticles(x, y, chips, wallInfo(level).color, 300, 6);
                    wallView.flashAlpha = Math.max(wallView.flashAlpha, 0.15 + 0.5 * strength);
                }
                shake = Math.max(shake, strength * 0.4 * METER);

                if (now - (lastPopup[id] || 0) > 220) {
                    var amount = pendingPopup[id];
                    var size = Math.min(44, 14 + Math.sqrt(amount) * 1.2);
                    popup(x - 0.5 * METER, y, formatNumber(amount), hex(lineage[id].color), size);
                    if (amount > 400) {
                        popup(x - 1.5 * METER, y - 1.2 * METER, amount > 1500 ? "MEGA SMASH!" : "CRUNCH!", "#ffe066", size * 0.8);
                    }
                    lastPopup[id] = now;
                    pendingPopup[id] = 0;
                    Sound.hit(Math.min(1, amount / 400));
                }
            });
            hitsThisFrame = [];

            if (wallAlive && wallHP <= 0) {
                breakWall();
            }
            else if (wallAlive) {
                updateCracks();
            }
        };

        var breakWall = function () {
            var w = wall.width * METER, h = wall.height * METER;
            var left = (wall.initialX - wall.width / 2) * METER;
            var color = wallInfo(level).color;
            for (var i = 0; i < 120; ++i) {
                spawnParticles(left + Math.random() * w, Math.random() * h, 1, color, 500, 8 + Math.random() * 14, Math.PI * 2);
            }
            shake = 1.2 * METER;
            wallView.bricks.visible = wallView.cracks.visible = wallView.flash.visible = false;
            wallRebuildAt = clock + 2500;

            Sound.explosion();
            banner("<h2>WALL DESTROYED!</h2><p>The " + wallInfo(level).name + " is rubble after "
                 + (generation - wallSince + 1) + " generation" + (generation === wallSince ? "" : "s") + ".<br>Next up: <b>"
                 + wallInfo(level + 1).name + "</b> (" + formatNumber(wallInfo(level + 1).hp) + " HP)</p>", 3200);
            level++;
        };

        var rebuildWall = function () {
            wallRebuildAt = null;
            wallSince = generation;
            wallHP = wallInfo(level).hp;
            drawWall();
            wallView.bricks.visible = wallView.cracks.visible = wallView.flash.visible = true;
            wallView.dropOffset = pixelHeight;
            updateHud(true);
        };

        // --------------------------------------------------------------------
        // Evolution
        // --------------------------------------------------------------------

        var ranking = function () {
            return damage.map(function (d, i) { return i; })
                         .sort(function (a, b) { return damage[b] - damage[a]; });
        };

        // Favored creatures first, then the hardest hitters.
        var defaultParents = function () {
            var parents = favored.slice().sort(function (a, b) { return damage[b] - damage[a]; });
            ranking().forEach(function (i) {
                if (parents.indexOf(i) < 0) { parents.push(i); }
            });
            return parents.slice(0, 3);
        };

        var lastGenerationEnd = -Infinity; // real time, ms

        var endGeneration = function () {
            var order = ranking();
            var best = damage[order[0]];
            var avg = damage.reduce(function (a, b) { return a + b; }, 0) / damage.length;
            var previousBest = history.length ? history[history.length - 1].best : 0;
            history.push({ best: best, avg: avg });

            var champion = lineage[order[0]];
            var record = records[bredBy];
            var newRecord = best > record.score;
            if (newRecord) {
                records[bredBy] = { score: best, name: Names.text(champion.name), generation: generation };
                try { localStorage.setItem(RECORD_KEYS[bredBy], JSON.stringify(records[bredBy])); } catch (e) {}
            }
            // At high speed generations fly by, so only records get a fanfare.
            var now = performance.now();
            var quiet = now - lastGenerationEnd < 2500 && !newRecord;
            lastGenerationEnd = now;
            if (newRecord) { Sound.record(); } else if (!quiet) { Sound.generation(); }
            drawHistory();

            var breedNow = mode === "auto" || autoLeft > 0;
            if (!breedNow) {
                openBreeder(newRecord);
                return;
            }

            var change = previousBest > 0 ? Math.round((best / previousBest - 1) * 100) : null;
            if (!quiet) {
                banner("<h2>Generation " + generation + " complete</h2>"
                     + "<p>&#9819; <b style='color:" + hex(champion.color) + "'>" + Names.text(champion.name)
                     + "</b> dealt " + formatNumber(best) + " damage"
                     + (!change ? "" : " (" + (change >= 0 ? "+" : "") + change + "% vs last)") + "</p>"
                     + (newRecord ? "<p class='record'>NEW " + bredBy.toUpperCase() + " RECORD!</p>" : ""), 2600);
            }

            if (autoLeft > 0) {
                autoLeft--;
                updateModeButton();
            }
            breed(defaultParents(), [], AUTO_MUTATION_RATE, "auto");
        };

        // Builds the next generation:
        //   the parents (1 to 3) survive unchanged,
        //   children of every pairing of parents fill the slots up to 9,
        //   each mutant index gets a heavily mutated copy,
        //   and newcomers fill whatever is left.
        var breed = function (parents, mutants, mutationRate, by) {
            generator.mutationRate = mutationRate;

            var pairs = [];
            parents.forEach(function (a, i) {
                parents.forEach(function (b, j) {
                    if (i < j || parents.length === 1) { pairs.push([a, b]); }
                });
            });

            var newGenomes = generator.GenerateRandData(NUM_CREATURES);
            var newLineage = [];
            parents.forEach(function (p, i) {
                newGenomes[i] = genomes[p];
                // A stranger gives up its stranger color for one of the team's.
                var color = p === STRANGER ? undefined : lineage[p].color;
                newLineage[i] = { name: lineage[p].name, color: color, origin: "survivor", streak: lineage[p].streak + 1 };
            });
            for (var k = parents.length; k < 9; ++k) {
                // Alternate which parent leads, so siblings get both name halves.
                var pair = pairs[(k - parents.length) % pairs.length];
                var a = pair[k % 2], b = pair[1 - k % 2];
                newGenomes[k] = generator.GenerateData(genomes[a], genomes[b]);
                newLineage[k] = { name: Names.child(lineage[a].name, lineage[b].name), origin: "child", streak: 0 };
            }
            mutants.forEach(function (m, k) {
                generator.mutationRate = 1;
                var genome = genomes[m];
                for (var round = 0; round < 3; ++round) { // every gene moves, three times over
                    genome = generator.GenerateData(genome, genome);
                }
                newGenomes[9 + k] = genome;
                var tail = lineage[m].name.tail;
                while (tail === lineage[m].name.tail) { tail = Names.pick(Names.tails); } // the name changes too
                newLineage[9 + k] = { name: { head: lineage[m].name.head, tail: tail }, origin: "mutant", streak: 0 };
            });
            for (var i = 9 + mutants.length; i < NUM_CREATURES; ++i) {
                newLineage[i] = { name: Names.random(), origin: "random", streak: 0 };
            }

            // Survivors keep their colors; everyone else takes what is left.
            var used = newLineage.map(function (l) { return l.color; });
            var free = PALETTE.filter(function (c) { return used.indexOf(c) < 0; });
            newLineage.forEach(function (l) {
                if (l.color === undefined) { l.color = free.shift(); }
            });

            Names.number(newLineage.map(function (l) { return l.name; }));

            genomes = newGenomes;
            lineage = newLineage;
            bredBy = by;
            favored = [];
            generation++;
            spawnGeneration();
            drawHistory();
            updateHud(true);
        };

        // --------------------------------------------------------------------
        // Breeder mode: the player picks the parents at the end of a generation.
        // --------------------------------------------------------------------

        // The chance that each gene a child inherits shifts by about 10%.
        var MUTATION_LEVELS = [ { rate: 0.15, name: "Gentle" }
                              , { rate: 0.5,  name: "Normal" }
                              , { rate: 0.8,  name: "Wild" }
                              , { rate: 1,    name: "Chaos" } ];
        var mutationLevel = 1;

        // Readable traits, computed from a genome. Bars on the cards compare
        // each trait across the generation.
        var TRAITS = [
            { label: "Tail", value: function (g) {
                  var length = 0;
                  for (var i = 0; i < g.tailData.numVertebrae; ++i) {
                      length += g.tailData.rootHeight * Math.pow(g.tailData.heightReductionFactor, i);
                  }
                  return length;
              }, text: function (g, v) { return Math.ceil(g.tailData.numVertebrae) + " seg, " + v.toFixed(1) + " m"; } }
          , { label: "Muscle", value: function (g) { return g.tailData.rootMaxTorque; }
              , text: function (g, v) { return Math.round(v / 1000) + "k"; } }
          , { label: "Body", value: function (g) { return g.torsoData.width * g.torsoData.height; }
              , text: function (g) { return g.torsoData.width.toFixed(1) + " × " + g.torsoData.height.toFixed(1) + " m"; } }
          , { label: "Wheels", value: function (g) { return g.leftWheelData.radius + g.rightWheelData.radius; }
              , text: function (g) { return g.leftWheelData.radius.toFixed(1) + " / " + g.rightWheelData.radius.toFixed(1) + " m"; } }
          , { label: "Drive", value: function (g) { return (g.leftWheelJointData.motorSpeed + g.rightWheelJointData.motorSpeed) / 2; }
              , text: function (g, v) { return v.toFixed(1); } }
          , { label: "Swing", value: function (g) { return g.tailNeuronData.maxMotorSpeeds[1]; }
              , text: function (g, v) { return v.toFixed(1); } }
        ];

        var breederPicks = { parents: [], mutants: [] };

        // The stranger is a brand-new random creature offered on the breeding
        // screen, so the player can bring fresh genes straight into the
        // bloodline. While the screen is open it lives one past the end of
        // genomes and lineage, so breed() treats it like any other parent.
        var STRANGER = NUM_CREATURES;
        var STRANGER_COLOR = 0xFCC419;

        var newStranger = function () {
            genomes[STRANGER] = generator.GenerateRandData(1)[0];
            lineage[STRANGER] = { name: Names.random(), color: STRANGER_COLOR, origin: "stranger", streak: 0 };
        };

        var openBreeder = function (newRecord) {
            setPaused(true);
            breederPicks = { parents: defaultParents(), mutants: [] };
            newStranger();
            byId("breed-gen").textContent = generation;
            byId("breed-record").textContent = newRecord ? "New " + bredBy + " record!" : "";
            renderCards();
            byId("breed-screen").classList.remove("hidden");
            drawPortraits(ranking().concat([STRANGER]));
        };

        var renderCards = function () {
            var order = ranking().concat([STRANGER]);
            var maxima = TRAITS.map(function (trait) {
                return Math.max.apply(null, genomes.map(trait.value)) || 1;
            });
            byId("breed-cards").innerHTML = order.map(function (i, rank) {
                var l = lineage[i], g = genomes[i];
                var stranger = i === STRANGER;
                var tag = l.origin === "survivor" ? "★" + l.streak
                        : l.origin === "random" ? "new" : l.origin;
                return "<div class='breed-card" + (stranger ? " stranger" : "") + "' data-i='" + i + "' style='--c:" + hex(l.color) + "'>"
                     + "<div class='card-head'><span class='pos'>" + (stranger ? "?" : "#" + (rank + 1)) + "</span>"
                     + "<span class='name'>" + Names.text(l.name) + "</span><span class='tag'>" + tag + "</span></div>"
                     + "<canvas class='portrait'></canvas>"
                     + "<div class='card-dmg'>" + (stranger ? "Untested" : formatNumber(damage[i]) + " dmg") + "</div>"
                     + "<dl>" + TRAITS.map(function (trait, t) {
                           var v = trait.value(g);
                           return "<dt>" + trait.label + "</dt><dd><span class='trait-bar' style='width:"
                                + Math.round(100 * v / maxima[t]) + "%'></span>" + trait.text(g, v) + "</dd>";
                       }).join("") + "</dl>"
                     + "<div class='card-actions'>"
                     + "<button class='parent-btn'></button>"
                     + (stranger
                        ? "<button class='reroll-btn' title='Replace the stranger with a different random creature'>↻ Another</button>"
                        : "<button class='mutant-btn' title='Adds a copy of this creature to the next generation with every gene"
                          + " randomly changed, by about 30%. It takes a newcomer&apos;s place. Up to 3.'></button>")
                     + "</div>"
                     + "<div class='card-status'></div>"
                     + "</div>";
            }).join("");
            renderBreederPicks();
        };

        // Draws every creature in its resting pose, standing on the ground line.
        // Each portrait is scaled to fill its frame: one long tail would shrink a
        // shared scale to stick figures, and the trait bars already compare sizes.
        var drawPortraits = function (order) {
            var shapes = order.map(function (i) {
                var g = genomes[i];
                var w = g.torsoData.width, h = g.torsoData.height;
                var rl = g.leftWheelData.radius, rr = g.rightWheelData.radius;
                var vertebrae = [], tailLength = 0, tailWidth = 0;
                for (var v = 0; v < g.tailData.numVertebrae; ++v) {
                    var vw = g.tailData.rootWidth * Math.pow(g.tailData.widthReductionFactor, v);
                    var vh = g.tailData.rootHeight * Math.pow(g.tailData.heightReductionFactor, v);
                    vertebrae.push({ w: vw, h: vh });
                    tailLength += vh;
                    tailWidth = Math.max(tailWidth, vw);
                }
                // Torso center at the origin, y pointing down.
                return {
                    i: i, w: w, h: h, rl: rl, rr: rr, vertebrae: vertebrae
                  , minX: Math.min(-w / 2 - rl, -tailWidth / 2), maxX: w / 2 + rr
                  , minY: -h / 2 - tailLength, maxY: h / 2 + Math.max(rl, rr)
                };
            });

            all("#breed-cards canvas.portrait").forEach(function (canvas, k) {
                var s = shapes[k];
                var ratio = window.devicePixelRatio || 1;
                var cw = canvas.clientWidth, ch = canvas.clientHeight;
                canvas.width = cw * ratio;
                canvas.height = ch * ratio;
                var ctx = canvas.getContext("2d");
                ctx.scale(ratio, ratio);

                var scale = Math.min((cw - 12) / (s.maxX - s.minX), (ch - 10) / (s.maxY - s.minY));
                var ground = ch - 4;

                ctx.strokeStyle = "rgba(255,255,255,0.25)";
                ctx.beginPath();
                ctx.moveTo(0, ground + 0.5);
                ctx.lineTo(cw, ground + 0.5);
                ctx.stroke();

                ctx.translate(cw / 2 - (s.minX + s.maxX) / 2 * scale, ground - s.maxY * scale);
                ctx.scale(scale, scale);
                ctx.lineWidth = 1 / scale;
                var color = lineage[s.i].color;

                // Tail, stacked up from the middle of the torso's top edge.
                ctx.fillStyle = hex(Creature.Scorpion.paleColor(color));
                ctx.strokeStyle = "#000";
                var y = -s.h / 2;
                s.vertebrae.forEach(function (v) {
                    var tip = v.h * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(-v.w / 2, y - v.h + tip);
                    ctx.lineTo(0, y - v.h);
                    ctx.lineTo(v.w / 2, y - v.h + tip);
                    ctx.lineTo(v.w / 2, y);
                    ctx.lineTo(0, y - tip);
                    ctx.lineTo(-v.w / 2, y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    y -= v.h - tip;
                });

                // Torso, with a mouth and eye facing the wall.
                ctx.fillStyle = hex(color);
                ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
                ctx.fillStyle = "#000";
                ctx.beginPath();
                ctx.moveTo(s.w / 2, -s.h * 0.3);
                ctx.lineTo(s.w * 0.1, s.h * 0.1);
                ctx.lineTo(s.w * 0.25, s.h / 2);
                ctx.lineTo(s.w / 2, s.h / 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(s.w * 0.15, -s.h * 0.15, Math.min(s.w, s.h) * 0.12, 0, Math.PI * 2);
                ctx.fill();

                // Wheels on the bottom corners.
                [[-s.w / 2, s.rl], [s.w / 2, s.rr]].forEach(function (wheel) {
                    ctx.beginPath();
                    ctx.arc(wheel[0], s.h / 2, wheel[1], 0, Math.PI * 2);
                    ctx.fillStyle = "#ccc";
                    ctx.fill();
                    ctx.lineWidth = wheel[1] / 3;
                    ctx.strokeStyle = "#111";
                    ctx.stroke();
                });
            });
        };

        var breederOpen = function () { return !byId("breed-screen").classList.contains("hidden"); };

        var renderBreederPicks = function () {
            all("#breed-cards .breed-card").forEach(function (card) {
                var i = +card.dataset.i;
                var p = breederPicks.parents.indexOf(i);
                var isMutant = breederPicks.mutants.indexOf(i) >= 0;
                card.classList.toggle("parent", p >= 0);
                card.classList.toggle("mutant", isMutant);
                var parentButton = card.querySelector(".parent-btn");
                parentButton.classList.toggle("on", p >= 0);
                parentButton.textContent = p >= 0 ? "✓ Parent" : "Make parent";
                parentButton.disabled = p < 0 && breederPicks.parents.length >= 3;
                var mutantButton = card.querySelector(".mutant-btn"); // the stranger has none
                if (mutantButton) {
                    mutantButton.classList.toggle("on", isMutant);
                    mutantButton.textContent = isMutant ? "✓ Mutant copy" : "+ Mutant copy";
                    mutantButton.disabled = !isMutant && breederPicks.mutants.length >= 3;
                }
                card.querySelector(".card-status").innerHTML =
                    (i === STRANGER && p < 0 ? "<div>A brand-new random creature. Make it a parent to bring fresh genes into the bloodline.</div>" : "")
                  + (p >= 0 ? "<div>Survives and breeds with the other parents.</div>" : "")
                  + (isMutant ? "<div>A scrambled copy joins the next generation.</div>" : "");
            });
            var n = breederPicks.parents.length;
            var children = 9 - n, mutants = breederPicks.mutants.length;
            byId("breed-plan").textContent = n === 0
                ? "Pick at least one parent."
                : n + " survivor" + (n === 1 ? "" : "s") + ", " + children + " children"
                  + (mutants ? ", " + mutants + " mutant" + (mutants === 1 ? "" : "s") : "")
                  + ", " + (3 - mutants) + " newcomer" + (3 - mutants === 1 ? "" : "s");
            byId("btn-breed").disabled = byId("btn-auto5").disabled = n === 0;
        };

        var toggleIn = function (list, i, max) {
            var at = list.indexOf(i);
            if (at >= 0) { list.splice(at, 1); }
            else if (list.length < max) { list.push(i); }
        };

        var mutationRate = function () {
            return MUTATION_LEVELS[mutationLevel].rate;
        };

        var mutationHelp = function (level) {
            return "Each gene a child inherits has a " + Math.round(level.rate * 100)
                 + "% chance to shift by about 10%. Parents and mutant copies are not affected.";
        };

        var renderMutation = function () {
            all("#mutation button").forEach(function (button, k) { button.classList.toggle("on", k === mutationLevel); });
            byId("mutation-help").textContent = mutationHelp(MUTATION_LEVELS[mutationLevel]);
        };
        byId("mutation").innerHTML = MUTATION_LEVELS.map(function (level, k) {
            return "<button data-level='" + k + "' title='" + mutationHelp(level) + "'>" + level.name + "</button>";
        }).join("");
        renderMutation();

        var closeBreeder = function (autoGenerations) {
            if (breederPicks.parents.length === 0) { return; }
            byId("breed-screen").classList.add("hidden");
            autoLeft = autoGenerations;
            updateModeButton();
            breed(breederPicks.parents, breederPicks.mutants, mutationRate(), "breeder");
            setPaused(false);
        };

        // One listener handles every card. Clicking anywhere on a card, or its
        // Parent button, toggles it as a parent; the other buttons do their own thing.
        byId("breed-cards").addEventListener("click", function (event) {
            var card = event.target.closest(".breed-card");
            if (!card) { return; }
            if (event.target.closest(".reroll-btn")) {
                newStranger();
                renderCards();
                drawPortraits(ranking().concat([STRANGER]));
                return;
            }
            var list = event.target.closest(".mutant-btn") ? breederPicks.mutants : breederPicks.parents;
            toggleIn(list, +card.dataset.i, 3);
            renderBreederPicks();
        });
        byId("mutation").addEventListener("click", function (event) {
            var button = event.target.closest("button");
            if (!button) { return; }
            mutationLevel = +button.dataset.level;
            renderMutation();
        });
        byId("btn-breed").addEventListener("click", function () { closeBreeder(0); });
        byId("btn-auto5").addEventListener("click", function () { closeBreeder(5); });

        // --------------------------------------------------------------------
        // HUD
        // --------------------------------------------------------------------

        var ranks = byId("ranks");
        var rows = [];
        var buildRows = function () {
            ranks.innerHTML = "";
            rows = lineage.map(function (l, i) {
                var row = document.createElement("li");
                row.dataset.i = i;
                row.innerHTML = "<span class='pos'></span><span class='swatch'></span><span class='name'></span>"
                              + "<span class='tag'></span><span class='dmg'></span><span class='dmgbar'></span>";
                row.cells = {};
                ["pos", "swatch", "name", "tag", "dmg", "dmgbar"].forEach(function (cell, k) {
                    row.cells[cell] = row.children[k];
                });
                row.cells.swatch.style.background = row.cells.dmgbar.style.background = hex(l.color);
                ranks.appendChild(row);
                return row;
            });
        };
        // The HUD refreshes several times a second, so it only touches what changed.
        var setText = function (el, text) {
            if (el.textContent !== text) { el.textContent = text; }
        };
        var setStyle = function (el, property, value) {
            if (el.style[property] !== value) { el.style[property] = value; }
        };

        var nametags = [];
        var nametagKey = "";
        var bannerTimer = null;

        var banner = function (html, duration) {
            var el = byId("banner");
            clearTimeout(bannerTimer);
            el.innerHTML = "<div class='msg'>" + html + "</div>";
            bannerTimer = setTimeout(function () {
                el.firstChild.classList.add("out");
                bannerTimer = setTimeout(function () { el.innerHTML = ""; }, 300);
            }, duration);
        };

        var toggleFavor = function (i) {
            var at = favored.indexOf(i);
            if (at >= 0) {
                favored.splice(at, 1);
            }
            else {
                favored.push(i);
                if (favored.length > 3) { favored.shift(); }
                var pos = creatures[i].torso.body.GetPosition();
                popup(pos.x * METER, (pos.y - 1.5) * METER, "♥ favored", "#ff8cc6", 20);
            }
            updateHud(true);
        };

        var lastHudUpdate = 0;
        var lastHP = wallHP;
        var updateHud = function (force) {
            var now = performance.now();
            if (!force && now - lastHudUpdate < 150) { return; }
            lastHudUpdate = now;

            var info = wallInfo(level);
            var hp = wallRebuildAt === null ? Math.max(0, wallHP) : 0;
            byId("level").textContent = level;
            byId("wall-name").textContent = info.name;
            byId("hp-fill").style.width = (100 * hp / info.hp) + "%";
            byId("hp-text").textContent = wallRebuildAt === null
                ? formatNumber(hp) + " / " + formatNumber(info.hp) + " HP"
                : "DESTROYED";
            if (hp < lastHP - 1) {
                byId("hp-bar").classList.add("hurt"); // removed again when the animation ends
            }
            lastHP = hp;

            byId("generation").textContent = generation;
            setText(byId("speed-now"), SPEEDS[speedIndex] === 0 && !paused ? " · running at " + Math.round(achieved) + "x" : "");
            byId("time-left").textContent = Math.max(0, GENERATION_SECONDS - simTime).toFixed(1);
            byId("time-fill").style.width = (100 * (1 - simTime / GENERATION_SECONDS)) + "%";

            // Rows stay in place and are reordered with CSS, so a click never
            // lands on a row that was just replaced.
            var order = ranking();
            var top = Math.max(1, damage[order[0]]);
            order.forEach(function (i, rank) {
                var l = lineage[i];
                var row = rows[i];
                var favorite = favored.indexOf(i) >= 0;
                setText(row.cells.pos, String(rank + 1));
                setText(row.cells.name, (rank === 0 && damage[i] > 0 ? "♛ " : "") + (favorite ? "♥ " : "") + Names.text(l.name));
                setText(row.cells.tag, l.origin === "survivor" ? "★" + l.streak : l.origin === "random" ? "new" : l.origin);
                setText(row.cells.dmg, formatNumber(damage[i]));
                setStyle(row.cells.dmgbar, "width", (90 * damage[i] / top) + "%");
                setStyle(row, "order", String(rank));
                var className = (favorite ? "favored" : "") + (rank >= 5 ? " low" : "");
                if (row.className !== className) { row.className = className; }
            });

            // Name tags over the top three and any favorites.
            var show = order.slice(0, 3).filter(function (i) { return damage[i] > 0; });
            favored.forEach(function (i) { if (show.indexOf(i) < 0) { show.push(i); } });
            var labels = show.map(function (i) {
                return (i === order[0] ? "♛ " : "") + (favored.indexOf(i) >= 0 ? "♥ " : "") + Names.text(lineage[i].name);
            });
            var key = show.join() + labels.join();
            if (key === nametagKey) { return; }
            nametagKey = key;
            nametags.forEach(function (el) { el.remove(); });
            nametags = show.map(function (i, k) {
                var el = document.createElement("div");
                el.className = "nametag";
                el.style.color = hex(lineage[i].color);
                el.textContent = labels[k];
                el.dataset.i = i;
                fxLayer.appendChild(el);
                return el;
            });
        };

        var positionNametags = function () {
            nametags.forEach(function (el, k) {
                var torso = creatures[el.dataset.i].torso;
                var pos = torso.body.GetPosition();
                el.style.left = (pos.x * METER + scene.position.x) + "px";
                el.style.top  = ((pos.y - torso.props.height / 2 - 0.4) * METER + scene.position.y - k * 14) + "px";
            });
        };

        var drawHistory = function () {
            var canvas = document.getElementById("history-chart");
            var ctx = canvas.getContext("2d");
            var ratio = window.devicePixelRatio || 1;
            canvas.width = 240 * ratio;
            canvas.height = 80 * ratio;
            ctx.scale(ratio, ratio);
            ctx.clearRect(0, 0, 240, 80);

            var record = records[mode];
            byId("record").textContent = record.score > 0
                ? mode + " record " + formatNumber(record.score) + " by " + record.name
                : "";

            if (history.length === 0) {
                ctx.fillStyle = "rgba(255,255,255,0.6)";
                ctx.font = "12px sans-serif";
                ctx.fillText("Finish a generation to see progress", 8, 44);
                return;
            }
            var max = Math.max.apply(null, history.map(function (h) { return h.best; })) || 1;
            var x = function (i) { return history.length === 1 ? 120 : 6 + i * 228 / (history.length - 1); };
            var y = function (v) { return 74 - v / max * 66; };
            [["avg", "#74c0fc"], ["best", "#ffe066"]].forEach(function (series) {
                ctx.strokeStyle = series[1];
                ctx.fillStyle = series[1];
                ctx.lineWidth = 2;
                ctx.beginPath();
                history.forEach(function (h, i) {
                    if (i === 0) { ctx.moveTo(x(i), y(h[series[0]])); }
                    else { ctx.lineTo(x(i), y(h[series[0]])); }
                });
                ctx.stroke();
                history.forEach(function (h, i) {
                    ctx.beginPath();
                    ctx.arc(x(i), y(h[series[0]]), 2.5, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
        };

        // --------------------------------------------------------------------
        // Controls
        // --------------------------------------------------------------------

        var updateModeButton = function () {
            var button = byId("btn-mode");
            button.textContent = mode === "auto" ? "Auto" : autoLeft > 0 ? "Breeder (auto " + autoLeft + ")" : "Breeder";
            button.classList.toggle("breeder", mode === "breeder");
        };

        var toggleMode = function () {
            mode = mode === "auto" ? "breeder" : "auto";
            autoLeft = 0;
            updateModeButton();
            drawHistory();
            banner(mode === "auto"
                ? "<h2>Auto mode</h2><p>The top scorers breed on their own.</p>"
                : "<h2>Breeder mode</h2><p>You choose the parents when this generation ends.</p>", 1800);
        };

        var setPaused = function (value) {
            paused = value;
            byId("btn-play").innerHTML = paused ? "&#9654;" : "&#10074;&#10074;";
        };

        var speedLabel = function () {
            return SPEEDS[speedIndex] ? SPEEDS[speedIndex] + "x" : "Max";
        };

        var setSpeed = function (index) {
            speedIndex = index;
            stepsOwed = 0;
            byId("btn-speed").textContent = speedLabel();
        };

        var cycleSpeed = function () {
            setSpeed((speedIndex + 1) % SPEEDS.length);
        };

        var toggleSound = function () {
            Sound.muted = !Sound.muted;
            byId("btn-sound").classList.toggle("off", Sound.muted);
        };

        var start = function () {
            Sound.start();
            started = true;
            byId("title-screen").classList.add("hidden");
            setPaused(breederOpen()); // stay paused while the player is choosing parents
        };

        var showHelp = function () {
            setPaused(true);
            byId("btn-start").textContent = started ? "Back to smashing" : "Start smashing";
            byId("title-screen").classList.remove("hidden");
        };

        byId("btn-start").addEventListener("click", start);
        byId("btn-play").addEventListener("click", function () { if (!breederOpen()) { setPaused(!paused); } });
        byId("btn-evolve").addEventListener("click", function () { if (started && !breederOpen()) { endGeneration(); } });
        byId("btn-mode").addEventListener("click", function () { if (!breederOpen()) { toggleMode(); } });
        byId("btn-speed").addEventListener("click", cycleSpeed);
        byId("hp-bar").addEventListener("animationend", function () { byId("hp-bar").classList.remove("hurt"); });
        byId("btn-sound").addEventListener("click", toggleSound);
        byId("btn-help").addEventListener("click", showHelp);
        ranks.addEventListener("click", function (event) {
            var row = event.target.closest("li");
            if (row) { toggleFavor(+row.dataset.i); }
        });

        // Clicking a creature favors it. The topmost creature under the pointer wins.
        renderer.view.addEventListener("click", function (event) {
            var p = new b2Vec2((event.clientX - scene.position.x) / METER, (event.clientY - scene.position.y) / METER);
            for (var i = creatures.length - 1; i >= 0; --i) {
                var hit = creatures[i].parts.some(function (datum) {
                    for (var f = datum.body.GetFixtureList(); f; f = f.GetNext()) {
                        if (f.TestPoint(p)) { return true; }
                    }
                    return false;
                });
                if (hit) {
                    toggleFavor(i);
                    return;
                }
            }
        });

        document.addEventListener("keydown", function (event) {
            if (!started) {
                if (event.key === " " || event.key === "Enter") { event.preventDefault(); start(); }
                return;
            }
            if (breederOpen()) {
                if (event.key === "Enter") { closeBreeder(0); }
                return;
            }
            switch (event.key.toLowerCase()) {
                case "b": toggleMode(); break;
                case " ": event.preventDefault(); setPaused(!paused); break;
                case "e": endGeneration(); break;
                case "s": cycleSpeed(); break;
                case "m": toggleSound(); break;
                case "h": showHelp(); break;
                case "p": togglePerf(); break;
                case "escape": byId("title-screen").classList.add("hidden"); break;
            }
        });

        // --------------------------------------------------------------------
        // Main loop
        // --------------------------------------------------------------------

        // The physics runs in fixed steps of STEP simulated seconds. Each frame owes
        // as many steps as real time and the speed call for, so the game runs at the
        // same pace at any refresh rate. Stepping stops when the frame's time budget
        // is spent: a slow machine drops the steps it cannot afford instead of
        // falling further behind, and "Max" steps for the whole budget, so a fast
        // machine simply evolves faster.
        // The budget grows while frames arrive at 60 per second and shrinks when
        // they come late, since rendering and the browser need their time too.
        // Where drawing alone is too slow for 60 fps (no GPU, say) the physics
        // still gets a share: at least half as long as everything else.
        var TARGET_FRAME  = 1000 / 60; // ms
        var lastFrame     = performance.now();
        var frameTime     = TARGET_FRAME; // smoothed ms between frames
        var physicsTime   = 0;            // ms the last frame spent stepping
        var budget        = 8;            // ms of physics allowed per frame
        var stepsOwed     = 0;
        var achieved      = 0;            // smoothed simulated seconds per real second

        // Press P for a readout of where each frame's time goes.
        var perf = { shown: false, since: performance.now(), frames: 0, steps: 0, physics: 0 };
        var updatePerf = function (now, steps) {
            if (paused) { // keep the last reading on screen, and start afresh on resume
                perf.since = now;
                perf.frames = perf.steps = perf.physics = 0;
                return;
            }
            perf.frames++;
            perf.steps += steps;
            perf.physics += physicsTime;
            var span = now - perf.since;
            if (span < 1000) { return; }
            if (perf.shown) {
                byId("perf").textContent =
                    (1000 * perf.frames / span).toFixed(0) + " fps · "
                  + (perf.steps * STEP * 1000 / span).toFixed(1) + "x · "
                  + (perf.steps ? (perf.physics / perf.steps).toFixed(3) : "–") + " ms/step · "
                  + (perf.steps / perf.frames).toFixed(1) + " steps/frame\n"
                  + "physics " + (perf.physics / perf.frames).toFixed(1) + " ms/frame · "
                  + "rest " + ((span - perf.physics) / perf.frames).toFixed(1) + " ms/frame · "
                  + "budget " + budget.toFixed(1) + " ms";
            }
            perf.since = now;
            perf.frames = perf.steps = perf.physics = 0;
        };
        var togglePerf = function () {
            perf.shown = !perf.shown;
            byId("perf").hidden = !perf.shown;
        };

        var step = function () {
            for (var w = 0; w < worlds.length; ++w) {
                worlds[w].Step(STEP, 10, 10);
                worlds[w].ClearForces();
            }
            simTime += STEP;
            clock += STEP * 1000;
            for (var c = 0; c < creatures.length; ++c) {
                creatures[c].brain.think();
            }
            if (wallRebuildAt !== null && clock >= wallRebuildAt) {
                rebuildWall();
            }
        };

        function animate() {
            var now = performance.now();
            var elapsed = now - lastFrame;
            var dt = Math.min(0.05, elapsed / 1000);
            lastFrame = now;
            if (elapsed < 250) { // ignore pauses such as a hidden tab
                frameTime += (elapsed - frameTime) * 0.2;
                budget = frameTime > TARGET_FRAME * 1.2
                       ? Math.max(budget * 0.9, (elapsed - physicsTime) / 2, 1)
                       : Math.min(budget + 0.25, TARGET_FRAME - 2);
            }
            physicsTime = 0;

            var steps = 0;
            if (!paused) {
                var speed = SPEEDS[speedIndex];
                var deadline = now + budget;
                stepsOwed += speed * Math.min(0.1, elapsed / 1000) / STEP;
                // Owing half a step is enough, so jitter in frame timing does not
                // turn one step per frame into zero then two.
                while ((speed === 0 || stepsOwed > 0.5) && (steps === 0 || performance.now() < deadline)) {
                    step();
                    stepsOwed--;
                    steps++;
                    if (simTime >= GENERATION_SECONDS) {
                        processHits();
                        endGeneration();
                        stepsOwed = 0;
                        break;
                    }
                }
                physicsTime = performance.now() - now;
                stepsOwed = speed === 0 ? 0 : Math.min(stepsOwed, 1);
                achieved += (steps * STEP / Math.max(0.001, elapsed / 1000) - achieved) * 0.05;
                processHits();
            }
            updatePerf(now, steps);

            creatures.forEach(function (creature) {
                creature.parts.forEach(function (datum) {
                    if (datum.body != null && datum.graphics != null) {
                        var pos = datum.body.GetPosition();
                        datum.graphics.position.x = pos.x * METER;
                        datum.graphics.position.y = pos.y * METER;
                        datum.graphics.rotation = datum.body.GetAngle();
                    }
                });
            });

            // Wall: flash on hits, drop in when rebuilt.
            wallView.flashAlpha = Math.max(0, wallView.flashAlpha - dt * 3);
            wallView.flash.alpha = wallView.flashAlpha;
            if (wallView.dropOffset > 0) {
                wallView.dropOffset = Math.max(0, wallView.dropOffset - dt * pixelHeight * 2.5);
                if (wallView.dropOffset === 0) {
                    shake = 0.6 * METER;
                    Sound.hit(1);
                }
            }
            wallLayer.position.y = -wallView.dropOffset;

            updateParticles(dt);

            scene.position.x = (Math.random() - 0.5) * shake;
            scene.position.y = sceneTop + (Math.random() - 0.5) * shake;
            shake = shake < 0.5 ? 0 : shake * Math.pow(0.002, dt);

            updateHud(false);
            positionNametags();

            renderer.render(stage);
            requestAnimFrame(animate);
        }

        // Rotating a phone or resizing the window changes the world's size, so the
        // current generation restarts to fit. The wall keeps its HP. While the
        // breeding screen is open the world is rebuilt by breeding anyway.
        var resizeTimer = null;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (window.innerWidth === pixelWidth && window.innerHeight === pixelHeight) { return; }
                layout();
                renderer.resize(pixelWidth, pixelHeight);
                drawBackdrop();
                particles = [];
                if (breederOpen()) {
                    drawPortraits(ranking().concat([STRANGER]));
                    return;
                }
                spawnGeneration();
                updateHud(true);
                if (started) {
                    banner("<h2>Screen changed</h2><p>Generation " + generation + " restarted to fit.</p>", 1800);
                }
            }, 250);
        });

        spawnGeneration();
        drawHistory();
        updateHud(true);
        requestAnimFrame(animate);

        // Debugging and testing hooks.
        window.mwgEvolution = {
            state: function () {
                return { generation: generation, level: level, wallHP: wallHP, simTime: simTime
                       , damage: damage.slice(), history: history.slice(), paused: paused };
            }
          , endGeneration: endGeneration
            // Runs the physics flat out and returns the average ms per step.
          , bench: function (steps) {
                var t = performance.now();
                for (var i = 0; i < steps && simTime < GENERATION_SECONDS; ++i) { step(); }
                return (performance.now() - t) / i;
            }
          , setSpeed: setSpeed
          , loop: function () { return { speed: achieved, budget: budget, frameTime: frameTime }; }
        };
    }

    ready(function(){
        init();
    });

});
