document.addEventListener('DOMContentLoaded', () => {
    const modelViewer = document.querySelector("#myModelViewer");
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let curEasingFactor = 0.08;
    let maxEasingFactor = 0.08;
    let minEasingFactor = 0.02;

    let delayTime = 300; // in milliseconds
    let easingTime = 1200; // in milliseconds
    let rotationStrengthX = 0.6
    let rotationStrengthY = 0.4
    let xUpperBound = 460
    let xLowerBound = 260
    let yUpperBound = 85
    let yLowerBound = 70

    let delayTimer;
    let lastMouseUpdateTime = performance.now();
    let decreaseEasing = false;
    let increaseEasing = false;

    let followMouse = false;

    function getMouse(e){
      mouseX = e.clientX;
      mouseY = e.clientY;
      clearTimeout(delayTimer); // Clear existing timer
      delayTimer = setTimeout(startTransition, delayTime);
    }

    document.addEventListener('mousemove', getMouse);

    function startTransition() {
      decreaseEasing = true;
      lastMouseUpdateTime = performance.now();
    }

    function cubicEaseIn(t) {
      return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    }

    function decreaseEasingFactors() {
      const easingProgress = (performance.now() - lastMouseUpdateTime) / easingTime;
      curEasingFactor = maxEasingFactor - cubicEaseIn(Math.min(1, easingProgress)) * (maxEasingFactor - minEasingFactor); 
      if (Math.round(curEasingFactor * 100) / 100 === minEasingFactor) {
        decreaseEasing = false;
        updateTargetRotation();
      }
    }

    function updateTargetRotation() {
      const dx = (mouseX - window.innerWidth / 2);
      const dy = (mouseY - window.innerHeight / 2);
      const dxDir = dx > 0 ? 1 : -1;
      const dyDir = dy > 0 ? 1 : -1;

      targetRotationX = rotationStrengthX * dxDir;
      targetRotationY = rotationStrengthY * dyDir;
      increaseEasing = true;
      lastMouseUpdateTime = performance.now();
    }

    function increaseEasingFactors() {
      const easingProgress = (performance.now() - lastMouseUpdateTime) / easingTime;
      curEasingFactor = cubicEaseIn(Math.min(1, easingProgress)) * maxEasingFactor; 
      if (Math.round(curEasingFactor * 100) / 100 === maxEasingFactor) {
        increaseEasing = false;
      }
    }

    function rotateModel() {
      if (!modelViewer.cameraOrbit) {
        requestAnimationFrame(animate);
        return;
      }
      const currentRotation = modelViewer.cameraOrbit.split(' ').map(parseFloat);

      let newRotationX = currentRotation[0] + (targetRotationX * curEasingFactor);
      let newRotationY = currentRotation[1] + (targetRotationY * curEasingFactor);

      newRotationY = Math.min(Math.max(newRotationY, yLowerBound), yUpperBound);
      newRotationX = Math.min(Math.max(newRotationX, xLowerBound), xUpperBound);

      modelViewer.cameraOrbit = `${newRotationX}deg ${newRotationY}deg 110%`;
    }

    function animate() {
      if (decreaseEasing) {
        decreaseEasingFactors();
      } else if (increaseEasing) {
        increaseEasingFactors();
      }
      if (followMouse) {
        rotateModel();
      }
      requestAnimationFrame(animate);
    }
                // Bind slider values to constants
    document.getElementById('delayTimeSlider').addEventListener('input', function() {
        delayTime = parseInt(this.value);
        document.getElementById('delayTimeValue').innerText = delayTime;

    });

    document.getElementById('easingTimeSlider').addEventListener('input', function() {
        easingTime = parseInt(this.value);
        document.getElementById('easingTimeValue').innerText = easingTime;

    });

    document.getElementById('rotationStrengthXSlider').addEventListener('input', function() {
        rotationStrengthX = parseFloat(this.value);
        document.getElementById('rotationStrengthXValue').innerText = rotationStrengthX;
    });

    document.getElementById('rotationStrengthYSlider').addEventListener('input', function() {
        rotationStrengthY = parseFloat(this.value);
        document.getElementById('rotationStrengthYValue').innerText = rotationStrengthY;
    });

    document.getElementById('xUpperBoundSlider').addEventListener('input', function() {
        xUpperBound = parseInt(this.value);
        document.getElementById('xUpperBoundValue').innerText = xUpperBound;
    });

    document.getElementById('xLowerBoundSlider').addEventListener('input', function() {
        xLowerBound = parseInt(this.value);
        document.getElementById('xLowerBoundValue').innerText = xLowerBound;
    });

    document.getElementById('yUpperBoundSlider').addEventListener('input', function() {
        yUpperBound = parseInt(this.value);
        document.getElementById('yUpperBoundValue').innerText = yUpperBound;
    });

    document.getElementById('yLowerBoundSlider').addEventListener('input', function() {
        yLowerBound = parseInt(this.value);
        document.getElementById('yLowerBoundValue').innerText = yLowerBound;
    });

    document.getElementById('maxEasingSlider').addEventListener('input', function() {
        maxEasingFactor = parseFloat(this.value);
        document.getElementById('maxEasingValue').innerText = maxEasingFactor;
    });

    document.getElementById('minEasingSlider').addEventListener('input', function() {
        minEasingFactor = parseFloat(this.value);
        document.getElementById('minEasingValue').innerText = minEasingFactor;
    });

    document.getElementById('startCameraInput').addEventListener('input', function() {
        modelViewer.cameraOrbit = `${this.value}`;
    });

    document.getElementById('followMouseCheckbox').addEventListener('change', function() {
        followMouse = this.checked;
    });

    animate();
});
