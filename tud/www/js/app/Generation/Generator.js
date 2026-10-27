"use strict";
define([
    "lib/Utils"
  , "lib/Class"
  , "app/Creature"
  , "app/Body"
  , "app/Wall" ], function (Utils, Class, Creature, Body, Wall) {
    // Every gene stays inside these bounds. Without them, mutation (10% at a
    // time) and selection for damage grow creatures without end, until a tail
    // spans the screen and one physics step takes longer than a frame.
    var LIMITS = {
        torsoData:           { width: [1, 7], height: [0.1, 2.5], density: [0.5, 8], friction: [0.005, 1] }
      , leftWheelData:       { radius: [0.1, 2], density: [0.5, 6], friction: [0.5, 8] }
      , rightWheelData:      { radius: [0.1, 2], density: [0.5, 6], friction: [0.5, 8] }
      , leftWheelJointData:  { motorSpeed: [1, 12], maxMotorTorque: [5, 60] }
      , rightWheelJointData: { motorSpeed: [1, 12], maxMotorTorque: [5, 60] }
      , tailData: {
            numVertebrae: [1, 10], rootWidth: [0.05, 1], rootHeight: [0.25, 2], rootDensity: [0.25, 3]
          , rootMaxTorque: [20000, 1500000], widthReductionFactor: [0.6, 1.35], heightReductionFactor: [0.5, 1.3]
          , densityReductionFactor: [0.5, 1.3], torqueReductionFactor: [0.6, 1.5], friction: [0.1, 1]
        }
      , tailNeuronData: { distanceThreshold: [1, 6], timePerPosition: [40, 400] }
    };
    var MAX_MOTOR_SPEED = 40;     // rad/s, for both tail phases
    var MAX_TAIL_LENGTH = 12;     // m, all vertebrae end to end
    var MAX_TIP_WIDTH   = 2.5;    // m
    var MAX_TIP_TORQUE  = 3000000;

    var clamp = function (value, range) {
        return Math.min(range[1], Math.max(range[0], value));
    };

    // Lowers a per-vertebra factor until the last of n vertebrae is at most max.
    var capTip = function (root, factor, n, max) {
        return n > 1 && root * Math.pow(factor, n - 1) > max ? Math.pow(max / root, 1 / (n - 1)) : factor;
    };

    var limit = function (data) {
        for (var prop in LIMITS) {
            for (var key in LIMITS[prop]) {
                if (typeof data[prop][key] === "number") {
                    data[prop][key] = clamp(data[prop][key], LIMITS[prop][key]);
                }
            }
        }
        var speeds = data.tailNeuronData.maxMotorSpeeds; // rest and attack; copyThing makes it an object
        speeds[0] = clamp(speeds[0], [0.5, MAX_MOTOR_SPEED]);
        speeds[1] = clamp(speeds[1], [0.5, MAX_MOTOR_SPEED]);

        var tail = data.tailData;
        var n = Math.ceil(tail.numVertebrae); // the tail builds this many vertebrae
        tail.widthReductionFactor = capTip(tail.rootWidth, tail.widthReductionFactor, n, MAX_TIP_WIDTH);
        tail.torqueReductionFactor = capTip(tail.rootMaxTorque, tail.torqueReductionFactor, n, MAX_TIP_TORQUE);
        var length = function () {
            var sum = 0;
            for (var i = 0; i < n; ++i) { sum += tail.rootHeight * Math.pow(tail.heightReductionFactor, i); }
            return sum;
        };
        if (length() > MAX_TAIL_LENGTH) { // shrink every vertebra by the same share
            tail.rootHeight *= MAX_TAIL_LENGTH / length();
        }
        return data;
    };

  	var Generator=Class.extend({
      init: function(mRate){
        if ( typeof(mRate) === 'undefined' ) { mRate = 0; }
        this.mutationRate=mRate;
      }
    , GenerateRandData: function(num){
        var NData=[];
        for (var i=0; i<num; i++){
          var TData = {
            torsoData:  {
                initialX: 10
                , initialY: 10
                , initialAngle: 0
                , width: Utils.Math.randRange(2,5)
                , height: Utils.Math.randRange(.1,2)
                , density: Utils.Math.randRange(1,5)
                , friction: 0.01
            }

            , leftWheelData: {
              radius: Utils.Math.randRange(.2,1.5)
              , density: 2
              , friction: Utils.Math.randRange(1,5)
          }

          , leftWheelJointData: {
              enableMotor: true
              , motorSpeed: Utils.Math.randRange(3,6)
              , maxMotorTorque: Utils.Math.randRange(10,30)
          }

          , rightWheelData: {
              radius: Utils.Math.randRange(.1,1.3)
              , density: 2
              , friction: Utils.Math.randRange(1,4)
          }

          , rightWheelJointData: {
              enableMotor: true
              , motorSpeed: Utils.Math.randRange(3,6)
              , maxMotorTorque: Utils.Math.randRange(10,20)
          }

          , tailData: {
              numVertebrae: Utils.Math.randRange(3,8)
              , rootWidth: Utils.Math.randRange(.1,.7)
              , rootHeight: Utils.Math.randRange(.5,1.3)
              , rootDensity: Utils.Math.randRange(.5,1.5)
              , rootMaxTorque: Utils.Math.randRange(75000,750000)
              , widthReductionFactor: Utils.Math.randRange(.85,1.25)
              , heightReductionFactor: Utils.Math.randRange(.7,1.2)
              , densityReductionFactor: Utils.Math.randRange(.8,1.1)
              , torqueReductionFactor: Utils.Math.randRange(.9,1.3)
              , friction: 0.5
          }

          , tailNeuronData: {
              maxMotorSpeeds: [Utils.Math.randRange(1,5), Utils.Math.randRange(5,20)]
            , distanceThreshold: 2.5
            , timePerPosition: 100
          }
        };
        NData.push(limit(Utils.Data.copyThing(TData)));
      }
      return NData;
    }
  	,	Generate1: function(parentA, parentB){
  			var AData=parentA.props;
  			var BData=parentB.props;
  			var CData=Utils.Data.copyThing(AData);
  			for(var prop in BData) {
  				for(var key in BData[prop]) { // Important: AData and BData should have the same property types contained in them.
            if (Math.random() < 0.5) {
              CData[prop][key] = BData[prop][key];
            }
            if (Math.random()<this.mutationRate && typeof(CData[prop][key])==="number"){
              //console.log("mutation");
              //CData[prop][key] = Utils.Math.randRange(AData[prop][key], BData[prop][key]);
              if (Math.random() < 0.5) {
                CData[prop][key] = CData[prop][key]*1.1;
              }
              else{
                CData[prop][key] = CData[prop][key]*0.9;
              }
            }
            if (Math.random()<this.mutationRate && key=="maxMotorSpeeds"){
              //console.log("mutation in maxMotorSpeeds");
              CData[prop][key] = [Utils.Math.randRange(AData[prop][key][0], BData[prop][key][0]),Utils.Math.randRange(AData[prop][key][1], BData[prop][key][1])];
            }
          }
        }
        return CData;
  		}
    , GenerateData: function(parentA, parentB){
        var AData=parentA;
        var BData=parentB;
        var CData=Utils.Data.copyThing(AData);
        for(var prop in BData) {
          for(var key in BData[prop]) { // Important: AData and BData should have the same property types contained in them.
            if (Math.random() < 0.5) {
              CData[prop][key] = BData[prop][key];
            }
            if (Math.random()<this.mutationRate && typeof(CData[prop][key])==="number"){
              //console.log("mutation");
              //CData[prop][key] = Utils.Math.randRange(AData[prop][key], BData[prop][key]);
              if (Math.random() < 0.5) {
                CData[prop][key] = CData[prop][key]*1.11111111;
              }
              else{
                CData[prop][key] = CData[prop][key]*0.9;
              }
            }
            if (Math.random()<this.mutationRate && key=="maxMotorSpeeds"){
              //console.log("mutation in maxMotorSpeeds");
              CData[prop][key] = [Utils.Math.randRange(AData[prop][key][0], BData[prop][key][0]),Utils.Math.randRange(AData[prop][key][1], BData[prop][key][1])];
            }
          }
        }
        return limit(CData);
      }
    ,




  	});
    return Generator;
  });


