# Parallux

Parallux is an open source remote followspot system which lets you use moving lights as followspots.

It is meant as an alternative to expensive automated systems like [Follow-Me](https://follow-me.com/) or [ZacTrack](https://www.zactrack.com/) and manual remote systems like [RoboSpot](https://www.robeuk.com/robospot).




### TODOS

- [ ] Switch from persistent electron-store to project-based systems so you can have different shows with different settings.
- [ ] Make the UI prettier (and dark mode).
- [ ] Import patch from EOS and then choose from those fixtures
- [ ] Add calibrate step based on grid
- [ ] make a target point for each fixture. they should all track the same crosshairs but the radius of each circle should be configurable and change based on the size settings. So an r2x wash circle would be bigger than r1x wash.
- [ ] Add color settings in standalone mode
- [ ] Add support for smooth b/o trigger
- [ ] Add the ability to "park" a fixture. When parked, fixture stops moving with the crosshairs and holds its current position and settings. This is helpful if you want to spot someone who won't move for a while, park that fixture, then continue to spot someone as they walk across the stage. If the second person stops, you can then lock their fixtures. Now all fixtures are parked. Then, move crosshairs back to the first guy (no fixtures will move because they're all parked), and then unlock the first guy's fixture. This allows you to have two people on stage at once, and easily switch between them without having to re-spot anyone. Unlocking will jump fixture to the crosshairs.
