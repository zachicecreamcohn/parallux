# Parallux

Parallux is an open source remote followspot system which lets you use moving lights as followspots.

It is meant as an alternative to expensive automated systems like [Follow-Me](https://follow-me.com/) or [ZacTrack](https://www.zactrack.com/) and manual remote systems like [RoboSpot](https://www.robeuk.com/robospot).

## How It Works

A camera pointed at the stage feeds into the app. The operator overlays a perspective grid on the camera feed to define the stage area, then calibrates each fixture by aiming its beam at 25 grid points. This builds a lookup table that maps screen positions to DMX pan/tilt values. This let's us control multiple fixtures of different types and positions with a single crosshair over the video feed.

During a show, the operator uses a gaming controller to move a crosshair over the camera feed. The app translates the crosshair position through each fixture's LUT and outputs the correct DMX values over sACN, so every fixture tracks the same target accurately.

## Controls

| Control | Function |
|---|---|
| R2 (clutch) | Hold to move the crosshair. Zoom and pan/tilt will not work unless this is held (to prevent accidentally nudging it). |
| Right stick | Focus position |
| Left stick Y | Beam size (iris or zoom, depending on the fixture capabilities) |
| L2 | Momentary blackout while held down. Release to return to previous intensity. |
| D-pad up/down | Gradual intensity adjustment |
| A button | Instant full on |
| B button | Instant full off |

## Setup

#### 1. Settings page
Patch your fixtures (DMX address, universe, fixture profile) and enter stage dimensions. Fixture profiles are defined in `src/fixtures.json`. Currently, only the Chauvet R2X Wash is included, but it's easy to add more.

#### 2. Dashboard
Select your camera, input the dimensions of the stage. The grid which appears will then have the correct aspect ratio. Then drag the 4 grid corners to match the stage edges on the video feed.

#### 3. Calibrate
Click Calibrate, pick a fixture. A dot appears at each of 25 grid intersections — aim the light at each dot using the gamepad, press A to save and advance. Repeat for each fixture.

> ![NOTE]
> It's easier to focus to people-height. Use the vertical offset slider to change the y position of the mapped grid so it intersects with the ideal focus position (e.g. chest height).


#### 4. Operate
The crosshair now accurately tracks all calibrated fixtures simultaneously. Point the crosshairs and your lights will follow!

## sACN Integration

The app outputs sACN at priority 150. A house console running at priority 100 can control color, gobos, beam sharpness, and other attributes while the app handles position. In standalone mode, the app controls all channels.

## Future Work

- Per-project files (multiple shows)
- Import patch from EOS
- Per-fixture beam size indicator on the crosshair
- Fixture parking (lock individual fixtures while tracking with others)
- Color control in standalone mode
- Configurable sACN destination IP
- Intensity indicator
- UI improvments (dark mode, full-screen video, actual design ideas)
- IP camera support. Right now, we just support identified camera input. But ideally we can use networked cameras to plug directly into an existing FOH feed
