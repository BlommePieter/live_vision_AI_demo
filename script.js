let isCameraOn = false;
let captionCapturingOn = false;
let videoStream;
let liveCaptionInterval;

// Replace with your Azure Computer Vision API key and endpoint
const apiKey = 'b98546f95ca748d2886cbf3e0d3fbc2f';
const endpoint = 'https://cv-pieter-blomme.cognitiveservices.azure.com';

const speechKey = 'ffa2e99ef45b447ca5d77a52ed6fcb35';
const serviceRegion = 'westeurope';

let currentCameraFacingMode = 'environment';

async function toggleCamera() {
    const videoElement = document.getElementById('cameraFeed');
    const flipCameraBtn = document.getElementById('flipCameraBtn');

    if (isCameraOn) {
        // Turn off the camera
        if (videoStream) {
            const tracks = videoStream.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
            isCameraOn = false;
            flipCameraBtn.style.display = 'none'; // Hide flip camera button when turning off camera
        }
    } else {
        // Turn on the camera
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentCameraFacingMode }
            });
            videoElement.srcObject = videoStream;
            isCameraOn = true;
            flipCameraBtn.style.display = 'block'; // Show flip camera button when turning on camera
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    }

    // Show/hide the video element based on camera status
    videoElement.style.display = isCameraOn ? 'block' : 'none';
}

function toggleLiveCaption() {

    if (captionCapturingOn) {
        // Turn off live caption
        clearInterval(liveCaptionInterval);
        captionCapturingOn = false;

        // change button background color red
        document.getElementById("toggleLiveCaption").style.backgroundColor = "rgb(131, 3, 0)";

    } else {
        // Turn on live caption
        liveCaptionInterval = setInterval(captureAndCaption, 5000);
        captionCapturingOn = true;

        // change button background color green
        document.getElementById("toggleLiveCaption").style.backgroundColor = "green";
    }
}

async function captureAndCaption() {
    const videoElement = document.getElementById('cameraFeed');

    // Get the current video frame as an image URL
    const imageUrl = await getVideoFrameAsDataURL(videoElement);

    // Get the image data from the live camera feed
    const imageData = await getImageData(imageUrl);

    // Send image data to Azure Computer Vision API for analysis
    const requestData = {
        url: `${endpoint}/vision/v3.2/analyze?visualFeatures=Description&language=en`,
        type: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': apiKey,
        },
        data: imageData,
        processData: false,
    };

    try {
        const response = await $.ajax(requestData);

        if (response.description && response.description.captions && response.description.captions.length >
            0) {
            const caption = response.description.captions[0].text;
            console.log('Image caption:', caption);

            // add some text on âge in div with id debug
            // document.getElementById("debug").innerHTML = caption;

            speakText('I see' + caption);
        } else {
            console.error('Unable to retrieve image caption.');
        }
    } catch (error) {
        console.error('Error in API request:', error);
    }
}

function getVideoFrameAsDataURL(videoElement) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.onloadend = function () {
                resolve(reader.result);
            };
            reader.readAsDataURL(blob);
        }, 'image/jpeg');
    });
}

function getImageData(imageUrl) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                reject(`Failed to load image: ${xhr.statusText}`);
            }
        };
        xhr.onerror = function () {
            reject('Error while loading image.');
        };
        xhr.open('GET', imageUrl, true);
        xhr.responseType = 'arraybuffer';
        xhr.send();
    });
}

function speakText(sentence) {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

    synthesizer.speakTextAsync(sentence, result => {
        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log('Speech synthesis completed.');

            // shwo some text on page with id debug2
            // document.getElementById("debug2").innerHTML = "voice synt success";


        } else {
            console.error('Speech synthesis failed:', result.errorDetails);
        }
    });
}

function flipCamera() {
    currentCameraFacingMode = (currentCameraFacingMode === 'environment') ? 'user' : 'environment';
    toggleCamera(); // Toggle the camera to apply the new facingMode
}