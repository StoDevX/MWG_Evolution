"use strict";
define(["lib/Class"], function (Class) {

  /* An efferent junction is a connection from a neuron to a body part.
   * It can be thought of similarly to a neuromuscular junction (a synapse
   * between efferent nerve fibers and muscle fibres).

   * --------
   * Values:
   * --------

   * bodyPart
   *  The body part this junction targets for manipulation.

   * impulseQueue
   *  The body part this junction targets for manipulation.

   * --------
   * Methods:
   * --------

   * impulse()
   *  Combines the data in the impulse queue and uses
   *  the overall result to inform some manipulation of
   *  the body part.

   * pushImpulse(value)
   *  Pushes the value onto the impulse queue.
   *  Connect this function to a neuron by using the
   *  Neuron.synapse(axon_index, dendrite, dendrite_owner) method and
   *  treating pushImpulse as the dendrite.
   *  Remember to .bind() pushImpulse so that this
   *  refers to the correct junction when it is called.

  */
  var EfferentJunction = Class.extend({
    init: function (bodyPart, impulse) {
      this.bodyPart = bodyPart;
      this.impulse = impulse || function () {};
      this.impulseQueue = [];
    }
  , _impulse: function () {
      this.impulse();
      this.impulseQueue = []; // clear impulse queue
    }
  , pushImpulse: function (value) {
      this.impulseQueue.push(value);
    }
  });

  return EfferentJunction;

});