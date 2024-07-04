import pkg from 'node-libgpiod';
const { version, Chip, Line } = pkg;
export default class Button {
    constructor(gpioPin, debounceTime = 200, longPressTime = 1000) {
      this.chip = new Chip(4);
      this.line = new Line(this.chip, gpioPin);
      this.debounceTime = debounceTime;
      this.longPressTime = longPressTime;
      this.lastPressTime = 0;
      this.pressTimer = null;
  
      this.shortPressCallback = null;
      this.longPressCallback = null;
  
      this.line.requestInputMode();  // Ensure the line is in input mode
  
      setInterval(this.checkButton.bind(this), 50); // Polling interval
    }
  
    checkButton() {
      const currentTime = Date.now();
      const value = this.line.getValue();  // Read the button value
  
      if (value === 1) {  // Button pressed
        if (!this.pressTimer) {
          this.lastPressTime = currentTime;
          this.pressTimer = setTimeout(() => {
            if (this.longPressCallback) this.longPressCallback();
            this.pressTimer = null;
          }, this.longPressTime);
        }
      } else if (value === 0) {  // Button released
        if (this.pressTimer) {
          clearTimeout(this.pressTimer);
          this.pressTimer = null;
          if ((currentTime - this.lastPressTime) < this.longPressTime) {
            if (this.shortPressCallback) this.shortPressCallback();
          }
        }
      }
    }
  
    setShortPressCallback(callback) {
      this.shortPressCallback = callback;
    }
  
    setLongPressCallback(callback) {
      this.longPressCallback = callback;
    }
  
    cleanup() {
      // No specific cleanup needed for Line class, but method is here for consistency
    }
  }
  
  // Example usage:
//   const chipNumber = 4;  // Replace with the actual chip number you're using
//   const gpioPin = process.env.AGGREGATE_BUTTON_INPUT_PIN;  // Replace with the actual GPIO pin number
//   const button = new Button(chipNumber, gpioPin);
  
//   button.setShortPressCallback(() => {
//     console.log('Short press detected.');
//     // Add your short press logic here
//   });
  
//   button.setLongPressCallback(() => {
//     console.log('Long press detected.');
//     // Add your long press logic here
//   });
  
//   // To remove the callbacks:
//   button.setShortPressCallback(null);
//   button.setLongPressCallback(null);
  
//   process.on('SIGINT', () => {
//     button.cleanup();
//     process.exit();
//   });