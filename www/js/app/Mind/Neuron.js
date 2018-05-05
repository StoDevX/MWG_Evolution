"use strict";
define(["lib/Class"], function (Class) {
  // ----------------------------------------------------------------------------
  // Neuron: A processing center for mental information.
  // ----------------------------------------------------------------------------

  /* A neuron serves as a node in the neural network,
   * which acts as the brain of a creature.

   * --------
   * Values:
   * --------

   * dendrites
   *  A dendrite is an incoming connection to a neuron.
   *  This is an array of functions that serve as the inputs to this neuron (you
   *  call a dendrite function to simulate a synapse signal traveling into that dendrite).
   *  The dendrite functions should be set up during the construction of a neuron.
   *  Be sure to document the index that each dendrite lives at when you write
   *  a neuron subclass.

   * axons
   *  An axon is an outgoing connection from a neuron.
   *  This is an array of arrays of dendrites. Each subarray holds references
   *  to the dendrites connected to the axon corresponding to the subarray's index.
   *  Each axon should correspond to a specific datum that the neuron can output.
   *  Be sure to document which indices correspond to which data when you write
   *  a neuron subclass.

   * --------
   * Methods:
   * --------

   * impulse (axon_index, value)
   *  Calls every dendrite in the subarray at axons[axon_index] with the value argument.

   * synapse (axon_index, dendrite, dendrite_owner)
   *  Adds the dendrite to the subarray at axons[axon_index].

  Proposed interface:
   * linkTo__ENTITIY_CLASS_NAME__(entity)
   *  Links the neuron's dendrites and axons up to the terminals on the
   *  entity, whether that entity is another neuron, a body part, or
   *  even a single junction on a body part. This is intended to be
   *  implemented in a subclass to provide functionality specific
   *  to the entity this neuron is designed to interact with.
   *  When you add implement it, replace __ENTITY_CLASS_NAME__ with
   *  the name of the class for the entity the method is designed
   *  to connect to the neuron.
   *  That way, you can have methods to link multiple different kinds
   *  of entities to your custom neuron.

   */
  var Neuron = Class.extend({
    init: function (dendrites, axons) {
      this.dendrites = dendrites || [];
      this.axons = axons || [];

      // Bind each dendrite's this to the neuron object
      for (var i = 0; i < dendrites.length; ++i) {
        dendrites[i] = dendrites[i].bind(this);
      }
    }

  , impulse: function (axon_index, value) {
      if (this.axons[axon_index] instanceof Array) { // instanceof is the fastest type checking operation
        this.axons[axon_index].forEach(function (dendrite) {
          dendrite(value);
        });
      }
    }
  , synapse: function (axon_index, dendrite, dendrite_owner) {
      if (this.axons[axon_index] instanceof Array) {
        this.axons[axon_index].push(dendrite.bind(dendrite_owner));
      }
  }

  });

  return Neuron;
});