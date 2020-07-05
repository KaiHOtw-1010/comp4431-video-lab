var currentEffect = null; // The current effect applying to the videos

var outputDuration = 0; // The duration of the output video
var outputFramesBuffer = []; // The frames buffer for the output video
var currentFrame = 0; // The current frame being processed
var completedFrames = 0; // The number of completed frames

// This function starts the processing of an individual frame.
function processFrame() {
    if (currentFrame < outputDuration) {
        currentEffect.process(currentFrame);
        currentFrame++;
    }
}

// This function is called when an individual frame is finished.
// If all frames are completed, it takes the frames stored in the
// `outputFramesBuffer` and builds a video. The video is then set as the 'src'
// of the <video id='output-video'></video>.
function finishFrame() {
    completedFrames++;
    if (completedFrames < outputDuration) {
        updateProgressBar("#effect-progress", completedFrames / outputDuration * 100);

        if (stopProcessingFlag) {
            stopProcessingFlag = false;
            $("#progress-modal").modal("hide");
        } else {
            setTimeout(processFrame, 1);
        }
    }
    else {
        buildVideo(outputFramesBuffer, function(resultVideo) {
            $("#output-video").attr("src", URL.createObjectURL(resultVideo));
            updateProgressBar("#effect-progress", 100);
            $("#progress-modal").modal("hide");
        });
    }
}

