#!/bin/bash
# gpio_set_low.sh
# Set GPIO pin 17 to low

# Set pin 17 to output
gpio -g mode 17 out
# Set pin 17 to high
gpio -g write 17 1
