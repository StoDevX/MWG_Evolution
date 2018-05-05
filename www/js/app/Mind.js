"use strict";
define( [ "app/Mind/Brain"
        , "app/Mind/Neuron"
        , "app/Mind/AfferentJunction"
        , "app/Mind/EfferentJunction"
        , "app/Mind/TailNeuron"
        ]
      , function (Brain, Neuron, AfferentJunction, EfferentJunction, TailNeuron) {

  var Mind              = {};
  Mind.Brain            = Brain;
  Mind.Neuron           = Neuron;
  Mind.AfferentJunction = AfferentJunction;
  Mind.EfferentJunction = EfferentJunction;
  Mind.TailNeuron       = TailNeuron;

  return Mind;
});