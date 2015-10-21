jquery-rsSlideIt
================
Smoothly animates a 2D/3D transition from one HTML element A to another element B.<br>
The animation morphs A's transform into B's [transform](https://developer.mozilla.org/en-US/docs/Web/CSS/transform "Transform documentation") CSS property.

[2D demo](http://codepen.io/ruisoftware/pen/GpyEyG "on CodePen")<br>
[3D demo](http://codepen.io/ruisoftware/pen/avEJMR "on CodePen")

### Quick Setup
Attach the plugin to a container element. This element should contain your slides.
E.g. For the following markup, that represents a viewport #container with 4 slides
```
<div id="container">
   <img id="slide1" src="http://placehold.it/200?text=slide1">
   <img id="slide2" src="http://placehold.it/200?text=slide2">
   <img id="slide3" src="http://placehold.it/200?text=slide3">
   <img id="slide4" src="http://placehold.it/200?text=slide4">
</div>
```
You create a plug-in instance this way:
```
$("#container").rsSlideIt({
  width: 500,
  height: 300 
});
```

### Under the hood
The concept is quite simple. At construction time, the plug-in gathers each slider `transform` property (remember that every element has a transform property that defaults to `none` or identity matrix).<br>
When the plug-in receives a request to make a transition to slide B, the plug-in smoothly applies the reverse of B's transformation to the whole viewport. To make it simple, if B is rotated 30 degrees, then the viewport is rotated by -30 degrees. This way, B is presented to the user as if it was untransformed.


