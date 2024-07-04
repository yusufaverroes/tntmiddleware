import pkg from 'node-libgpiod';
const { version, Chip, Line } = pkg;
class LED {
  constructor(chipNumber, gpioPin) {
    this.chip = new Chip(chipNumber);
    this.line = new Line(this.chip, gpioPin);
    this.line.requestOutputMode();
    this.blinkingTimes=Infinity;
    this.state = 'off';
    this.blinkInterval = null;

    this.startStateMachine();
  }

  startStateMachine() {
    setInterval(() => {
      switch (this.state) {
        case 'off':
          this.line.setValue(1);
          break;
        case 'on':
          this.line.setValue(0);
          break;
        case 'blinkSlow':
          this.blink(1000);
          break;
        case 'blinkFast':
          this.blink(200);
          break;
        default:
          this.line.setValue(0);
          break;
      }
    }, 50);
  }

  blink(interval) {
    if (this.blinkInterval && this.blinkInterval !== interval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }

    let blinkCount = 0;

    this.blinkInterval = setInterval(() => {
      this.line.setValue(this.line.getValue() === 0 ? 1 : 0);
      blinkCount++;

      if (blinkCount >= this.blinkingTimes * 2) { // *2 because each blink involves two toggles (on/off)
        clearInterval(this.blinkInterval);
        this.blinkInterval = null;
      }
    }, interval);
  }


  setState(state) {
    if (['off', 'on', 'blinkSlow', 'blinkFast'].includes(state)) {
      this.state = state;

      if (state !== 'blinkSlow' && state !== 'blinkFast' && this.blinkInterval) {
        clearInterval(this.blinkInterval);
        this.blinkInterval = null;
      }
    } else {
      console.error(`Invalid state: ${state}`);
    }
  }

  cleanup() {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
    }
    this.line.setValue(0);
  }
}

// Example usage:
const chipNumber = 4;  // Replace with the actual chip number you're using
const gpioPin = process.env.LED_PIN;  // Replace with the actual GPIO pin number
const led = new LED(chipNumber, gpioPin);

// Set the LED to blink fast
led.setState('blinkFast');

// Change the state to light up after 5 seconds
setTimeout(() => {
  led.setState('on');
}, 5000);

// Change the state to blink slow after 10 seconds
setTimeout(() => {
  led.setState('blinkSlow');
}, 10000);

// Turn off the LED after 15 seconds
setTimeout(() => {
  led.setState('off');
}, 15000);

process.on('SIGINT', () => {
  led.cleanup();
  process.exit();
});
