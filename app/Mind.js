import { Brain } from './Mind/Brain.js'
import { Neuron } from './Mind/Neuron.js'
import { AfferentJunction } from './Mind/AfferentJunction.js'
import { EfferentJunction } from './Mind/EfferentJunction.js'
import { TailNeuron } from './Mind/TailNeuron.js'

var Mind = {}
Mind.Brain = Brain
Mind.Neuron = Neuron
Mind.AfferentJunction = AfferentJunction
Mind.EfferentJunction = EfferentJunction
Mind.TailNeuron = TailNeuron

export default Mind
