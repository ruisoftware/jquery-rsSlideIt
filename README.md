#jquery-rsSlideIt
Performs a smooth 2D/3D transition from one HTML element A to another element B.<br>
The transition works be progressively morphing A's transform into B's [transform](https://developer.mozilla.org/en-US/docs/Web/CSS/transform "Transform documentation").

Check out a [2D demo](http://codepen.io/ruisoftware/pen/GpyEyG "on CodePen") on CodePen, and also one
[3D demo](http://codepen.io/ruisoftware/pen/avEJMR "on CodePen") with fallback to 2D for older browsers.

#Key Features
 * Runs a single transition or a sequence of transitions.
 * Fallbacks to browsers that do not support 3D transformations and CSS3 animations.
 * Highly customizable;
 * Responsive design, suitable for any window sizes.
 
#Table of Contents
- [jquery-rsSlideIt](#jquery-rsslideit)
- [Key Features](#key-features)
- [Quick Setup](#quick-setup)
- [How do I add this to my project?](#how-do-i-add-this-to-my-project)

**[Back to top](#table-of-contents)**

##Quick Setup
Create a blocked element with the slide elements inside.
E.g. For the following markup, that represents a viewport #container with 4 slides
````html
<div id="container">
   <img id="slide1" src="http://placehold.it/200?text=slide1">
   <img id="slide2" src="http://placehold.it/200?text=slide2">
   <img id="slide3" src="http://placehold.it/200?text=slide3">
   <img id="slide4" src="http://placehold.it/200?text=slide4">
</div>
````
You create a plug-in instance this way:
````javascript
$("#container").rsSlideIt({
  width: 500,
  height: 300 
});
````
**[Back to top](#table-of-contents)**

##How do I add this to my project?
 * You can fork this project and use the files from your repository, or
 * You can manually download the [unminimized version](http://raw.githubusercontent.com/ruisoftware/jquery-rsSlideIt/master/jquery.rsSlideIt.js) or [minized version](http://raw.githubusercontent.com/ruisoftware/jquery-rsSlideIt/master/jquery.rsSlideIt.min.js) as such:
````javascript
<script src="http://raw.githubusercontent.com/ruisoftware/jquery-rsSlideIt/master/jquery.rsSlideIt.js"></script>
````
Note: When in production environment, it is recommended to use protocol-less links (use `src="//raw..."` instead)  
**[Back to top](#table-of-contents)**

### Under the hood
The concept is quite simple. At construction time, the plug-in gathers each slider `transform` property (remember that every element has a transform property that defaults to `none` or identity matrix).<br>
When the plug-in receives a request to make a transition to slide B, the plug-in smoothly applies the reverse of B's transformation to the whole viewport. To make it simple, if B is rotated 30 degrees, then the viewport is rotated by -30 degrees. This way, B is presented to the user as if it was untransformed.