// Definition of various video effects
//
// `effects` is an object with unlimited number of members.
// Each member of `effects` represents an effect.
// Each effect is an object, with two member functions:
// - setup() which responsible for gathering different parameters
//           of that effect and preparing the output buffer
// - process() which responsible for processing of individual frame
var effects = {
    reverse: {
        setup: function() {
            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {
            // debugging
            // var w = $("#input-video-1").get(0).videoWidth;
            // var h = $("#input-video-1").get(0).videoHeight;
            // console.log(w, h);
            // Put the frames in reverse order
            outputFramesBuffer[idx] = input1FramesBuffer[(outputDuration - 1) - idx];

            // Notify the finish of a frame
            finishFrame();
        }
    },

    fadeInOut: {
        setup: function() {
            // Prepare the parameters
            this.fadeInDuration = Math.round(parseFloat($("#fadeIn-duration").val()) * frameRate);
            this.fadeOutDuration = Math.round(parseFloat($("#fadeOut-duration").val()) * frameRate);

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');

            /*
             * TODO: Calculate the multiplier
             */
            function lerp(value1, value2, percentage) {
                if (percentage < 0) return value1;
                if (percentage > 1) return value2;
                return value1 + (value2 - value1) * percentage;
                // e.g. lerp(v0, v1, t)    // v = v0 * (1-t) + v1 * t
            }
            var multiplier = 1;
            if (idx < this.fadeInDuration) {
                // In the fade-in region: x0=0, x1=this.fadeInDuration, y0=0, y1=1
                var t_lerp = (idx - 0) / (this.fadeInDuration - 0);
                multiplier = lerp(0, 1, t_lerp);
            }
            else if (idx > outputDuration - this.fadeOutDuration) {
                // In the fade-out region: x0=outputDuration-fadeOutDuration, x1=outputDuration, y0=1, y1=0
                var t_lerp = (idx - (outputDuration-this.fadeOutDuration-1)) / (outputDuration-1 - (outputDuration-this.fadeOutDuration-1));
                multiplier = lerp(1, 0, t_lerp);
            }
            // else: multiplier remains to be 1.

            // Modify the image content based on the multiplier
            var img = new Image();
            img.onload = function() {
                // Get the image data object
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, w, h);

                /*
                 * TODO: Modify the pixels
                 */
                for (var i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i]   *= multiplier;
                    imageData.data[i+1] *= multiplier;
                    imageData.data[i+2] *= multiplier;
                }

                // Store the image data as an output frame
                ctx.putImageData(imageData, 0, 0);
                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
            // finishFrame(); // cannot be put outside
        }
    },

    motionBlur: {
        setup: function() {
            // Prepare the parameters
            this.blurFrames = parseInt($("#blur-frames").val());

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);

            // Prepare a buffer of frames (as ImageData)
            this.imageDataBuffer = [];
        },
        process: function(idx, parameters) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');

            // Need to store them as local variables so that
            // img.onload can access them
            var imageDataBuffer = this.imageDataBuffer;     // an array which stores involving frames
            var blurFrames = this.blurFrames;               // # of frames to be blurred.

            // Combine frames into one
            var img = new Image();
            img.onload = function() {
                // Get the image data object of the current frame
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, w, h);
                /*
                 * TODO: Manage the image data buffer
                 */
                imageDataBuffer.push(imageData);
                if (imageDataBuffer.length > blurFrames) {  // the buffer can at most have "blurFrames" number of frames.
                    imageDataBuffer.shift();
                }   // thus, the "imageDataBuffer" is an array containing the frames, as image data objects, that you need to merge.
                // debugging
                // console.log(imageDataBuffer.length);

                // Create a blank image data
                imageData = new ImageData(w, h);
                /*
                 * TODO: Combine the image data buffer into one frame
                 */
                for (var i = 0; i < imageData.data.length; i += 4) {
                    // set the pixel to black as default since this is an empty image.
                    imageData.data[i]   = 0;
                    imageData.data[i+1] = 0;
                    imageData.data[i+2] = 0;
                    imageData.data[i+3] = 255;  // note: alpha value of each pixel must be set to 255.
                    var channelRsum = 0, channelGsum = 0, channelBsum = 0;
                    for (var j = 0; j < imageDataBuffer.length; ++j) {
                        channelRsum = channelRsum + imageDataBuffer[j].data[i];
                        channelGsum = channelGsum + imageDataBuffer[j].data[i+1];
                        channelBsum = channelBsum + imageDataBuffer[j].data[i+2];
                    }
                    channelRsum /= imageDataBuffer.length;  // note it is not divided by "blurFrames"
                    channelGsum /= imageDataBuffer.length;  // because imageDataBuffer.length can be 0,1,...,blurFrames
                    channelBsum /= imageDataBuffer.length;
                    imageData.data[i]   = channelRsum;
                    imageData.data[i+1] = channelGsum;
                    imageData.data[i+2] = channelBsum;
                }

                // Store the image data as an output frame
                ctx.putImageData(imageData, 0, 0);
                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
        }
    },
    earthquake: {
        setup: function() {
            // Prepare the parameters
            this.strength = parseInt($("#earthquake-strength").val());

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx, parameters) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');      // seems in image onload function, this,crossFadeDuration cannot be read. Thus I define a global variable.
            // debugging
            // console.log("w: ", w, "h: ", h);
            /*
             * TODO: Calculate the placement of the output frame
             */    // Math.random() gives you 0~1
            var dx = Math.random() * (this.strength*2);  // a random number between 0 and 2 * strength
            var dy = Math.random() * (this.strength*2);  // a random number between 0 and 2 * strength
            var sw = w - 2 * this.strength;            // the value of width and height
            var sh = h - 2 * this.strength;

            // Draw the input frame in a new location and size
            var img = new Image();
            img.onload = function() {
                /*
                 * TODO: Draw the input frame appropriately
                 */
                ctx.drawImage(img, dx, dy, sw, sh, 0, 0, w, h);

                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
        }
    },
    crossFade: {
        setup: function() {
            // Prepare the parameters
            this.crossFadeDuration =
                Math.round(parseFloat($("#crossFade-duration").val()) * frameRate);
            // debugging
            // console.log(this.crossFadeDuration);
            /*
             * TODO: Prepare the duration and output buffer
             */     // Initialize the duration of the output video, and Prepare the array for storing the output frames.
            outputDuration = input1FramesBuffer.length + input2FramesBuffer.length - this.crossFadeDuration;
            // intermediateBuffer = new Array(outputDuration);
            outputFramesBuffer = new Array(outputDuration);
        },
            /*
             * TODO: Make the transition work
             */
        process: function(idx) {
            // debugging
            // console.log(this.crossFadeDuration);
            // Need to store cfd as local variable so that
            // img.onload can access it
            var cfd = this.crossFadeDuration;
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');
            // var canvas2 = getCanvas(w, h);
            // var ctx2 = canvas2.getContext('2d');
            // var canvas3 = getCanvas(w, h);
            // var ctx3 = canvas3.getContext('2d');
            /*
             * TODO: Calculate the multiplier
             */
            function lerp(value1, value2, percentage) {
                if (percentage < 0) return value1;
                if (percentage > 1) return value2;
                return value1 + (value2 - value1) * percentage;
            }   // e.g. lerp(v0, v1, t)    // v = v0 * (1-t) + v1 * t
            var multiplierInput1 = 1, multiplierInput2 = 1;
            if (idx >= input1FramesBuffer.length - this.crossFadeDuration && idx < input1FramesBuffer.length) {
                var t_lerp = (idx - (input1FramesBuffer.length - this.crossFadeDuration)) / (input1FramesBuffer.length - (input1FramesBuffer.length - this.crossFadeDuration));
                multiplierInput1 = lerp(1, 0, t_lerp);
                multiplierInput2 = lerp(0, 1, t_lerp);
            }  /* else: multiplierInput1=1, multiplierInput2=1 */

            /* ----------------------------------------------------------------------------------------- */
            if (idx < input1FramesBuffer.length - this.crossFadeDuration) {
                // debugging
                console.log("in here first part?");
                // console.log(this.crossFadeDuration);
                outputFramesBuffer[idx] = input1FramesBuffer[idx];
                finishFrame();
            }
            else if (idx >= input1FramesBuffer.length) {
                // debugging
                // outputFramesBuffer[idx] = input1FramesBuffer[this.crossFadeDuration + idx];
                outputFramesBuffer[idx] = input2FramesBuffer[idx - (input1FramesBuffer.length-this.crossFadeDuration)];
                finishFrame();
            }
            else {
                // debugging
                console.log("in transition..");
                // console.log("crossFadeDuration: ", this.crossFadeDuration);
                var imageData1_data = [];
                var img_input1 = new Image(), img_input2 = new Image(); // outputImageData = new ImageData(w, h);
                img_input1.onload = function() {
                    img_input2.src = input2FramesBuffer[idx - (input1FramesBuffer.length-cfd)];
                    // img_input2.src = input2FramesBuffer[idx - 50];
                    // debugging
                    // console.log(idx);
                    // console.log(input1FramesBuffer.length);
                    // console.log(cfd);
                };
                img_input2.onload = function() {
                    ctx.drawImage(img_input1, 0, 0);    var imageData1 = ctx.getImageData(0, 0, w, h);
                    ctx.drawImage(img_input2, 0, 0);    var imageData2 = ctx.getImageData(0, 0, w, h);

                    for (var i = 0; i < imageData1.data.length; i += 4) {
                        imageData1.data[i]   *= multiplierInput1;
                        imageData1.data[i+1] *= multiplierInput1;
                        imageData1.data[i+2] *= multiplierInput1;
                    }
                    for (var i = 0; i < imageData2.data.length; i += 4) {
                        imageData2.data[i]   = imageData2.data[i] * multiplierInput2 + imageData1.data[i];
                        imageData2.data[i+1] = imageData2.data[i+1] * multiplierInput2 + imageData1.data[i+1];
                        imageData2.data[i+2] = imageData2.data[i+2] * multiplierInput2 + imageData1.data[i+2];
                    }
                    // for (var i = 0; i < outputImageData.data.length; i += 4) {
                    //      ...sum multiplied input1 with multplied input2...
                    // }
                    // ctx.putImageData(outputImageData, 0, 0);
                    ctx.putImageData(imageData2, 0, 0);
                    outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
                    finishFrame();
                };
                img_input1.src = input1FramesBuffer[idx];
                // var img_input1 = new Image(), img_input2 = new Image();
                // img_input1.onload = function() {
                //     ctx.drawImage(img_input1, 0, 0);
                //     var imageData1 = ctx.getImageData(0, 0, w, h);
                //     for (var i = 0; i < imageData1.data.length; i += 4) {
                //         imageData1.data[i]   *= multiplierInput1;
                //         imageData1.data[i+1] *= multiplierInput1;
                //         imageData1.data[i+2] *= multiplierInput1;
                //     }
                //     imageData1_data = imageData1.data;
                // };
                // img_input1.src = input1FramesBuffer[idx];
                //
                // img_input2.onload = function() {
                //     ctx.drawImage(img_input2, 0, 0);
                //     var imageData2 = ctx.getImageData(0, 0, w, h);
                //     for (var i = 0; i < imageData2.data.length; i += 4) {
                //         imageData2.data[i]   *= multiplierInput2;
                //         imageData2.data[i+1] *= multiplierInput2;
                //         imageData2.data[i+2] *= multiplierInput2;
                //         imageData2.data[i]   += imageData1_data[i];
                //         imageData2.data[i+1] += imageData1_data[i+1];
                //         imageData2.data[i+2] += imageData1_data[i+2];
                //     }
                //     ctx.putImageData(imageData2, 0, 0);
                //     outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
                //     finishFrame();
                // };
                // img_input2.src = input2FramesBuffer[idx - (input1FramesBuffer.length-this.crossFadeDuration)];
            }
            // else {
            //     console.log("in transition..") // debugging
            //     var img_input1 = new Image();
            //     img_input1.onload = function() {
            //         ctx1.drawImage(img_input1, 0, 0);
            //         var imageData1 = ctx1.getImageData(0, 0, w, h);
            //         for (var i = 0; i < imageData1.data.length; i += 4) {
            //             imageData1.data[i]   *= multiplierInput1;
            //             imageData1.data[i+1] += multiplierInput1;
            //             imageData1.data[i+2] += multiplierInput1;
            //         } ///////////////////////////////////
            //         var img_input2 = new Image();
            //         img_input2.onload = function() {
            //             ctx2.drawImage(img_input2, 0, 0);
            //             var imageData2 = ctx2.getImageData(0, 0, w, h);
            //             for (var i = 0; i < imageData2.data.length; i += 4) {
            //                 imageData1.data[i]   += imageData2.data[i]   * multiplierInput2;
            //                 imageData1.data[i+1] += imageData2.data[i+1] * multiplierInput2;
            //                 imageData1.data[i+2] += imageData2.data[i+2] * multiplierInput2;
            //             }
            //         };
            //         img_input2.src = input2FramesBuffer[idx - (input1FramesBuffer.length-this.crossFadeDuration)];
            //
            //         ctx1.putImageData(imageData1, 0, 0);
            //         outputFramesBuffer[idx] = canvas1.toDataURL("image/webp");
            //         finishFrame();
            //     };
            //     img_input1.src = input1FramesBuffer[idx];
            // }
            /* the transition period: "input1FramesBuffer.length-this.crossFadeDuration" <= idx < input1FramesBuffer.length */
            // else {
            //     // debugging
            //     console.log("in here?");
            //     var img_input1 = new Image();
            //     img_input1.onload = function() {
            //         // Get the image data object
            //         ctx1.drawImage(img_input1, 0, 0);
            //         var imageData = ctx1.getImageData(0, 0, w, h);
            //         // Modify the pixels //
            //         for (var i = 0; i < imageData.data.length; i += 4) {
            //             imageData.data[i]   *= multiplierInput1;
            //             imageData.data[i+1] *= multiplierInput1;
            //             imageData.data[i+2] *= multiplierInput1;
            //         }
            //         // Store the image data as an output frame
            //         ctx1.putImageData(imageData, 0, 0);
            //         intermediateBuffer[idx] = canvas1.toDataURL("image/webp");
            //         // Notify the finish of a frame
            //         // debugging
            //         // // finishFrame();
            //     };
            //     img_input1.src = input1FramesBuffer[idx];
            //
            //     var img_input2 = new Image();
            //     // tiral\
            //     var img_mid    = new Image();
            //     // trial
            //     img_input2.onload = function() {
            //         // Get the image data object
            //         ctx2.drawImage(img_input2, 0, 0);
            //         var imageData = ctx2.getImageData(0, 0, w, h);
            //         // Modify the pixels //
            //         for (var i = 0; i < imageData.data.length; i += 4) {
            //             imageData.data[i]   *= multiplierInput2;
            //             imageData.data[i+1] *= multiplierInput2;
            //             imageData.data[i+2] *= multiplierInput2;
            //         }
            //         // trial
            //         img_mid.onload = function() {
            //             ctx3.drawImage(img_mid, 0, 0);
            //             var imageDataOutput = ctx3.getImageData(0, 0, w, h);
            //             for (var i = 0; i < imageDataOutput.data.length; i += 4) {
            //                 imageDataOutput.data[i]   += imageData.data[i];
            //                 imageDataOutput.data[i+1] += imageData.data[i+1];
            //                 imageDataOutput.data[i+2] += imageData.data[i+2];
            //             }
            //             ctx3.putImageData(imageDataOutput, 0, 0);
            //             intermediateBuffer[idx] = canvas3.toDataURL("image/webp");
            //             // finishFrame();
            //         };
            //         img_mid.src = intermediateBuffer[idx];
            //         // trial
            //
            //         // Store the image data as an output frame
            //         // ctx2.putImageData(imageData, 0, 0);
            //         // outputFramesBuffer[idx] = canvas2.toDataURL("image/webp");
            //         // Notify the finish of a frame
            //
            //         // trial
            //         outputFramesBuffer[idx] = intermediateBuffer[idx];
            //         finishFrame();
            //     };
            //     img_input2.src = input2FramesBuffer[idx - (input1FramesBuffer.length-this.crossFadeDuration)];
            //     // // debugging
            //     // // outputFramesBuffer[idx] = input1FramesBuffer[idx];
            //     // // finishFrame();
            // }
        }
    }
};

// Handler for the "Apply" button click event
function applyEffect(e) {
    $("#progress-modal").modal("show");
    updateProgressBar("#effect-progress", 0);

    // Check which one is the actively selected effect
    switch(selectedEffect) {
        case "fadeInOut":
            currentEffect = effects.fadeInOut;
            break;
        case "reverse":
            currentEffect = effects.reverse;
            break;
        case "motionBlur":
            currentEffect = effects.motionBlur;
            break;
        case "earthquake":
            currentEffect = effects.earthquake;
            break;
        case "crossFade":
            currentEffect = effects.crossFade;
            break;
        default:
            // Do nothing
            $("#progress-modal").modal("hide");
            return;
    }

    // Set up the effect
    currentEffect.setup();

    // Start processing the frames
    currentFrame = 0;
    completedFrames = 0;
    processFrame();
}
