# jquery-rsSlideIt [![Build Status](https://travis-ci.org/ruisoftware/jquery-rsSlideIt.svg?branch=master)](https://travis-ci.org/ruisoftware/jquery-rsSlideIt)
Performs a smooth 2D/3D transition from one HTML element A to another element B.<br>
The transition works be progressively morphing A's transform into B's [transform](https://developer.mozilla.org/en-US/docs/Web/CSS/transform "Transform documentation").

Check out a [2D demo](http://codepen.io/ruisoftware/pen/GpyEyG "on CodePen") on CodePen, and also one
[3D demo](http://codepen.io/ruisoftware/pen/xwNrqM "on CodePen") with fallback to 2D for older browsers.

# Key Features
 - Runs a single transition or a sequence of transitions;
 - Transition effect is automatically computed between two slides;
 - Fallbacks to browsers that do not support 3D transformations and CSS3 animations;
 - Highly customizable:
 	- Any markup you want. Only restriction is sliders to be contained in a parent blocked element;
 	- Strong event driven support;
 	- Single transition or a sequence of transitions (movie mode);
 	- Transition duration, easing function animation and zoom vertexes;
 	- Optional user zoomming and panning between each transition.
 * Responsive design, suitable for any window sizes;
 * Optionally loads images asynchronously to save page load times, when slides are images.
 
# Installation

You can install from [npm](https://www.npmjs.com/):
````bash
npm install jquery.rsSlideIt --save
````
or directly from git:
````javascript
<script src="http://rawgit.com/ruisoftware/jquery-rsSlideIt/master/src/jquery.rsSlideIt.js"></script>
````
or you can download the Zip archive from github, clone or fork this repository and include `jquery.rsSlideIt.js` from your local machine.

You also need to download jQuery. In the example below, jQuery is downloaded from Google cdn.

# Usage

## 1. Add script
````javascript
<script src="http://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
<script src="http://rawgit.com/ruisoftware/jquery-rsSlideIt/master/libs/modernizr.js"></script>
<script src="http://rawgit.com/ruisoftware/jquery-rsSlideIt/master/src/jquery.rsSlideIt.js"></script>
````
If you care about older browsers, primarily versions of IE prior to IE9, then replace the jQuery `2.1.4` by `1.11.3`.

The [Modernizr](#fallbacks) library should be loaded before the plugin.

jquery.rsSlideIt.js should be loaded after the jQuery and Modernizr libraries. In production environment, it is recommended the use of the minimized version `jquery.rsSlideIt.min.js`.

## 2. HTML
Create a blocked element with slide elements inside.
````html
<div id="container">
	<img id="slide1" src="http://placehold.it/200?text=slide1">
	<img id="slide2" src="http://placehold.it/200?text=slide2">
	<img id="slide3" src="http://placehold.it/200?text=slide3">
	<img id="slide4" src="http://placehold.it/200?text=slide4">
</div>
<button id="prev">previous</button>
<button id="next">next</button>
````
The above markup represents a viewport with 4 slides.
Any markup can be used. Your container does not have to be a `div` and your slides do not have to `img`.

## 3. Javascript
Create plugin instance and set previous/next events
````javascript
$(function () {
	$("#container").rsSlideIt({
		width: 500,
		height: 300
	});

	$("#prev, #next").click(function () {
		$("#container").rsSlideIt('transition', {
			slide: this.id // destination slide is either 'prev' or 'next', depending on which button is pressed
		});
	});
});
````

## 4. CSS (optional)
````css
	#slide1 {
		transform: rotate(30deg);
	}
	#slide3 {
		transform: rotate(-30deg) skew(150deg) translateY(100px);
	}
````

# How it works
During the plugin initialization, the plugin performs two tasks:
 1. Loads the CSS transform property of each slide into an internal data structure.
 2. Inserts a `div` element between your container and the slides, i.e., it changes the DOM from
````html
<div id="container">
	<img id="slide1" src="http://placehold.it/200?text=slide1">
	<img id="slide2" src="http://placehold.it/200?text=slide2">
	<img id="slide3" src="http://placehold.it/200?text=slide3">
	<img id="slide4" src="http://placehold.it/200?text=slide4">
</div>
````
to
````html
<div id="container">
	<div> <!-- new div element -->
		<img id="slide1" src="http://placehold.it/200?text=slide1">
		<img id="slide2" src="http://placehold.it/200?text=slide2">
		<img id="slide3" src="http://placehold.it/200?text=slide3">
		<img id="slide4" src="http://placehold.it/200?text=slide4">
	</div>
</div>
````
Let's call this new `div` the *world*.

When a request to make a transition to a slideN is received, the plugin smoothly changes the *world* transformation to the slideN reverse transformation, e.g., if your slides are
````css
#slide1 { transform: none; }
#slide2 { transform: rotate(30deg); }
#slide3 { transform: rotate(25deg) skew(45deg); }
#slide4 { transform: skew(-15deg); }
````
then when a transition is done:
 * from slide1 to slide2, the *world* transform changes from `rotate(0)` to `rotate(-30deg)`.
 * from slide2 to slide3, the *world* transform changes from `rotate(-30deg) skew(0)` to `rotate(-25deg) skew(-45deg)`.
 * from slide3 to slide4, the *world* transform changes from `rotate(-25deg) skew(-45deg)` to `rotate(0) skew(15deg)`.
 * from slide4 to slide1, the *world* transform changes from `skew(15deg)` to `skew(0)`.


# Fallbacks
The plugin uses [Modernizr](https://modernizr.com/) for CSS3 feature detection. If Modernizr is not loaded (see [Add Script](#installation-and-usage)), the plugin assumes that your browser does not support the latest CSS3 features and resorts to Javascript fallbacks, even on modern browsers. Thus it is highly recommended to include Modernizr. Specifically, the Modernizr properties required by the plugin are [cssanimations and csstransforms3d](https://modernizr.com/download?cssanimations-csstransforms3d-setclasses).

## 3D transformations
If 3D transformations are not supported by the browser, the plugin adds a fallback class to the container element, which is by default `no3D`.
So, if you 3D slide is `rotateX(45deg) rotateZ(5deg)` you can fallback it to 2D, by adding another CSS rule:
````css
#mySlide { transform: rotateX(45deg) rotateZ(5deg); }   /* 3D transformation */
.no3D #mySlide { transform: rotate(5deg); }             /* 2D fallback for older browsers */
````
Please note, that if Modernizr is not loaded on browsers that support 3D transformations, and no 2D CSS fallback is defined, the 3D transformations will still render correctly, but the plugin will make 2D transitions, because the plugin relies on what is returned by Modernizr.csstransforms3d, and if Modernizr is missing, it means returning false.

Here is one [3D demo](http://codepen.io/ruisoftware/pen/xwNrqM "on CodePen") with a fallback to 2D on older browsers. You can see a preview [here](http://codepen.io/ruisoftware/pen/avrwLX) on how the 3D demo looks like in older browsers.

## CSS animations
If [CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Using_CSS_animations) are not supported by the browser, the plugin gracefully degradates to javascript animation using [requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame).
Still, if requestAnimationFrame() is not supported by the browser, then a [jQuery.animate()](http://api.jquery.com/animate/) based animation is used instead.

# License
This project is licensed under the terms of the [MIT license](https://opensource.org/licenses/mit-license.php)

# Bug Reports & Feature Requests
Please use the [issue tracker](https://github.com/ruisoftware/jquery-rsSlideIt/issues) to report any bugs or file feature requests.

# Contributing
Please refer to the [Contribution page](https://github.com/ruisoftware/jquery-rsSlideIt/blob/master/CONTRIBUTING.md) from more information.
