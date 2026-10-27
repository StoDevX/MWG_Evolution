## MWG Evolution

This is the final project for our Mobile Web Graphics course (Fall 2014). It serves as an investigation of genetic algorithms and very, very simple neural networks.

We "evolve" a car-like creature with a scorpion-like tail on the basis of the amount of force it can apply to a wall over a given time period (by default 20 seconds in the most up-to-date demo). The intent is to produce creatures that are better at attacking the wall. Each creature has a body (represented by Box2D fixtures) and a mind (constructed as a very small neural network) to control different body parts. The mind is not a conventional neural network in that it is never trained, but it does co-evolve with the body generation-to-generation. In this way the operation of the mind can improve.

### What it looks like

![demo](http://i.imgur.com/YmHlezC.png)

### Current parameters that we evolve

**Torso:**

* The width of the torso.
* The height of the torso.
* The density of the torso.
* The friction of the torso.

**Wheels:**

* The radius of the wheel.
* The density of the wheel.
* The friction of the wheel.

**Wheel Joints:**

* The speed of the motor.
* The maximum torque of the motor.

**Tail:**

* The number of vertebrae in the tail.
* The width of the root vertebra.
* The height of the root vertebra.
* The density of the root vertebra.
* The maximum torque of the motor assigned to the root vertebra.
* The friction of the entire tail.
* The factor by which the width of each vertebra changes along the tail from root to end.
* The factor by which the height of each vertebra changes along the tail from root to end.
* The factor by which the density of each vertebra changes along the tail from root to end.
* The factor by which the torque of each vertebra changes along the tail from root to end.

**Mind:**

* The distance threshold at which the creature will begin attacking the wall. This distance is measured by the creature's Eye, then sent to its TailNeuron during the "thinking" step of the simulation.
* The amount of time the creature spends in each position of its movement pattern during the attacking phase.
* The maximum speed, by phase (at rest or attacking), that the creature will try to move the joints on its tail. The actual speed that it tries to move a given tail joint depends on the difference between that joint's angle and the angle that that joint is assigned for the current position in that creature's movement pattern.
* Note:  We do not presently evolve the number of key positions in the movement pattern or the angles for each stage of the movement pattern. The angles for the attack position change slightly depending on the number of neurons in the tail. Currently, the movement pattern consists of the creature cycling between the "at rest" and "attacking" tail positions.

---

### A few other items to note

* The code is in the "www" folder.

* Open "FullScreenEvolution.html" for the most up to date demo. Serve the `www` folder over HTTP (for example `python3 -m http.server` inside `tud/www`), since require.js cannot load modules from `file://` URLs in most browsers. The game plays like this:
    * The wall is a boss with HP. Damage carries over between generations, and each destroyed wall is replaced by a tougher one (Cardboard, Plywood, Brick, and so on).
    * Every creature has its own color and a name. Survivors keep theirs, children take half their name from each parent, and duplicate names get numbered (Chompzilla II).
    * The leaderboard ranks creatures by damage dealt this generation. The chart tracks the best and average damage per generation, and the all-time record is saved in the browser.
    * Click a creature, or its leaderboard row, to favor it. Up to three favored creatures are guaranteed to breed, ahead of the top scorers.
    * Press `B` (or the Auto button) for **Breeder mode**. At the end of each generation the game pauses on a card for every creature, showing its damage and readable traits (tail, muscle, body, wheels, drive, swing). Pick 1 to 3 parents, add up to 3 heavily mutated "mutant copies", or make the randomly generated "stranger" a parent to bring in fresh genes. Set the mutation rate from Gentle to Chaos, then breed. "Breed, then auto ×5" hands the next five generations back to the algorithm. Auto-bred and player-bred generations keep separate records.
    * Hits throw sparks and damage numbers, shake the screen and play synthesized sound effects.
    * Keyboard: `Space` pause, `E` evolve now, `B` breeder mode, `S` cycle speed (1x, 2x, 4x, 8x), `M` sound, `H` help.

* Most documentation is inline with code, but some of it might be just a tiny bit out of date since we haven't gone through with a fine-tooth comb and updated it after our mad rush the night before our demo day. The demo code is messy. Don your hazmat suit before entering.

* Look in www/js/app/Body     to see how creature body parts are designed,
       in www/js/app/Creature to see how creatures are designed,
       in www/js/app/Mind     to see how the neural networks that control the creatures are designed.

* The aspect ratio of your viewport might effect how the creatures evolve, because this affects the aspect ratio of the environment.

* We use Box2dWeb.js for physics simulation.

* We use PIXI.js for rendering.

* This is an Apache Cordova project, which makes it easy to build for mobile deployment.
