// ----------------------------------------------------------------------------
// Brain: Access and manipulation of the input and output
//        leaves of the neural network.
// ----------------------------------------------------------------------------

export class Brain {
  init(afferent_junctions, efferent_junctions) {
    this.afferent_junctions = afferent_junctions || [];
    this.efferent_junctions = efferent_junctions || [];
  }

  think() {
    // Start propagating by triggering senses (afferent junctions).
    this.afferent_junctions.forEach(function (afferent) {
      afferent.impulse();
    });

    // Finish propagation by applying accumulated values on
    // efferent junctions to body parts.
    this.efferent_junctions.forEach(function (efferent) {
      efferent._impulse(); // _impulse also clears the impulse queue
    });
  }
}
