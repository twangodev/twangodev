---
title: "ATC Monitor"
summary: "Analyzes thousands of past flights to define safe corridors, then continuously monitors live flights/frequencies for outliers to catch anomalies long before they become emergencies."
date: "Jun 21 2025"
draft: false
tags:
  - Python
  - Air Traffic Control
  - Data Analysis
  - CalHacks
  - Safety Systems
repoUrl: https://github.com/twangodev/atcmonitor
---

## Overview

ATC Monitor is an advanced flight safety system developed at CalHacks that uses historical flight data analysis to establish safe flight corridors and actively monitors live air traffic for potential anomalies. By analyzing patterns from thousands of flights, it can detect deviations that might indicate potential safety issues long before they escalate into emergencies.

## Key Features

- **Historical Data Analysis**: Processes thousands of past flight paths to establish normal flight corridors
- **Real-time Monitoring**: Continuously tracks live flights and ATC frequencies
- **Anomaly Detection**: Identifies outliers and unusual patterns in flight behavior
- **Early Warning System**: Alerts controllers to potential issues before they become critical
- **Frequency Analysis**: Monitors air traffic control communications for unusual patterns

## Technical Implementation

- **Data Processing**: Efficiently handles large volumes of historical and real-time flight data
- **Pattern Recognition**: Uses statistical analysis to define safe operational envelopes
- **Live Integration**: Connects to real-time flight tracking and ATC frequency feeds
- **Alerting System**: Provides graduated alerts based on deviation severity

## Impact

This project aims to enhance aviation safety by providing an additional layer of monitoring that can catch potential issues early, giving air traffic controllers and pilots more time to respond to developing situations.

## Hackathon Achievement

Developed at CalHacks, this project demonstrates the application of data science and real-time monitoring to critical safety infrastructure.