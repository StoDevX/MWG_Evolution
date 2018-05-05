"use strict";
define(["lib/Class"], function (Class) {
  /* An afferent junction is a connection from a body part to the nervous system.
   * It effectively serves as a sensory receptor.

   * --------
   * Values:
   * --------

   * bodyPart
   *  The body part to get data from.

   * dendrites
   *  The dendrites of the target neuron or neurons to propagate
   *  data to. These dendrites are input to that neuron, not to this
   *  junction.

   * --------
   * Methods:
   * --------

   * sense()
   *  Accesses the datum this junction observes, then returns
   *  that value. You should create a closure around the body
   *  part when you define the sense() function.

   * impulse()
   *  Propagates this junction's datum onto all connected dendrites.

   * synapse(dendrite)
   *  Connects the dendrite to this junction.

  */
  var AfferentJunction = Class.extend({
    init: function (bodyPart, sense, dendrites) {
      this.bodyPart = bodyPart;
      this.dendrites = dendrites || [];
      this.sense = sense || function () { return null; };
    }
  , impulse: function () {
      var datum = this.sense();
      this.dendrites.forEach(function (dendrite) {
        dendrite(datum);
      });
    }
  , synapse: function(dendrite, dendrite_owner) {
      // TODO: The neuron already ensures that the dendrites
      // are bound to it when it is constructed, do we really
      // need to rebind them to the same thing here?
      // Or perhaps we wish to have the flexibility of changing
      // the dendrite owner if we want (which wouldn't affect the
      // original dendrite anyway). There is also the matter of memory
      // efficiency to consider here, as .bind() returns a new function
      // every time it is called.
      // Further note that we may need this because there are some
      // cases where dendrites are generated after construction,
      // like the TailNeuron for instance. We should decide whether
      // to enforce this here or leave the responsibility to whoever
      // programs a neuron.
      this.dendrites.push(dendrite.bind(dendrite_owner));
    }

  });

  return AfferentJunction;
});