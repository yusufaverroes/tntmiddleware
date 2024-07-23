import gpiod as GPIO
import subprocess
import time
import os

pipe_path = '/tmp/middleware-failsafe-pipe'

if not os.path.exists(pipe_path):
    print(f'Pipe {pipe_path} does not exist.')
## TO DO: make cleaning pipe logic 
# with open(pipe_path, 'r') as pipe: # Cleaning up the pipe
#     message = pipe.read()
    
#     while(message):
#         message = pipe.read()
#         time.sleep(1)
#     pass
    
    



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
        # Apply low signal if middleware is running (activate printer sensor)
        print("Middle Ware is normal")
        gpio_line.set_value(0)
        
    else:
        # Apply high signal if middleware is not running (deactivate printer sensor)
        print("Something bad is occured on middleware")
        gpio_line.set_value(1)
        

try:
    print("failsafe is started")
    while True:
        middleware_running = check_middleware_status()
        # Only change GPIO signal if status has changed
        if middleware_running != previous_status:
            set_gpio_signal(middleware_running)
            previous_status = middleware_running
        with open(pipe_path, 'r') as pipe:
            message = pipe.read()
            if message:
                if message=="on":
                    gpio_line.set_value(0)
                    print("sensor is activated by middleware")
                elif message=="off":
                    gpio_line.set_value(1)
                    print("sensor is deactivated by middleware")
                
        time.sleep(1)
except KeyboardInterrupt:
    pass

finally:
    # Clean up GPIO 
    gpio_line.release()
