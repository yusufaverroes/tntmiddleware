import gpiod as GPIO
import subprocess
import time

# Define the GPIO pin and chip number
GPIO_PIN = 25

# Set up GPIO
chip = GPIO.Chip('gpiochip4')
gpio_line = chip.get_line(GPIO_PIN)
gpio_line.request(consumer="LED", type=GPIO.LINE_REQ_DIR_OUT)
# Initial status (None indicates we haven't checked yet)
previous_status = None

def check_middleware_status():
    try:
        # Run the pm2 command to check the status of the middleware
        result = subprocess.run(['pm2', 'status', 'middleware'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Check the output to determine if middleware is running
        if 'online' in result.stdout:
            return True
        else:
            return False
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

def set_gpio_signal(is_running):
    if is_running:
        # Apply low signal if middleware is running
        print("Middle Ware is normal")
        gpio_line.set_value(0)
        
    else:
        # Apply high signal if middleware is not running
        print("Something bad is occured on middleware")
        gpio_line.set_value(1)
        

try:
    while True:
        middleware_running = check_middleware_status()
        
        # Only change GPIO signal if status has changed
        if middleware_running != previous_status:
            set_gpio_signal(middleware_running)
            previous_status = middleware_running
        
        # Check every 10 seconds
        time.sleep(1)
except KeyboardInterrupt:
    pass

finally:
    # Clean up GPIO settings
    gpio_line.release()
