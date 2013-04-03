// TODO set a translate transformation (in CSS) to a -webkit-transform's slide and watch how it works with the mouse pan translate

/**
* jQuery SliteIt - Displays a slide show
* ====================================================
*
* Licensed under The MIT License
* 
* @version   2 
* @author    Jose Rui Santos
*
* 
* Input parameter  Default value  Remarks
* ================ =============  ===============================================================================================
*
* 
* Usage with default values:
* ==========================
*
*/
(function ($) {
    var SlideItClass = function ($elem, opts) {
        var data = {
                $elemsOnTop: $(opts.selector.elementsOnTop),
                $elemAndTops: null,
                slideData: [],
                qtSlides: 0,
                supportsCSSAnimation: (typeof Modernizr !== 'undefined') && !!Modernizr.cssanimations,
                isIE8orBelow: false,
                isIE9: false,
                isMozilla11orBelow: false,
                init: function () {
                    this.qtSlides = container.$slides.length;
                    this.$elemAndTops = $elem.add(this.$elemsOnTop);

                    // to prevent the default behaviour in IE when dragging an element
                    this.$elemAndTops.add(container.$transDiv).each(function () {
                        this.ondragstart = this.onselectstart = function () { return false; };
                    });
                    this.initBrowsers();
                },
                initBrowsers: function () {
                    var matches = navigator.userAgent.match(/MSIE (\d+\.\d+);/);
                    if (!!matches && matches.length === 2) {
                        var version = util.toInt(matches[1]);
                        this.isIE8orBelow = version < 9;
                        this.isIE9 = version === 9;
                    } else {
                        matches = navigator.userAgent.match(/Firefox[\/\s](\d+\.\d+)/);
                        if (!!matches && matches.length === 2) {
                            this.isMozilla11orBelow = util.toInt(matches[1]) < 12;
                        }
                    }
                },
                checkSlideBounds: function (slideIdx) {
                    return slideIdx < 0 ? 0 : (slideIdx > this.qtSlides - 1 ? data.qtSlides - 1 : slideIdx);
                },
                activeSlide: {
                    $slide: null,
                    index: -1
                },
                sortedX: [],
                sortedY: [],
                findPnt: function (isX, elem, sortedArray) {
                    var from = 0,
                        len = sortedArray.length,
                        to = len - 1,
                        middle = -2,
                        middleValue,
                        slideData;
                    while (from <= to) {
                        middle = Math.floor((from + to)/ 2);
                        slideData = this.slideData[sortedArray[middle]];
                        middleValue = isX ? slideData.centerTransParent.x : slideData.centerTransParent.y;
                        if (middleValue < elem) {
                            from = ++middle;
                        } else {
                            if (middleValue > elem) {
                                to = --middle;
                            } else {
                                return {found: true, idx: middle};
                            }
                        }
                    }
                    
                    if (middle > -2) {
                        middle = (middle < 0 ? 0 : middle);
                        if (middle < len) {
                            slideData = this.slideData[sortedArray[middle]];
                            middleValue = isX ? slideData.centerTransParent.x : slideData.centerTransParent.y;
                            if (middleValue < elem) {
                                ++middle;
                            }
                        }
                    }
                    return { found: false, idx: (middle < 0 ? 0 : middle) };
                },
                insertSorted: function () {
                    delete this.sortedX;
                    delete this.sortedY;
                    this.sortedX = [];
                    this.sortedY = [];
                    for (var i = 0; i < this.qtSlides; i++) {
                        this.sortedX.splice(this.findPnt(true, this.slideData[i].centerTransParent.x, this.sortedX).idx, 0, i);
                        this.sortedY.splice(this.findPnt(false, this.slideData[i].centerTransParent.y, this.sortedY).idx, 0, i);
                    }
                },
                findRange: function (isX, range) {
                    var sortedArray = (isX ? this.sortedX : this.sortedY),
                        findResultFrom = this.findPnt(isX, range[0], sortedArray),
                        findResultTo = this.findPnt(isX, range[1], sortedArray),
                        value,
                        slideData;
                    if (findResultFrom.found) { // get the first point with the same x or y value
                        value = range[0];
                        while (findResultFrom.idx > 0 && value === range[0]) {
                            --findResultFrom.idx;
                            slideData = this.slideData[sortedArray[findResultFrom.idx]];
                            value = isX ? slideData.centerTransParent.x : slideData.centerTransParent.y;
                            if (value !== range[0]) {
                                findResultFrom.idx++;
                            }
                        }
                    }
                    if (findResultTo.found) { // get the last point with the same x or y value
                        var value = range[1],
                            len = sortedArray.length;
                        while (findResultTo.idx < len - 1 && value === range[1]) { // yes, "< len - 1" is correct
                            ++findResultTo.idx;
                            slideData = this.slideData[sortedArray[findResultTo.idx]];
                            value = isX ? slideData.centerTransParent.x : slideData.centerTransParent.y;
                            if (value !== range[1]) {
                                findResultTo.idx--;
                            }
                        }
                    } else {
                        // when the range[1] is not found, the result points to the position where it should be inserted (position immediately after the largest smaller range[1]), 
                        // hence we need to decrement it
                        findResultTo.idx--;
                    }
                    var result = [];
                    for (var idx = findResultFrom.idx; idx <= findResultTo.idx; ++idx) {
                        result.push(sortedArray[idx]);
                    }
                    return result;
                },
                findRangeX: function (range) {
                    return this.findRange(true, range);
                },
                findRangeY: function (range) {
                    return this.findRange(false, range);
                },

                // returns the slide that whose center is closest to the viewport center
                getActiveSlide: function () {
                    container.setCenterPos();
                    var minDist = minIdx = -1,
                        distance = (container.center.x + container.center.y) / 10,
                        zoomDistance = zoomUtil.zoom * distance,
                        pntsX = [],
                        pntsY = [],
                        merged = [],
                        maxIterations = 10,
                        transformedOrigZero = transUtil.getTransformedPoint(transUtil.orig);

                    if (this.sortedX.length > 0 && this.sortedY.length > 0) {
                        while (merged.length === 0 && maxIterations-- > 0) { // maxIterations is just an optimization, since 4 iterations should be enough to find the nearest point
                            pntsX = this.findRangeX([transformedOrigZero.x - zoomDistance, transformedOrigZero.x + zoomDistance]);
                            pntsY = this.findRangeY([transformedOrigZero.y - zoomDistance, transformedOrigZero.y + zoomDistance]);
                            merged = $.map(pntsX, function (px) {
                                return $.inArray(px, pntsY) < 0 ? null : px;
                            });
                            distance *= 2;
                            zoomDistance = zoomUtil.zoom * distance;
                        }
                            
                        var dist, slideData;
                        for (var i = merged.length - 1; i > -1; i--) {
                            slideData = this.slideData[merged[i]];
                            dist = util.getDistanceTwoPnts(slideData.centerTransParent, transformedOrigZero);
                            if (dist < minDist || i === merged.length - 1) {
                                minDist = dist;
                                minIdx = merged[i];
                            }
                        }
                    }
                    return { $slide: minIdx === -1 ? null : container.$slides.eq(minIdx), index: minIdx };
                },

                gotoSlide: function (slide) {
                    var prevSlide = this.activeSlide.index;
                    transUtil.setActiveSlide(slide);
                    container.$transDiv.css(transUtil.getTransformCSS());
                    transUtil.cache.refreshCenterTransParent();
                    events.fireSlideEvents(true, prevSlide);
                    if (seqData.userInteract) {
                        events.bindEvents();
                    }
                }
            },
            
            container = {
                $transDiv: null,
                $slides: null, // set with all slide elements
                size: { x: 0, y: 0 },
                IEorigSize: { x: 0, y: 0 }, // IE needs to compute based on unscaled (original) container size
                center: { x: 0, y: 0 }, // center point. Used to determine the active slide. Active slide is the slide whose center is closest to this center.
                setCenterPos: function () {
                    this.center.x = $elem.width() / 2;
                    this.center.y = $elem.height() / 2;
                },
                setSizeForIE: function () {
                    this.IEorigSize.x = this.$transDiv.width();
                    this.IEorigSize.y = this.$transDiv.height();
                },
                resetMaxSize: function () {
                    this.size.x = this.size.y = 0;
                },
                setMaxSize: function (width, height) {
                    this.size.x = Math.max(this.size.x, width);
                    this.size.y = Math.max(this.size.y, height);
                },
                init: function () {
                    if (!!opts.layout.width) { $elem.css('width', opts.layout.width); }
                    if (!!opts.layout.height) { $elem.css('height', opts.layout.height); }
                    $elem.css('overflow', 'hidden').scrollLeft(0).scrollTop(0);
                    this.setCenterPos();
                    $elem.wrapInner('<div id="xm"/>');
                    this.$transDiv = $('div:eq(0)', $elem);
                    this.$transDiv.css({
                        'position': 'relative',
                        'z-index': 0 // fix for IE8 standards mode that, without this z-index, cannot transform child elements
                    })
                    this.$slides = $(opts.selector.slide, this.$transDiv);
                }
            },

            seqData = { // data for the whole slide show currently running
                idx: 0,      // current active slide while sequence runs
                repeat: 0,   // how many cycles a sequence runs
                qt: null,    // quantities of all sequence input parameters
                state: $.fn.rsSlideIt.state.STOP,
                timeoutId: null,
                pauseOnSlide: false,
                userInteract: true,
                onBeginDelay: null,
                onEndDelay: null,
                init: function (optsSequence) {
                    this.idx = 0;
                    this.state = $.fn.rsSlideIt.state.PLAY;
                    transData.reset();
                    transData.onBegin = optsSequence.onBeginTrans;
                    transData.onEnd = optsSequence.onEndTrans;
                    transData.inputOpts = optsSequence;
                    transData.isPrevOrNext = (typeof optsSequence.sequence === 'string') && (optsSequence.sequence == 'prev' || optsSequence.sequence == 'next');
                    this.onBeginDelay = optsSequence.onBeginDelay;
                    this.onEndDelay = optsSequence.onEndDelay;
                    this.userInteract = optsSequence.userInteract;
                    this.repeat = optsSequence.repeat == 'forever' ? -1 : optsSequence.repeat;
                    if (this.repeat != -1) {
                        if (transData.isPrevOrNext) {
                            this.repeat++; // when user clicks the play button, first need to go to first slide to start the sequence from there
                            // this first step of moving to first slide consumes one repetition, therefore the need to increment it by one
                        }
                    }
                    this.qt = {
                        sequences: (typeof optsSequence.sequence === 'object') ? optsSequence.sequence.length : (transData.isPrevOrNext ? data.qtSlides : 0),
                        delays: (typeof optsSequence.delayOnSlide === 'object') ? optsSequence.delayOnSlide.length : 0,
                        zoomDests: (typeof optsSequence.zoomDest === 'object') ? optsSequence.zoomDest.length : 0,
                        zoomVertexes: (typeof optsSequence.zoomVertex === 'object') ? optsSequence.zoomVertex.length : 0,
                        easings: (typeof optsSequence.easing === 'object') ? optsSequence.easing.length : 0,
                        durations: (typeof optsSequence.duration === 'object') ? optsSequence.duration.length : 0
                    };
                },

                doSlideshow: function (event) {
                    var runTransition = function () {
                        transData.onEndTransSlideShow = function () {
                            if (seqData.state === $.fn.rsSlideIt.state.PAUSE ||
                                seqData.state === $.fn.rsSlideIt.state.PLAY && (seqData.repeat == -1 || seqData.idx % seqData.qt.sequences > 0 || seqData.repeat-- > 0)) {

                                if (seqData.state !== $.fn.rsSlideIt.state.PAUSE || seqData.pauseOnSlide) {
                                    transData.setupNextTrans();
                                    seqData.pauseOnSlide = false;
                                }
                                $elem.trigger('transition.rsSlideIt', [transData]);
                                
                            } else {
                                switch (seqData.state) {
                                    case $.fn.rsSlideIt.state.PLAY:
                                        seqData.state = $.fn.rsSlideIt.state.STOP; // no break here
                                    case $.fn.rsSlideIt.state.STOP:
                                        if (transData.inputOpts.onStop) {
                                            transData.inputOpts.onStop();
                                        }
                                        if (!seqData.userInteract) {
                                            events.bindEvents();
                                        }
                                        transData.reset();
                                        events.fireSlideEvents(false);
                                }
                            }
                        };

                        if (seqData.state !== $.fn.rsSlideIt.state.PAUSE && !seqData.userInteract) {
                            events.unbindEvents();
                        }
                        transData.onEndTransSlideShow();
                    };

                    if (transData.inputOpts.onPlay) {
                        transData.inputOpts.onPlay();
                    }
                    runTransition();
                }
            },
            
            transData = {     // data for the current transition that is running
                anim: {
                    $obj: null,
                    progress: 0, // 0 <= from <= 1
                    centerPnt: { x: 0, y: 0 },
                    transfsFadeToIdentity: [],
                    gotoSlideIdx: 0,
                    progressPausedOn: null,
                    zoomCoefs: null,
                    start: function (center) {
                        this.progress = 0;
                        this.centerPnt.x = center.x;
                        this.centerPnt.y = center.y;
                    },
                    setLastStep: function () {
                        for (var i = this.transfsFadeToIdentity.length - 1; i > -1; --i) {
                            var transformation = this.transfsFadeToIdentity[i];
                            transformation.lastStep = transformation.lastStep + this.progress * (1 - transformation.lastStep);
                        }
                        transData.animating = true;
                    },
                    pushTransformations: function (transformationsArray, interruptedDuringTransition) {
                        for (var i = transformationsArray.length - 1; i > -1; --i) {
                            var transformation = transformationsArray[i];
                            this.transfsFadeToIdentity.unshift({ 
                                id:         transformation.id,
                                valueIdent: transformation.valueIdent,
                                valueInv:   transformation.valueInv, 
                                lastStep:   interruptedDuringTransition ? 1 - this.progress : this.progress
                            });
                        }
                    },
                    clearTransformations: function () {
                        this.transfsFadeToIdentity = [];
                    },
                    interrupt: function () {
                        if (this.$obj !== null) {
                            this.$obj.stop(); // js animation
                        }
                        transUtil.activeSlideCTMmatrix = util.getInvertedMatrix(transUtil.cache.matrixCTM);
                        util.multiply2x2Matrices(transUtil.getMatrixScale(zoomUtil.zoom), transUtil.activeSlideCTMmatrix); // remove the user zoom
                        if (data.isIE8orBelow) {
                            transUtil.trans.x = container.center.x - transUtil.orig.x;
                            transUtil.trans.y = container.center.y - transUtil.orig.y;
                            transUtil.activeSlideCenterTrans.x = transUtil.orig.x;
                            transUtil.activeSlideCenterTrans.y = transUtil.orig.y;
                            transUtil.cache.refresh();
                            transUtil.adjustTransIE(transUtil.orig);
                        }
                        if (seqData.state == $.fn.rsSlideIt.state.STOP) {
                            transUtil.activeSlideIndex = this.gotoSlideIdx;
                        }
                        transUtil.cache.refreshCenterTransParent();
                        transData.finished(true, true);
                        events.fireSlideEvents();
                    },
                    computeIntermediateMatrix: function (now, toTransformations, noCalcInvMatrix, zoomValue) {
                        var i, transformation, interpolateFactor, value;
                        // from slide matrix to identity
                        transUtil.cache.matrixCTM = transUtil.getMatrixIdentity();
                        for (i = this.transfsFadeToIdentity.length - 1; i > -1; --i) {
                            transformation = this.transfsFadeToIdentity[i];
                            interpolateFactor = transformation.lastStep + now * (1 - transformation.lastStep);
                            value = transformation.id == transUtil.transID.SCALEXY ? 
                                util.interpolatePoint(transformation.valueInv, { x: transformation.valueIdent, y: transformation.valueIdent }, interpolateFactor) :
                                util.interpolate(transformation.valueInv, transformation.valueIdent, interpolateFactor);
                            util.multiply2x2Matrices(transUtil.getMatrix(transformation.id, value), transUtil.cache.matrixCTM);
                        }

                        // from identity to slide matrix
                        for (i = toTransformations.length - 1; i > -1; --i) {
                            transformation = toTransformations[i];
                            value = transformation.id == transUtil.transID.SCALEXY ? 
                                util.interpolatePoint({ x: transformation.valueIdent, y: transformation.valueIdent }, transformation.valueInv, now) :
                                util.interpolate(transformation.valueIdent, transformation.valueInv, now);
                            util.multiply2x2Matrices(transUtil.getMatrix(transformation.id, value), transUtil.cache.matrixCTM);
                        }
                        util.multiply2x2Matrices(transUtil.getMatrix(transUtil.transID.SCALE, zoomValue === undefined ? zoomUtil.zoom : zoomValue), transUtil.cache.matrixCTM);
                        if (!noCalcInvMatrix) {
                            transUtil.cache.matrixCTM_inv = util.getInvertedMatrix(transUtil.cache.matrixCTM);    
                        }
                    }
                },

                cssAnim: {
                    $styleObj: null,
                    startTime: 0,
                    totalTime: 0,
                    getFrames: function (fromCenterTrans, toCenterTrans, toTransformations, easing, durationMs) {
                        var css = '', orig, animEasingFunc, animEasing, animValue;
                        for (var anim = 0; anim < 1.005; anim += 0.01) {
                            animValue = transData.anim.progressPausedOn !== null ? util.interpolate(transData.anim.progressPausedOn, 1, anim) : anim;
                            animEasingFunc = $.easing[easing];
                            animEasing = !!animEasingFunc ? animEasingFunc(animValue, durationMs*animValue, 0, 1, durationMs) : animValue;
                            transData.anim.computeIntermediateMatrix(animEasing, toTransformations, true, util.getQuadraticValue(transData.anim.zoomCoefs, animEasing));

                            orig = util.interpolatePoint(fromCenterTrans, toCenterTrans, !!animEasingFunc ? animEasingFunc(anim, durationMs*anim, 0, 1, durationMs) : anim);
                            // XX is a mask that will be replaced by a css prefix
                            css += Math.round(anim*100) + '% { XXtransform-origin: ' + orig.x.toFixed(0) + 'px ' + orig.y.toFixed(0) + 'px;' +
                                                 'XXtransform: matrix(' + 
                                                    transUtil.cache.matrixCTM[0].toFixed(4) + ',' + 
                                                    transUtil.cache.matrixCTM[1].toFixed(4) + ',' +
                                                    transUtil.cache.matrixCTM[2].toFixed(4) + ',' + 
                                                    transUtil.cache.matrixCTM[3].toFixed(4) + ',' +
                                                    (container.center.x - orig.x).toFixed(2) + ',' + 
                                                    (container.center.y - orig.y).toFixed(2) + '); }\n';
                        }
                        transUtil.cache.matrixCTM_inv = util.getInvertedMatrix(transUtil.cache.matrixCTM);
                        return css;
                    },
                    interrupt: function () {
                        this.totalTime += +new Date() - this.startTime;
                        transData.anim.progress = this.totalTime / transData.prevDuration;
                        transData.anim.progress = transData.anim.progress > 1 ? 1: transData.anim.progress;
                        var animEasingFunc = $.easing[transData.easing],
                            animEasing = !!animEasingFunc ? animEasingFunc(transData.anim.progress, transData.prevDuration * transData.anim.progress, 0, 1, transData.prevDuration) : transData.anim.progress;
   
                        zoomUtil.zoom = util.getQuadraticValue(transData.anim.zoomCoefs, animEasing);
                        transData.anim.computeIntermediateMatrix(animEasing, data.slideData[transData.anim.gotoSlideIdx].cssTransforms.transformations);

                        transData.anim.centerPnt = transUtil.getTransformOriginCss(container.$transDiv);
                        transUtil.trans.x = container.center.x - transData.anim.centerPnt.x;
                        transUtil.trans.y = container.center.y - transData.anim.centerPnt.y;
                        transUtil.setTransformOrigin(transData.anim.centerPnt.x, transData.anim.centerPnt.y);

                        transUtil.activeSlideCTMmatrix = util.getInvertedMatrix(transUtil.cache.matrixCTM);
                        util.multiply2x2Matrices(transUtil.getMatrixScale(zoomUtil.zoom), transUtil.activeSlideCTMmatrix); // remove the user zoom
                        
                        if (transData.isThisPartOfSlideShow()) {
                            this.resetCSSanimation();
                        }
                        if (seqData.state == $.fn.rsSlideIt.state.STOP) {
                            transUtil.activeSlideIndex = transData.anim.gotoSlideIdx;
                        }
                        transUtil.cache.refreshCenterTransParent();
                        transData.finished(true, true);
                        events.fireSlideEvents();
                    },
                    resetCSSanimation: function () {
                        container.$transDiv.css(transUtil.getTransformCSSstyle()).css({
                            '-webkit-animation': '',
                            '-moz-animation': '',
                            '-o-animation': '',
                            'animation': ''
                       });
                    }
                },
                slide: null,
                prevDuration: null,
                duration: null,
                zoomDest: null,
                zoomVertex: null,
                easing: null,
                onBegin: null,
                onEnd: null,                    // user event for complete standalone transition
                onEndTransSlideShow: null,      // internal event for complete transition within a set of transitions (slide show)
                inputOpts: null,
                isPrevOrNext: false,
                animating: false,
                
                isThisPartOfSlideShow: function () { // slide show is running? (true) Or just a single transition is running? (false)
                    return !!this.onEndTransSlideShow;
                },
                
                reset: function () {
                    this.slide = this.duration = this.zoomDest = this.zoomVertex = this.easing = this.onEndTransSlideShow = null;
                    this.cssAnim.totalTime = 0;
                },
                
                setupNextTrans: function () {
                    this.slide = this.isPrevOrNext ? this.inputOpts.sequence : this.inputOpts.sequence[seqData.idx % seqData.qt.sequences];
                    this.prevDuration = this.duration = util.getSpeedMs(seqData.qt.durations == 0 ? this.inputOpts.duration : this.inputOpts.duration[seqData.idx % seqData.qt.durations]);
                    this.zoomDest = seqData.qt.zoomDests == 0 ? this.inputOpts.zoomDest : this.inputOpts.zoomDest[seqData.idx % seqData.qt.zoomDests];
                    this.zoomVertex = seqData.qt.zoomVertexes == 0 ? this.inputOpts.zoomVertex : this.inputOpts.zoomVertex[seqData.idx % seqData.qt.zoomVertexes];
                    this.easing = seqData.qt.easings == 0 ? this.inputOpts.easing : this.inputOpts.easing[seqData.idx % seqData.qt.easings];
                },
                
                interrupt: function () {
                    data.supportsCSSAnimation ? this.cssAnim.interrupt() : this.anim.interrupt();
                },
                
                finished: function (finishedWithAnimation, interrupted) {
                    var done = function () {
                        if (seqData.timeoutId) {
                            $elem.triggerHandler('endDelay.rsSlideIt', [transData.anim.gotoSlideIdx]);
                        }                            
                        seqData.timeoutId = null;
                        transData.animating = false;
                        if (!interrupted && transData.isThisPartOfSlideShow()) {
                            ++seqData.idx;
                            transData.onEndTransSlideShow();
                        }
                    };

                    if (this.isThisPartOfSlideShow()) {
                        // transition that ran integrated in a sequence
                        if (seqData.state === $.fn.rsSlideIt.state.PLAY) {
                            if (!finishedWithAnimation) {
                                seqData.timeoutId = null;
                                done();
                            } else {
                                var delay = seqData.qt.delays == 0 ? this.inputOpts.delayOnSlide : this.inputOpts.delayOnSlide[seqData.idx % seqData.qt.delays];
                                $elem.triggerHandler('beginDelay.rsSlideIt', [this.anim.gotoSlideIdx, delay]);
                                seqData.timeoutId = setTimeout(done, delay);
                            }
                        } else {
                            seqData.timeoutId = null;
                            done();
                            switch(seqData.state) {
                                case $.fn.rsSlideIt.state.PLAY: seqData.state = $.fn.rsSlideIt.state.STOP; break;
                                case $.fn.rsSlideIt.state.PAUSE: this.animating = true;
                            }
                        }
                    } else {
                        // standalone transition
                        done();
                    }
                },
                
                doTransition: function (event, optsTrans) {
                    data.supportsCSSAnimation ? this.doTransitionCSS(event, optsTrans) : this.doTransitionJS(event, optsTrans);
                },

                prepareTransition: function (optsTrans) {
                    var sameDestSlideIdx = false;
                    if (this.animating) {
                        if (this.isThisPartOfSlideShow()) { 
                            // slideshow was paused, and now it is going to resume
                            sameDestSlideIdx = true;
                            if (data.supportsCSSAnimation) {
                                this.anim.progressPausedOn = this.anim.progress;
                            } else {
                                this.anim.progressPausedOn = this.anim.progressPausedOn !== null ? util.interpolate(this.anim.progressPausedOn, 1, this.anim.progress) : this.anim.progress;
                            }
                            if (seqData.userInteract) {
                                events.unbindEvents();
                            }
                            this.anim.centerPnt.x = transUtil.orig.x;
                            this.anim.centerPnt.y = transUtil.orig.y;
                        } else {
                            // the single transition that is currently running, will stop and another single transition will start
                            this.interrupt();
                            this.anim.setLastStep();
                            var prevGotoSlideIdx = this.anim.gotoSlideIdx;
                            this.anim.pushTransformations(data.slideData[prevGotoSlideIdx].cssTransforms.transformations, true);
                            this.anim.gotoSlideIdx = util.getSlideIdx(optsTrans.slide, this.anim.gotoSlideIdx);
                            sameDestSlideIdx = prevGotoSlideIdx == this.anim.gotoSlideIdx;
                        }
                    } else {
                        // single transition (or slideshow) was stopped and now it is going to start
                        this.anim.setLastStep();
                        this.anim.pushTransformations(data.slideData[transUtil.activeSlideIndex].cssTransforms.transformations, !util.isAlmostZero(this.anim.progress, 5E-6));
                        this.anim.start(transUtil.orig);
                        if (seqData.userInteract) {
                            events.unbindEvents();
                        }
                        this.anim.gotoSlideIdx = util.getSlideIdx(optsTrans.slide);
                    }

                    // if user is currently panning around when transition kicks in, then stop panning
                    panUtil.stopImmediately();
                    container.setCenterPos();
                    return sameDestSlideIdx;
                },

                animationWillRun: function (fromCenterTrans, toCenterTrans, zoomDest) {
                    var sameMatrices = function (matrix1, matrix2) {
                        var m = [matrix2[0], matrix2[1], matrix2[2], matrix2[3]];
                        util.multiply2x2Matrices(transUtil.getMatrix(transUtil.transID.SCALE, zoomUtil.zoom), m);
                        return util.areMatricesEqual(matrix1, m);
                    };
                    return fromCenterTrans.x != toCenterTrans.x ||
                           fromCenterTrans.y != toCenterTrans.y ||
                           !util.areTheSame(zoomUtil.zoom, zoomDest) ||
                           !sameMatrices(data.slideData[this.anim.gotoSlideIdx].cssTransforms.ctmMatrix, transUtil.cache.matrixCTM_inv);
                },

                doTransitionCSS: function (event, optsTrans) {
                    var sameDestSlideIdx = this.prepareTransition(optsTrans),
                        toTransformations = data.slideData[this.anim.gotoSlideIdx].cssTransforms.transformations,
                        zoomDest = zoomUtil.checkZoomBounds(zoomUtil.getZoomDest(optsTrans.zoomDest, this.anim.gotoSlideIdx)),
                        isLinearZoom = typeof optsTrans.zoomVertex === 'string' && optsTrans.zoomVertex == 'linear';

                    if (this.animationWillRun(this.anim.centerPnt, data.slideData[this.anim.gotoSlideIdx].centerTrans, zoomDest)) {
                        // medium (x, y) = (x=unknown for now, y=optsTrans.zoomVertex= min or max zoom represented by y-coordinate 
                        // that corresponds to minimum or maximun the function takes)
                        zoomUtil.setZoomVertex(optsTrans.zoomVertex, this.anim.gotoSlideIdx, zoomDest);
                        // get the coefficients [a, b, c] of a quadratic function that interpolates the following 3 points: 

                        this.anim.zoomCoefs = util.getQuadratic2PntsVertex({ x: 0, y: zoomUtil.zoom }, { x: 1, y: zoomDest }, isLinearZoom ? 'linear' : zoomUtil.zoomVertex);
                        var durationMs = optsTrans.duration * (sameDestSlideIdx ? 1 - this.anim.progress : 1),
                            animationName = 'rsSlideIt' + (+new Date()),
                            animData;

                        if ((seqData.state === $.fn.rsSlideIt.state.PLAY || !this.isThisPartOfSlideShow()) && optsTrans.onBegin) {
                            $elem.triggerHandler('beginTrans.rsSlideIt', [data.activeSlide.index, this.anim.gotoSlideIdx]);
                        }
                        if (this.isThisPartOfSlideShow()) {
                            seqData.state = $.fn.rsSlideIt.state.PLAY;
                        }

                        if (this.cssAnim.$styleObj) {
                            this.cssAnim.$styleObj.remove();
                        }
                        
                        animData = this.cssAnim.getFrames(this.anim.centerPnt, data.slideData[this.anim.gotoSlideIdx].centerTrans, toTransformations, optsTrans.easing, durationMs);
                        this.cssAnim.$styleObj = $('<style> ' + 
                            '@-webkit-keyframes ' + animationName + ' {\n' + animData.replace(/XX/g, '-webkit-') + '}\n' + 
                            '@-moz-keyframes ' + animationName + ' {\n' + animData.replace(/XX/g, '-moz-') + '}\n' + 
                            '@-o-keyframes ' + animationName + ' {\n' + animData.replace(/XX/g, '-o-') + '}\n' + 
                            '@keyframes ' + animationName + ' {\n' + animData.replace(/XX/g, '') + '}\n' + 
                        '</style>');

                        $('head').append(this.cssAnim.$styleObj);
                        animData = animationName + ' ' + durationMs + 'ms linear forwards';
                        container.$transDiv.css({
                            '-webkit-animation': animData,
                            '-moz-animation': animData,
                            '-o-animation': animData,
                            'animation': animData
                        });
                    } else {
                        if (this.isThisPartOfSlideShow()) {
                            seqData.state = $.fn.rsSlideIt.state.PLAY;
                        }
                        this.transitionDone(false);
                    }
                },

                doTransitionJS: function (event, optsTrans) {
                    var sameDestSlideIdx = this.prepareTransition(optsTrans),
                        fromCenterTrans = { x: this.anim.centerPnt.x, y: this.anim.centerPnt.y },
                        toCenterTrans = data.slideData[this.anim.gotoSlideIdx].centerTrans,
                        toTransformations = data.slideData[this.anim.gotoSlideIdx].cssTransforms.transformations,
                        zoomDest = zoomUtil.checkZoomBounds(zoomUtil.getZoomDest(optsTrans.zoomDest, this.anim.gotoSlideIdx)),
                        isLinearZoom = typeof optsTrans.zoomVertex === 'string' && optsTrans.zoomVertex == 'linear';

                    if (this.animationWillRun(fromCenterTrans, toCenterTrans, zoomDest)) {
                        // medium (x, y) = (x=unknown for now, y=optsTrans.zoomVertex= min or max zoom represented by y-coordinate 
                        // that corresponds to minimum or maximun the function takes)
                        zoomUtil.setZoomVertex(optsTrans.zoomVertex, this.anim.gotoSlideIdx, zoomDest);
                        // get the coefficients [a, b, c] of a quadratic function that interpolates the following 3 points: 
                        this.anim.zoomCoefs = util.getQuadratic2PntsVertex({ x: 0, y: zoomUtil.zoom }, { x: 1, y: zoomDest }, isLinearZoom ? 'linear' : zoomUtil.zoomVertex);

                        if ((seqData.state === $.fn.rsSlideIt.state.PLAY || !this.isThisPartOfSlideShow()) && optsTrans.onBegin) {
                            $elem.triggerHandler('beginTrans.rsSlideIt', [data.activeSlide.index, this.anim.gotoSlideIdx]);
                        }
                        if (this.isThisPartOfSlideShow()) {
                            seqData.state = $.fn.rsSlideIt.state.PLAY;
                        }

                        // this.anim.progress holds the position the last animation had before being interrupted.
                        // If previous animation did finished (not interrupted), then this.anim.progress is zero.
                        this.anim.$obj = $({ percent: 0 });
                        this.anim.$obj.animate({
                            percent: 1
                        }, {
                            duration: optsTrans.duration * (sameDestSlideIdx ? 1 - this.anim.progress : 1),
                            easing: optsTrans.easing,
                            step: function (now) {
                                var prevZoom = zoomUtil.zoom;
                                transData.anim.progress = now;
                                transData.anim.centerPnt = util.interpolatePoint(fromCenterTrans, toCenterTrans, now);
                                zoomUtil.zoom = util.getQuadraticValue(transData.anim.zoomCoefs, now);

                                if (transData.anim.progressPausedOn !== null) {
                                    now = util.interpolate(transData.anim.progressPausedOn, 1, now);
                                }
                                transData.anim.computeIntermediateMatrix(now, toTransformations);

                                transUtil.trans.x = container.center.x - transData.anim.centerPnt.x;
                                transUtil.trans.y = container.center.y - transData.anim.centerPnt.y;
                                if (data.isIE8orBelow) {
                                    transUtil.adjustTransIE(transData.anim.centerPnt);
                                }
                                transUtil.setTransformOrigin(transData.anim.centerPnt.x, transData.anim.centerPnt.y);
                                container.$transDiv.css(transUtil.getTransformCSSstyle());
                                zoomUtil.invokeChangeZoom(prevZoom);
                            },
                            complete: function () {
                                transData.transitionDone(true);
                            }
                        });
                    } else {
                        if (this.isThisPartOfSlideShow()) {
                            seqData.state = $.fn.rsSlideIt.state.PLAY;
                        }
                        this.transitionDone(false);
                    }
                },
                transitionDone: function (finishedWithAnimation) {
                    if (!!this.anim.zoomCoefs) {
                        zoomUtil.zoom = util.getQuadraticValue(this.anim.zoomCoefs, 1);
                    }
                    this.anim.progressPausedOn = null;
                    this.anim.clearTransformations();
                    if (finishedWithAnimation) {
                        $elem.triggerHandler('endTrans.rsSlideIt', [data.activeSlide.index, this.anim.gotoSlideIdx]);
                    }
                    data.gotoSlide(this.anim.gotoSlideIdx);
                    this.finished(finishedWithAnimation, false);
                    this.anim.progress = this.cssAnim.totalTime = 0;
                }
            },

            util = {
                warn: function (msg, alertIfWarnNoSupported) {
                    if (window.console) {
                        window.console.warn(msg);
                    } else {
                        if (alertIfWarnNoSupported) {
                            alert(msg);
                        }
                    }
                },

                isAlmostZero: function (a, maxDelta) {
                    return this.areTheSame(a, 0, maxDelta);
                },

                isAlmostOne: function (a, maxDelta) {
                    return this.areTheSame(a, 1, maxDelta);
                },

                areTheSame: function (a, b, maxDelta) {
                    return Math.abs(a - b) < (maxDelta === undefined ? 0.00005 : maxDelta);
                },

                roundToTrigonometricBounds: function (value) {
                    return this.isAlmostZero(value) ? 0 : (this.isAlmostOne(value) ? 1 : (this.isAlmostZero(value + 1) /* testing for -1 */ ? -1 : value));
                },

                radToDeg: function (rad) {
                    var deg = rad * 180 / Math.PI;
                    return deg < 0 ? 360 + deg : deg;
                },

                degToRad: function (deg) {
                    return deg * Math.PI / 180;
                },

                toInt: function (str) {
                    var value = !str || str == 'auto' || str == '' ? 0 : parseInt(str, 10);
                    return isNaN(value) ? 0 : value;
                },

                toFloat: function (str) {
                    var value = !str || str == 'auto' || str == '' ? 0.0 : parseFloat(str);
                    return isNaN(value) ? 0.0 : value;
                },

                interpolate: function (from, to, percent) {
                    return (to - from) * percent + from;
                },

                interpolatePoint: function (from, to, percent) {
                    return { 
                        x: (to.x - from.x) * percent + from.x,
                        y: (to.y - from.y) * percent + from.y
                    };
                },

                getDistanceTwoPnts: function (pnt1, pnt2) {
                    var pt = [pnt1.x - pnt2.x, pnt1.y - pnt2.y];
                    return Math.sqrt(pt[0] * pt[0] + pt[1] * pt[1]);
                },

                // given 3 points, it uses interpolation to find out the coefficients [a, b, c] of the 
                // quadratic function that intersects those 3 points.
                // These 3 points should be distinct and cannot share the same X
                // f(x) = y = a(x^2) + bx + c
                getQuadratic: function (p1, p2, p3) {
                    // is p2.y is the minimum/maximum y-coordinate among the 3 points?
                    if (Math.abs(Math.min(p2.y, Math.min(p1.y, p3.y)) - p2.y) < 0.000001 ||
                        Math.abs(Math.max(p2.y, Math.max(p1.y, p3.y)) - p2.y) < 0.000001) {

                        // return a quadratic function that interpolates these 3 points
                        var deno = (p1.x - p2.x) * (p1.x - p3.x) * (p2.x - p3.x);
                        return {
                            a: (p3.x * (p2.y - p1.y) + p2.x * (p1.y - p3.y) + p1.x * (p3.y - p2.y)) / deno,
                            b: (p3.x * p3.x * (p1.y - p2.y) + p1.x * p1.x * (p2.y - p3.y) + p2.x * p2.x * (p3.y - p1.y)) / deno,
                            c: (p3.x * (p2.x * p1.y * (p2.x - p3.x) + p1.x * p2.y * (p3.x - p1.x)) + p1.x * p2.x * p3.y * (p1.x - p2.x)) / deno
                        };
                    } else {
                        // return a linear function that interpolates the first and third point
                        return this.getLinear(p1, p3);
                    }
                },

                getLinear: function (p1, p3) {
                    var m = (p1.y - p3.y) / (p1.x - p3.x);
                    return {
                        a: 0,
                        b: m,
                        c: p1.y - m * p1.x
                    };
                },

                getQuadraticValue: function (coefs, x) {
                    return coefs.a * x * x + coefs.b * x + coefs.c;
                },

                // returns the x-coordinate of the point that corresponds to the min/max value of a quadradic f(x) function (when f'(x) = 0) 
                getVertexPointX: function (coefs) {
                    return -coefs.b / (2 * coefs.a);
                },

                // given 2 points and the y-coordinate of the vertex point (point where function has its min or max value),
                // this function interpolates a quadratic function.
                // It might need to make further approximations for the resulting f(x) reach the targeted p2yVertex
                getQuadratic2PntsVertex: function (p1, p3, p2yVertex) {
                    if (typeof p2yVertex === 'string' && p2yVertex == 'linear') {
                        return this.getLinear(p1, p3);
                    } else {
                        return this.getQuadraticAprox(p1, { x: (p1.x + p3.x) / 2, y: p2yVertex }, p3);
                    }
                },

                getQuadraticAprox: function (p1, p2, p3) {
                    var coefs = this.getQuadratic(p1, p2, p3);
                    if (coefs.a != 0) { // only continue if a is non zero (if it is a parabola)

                        var vertexPnt = {
                            x: this.getVertexPointX(coefs),
                            y: 0 // is computed below
                        };
                        vertexPnt.y = this.getQuadraticValue(coefs, vertexPnt.x);

                        // compare the y-coordinate of the vertex point against the desired vertex (p2.y)
                        if (Math.abs(vertexPnt.y - p2.y) > 0.001) {
                            // fine tuning to aproximate the desired vertex (p2.y)
                            // in worst case scenario, this recursive function runs on O(3), so performance is not that bad
                            return this.getQuadraticAprox(p1, { x: vertexPnt.x, y: p2.y }, p3);
                        }
                    }
                    return coefs;
                },

                // multiplies matrix1 by matrix2 and places result in matrix2. Also returns the result matrix
                multiply2x2Matrices: function (matrix1, matrix2) {
                    // matrix1 and matrix2 are 2x2 matrices, with indexes as | 0 1 |
                    //                                                       | 2 3 |
                    var m2 = [matrix2[0], matrix2[1], matrix2[2], matrix2[3]];
                    matrix2[0] = matrix1[0] * m2[0] + matrix1[1] * m2[2];
                    matrix2[1] = matrix1[0] * m2[1] + matrix1[1] * m2[3];
                    matrix2[2] = matrix1[2] * m2[0] + matrix1[3] * m2[2];
                    matrix2[3] = matrix1[2] * m2[1] + matrix1[3] * m2[3];
                    return matrix2;
                },
                
                areMatricesEqual: function (matrix1, matrix2) {
                    return  this.areTheSame(matrix1[0], matrix2[0]) &&
                            this.areTheSame(matrix1[1], matrix2[1]) &&
                            this.areTheSame(matrix1[2], matrix2[2]) &&
                            this.areTheSame(matrix1[3], matrix2[3]);
                },           

                // returns the inverse matrix of the given matrix, in such a way that matrix * matrixInv = matrixIdentity
                getInvertedMatrix: function (matrix) {
                    var coef = matrix[0] * matrix[3] - matrix[1] * matrix[2];
                    if (!this.isAlmostZero(coef)) {
                        return [matrix[3] / coef, - matrix[1] / coef, - matrix[2] / coef, matrix[0] / coef];
                    }
                    return [matrix[0], matrix[1], matrix[2], matrix[3]];
                },

                isDefined: function (value) {
                    return value && value != "" && value != "none";
                },

                getAngleRadians: function (value) {
                    var toRad = 0; // conversion rate to radians
                    // try radians
                    var found = value.match(/[-|+]?[\d.]+rad/i);
                    if (!found || !this.isDefined(found[0])) {
                        // try degrees
                        found = value.match(/[-|+]?[\d.]+deg/i);
                        if (!found || !this.isDefined(found[0])) {
                            // try grads
                            found = value.match(/[-|+]?[\d.]+grad/i);
                            if (!found || !this.isDefined(found[0])) {
                                // try turns
                                found = value.match(/[-|+]?[\d.]+turn/i);
                                if (!found || !this.isDefined(found[0])) {
                                    return 0;
                                } else toRad = Math.PI / 0.5; // turn to rad
                            } else toRad = Math.PI / 200; // grad to rad
                        } else toRad = Math.PI / 180; // deg to rad
                    } else toRad = 1; // rad to rad
                    value = value.replace(/rad|deg|grad|turn/gi, '');
                    return util.toFloat(value) * toRad;
                },

                getSlideIdx: function (dest, currentSlideIdx) {
                    var currSlide = currentSlideIdx === undefined ? data.activeSlide.index : currentSlideIdx;
                    switch (dest) {
                        case 'prev': return currSlide <= 0 ? data.qtSlides - 1 : currSlide - 1;
                        case 'next': return currSlide >= data.qtSlides - 1 ? 0 : currSlide + 1;
                        case 'first': return 0;
                        case 'last': return data.qtSlides - 1;
                        default: return dest;
                    }
                },

                getSpeedMs: function (speed) {
                    var ms = speed;
                    if (typeof speed === 'string') {
                        ms = $.fx.speeds[speed];
                        if (ms === undefined) {
                            ms = $.fx.speeds['_default'];
                        }
                    }
                    if (ms === undefined) {
                        ms = 400;
                    }
                    return ms;
                }
            },

            zoomUtil = {
                zoom: 1.0,
                zoomVertex: 0,
                longestPath: 0, // used when zoomVertex is 'in' or 'out'
                checkZoomBounds: function (zoomValue) {
                    return (zoomValue > opts.zoomMax ? opts.zoomMax : (zoomValue < opts.zoomMin ? opts.zoomMin : zoomValue));
                },
                calcLongestPath: function () {
                    this.longestPath = 0;
                    for (var i = 0; i < data.qtSlides; ++i) {
                        for (var j = i + 1; j < data.qtSlides; ++j) {
                            this.longestPath = Math.max(this.longestPath, util.getDistanceTwoPnts(data.slideData[i].center, data.slideData[j].center));
                        }
                    }
                },
                doZoom: function (newZoom) {
                    var prevZoom = this.zoom;
                    this.zoom = this.checkZoomBounds(newZoom);
                    if (prevZoom != this.zoom) {
                        container.$transDiv.css(transUtil.doMouseZoom(prevZoom, this.zoom));
                        transUtil.cache.refreshCenterTransParent();
                        events.fireSlideEvents(false);
                        this.invokeChangeZoom(prevZoom);
                    }
                },
                invokeChangeZoom: function (prevZoom) {
                    if (prevZoom != this.zoom && opts.events.onChangeZoom) {
                        $elem.triggerHandler('changeZoom.rsSlideIt', [this.zoom]);
                    }
                },
                setZoomVertex: function (zoomVertex, destSlide, zoomDest) {
                    if (typeof zoomVertex === 'string') {
                        switch (zoomVertex) {
                            case 'out':
                                var min = Math.min(this.zoom, zoomDest);
                                this.zoomVertex = min - (min - opts.zoomMin) * util.getDistanceTwoPnts(transData.anim.centerPnt, data.slideData[destSlide].center) / this.longestPath;
                                break;
                            case 'in':
                                var max = Math.max(this.zoom, zoomDest);
                                this.zoomVertex = max + (opts.zoomMax - max) * util.getDistanceTwoPnts(transData.anim.centerPnt, data.slideData[destSlide].center) / this.longestPath;
                        }
                    } else {
                        this.zoomVertex = zoomVertex;
                    }
                    this.zoomVertex = this.checkZoomBounds(this.zoomVertex);
                },
                getZoomDest: function (zDest, gotoSlideIdx) {
                    if (typeof zDest === 'string') {
                        container.setCenterPos();
                        var slideData = data.slideData[gotoSlideIdx],
                            fit = {
                                x: container.center.x * 2 / (slideData.padding[3] + slideData.size.x + slideData.padding[1]),
                                y: container.center.y * 2 / (slideData.padding[0] + slideData.size.y + slideData.padding[2])
                            };
                        switch (zDest) {
                            case 'current': return this.zoom;
                            case 'fitWidth': return fit.x;
                            case 'fitHeight': return fit.y;
                            case 'fit': return Math.min(fit.x, fit.y);
                            case 'cover': return Math.max(container.center.x * 2 / slideData.size.x, container.center.y * 2 / slideData.size.y);
                            default: return this.zoom;
                        }
                    }
                    return zDest;
                },
                initZoom: function (z, zMin, slideIdx) {
                    this.zoom = zMin;
                    this.zoom = this.checkZoomBounds(this.getZoomDest(z, slideIdx));
                },
                setterZoom: function (newZoom) {
                    container.setCenterPos();
                    this.doZoom(this.checkZoomBounds(newZoom));
                }
            },

            panUtil = {
                startPage: { x: 0, y: 0 },
                startTrans: { x: 0, y: 0 },
                isPanning: false,
                elemPos: { x: 0, y: 0 },
                width: 0,
                height: 0,
                beginPan: function (event) {
                    panUtil.startPage.x = event.pageX;
                    panUtil.startPage.y = event.pageY;
                    panUtil.startTrans.x = transUtil.trans.x;
                    panUtil.startTrans.y = transUtil.trans.y;
                    panUtil.isPanning = true;
                    var rect = transUtil.getTransformedRect(container.IEorigSize),
                        pos = $elem.position();
                    panUtil.width = rect.bottomRight.x - rect.topLeft.x;
                    panUtil.height = rect.bottomRight.y - rect.topLeft.y;
                    panUtil.elemPos.x = pos.left;
                    panUtil.elemPos.y = pos.top;
                    $elem.triggerHandler('beginPan.rsSlideIt');
                },
                endPan: function () {
                    panUtil.isPanning = false;
                    $elem.triggerHandler('endPan.rsSlideIt');
                },
                mousemove: function (event) {
                    if (!panUtil.isPanning) {
                        panUtil.beginPan(event);
                    }
                    
                    var position = container.$transDiv.offset(),
                        limits = {
                            top: position.top - panUtil.elemPos.y + panUtil.height,
                            right: position.left - panUtil.elemPos.x - container.center.x * 2,
                            bottom: position.top - panUtil.elemPos.y - container.center.y * 2,  
                            left: position.left - panUtil.elemPos.x + panUtil.width
                        };
                    if (limits.top < 0) {
                        panUtil.startPage.y += limits.top;
                    }
                    if (limits.right > 0) {
                        panUtil.startPage.x += limits.right;
                    }
                    if (limits.bottom > 0) {
                        panUtil.startPage.y += limits.bottom;
                    }
                    if (limits.left < 0) {
                        panUtil.startPage.x += limits.left;
                    }

                    var offset = { x: event.pageX - panUtil.startPage.x, y: event.pageY - panUtil.startPage.y };
                    if (!data.isIE8orBelow) {
                        offset = transUtil.getTransformedPoint(offset, transUtil.cache.matrixCTM_inv);
                    }
                    transUtil.trans.x = panUtil.startTrans.x + offset.x;
                    transUtil.trans.y = panUtil.startTrans.y + offset.y;
                    
                    if (data.isIE8orBelow) {
                        offset = transUtil.getTransformedPoint(offset, transUtil.cache.matrixCTM_inv);
                    }
                    container.$transDiv.css(transUtil.doMousePan(offset));
                },
                mousedown: function (event) {
                    if (event.which == 1) {
                        data.$elemAndTops.bind('mousemove.rsSlideIt', panUtil.mousemove);
                        panUtil.isPanning = false;
                    }
                    event.preventDefault();
                },
                mouseup: function (event) {
                    if (data.isIE8orBelow) {
                        var offset = { x: event.pageX - panUtil.startPage.x, y: event.pageY - panUtil.startPage.y };
                        transUtil.trans.x = panUtil.startTrans.x + offset.x;
                        transUtil.trans.y = panUtil.startTrans.y + offset.y;
                        offset = transUtil.getTransformedPoint(offset, transUtil.cache.matrixCTM_inv);
                        transUtil.activeSlideCenterTrans.x -= offset.x;
                        transUtil.activeSlideCenterTrans.y -= offset.y;
                    }
                    if (event.which == 1) {
                        panUtil.stopImmediately();
                    }
                    event.preventDefault();
                },
                stopImmediately: function () {
                    data.$elemAndTops.unbind('mousemove.rsSlideIt');
                    if (panUtil.isPanning) {
                        panUtil.endPan();
                    }
                }
            },

            transUtil = {
                transID: { 
                    TRANSLATE:  0,
                    ROTATE:     1,
                    SKEWX:      2,
                    SKEWY:      3,
                    SCALEX:     4,
                    SCALEY:     5,
                    SCALEXY:    6,
                    SCALE:      7
                },
                orig: { x: container.center.x, y: container.center.y }, // transformation origin point
                trans: { x: 0, y: 0 },
                activeSlideIndex: -1,
                activeSlideCTMmatrix: null,
                activeSlideCenterTrans: { x: 0, y: 0 },
                cache: { // caches some expensive function results
                    matrixCTM:      [1, 0, 0, 1], // Current Transformation Matrix containing all the precalculated transformations
                    matrixCTM_inv:  [1, 0, 0, 1], // Inversed matrixCTM, which means matrixCTM * matrixCTM_inv = Identity matrix. This matrixCTM_inv matches the current slide ctmMatrix, with user zoom applied.
                    
                    refresh: function () {
                        this.matrixCTM = util.getInvertedMatrix(transUtil.activeSlideCTMmatrix);
                        util.multiply2x2Matrices(transUtil.getMatrixScale(zoomUtil.zoom), this.matrixCTM); // final scale transformation related with the mouse zoom
                        this.matrixCTM_inv = util.getInvertedMatrix(this.matrixCTM);
                    },

                    refreshCenterTransParent: function () {
                        for (var i = data.qtSlides - 1; i > -1; --i) {
                            var transformedPoint = transUtil.getTransformedPoint(data.slideData[i].centerTrans);
                            data.slideData[i].centerTransParent.x = transformedPoint.x;
                            data.slideData[i].centerTransParent.y = transformedPoint.y;
                        }
                        data.insertSorted();
                    }
                },

                getMatrixIdentity:  function () { return [1, 0, 0, 1]; },
                getMatrixRotate:    function (sine, cosine) { sine = util.roundToTrigonometricBounds(sine); cosine = util.roundToTrigonometricBounds(cosine); return [cosine, sine, - sine, cosine]; },
                getMatrixSkewX:     function (tangent) { return [1, 0, util.roundToTrigonometricBounds(tangent), 1]; },
                getMatrixSkewY:     function (tangent) { return [1, util.roundToTrigonometricBounds(tangent), 0, 1]; },
                getMatrixScale:     function (scale) { return [scale, 0, 0, scale]; },
                getMatrixScaleXY:   function (scaleX, scaleY) { return [scaleX, 0, 0, scaleY]; },
                getMatrixScaleX:    function (scaleX) { return [scaleX, 0, 0, 1]; },
                getMatrixScaleY:    function (scaleY) { return [1, 0, 0, scaleY]; },
                getMatrix: function (id, value) {
                    switch (id) {
                        case this.transID.ROTATE:   return this.getMatrixRotate(Math.sin(value), Math.cos(value));
                        case this.transID.SKEWX:    return this.getMatrixSkewX(Math.tan(value));
                        case this.transID.SKEWY:    return this.getMatrixSkewY(Math.tan(value));
                        case this.transID.SCALEX:   return this.getMatrixScaleX(value);
                        case this.transID.SCALEY:   return this.getMatrixScaleY(value);
                        case this.transID.SCALEXY:  return this.getMatrixScaleXY(value.x, value.y);
                        case this.transID.SCALE:    return this.getMatrixScale(value);
                    }
                    return this.getMatrixIdentity();
                },

                getTransformedPoint: function(pnt, ctmMatrix, centerPnt) {
                    var ctm = ctmMatrix === undefined ? this.cache.matrixCTM : ctmMatrix;
                    if (centerPnt === undefined) {
                        return { 
                            x: ctm[0]*pnt.x + ctm[2]*pnt.y,
                            y: ctm[1]*pnt.x + ctm[3]*pnt.y
                        };
                    }
                    return { 
                        x: centerPnt.x + ctm[0]*(pnt.x - centerPnt.x) + ctm[2]*(pnt.y - centerPnt.y),
                        y: centerPnt.y + ctm[1]*(pnt.x - centerPnt.x) + ctm[3]*(pnt.y - centerPnt.y)
                    };
                },
                getTransformedRect: function(rectSize, slideCtmMatrix, centerPnt) {
                    var lt = this.getTransformedPoint({ x: 0, y: 0 }, slideCtmMatrix, centerPnt),
                        rt = this.getTransformedPoint({ x: rectSize.x, y: 0 }, slideCtmMatrix, centerPnt),
                        rb = this.getTransformedPoint({ x: rectSize.x, y: rectSize.y }, slideCtmMatrix, centerPnt),
                        lb = this.getTransformedPoint({ x: 0, y: rectSize.y }, slideCtmMatrix, centerPnt);
                    return {
                        topLeft: {
                            x: Math.min(lt.x, Math.min(rt.x, Math.min(lb.x, rb.x))),
                            y: Math.min(lt.y, Math.min(rt.y, Math.min(lb.y, rb.y)))
                        },
                        bottomRight: {
                            x: Math.max(lt.x, Math.max(rt.x, Math.max(lb.x, rb.x))),
                            y: Math.max(lt.y, Math.max(rt.y, Math.max(lb.y, rb.y)))
                        }
                    };
                },
                getTransformOrigin: function () {
                    return { x: this.orig.x, y: this.orig.y };
                },
                setTransformOrigin: function (origX, origY) {
                    this.orig.x = origX;
                    this.orig.y = origY;
                },
                
                getTransformCSSstyle: function () {
                    if (data.isIE8orBelow) {
                        return {
                            'margin-left': this.trans.x,
                            'margin-top': this.trans.y,
                            'filter': 'progid:DXImageTransform.Microsoft.Matrix(' +
                                        'M11=' + this.cache.matrixCTM[0] + 
                                        ',M12=' + this.cache.matrixCTM[2] + // Second and third coefficients are swapped
                                        ',M21=' + this.cache.matrixCTM[1] + 
                                        ',M22=' + this.cache.matrixCTM[3] + 
                                        // DX and DY translation do not work when SizingMethod is 'auto expand'. The workaround is using margins to simulate translation.
                                        // ', DX=0, DY=0' +   (leave as it is, do not uncomment this line)
                                        ',SizingMethod=\'auto expand\')'
                        };
                    } else {
                        var matrixCss = 'matrix(' + this.cache.matrixCTM + ',' + this.trans.x + ',' + this.trans.y + ')',
                            origCss = this.orig.x.toFixed(0) + 'px ' + this.orig.y.toFixed(0) + 'px';
                        return {
                            '-webkit-transform-origin': origCss,
                            '-moz-transform-origin': origCss,
                            '-o-transform-origin': origCss,
                            'msTransformOrigin': origCss,
                            'transform-origin': origCss,

                            '-webkit-transform': matrixCss,
                            '-moz-transform': matrixCss,
                            '-o-transform': matrixCss,
                            'msTransform': matrixCss,
                            'transform': matrixCss
                        };
                    }
                },

                adjustTransIE: function (centerPnt) {
                    var rect = this.getTransformedRect(container.IEorigSize, this.cache.matrixCTM, centerPnt);
                    this.trans.x += rect.topLeft.x;
                    this.trans.y += rect.topLeft.y;
                },

                setActiveSlide: function (slideIdx) {
                    data.activeSlide.index = this.activeSlideIndex = slideIdx;
                    data.activeSlide.$slide = container.$slides.eq(slideIdx);
                    var slideData = data.slideData[slideIdx];
                    this.activeSlideCTMmatrix = slideData.cssTransforms.ctmMatrix;
                    this.trans.x = container.center.x - slideData.centerTrans.x;
                    this.trans.y = container.center.y - slideData.centerTrans.y;
                    this.cache.refresh();
                    if (data.isIE8orBelow) {
                        this.activeSlideCenterTrans.x = slideData.centerTrans.x;
                        this.activeSlideCenterTrans.y = slideData.centerTrans.y;
                        this.adjustTransIE(slideData.centerTrans);
                    }
                },

                getTransformCSS: function (offset) {
                    this.setTransformOrigin(container.center.x - this.trans.x, container.center.y - this.trans.y);
                    if (data.isIE8orBelow) {
                        var rect = this.getTransformedRect(container.IEorigSize, this.cache.matrixCTM, 
                            offset === undefined ? this.activeSlideCenterTrans : {
                                x: this.activeSlideCenterTrans.x - offset.x,
                                y: this.activeSlideCenterTrans.y - offset.y
                            });
                        this.orig.x += rect.topLeft.x;
                        this.orig.y += rect.topLeft.y;
                    }
                    return this.getTransformCSSstyle();
                },

                getTransformOriginCss: function ($element, outerSize) {
                    if (data.isIE8orBelow) {
                        // TODO check if in IE8 and below, the transform origin correctly maps to the margins
                        return { x: util.toFloat($element.css('margin-left')), y: util.toFloat($element.css('margin-top')) };
                    } else {
                        var value = $element.css('-webkit-transform-origin');
                        if (!util.isDefined(value)) {
                            value = $element.css('-moz-transform-origin');
                            if (!util.isDefined(value)) {
                                value = $element.css('-o-transform-origin');
                                if (!util.isDefined(value)) {
                                    value = $element.css('msTransformOrigin');
                                    if (!util.isDefined(value)) {
                                        value = $element.css('transform-origin');
                                        if (!util.isDefined(value)) {
                                            return !!outerSize ? 
                                                { x: outerSize.x / 2, y: outerSize.y / 2 } : { x: container.IEorigSize.x / 2, y: container.IEorigSize.y / 2 };
                                        }
                                    }
                                }
                            }
                        }
                    }
                    var values = value.split(" ");
                    return { x: util.toFloat(values[0]), y: util.toFloat(values[1]) };
                },

                doMousePan: function (offset) {
                    var css = this.getTransformCSS(offset);
                    events.fireSlideEvents(false);
                    return css;
                },

                doMouseZoom: function (oldMouseZoom, newMouseZoom) {
                    if (data.isIE8orBelow) {
                        // IE8 and below do not have transform-origin, so the workaround to properly center scale transformations is to apply a translation
                        if (!util.isAlmostZero(oldMouseZoom)) {
                            var deltaScale, deltaTrans;
                            deltaScale = newMouseZoom - oldMouseZoom;
                            deltaTrans = (container.center.x - this.trans.x) / oldMouseZoom;
                            this.trans.x -= deltaTrans * deltaScale;
                            
                            deltaTrans = (container.center.y - this.trans.y) / oldMouseZoom;
                            this.trans.y -= deltaTrans * deltaScale;
                       }
                    }
                    this.cache.refresh();
                    return this.getTransformCSS();
                }
            },

            events = {
                onMouseWheel: function (event) {
                    var delta = {x: 0, y: 0};
                    if (event.wheelDelta === undefined && event.originalEvent !== undefined && (event.originalEvent.wheelDelta !== undefined || event.originalEvent.detail !== undefined)) { 
                        event = event.originalEvent;
                    }
                    if (event.wheelDelta) { 
                        delta.y = event.wheelDelta/120;
                    }
                    if (event.detail) {
                        delta.y = -event.detail/3;
                    }
                    var evt = event || window.event;
                    if (evt.axis !== undefined && evt.axis === evt.HORIZONTAL_AXIS) {
                        delta.x = - delta.y;
                        delta.y = 0;
                    }
                    if (evt.wheelDeltaY !== undefined) {
                        delta.y = evt.wheelDeltaY / 120;
                    }
                    if (evt.wheelDeltaX !== undefined) { 
                        delta.x = - evt.wheelDeltaX / 120;
                    }
                    evt.preventDefault ? evt.preventDefault() : evt.returnValue = false; // prevents scrolling
                    zoomUtil.doZoom(zoomUtil.zoom + delta.y * opts.zoomStep);
                },
                onMousedown: function (event) {
                    panUtil.mousedown(event);
                },
                onMouseup: function (event) {
                    panUtil.mouseup(event);
                },
                onMouseleave: function (event) {
                    if (panUtil.isPanning) {
                        var $mouseOn = $(document.elementFromPoint(event.clientX, event.clientY));
                        if (!!$mouseOn && $mouseOn.closest(data.$elemAndTops).length !== 1) {
                            event.which = 1;
                            panUtil.mouseup(event);
                        }
                    }
                },
                onSingleTransition: function (event, optsTrans) {
                    if (!transData.isThisPartOfSlideShow()) {
                        transData.prevDuration = transData.duration;
                        transData.reset();
                        transData.duration = util.getSpeedMs(optsTrans.duration);
                        if (transData.prevDuration === null) {
                            transData.prevDuration = transData.duration;
                        }
                        optsTrans.duration = transData.duration;
                        transData.easing = optsTrans.easing;
                        transData.onBegin = optsTrans.onBegin;
                        transData.onEnd = optsTrans.onEnd;
                        transData.doTransition(event, optsTrans);
                    }
                },
                onTransition: function (event, optsTrans) {
                    transData.doTransition(event, optsTrans);
                },
                onPlayPause: function (event, optsSequence) {
                    if (seqData.state === $.fn.rsSlideIt.state.PLAY) {
                        seqData.state = $.fn.rsSlideIt.state.PAUSE;
                        if (seqData.timeoutId) {
                            // pause was invoked when transition was already done, in other words, 
                            // user clicked "pause" when the slide show was standing still waiting for the next transition to start
                            clearTimeout(seqData.timeoutId);
                            seqData.pauseOnSlide = true;
                        } else {
                            // user clicked "pause" when the transition was running
                            if (seqData.userInteract) {
                                events.bindEvents();
                            }
                        }
                        transData.interrupt();
                        events.firePauseStopEvents();
                    } else {
                        if (seqData.state === $.fn.rsSlideIt.state.STOP && !transData.animating) {
                            seqData.init(optsSequence);
                        }
                        if (seqData.state === $.fn.rsSlideIt.state.PLAY || seqData.state === $.fn.rsSlideIt.state.PAUSE) {
                            seqData.doSlideshow(event);
                        }
                    }
                },
                onStop: function (event) {
                    // if "stop" is invoked when no playback is running, then transData.inputOpts is null
                    if (transData.inputOpts) {
                        if (seqData.timeoutId) {
                            // stop was invoked when transition was already done, in other words,
                            // user clicked "stop" when the slide show was standing still waiting for the next transition to start
                            clearTimeout(seqData.timeoutId);
                        } else {
                            // user clicked "stop" when the transition was running or
                            // user clicked "stop" when transition was paused somewhere in the middle
                            if (seqData.state !== $.fn.rsSlideIt.state.PAUSE && seqData.userInteract) {
                                events.bindEvents();
                            }
                        }
                        if (!seqData.userInteract) {
                            events.bindEvents();
                        }
                        transData.anim.progressPausedOn = null;
                        if (seqData.state === $.fn.rsSlideIt.state.PAUSE) {
                            seqData.state = $.fn.rsSlideIt.state.STOP;    
                            transUtil.activeSlideIndex = transData.anim.gotoSlideIdx;
                            transData.finished(true, true);
                        } else {
                            seqData.state = $.fn.rsSlideIt.state.STOP;
                            transData.interrupt();
                        }
                        events.firePauseStopEvents();
                        transData.reset();
                        transData.inputOpts = null;
                    }
                },
                unbindEvents: function () {
                    //console.log('-    ' + (new Date().getTime()));
                    if (opts.mouseZoom) {
                        data.$elemAndTops.unbind('DOMMouseScroll.rsSlideIt mousewheel.rsSlideIt');
                    }
                    if (opts.mousePan) {
                        data.$elemAndTops.
                            unbind('mousedown.rsSlideIt mouseleave.rsSlideIt').
                            unbind('mouseup.rsSlideIt', this.onMouseup);
                    }
                },
                bindEvents: function () {
                    //console.log('+    ' + (new Date().getTime()));
                    if (opts.mouseZoom) {
                        data.$elemAndTops.bind('DOMMouseScroll.rsSlideIt mousewheel.rsSlideIt', this.onMouseWheel);
                    }
                    if (opts.mousePan) {
                        data.$elemAndTops.
                            bind('mousedown.rsSlideIt', this.onMousedown).
                            bind('mouseup.rsSlideIt', this.onMouseup).
                            bind('mouseleave.rsSlideIt', this.onMouseleave);
                    }
                },
                onGetter: function (event, field) {
                    switch (field) {
                        case 'zoom': return zoomUtil.zoom;
                        case 'zoomMin': return opts.zoomMin;
                        case 'zoomStep': return opts.zoomStep;
                        case 'zoomMax': return opts.zoomMax;
                        case 'activeSlide': return data.activeSlide.index;
                        case 'center': return transUtil.getTransformOrigin();
                        case 'state': return seqData.state;
                        case 'events': return opts.events;
                    }
                    return null;
                },
                onSetter: function (event, field, value) {
                    switch (field) {
                        case 'zoomMin':
                            opts.zoomMin = value;
                            if (opts.zoomMin > opts.zoomMax) {
                                opts.zoomMin = opts.zoomMax;
                            }
                            value = zoomUtil.zoom;
                            // note that 'zoomMin' does not have break here
                        case 'zoom':
                            zoomUtil.setterZoom(value);
                            break;
                        case 'zoomMax':
                            opts.zoomMax = value;
                            if (opts.zoomMin > opts.zoomMax) {
                                opts.zoomMax = opts.zoomMin;
                                zoomUtil.setterZoom(value);
                            }
                            break;
                        case 'zoomStep':
                            opts.zoomStep = value;
                            break;
                        case 'activeSlide':
                            if (!transData.animating) {
                                if (seqData.userInteract) {
                                    events.unbindEvents();
                                }
                                transData.anim.clearTransformations();
                                data.gotoSlide(data.checkSlideBounds(value));
                                transData.anim.progress = transData.cssAnim.totalTime = 0;
                            }   
                    }
                    return events.onGetter(event, field);
                },
                readUnderneath: function (event) {
                    var $target = $(event.target),
                        firedOnOverlay = $target.is(data.$elemsOnTop);
                    if (firedOnOverlay) {
                        if (document.elementFromPoint) {
                            data.$elemsOnTop.css('visibility', 'hidden');
                            // get the element underneath
                            var $under = $(document.elementFromPoint(event.clientX, event.clientY));
                            data.$elemsOnTop.css('visibility', 'visible');
                            if ($under.closest(opts.selector.slide).length === 1) {
                                return $under;
                            }
                        }
                        return null;
                    }
                    return $target;
                },
                onMouseupClick: function (event) {
                    // onClick is implemented as mouseUp, because a genuine click event is fired when users finishes to pan around with mouse.
                    // So, the workaroud is to catch the mouseup and fire the user onClickSlide
                    if (!panUtil.isPanning && !!opts.events.onClickSlide) {
                        var $slide = events.readUnderneath(event);
                        if ($slide) {
                            $elem.triggerHandler('clickSlide.rsSlideIt', [$slide, container.$slides.index($slide.closest(opts.selector.slide))]);
                        }
                    }
                },
                onDblClick: function (event) {
                    if (!!opts.events.onDblClickSlide) {
                        var $slide = events.readUnderneath(event);
                        if ($slide) {
                            $elem.triggerHandler('dblClickSlide.rsSlideIt', [$slide, container.$slides.index($slide.closest(opts.selector.slide))]);
                        }
                    }
                },
                onCreate: function (event) {
                    if (opts.events.onCreate) {
                        opts.events.onCreate(event);
                    }
                },
                onAjaxLoadBegin: function (event, qtTotal) {
                    if (opts.events.onAjaxLoadBegin) {
                        opts.events.onAjaxLoadBegin(event, qtTotal);
                    }
                },
                onAjaxLoadSlide: function (event, $ajaxSlide, index, success) {
                    if (opts.events.onAjaxLoadSlide) {
                        opts.events.onAjaxLoadSlide(event, $ajaxSlide, index, success);
                    }
                },
                onAjaxLoadEnd: function (event) {
                    if (opts.events.onAjaxLoadEnd) {
                        opts.events.onAjaxLoadEnd(event);
                    }
                },
                onChangeZoom: function (event, zoom) {
                    if (opts.events.onChangeZoom) {
                        opts.events.onChangeZoom(event, zoom);
                    }
                },
                onSelectSlide: function (event, $slide, index, caption) {
                    if (opts.events.onSelectSlide) {
                        opts.events.onSelectSlide(event, $slide, index, caption);
                    }
                }, 
                onUnselectSlide: function (event, $slide, index) {
                    if (opts.events.onUnselectSlide) {
                        opts.events.onUnselectSlide(event, $slide, index);
                    }
                }, 
                onClickSlide: function (event, $slide, index) {
                    if (opts.events.onClickSlide) {
                        opts.events.onClickSlide(event, $slide, index);
                    }
                }, 
                onDblClickSlide: function (event, $slide, index) {
                    if (opts.events.onDblClickSlide) {
                        opts.events.onDblClickSlide(event, $slide, index);
                    }
                }, 
                onBeginPan: function (event) {
                    if (opts.events.onBeginPan) {
                        opts.events.onBeginPan(event);
                    }
                },
                onEndPan: function (event) {
                    if (opts.events.onEndPan) {
                        opts.events.onEndPan(event);
                    }
                },
                onBeginTrans: function (event, fromSlide, toSlide) {
                    if (transData.onBegin) {
                        transData.onBegin(event, fromSlide, toSlide);
                    }
                },
                onEndTrans: function (event, fromSlide, toSlide) {
                    if (transData.onEnd) {
                        transData.onEnd(event, fromSlide, toSlide);
                    }
                },
                onBeginDelay: function (event, slide, delay) {
                    if (seqData.onBeginDelay) {
                        seqData.onBeginDelay(event, slide, delay);
                    }
                },
                onEndDelay: function (event, slide) {
                    if (seqData.onEndDelay) {
                        seqData.onEndDelay(event, slide);
                    }
                },
                fireSlideEvents: function (forceSel, prevSlide) {
                    var newActiveSlide = data.getActiveSlide(),
                        previousSlide = prevSlide === undefined ? data.activeSlide.index : prevSlide;
                    if (newActiveSlide.index > -1 && (forceSel || previousSlide != newActiveSlide.index)) {
                        if (opts.events.onUnselectSlide && previousSlide != newActiveSlide.index) {
                            $elem.triggerHandler('unselectSlide.rsSlideIt', [container.$slides.eq(previousSlide), previousSlide]);
                        }
                        data.activeSlide = newActiveSlide;
                        if (opts.events.onSelectSlide) {
                            $elem.triggerHandler('selectSlide.rsSlideIt', [data.activeSlide.$slide, data.activeSlide.index, data.slideData[newActiveSlide.index].caption]);
                        }
                    }
                },
                firePauseStopEvents: function () {
                    switch (seqData.state) {
                        case $.fn.rsSlideIt.state.PAUSE:
                            if (transData.inputOpts.onPause) {
                                transData.inputOpts.onPause();
                            }
                            break;
                        case $.fn.rsSlideIt.state.STOP:
                            if (transData.inputOpts.onStop) {
                                transData.inputOpts.onStop();
                            }
                    }
                },
                onCssAnimationStart: function (e) {
                    transData.cssAnim.startTime = +new Date();
                },
                onCssAnimationEnd: function () {
                    var centerTrans = data.slideData[transData.anim.gotoSlideIdx].centerTrans;
                    transUtil.trans.x = container.center.x - centerTrans.x;
                    transUtil.trans.y = container.center.y - centerTrans.y;
                    transUtil.setTransformOrigin(centerTrans.x, centerTrans.y);
                    transData.cssAnim.resetCSSanimation();
                    transData.transitionDone(true);
                }
            },

            load = {
                processedSlides: 0,
                $slidesInSlides: null,
                init: function () {
                    container.init();
                    data.init();
                    this.ajax.init();
                    this.$slidesInSlides = !opts.selector.slideInSlide ? $([]) : $(opts.selector.slideInSlide, container.$transDiv);
                    if (data.qtSlides > 0) {
                        $elem.
                            bind('singleTransition.rsSlideIt', events.onSingleTransition).
                            bind('transition.rsSlideIt', events.onTransition).
                            bind('playPause.rsSlideIt', events.onPlayPause).
                            bind('stop.rsSlideIt', events.onStop).
                            bind('getter.rsSlideIt', events.onGetter).
                            bind('setter.rsSlideIt', events.onSetter).
                            bind('create.rsSlideIt', events.onCreate).
                            bind('ajaxLoadBegin.rsSlideIt', events.onAjaxLoadBegin).
                            bind('ajaxLoadSlide.rsSlideIt', events.onAjaxLoadSlide).
                            bind('ajaxLoadEnd.rsSlideIt', events.onAjaxLoadEnd).
                            bind('changeZoom.rsSlideIt', events.onChangeZoom).
                            bind('selectSlide.rsSlideIt', events.onSelectSlide).
                            bind('unselectSlide.rsSlideIt', events.onUnselectSlide).
                            bind('clickSlide.rsSlideIt', events.onClickSlide).
                            bind('dblClickSlide.rsSlideIt', events.onDblClickSlide).
                            bind('beginPan.rsSlideIt', events.onBeginPan).
                            bind('endPan.rsSlideIt', events.onEndPan).
                            bind('beginTrans.rsSlideIt', events.onBeginTrans).
                            bind('endTrans.rsSlideIt', events.onEndTrans).
                            bind('beginDelay.rsSlideIt', events.onBeginDelay).
                            bind('endDelay.rsSlideIt', events.onEndDelay);

                        container.$slides.add(data.$elemsOnTop).bind('dblclick.rsSlideIt', events.onDblClick).bind('mouseup.rsSlideIt', events.onMouseupClick);
                        if (data.supportsCSSAnimation) { 
                            container.$transDiv.
                                bind('animationstart.rsSlideIt', events.onCssAnimationStart).
                                bind('webkitAnimationStart.rsSlideIt', events.onCssAnimationStart).
                                bind('oanimationstart.rsSlideIt', events.onCssAnimationStart).
                                bind('MSAnimationStart.rsSlideIt', events.onCssAnimationStart).
                                bind('animationend.rsSlideIt', events.onCssAnimationEnd).
                                bind('webkitAnimationEnd.rsSlideIt', events.onCssAnimationEnd).
                                bind('oanimationend.rsSlideIt', events.onCssAnimationEnd).
                                bind('MSAnimationEnd.rsSlideIt', events.onCssAnimationEnd);
                        }
                    }
                    
                    if (typeof Modernizr === 'undefined') {
                        util.warn('Unable to determine if your browser supports CSS3 animations natively, because Moderniz lib not loaded. Falling back to pure javascript animation!', false);
                    } else {
                        if (typeof Modernizr.cssanimations === 'undefined') {
                            util.warn('Moderniz missing the "CSS Animations" detection feature! Use a Moderniz version that includes such feature, otherwise rsSlideIt falls back to pure javascript animations.', false);
                        }
                    }

                    opts.initialSlide = data.checkSlideBounds(opts.initialSlide);
                    if (opts.zoomMax < opts.zoomMin) { var sw = opts.zoomMax; opts.zoomMax = opts.zoomMin; opts.zoomMin = sw; }
                    opts.initialZoom = opts.initialZoom < opts.Min ? opts.Min : (opts.initialZoom > opts.Max ? opts.Max : opts.initialZoom);
                    $elem.
                        bind('loadSlide.rsSlideIt', this.onLoadSlide).
                        triggerHandler('loadSlide.rsSlideIt');
                },
                getCaption: function ($slide) {
                    var caption = [];
                    if (opts.selector.caption) {
                        $slide.nextAll().each(function () {
                            var $this = $(this);
                            if ($this.is(opts.selector.caption)) {
                                caption.push($this.html());
                                return true;
                            }
                            return false;
                        });
                    }
                    return caption.length == 0 ? null : caption;
                },
                getTransformInfo: function ($slide, outerSize) {
                    var getTransformFromCSSie = function (msFilter) {
                            var lookup = "progid:dximagetransform.microsoft.matrix(",
                                pos = msFilter.toLowerCase().indexOf(lookup);
                            if (pos > -1) {
                                msFilter = msFilter.substring(pos + lookup.length).toLowerCase().replace(/(m11=|m12=|m21=|m22=| )/g, '');
                                var coefs = msFilter.split(',');
                                // M12 and M21 are swapped in IE
                                msFilter = 'matrix(' + coefs[0] + ', ' + coefs[2] + ', ' + coefs[1] + ', ' + coefs[3] + ')';
                            }
                            return msFilter;
                        },
                        getTransformFromCss = function () {
                            var value;
                            if (data.isIE8orBelow) {
                                value = $slide.css('filter');
                                if (!util.isDefined(value)) {
                                    value = $slide.css('-ms-filter');
                                    if (!util.isDefined(value)) {
                                        return null;
                                    }
                                }
                                value = getTransformFromCSSie(value);
                            } else {
                                value = $slide.css('-webkit-transform');
                                if (!util.isDefined(value)) {
                                    value = $slide.css('-moz-transform');
                                    if (!util.isDefined(value)) {
                                        value = $slide.css('-o-transform');
                                        if (!util.isDefined(value)) {
                                            value = $slide.css('msTransform');
                                            if (!util.isDefined(value)) {
                                                value = $slide.css('transform');
                                            }
                                        }
                                    }
                                }
                            }
                            return !util.isDefined(value) ? null : value;
                        },
                        getTransformFromDataAttr = function () {
                            var value = $slide.attr('data-transform');
                            return !util.isDefined(value) ? null : value;
                        },
                        getMatrixCoefs = function (value) {
                            value = value.replace(/(matrix\(| )/gi, ''); // remove occurences of "matrix(" and " "
                            var coefs = value.split(',');
                            return {
                                m11: util.roundToTrigonometricBounds(util.toFloat(coefs[0])),
                                m12: util.roundToTrigonometricBounds(util.toFloat(coefs[1])),
                                m21: util.roundToTrigonometricBounds(util.toFloat(coefs[2])),
                                m22: util.roundToTrigonometricBounds(util.toFloat(coefs[3]))
                            };
                        },
                        getInvertedScale = function (scale) {
                            return util.isAlmostZero(scale) ? 20000 : (1.0 / scale);
                        },
                        getTransformRotate = function (value) {
                            var found = value.match(/rotate\([-|+]?[\d.]+(deg|rad|grad|turn)\)/i);
                            // try rotate(a)
                            if (found && util.isDefined(found[0])) {
                                var angle = util.getAngleRadians(value.replace(/rotate\(|\)/gi, '')),
                                    sine = Math.sin(angle),
                                    cosine = Math.cos(angle);
                                return { 
                                    id:         transUtil.transID.ROTATE,
                                    valueIdent: 0,
                                    valueInv:   - angle,
                                    matrix:     transUtil.getMatrixRotate(sine, cosine),
                                    matrixInv:  transUtil.getMatrixRotate(- sine, cosine)
                                };
                            }
                            return null;
                        },
                        getTransformSkew = function (value) {
                            // try skewX(x)
                            var found = value.match(/skewX\([-|+]?[\d.]+(deg|rad|grad|turn)\)/i),
                                angle, tangent;
                            if (found && util.isDefined(found[0])) {
                                angle = util.getAngleRadians(value.replace(/skewX\(|\)/gi, ''));
                                tangent = Math.tan(angle);
                                return { 
                                    id:         transUtil.transID.SKEWX, 
                                    valueIdent: 0,
                                    valueInv:   - angle,
                                    matrix:     transUtil.getMatrixSkewX(tangent),
                                    matrixInv:  transUtil.getMatrixSkewX(- tangent)
                                };
                            }
                            // try skewY(y)
                            found = value.match(/skewY\([-|+]?[\d.]+(deg|rad|grad|turn)\)/i);
                            if (found && util.isDefined(found[0])) {
                                angle = util.getAngleRadians(value.replace(/skewY\(|\)/gi, ''));
                                tangent = Math.tan(angle);
                                return { 
                                    id:         transUtil.transID.SKEWY,
                                    valueIdent: 0,
                                    valueInv:   - angle,
                                    matrix:     transUtil.getMatrixSkewY(tangent),
                                    matrixInv:  transUtil.getMatrixSkewY(- tangent)
                                };
                            }

                            // try skew(x,y) -- non standard
                            found = value.match(/skew\([-|+]?[\d.]+(deg|rad|grad|turn),[-|+]?[\d.]+(deg|rad|grad|turn)\)/i);
                            if (found && util.isDefined(found[0])) {
                                util.warn('Slide ' + (container.$slides.index($slide) + 1) + ' contains a non-standard transformation: skew(x,y). Use skewX(x) skewY(y) instead.', true);
                            } else {
                                // try skew(x) -- non standard
                                found = value.match(/skew\([-|+]?[\d.]+(deg|rad|grad|turn)\)/i);
                                if (found && util.isDefined(found[0])) {
                                    util.warn('Slide ' + (container.$slides.index($slide) + 1) + ' contains a non-standard transformation: skew(x). Use skewX(x) instead.', true);
                                }
                            }
                            return null;
                        },
                        getTransformScale = function (value) {
                            var scaleX, scaleY, scaleXInv, scaleYInv,
                                found = value.match(/scale\([-|+]?[\d.]+\)/i);

                            // try scale(s)
                            if (found && util.isDefined(found[0])) {
                                var scale = util.toFloat(value.replace(/scale\(|\)/gi, '')),
                                    scaleInv = getInvertedScale(scale);
                                return { 
                                    id:         transUtil.transID.SCALE, 
                                    valueIdent: 1,
                                    valueInv:   scaleInv,
                                    matrix:     transUtil.getMatrixScale(scale),
                                    matrixInv:  transUtil.getMatrixScale(scaleInv)
                                };
                            }

                            // try scale(x,y)
                            found = value.match(/scale\([-|+]?[\d.]+,[-|+]?[\d.]+\)/i);
                            if (found && util.isDefined(found[0])) {
                                var scales = value.replace(/scale\(|\)/gi, '').split(",");
                                scaleX = util.toFloat(scales[0]);
                                scaleY = util.toFloat(scales[1]);
                                scaleXInv = getInvertedScale(scaleX);
                                scaleYInv = getInvertedScale(scaleY);
                                return {
                                    id:         transUtil.transID.SCALEXY, 
                                    valueIdent: 1,
                                    valueInv:   { x: scaleXInv, y: scaleYInv },
                                    matrix:     transUtil.getMatrixScaleXY(scaleX, scaleY),
                                    matrixInv:  transUtil.getMatrixScaleXY(scaleXInv, scaleYInv)
                                };
                            }        
                            // try scaleX(x)
                            found = value.match(/scaleX\([-|+]?[\d.]+\)/i);
                            if (found && util.isDefined(found[0])) {
                                scaleX = util.toFloat(value.replace(/scaleX\(|\)/gi, ''));
                                scaleXInv = getInvertedScale(scaleX);
                                return { 
                                    id:         transUtil.transID.SCALEX, 
                                    valueIdent: 1,
                                    valueInv:   scaleXInv,
                                    matrix:     transUtil.getMatrixScaleX(scaleX),
                                    matrixInv:  transUtil.getMatrixScaleX(scaleXInv)
                                };
                            }
                            // try scaleY(y)
                            found = value.match(/scaleY\([-|+]?[\d.]+\)/i);
                            if (found && util.isDefined(found[0])) {
                                scaleY = util.toFloat(value.replace(/scaleY\(|\)/gi, ''));
                                scaleYInv = getInvertedScale(scaleY);
                                return { 
                                    id:         transUtil.transID.SCALEY,
                                    valueIdent: 1,
                                    valueInv:   scaleYInv,
                                    matrix:     transUtil.getMatrixScaleY(scaleY),
                                    matrixInv:  transUtil.getMatrixScaleY(scaleYInv)
                                };
                            }
                            return null;
                        },
                        getTransformDefault = function (origin) {
                            return  {
                                origin: { x: origin.x, y: origin.y },
                                ctmMatrix: [1, 0, 0 , 1],
                                transformations: []
                            };
                        },
                        getTransformFromData = function (value, origin) {
                            // remove all spaces and then add a space before each scale, rotate, skew and translate
                            var transfs = value.replace(/ /g, '').replace(/\)scale/g, ') scale').replace(/\)rotate/g, ') rotate').replace(/\)skew/g, ') skew').replace(/\)translate/g, ') translate').split(' '),
                                allTrans = getTransformDefault(origin),
                                cssData;

                            for (var i = 0, len = transfs.length; i < len; ++i) {
                                cssData = null;
                                switch (transfs[i].substring(0, 5)) { // the reason to make a switch on a substring, is just to make the code less verbose, rather than with ifs
                                    case 'rotat':
                                        cssData = getTransformRotate(transfs[i]);
                                        break;
                                    case 'skew(': 
                                        // no need calculate ctmMatrix, because skew() is a non-standard, thus ignored
                                        getTransformSkew(transfs[i]); // however, call the getter just to issue a warning to the user about this
                                        break;
                                    case 'skewX': 
                                    case 'skewY': 
                                        cssData = getTransformSkew(transfs[i]);
                                        break;
                                    case 'scale':
                                        switch (transfs[i].substring(0, 6)) {
                                            case 'scaleX': 
                                            case 'scaleY': 
                                            case 'scale(': 
                                                cssData = getTransformScale(transfs[i]);
                                        }
                                }

                                if (cssData) {
                                    util.multiply2x2Matrices(cssData.matrix, allTrans.ctmMatrix);
                                    allTrans.transformations.push({ 
                                        id: cssData.id,
                                        valueIdent: cssData.valueIdent,
                                        valueInv: cssData.valueInv, 
                                        matrixInv: cssData.matrixInv
                                    });
                                }
                            }
                            return allTrans;
                        },
                        value = getTransformFromDataAttr(),
                        origin = transUtil.getTransformOriginCss($slide, outerSize);

                    if (value == null) {
                        value = getTransformFromCss();
                        if (value == null) {
                            return getTransformDefault(origin);
                        }
                    }
                    if (value.indexOf('matrix(') == 0) {
                        var coefs = getMatrixCoefs(value);
                        if (util.areTheSame(coefs.m11, coefs.m22) && util.areTheSame(coefs.m12, - coefs.m21)) {
                            var angle;
                            if (util.isAlmostZero(coefs.m11, 0.02)) {
                                angle = coefs.m12 > 0 ? Math.PI / 2 : - Math.PI / 2;
                            } else {
                                angle = Math.atan(coefs.m12 / coefs.m11) + (coefs.m11 < 0 ? Math.PI : 0);
                            }
                            var scale = Math.sqrt(coefs.m11 * coefs.m11 + coefs.m12 * coefs.m12),
                                allTrans = getTransformDefault(origin),
                                cosine = Math.cos(angle),
                                sine = Math.sin(angle);
                            scale = util.isAlmostOne(scale) ? 1 : getInvertedScale(scale); // scale is the inverted scale
                            allTrans.ctmMatrix[0] = coefs.m11;
                            allTrans.ctmMatrix[1] = coefs.m12;
                            allTrans.ctmMatrix[2] = coefs.m21;
                            allTrans.ctmMatrix[3] = coefs.m22;

                            if (!util.isAlmostOne(scale)) {
                                allTrans.transformations.push({
                                    id: transUtil.transID.SCALE,
                                    valueIdent: 1,
                                    valueInv: scale,
                                    matrixInv: transUtil.getMatrixScale(scale)
                                });
                            }
                            if (!util.isAlmostZero(angle, 0.000000005)) {
                                allTrans.transformations.push({
                                    id: transUtil.transID.ROTATE,
                                    valueIdent: 0,
                                    valueInv: - angle,
                                    matrixInv: transUtil.getMatrixRotate(- sine, cosine)
                                });
                            }
                            return allTrans;
                        }
                        // CSS matrix is too complex. Need more info from data-transform
                        util.warn('Failed to read transformation style for slide ' + (container.$slides.index($slide) + 1) + ', due to an uneven scaleX and scaleY or to the use of skew.\nDefine your transform style in a data-transform attribute instead.', true);
                        return getTransformDefault(origin);
                    }
                    return getTransformFromData(value, origin);
                },
                onLoadSlide: function (event) {
                    var $slide = container.$slides.eq(load.processedSlides),
                        slideInSlide = load.$slidesInSlides.index($slide) > -1,
                        loadSuccess = function () {
                            loadSuccessExternal(this.complete, this.naturalWidth, this.naturalHeight);
                        },
                        loadSuccessExternal = function (complete, naturalWidth, naturalHeight) {
                            if (complete && typeof naturalWidth != "undefined" && naturalWidth > 0) {
                                load.getOtherSizes(slideSizes, $slide, naturalWidth, naturalHeight);
                                load.processSlide($slide, slideInSlide, slideSizes);
                            } else {
                                // todo
                                load.getOtherSizes(slideSizes, $slide, 1, 1);
                                load.processSlide($slide, slideInSlide, slideSizes);
                            }
                        },
                        loadFailure = function () {
                            load.getOtherSizes(slideSizes, $slide, 1, 1);
                            load.processSlide($slide, slideInSlide, slideSizes);
                        };

                    // IE9 renders a black block, when both -ms-transform and filter are defined. To work around this, need to remove filter
                    if (data.isIE9 && $slide.css('msTransform') != '' && $slide.css('filter') != '') {
                        $slide.css('filter', '');
                    }
                    var isImg = $slide.is('img'),
                        isImgAjax = $slide.is('img[data-src]'),
                        slideSizes = load.getSlideSizes($slide, slideInSlide);
                    if (slideSizes.size.x === 0 || slideSizes.size.y === 0 || isImgAjax && (util.toInt($slide.attr('width')) == 0 || util.toInt($slide.attr('height')) == 0)) { // size is unknown and slide does not contain any valid width/height attribute
                        if (isImg) {
                            if (isImgAjax) { // ajax img without width/height attribute defined
                                load.ajax.doLoad($slide, loadSuccessExternal, loadFailure);
                            } else { // non ajax img without width/height attribute defined
                                $slide.load(loadSuccess).error(loadFailure);
                            }
                        } else {
                            // slides should have a non-zero dimension. In the rare case of zero size element, assume 1x1 instead. This is reasonable workaround. 
                            this.getOtherSizes(slideSizes, $slide, 1, 1);
                            load.processSlide($slide, slideInSlide, slideSizes);
                        }
                    } else {                            
                        load.processSlide($slide, slideInSlide, slideSizes);
                    }
                },
                processSlide: function ($slide, slideInSlide, slideSizes) {
                    load.pushSlideData($slide, slideInSlide, slideSizes);
                    if (++load.processedSlides < data.qtSlides) {
                        $elem.triggerHandler('loadSlide.rsSlideIt');
                    } else {
                        load.setSlidePos();
                    }
                },
                getOtherSizes: function (sizes, $slide, newWidth, newHeight) {
                    if (newWidth > 0) {
                        sizes.size.x = newWidth;
                        sizes.outerSize.x = sizes.size.x + 
                            util.toInt($slide.css('padding-left')) + util.toInt($slide.css('padding-right')) +
                            util.toInt($slide.css('border-left-width')) + util.toInt($slide.css('border-right-width'));
                        sizes.outerSizeAll.x = sizes.outerSize.x + 
                            util.toInt($slide.css('margin-left')) + util.toInt($slide.css('margin-right'));
                    }
                    if (newHeight > 0) {
                        sizes.size.y = newHeight;
                        sizes.outerSize.y = sizes.size.y + 
                            util.toInt($slide.css('padding-top')) + util.toInt($slide.css('padding-bottom')) +
                            util.toInt($slide.css('border-top-width')) + util.toInt($slide.css('border-bottom-width'));
                        sizes.outerSizeAll.y = sizes.outerSize.y + 
                            util.toInt($slide.css('margin-top')) + util.toInt($slide.css('margin-bottom'));
                    }
                },
                getSlideSizes: function ($slide, slideInSlide) {
                    var cssDisplay, ieFilter, ieMsFilter;
                    if (!slideInSlide && opts.layout.cols !== null) {
                        // to get the correct size of blocked elements, need to read it as an inline-block
                        cssDisplay = $slide.css('display');
                        $slide.css('display', 'inline-block');
                    }
                    if (data.isIE8orBelow) {
                        ieFilter = $slide.css('filter');
                        ieMsFilter = $slide.css('-ms-filter');
                        $slide.css({ 'filter': '', '-ms-filter': '' });
                    }
                    var sizes = {
                        outerSize: { x: $slide.outerWidth(), y: $slide.outerHeight() },
                        outerSizeAll: { x: $slide.outerWidth(true), y: $slide.outerHeight(true) },
                        size: { x: $slide.width(), y: $slide.height() }
                    };
                    if (sizes.size.x == 0 || sizes.size.y == 0) {
                        // $slide.width() does not return width for ajax images in some browsers. Get the width from the img attribute, if available.
                        this.getOtherSizes(sizes, $slide, util.toInt($slide.attr('width')), util.toInt($slide.attr('height')));
                    }
                    if (data.isIE8orBelow) {
                        $slide.css({ 'filter': ieFilter, '-ms-filter': ieMsFilter });
                    }
                    if (!slideInSlide && opts.layout.cols !== null) {
                        // restore the original display
                        $slide.css('display', cssDisplay);
                    }
                    return sizes;
                },
                pushSlideData: function ($slide, slideInSlide, slideSizes) {
                    var cssTransforms = load.getTransformInfo($slide, slideSizes.outerSize),
                        contRectOuter = transUtil.getTransformedRect(slideSizes.outerSize, cssTransforms.ctmMatrix, cssTransforms.origin),
                        contRectOuterAll = transUtil.getTransformedRect(slideSizes.outerSizeAll, cssTransforms.ctmMatrix, cssTransforms.origin);

                    data.slideData.push({
                        // pos and centerTrans are computed later
                        pos: { x: 0, y: 0 },
                        center: { // center of element, with origin pointing to this element's topleft
                            x: slideSizes.outerSize.x / 2,
                            y: slideSizes.outerSize.y / 2
                        },
                        centerTrans: { x: 0, y: 0 }, // same as center but with transformations applied and origin set to transDiv topleft
                        centerTransParent: { x: 0, y: 0 }, // centerTrans transformed to the parent CTM (container.$transDiv) with a (0, 0) center
                        sizeTrans: {
                            x: Math.round(contRectOuter.bottomRight.x - contRectOuter.topLeft.x),
                            y: Math.round(contRectOuter.bottomRight.y - contRectOuter.topLeft.y)
                        },
                        sizeTransAll: {
                            x: Math.round(contRectOuterAll.bottomRight.x - contRectOuterAll.topLeft.x),
                            y: Math.round(contRectOuterAll.bottomRight.y - contRectOuterAll.topLeft.y)
                        },
                        topLeftTrans: {
                            left: contRectOuterAll.topLeft.x,
                            top: contRectOuterAll.topLeft.y
                        },
                        size: {
                            x: slideSizes.size.x,
                            y: slideSizes.size.y
                        },
                        outerSize: {
                            x: slideSizes.outerSize.x,
                            y: slideSizes.outerSize.y
                        },
                        padding: [util.toInt($slide.css('padding-top')), util.toInt($slide.css('padding-right')), util.toInt($slide.css('padding-bottom')), util.toInt($slide.css('padding-left'))],
                        caption: load.getCaption($slide),
                        cssTransforms: cssTransforms
                    });
                },
                setSlidePos: function () {
                    var col = row = 0,
                        needNewRow = false,
                        justifySlide = {
                            x: opts.layout.cols !== null && opts.layout.horizAlign && (opts.layout.horizAlign == 'left' || opts.layout.horizAlign == 'center' || opts.layout.horizAlign == 'right'),
                            y: opts.layout.cols !== null && opts.layout.vertAlign && (opts.layout.vertAlign == 'top' || opts.layout.vertAlign == 'center' || opts.layout.vertAlign == 'bottom')
                        },
                        maxWidthInCol = [],
                        maxHeightInRow = [],
                        $slide, slideInSlide, slideData,
                        changeRow = function (col) {
                            return opts.layout.cols !== null && (col % opts.layout.cols === 0);
                        };
                        
                    if (justifySlide.x || justifySlide.y) {
                        for (var i = 0; i < data.qtSlides; ++i) {
                            $slide = container.$slides.eq(i);
                            slideInSlide = load.$slidesInSlides.index($slide) > -1;
                            slideData = data.slideData[i];

                            if (!slideInSlide && needNewRow) {
                                ++row;
                            }

                            if (!slideInSlide) {
                                if (justifySlide.x) {
                                    if (col === maxWidthInCol.length) {
                                        maxWidthInCol.push(slideData.sizeTransAll.x);
                                    } else {
                                        maxWidthInCol[col] = Math.max(maxWidthInCol[col], slideData.sizeTransAll.x);
                                    }
                                }

                                if (justifySlide.y) {
                                    if (row === maxHeightInRow.length) {
                                        maxHeightInRow.push(slideData.sizeTransAll.y);
                                    } else {
                                        maxHeightInRow[row] = Math.max(maxHeightInRow[row], slideData.sizeTransAll.y);
                                    }
                                }

                                needNewRow = changeRow(++col);
                                if (needNewRow) {
                                    col = 0;
                                }
                            }
                        }
                    }

                    if (opts.layout.cols !== null) {
                        // non slides that are blocked, should float in order to not interfere with space available
                        container.$transDiv.children().not(container.$slides).filter(function (index) {
                            return $(this).css('display') === 'block';
                        }).css('float', 'left');
                    }
                    
                    container.resetMaxSize();
                    container.$transDiv.css({ 'width': '500000px', 'height': '500000px' }); // (ugly) workaround that allows $.position() return correct values in some older browsers. This dimension is correctly set after the following for loop.
                    var maxHeight = 0, previousWasBlocked = false, parentSlideIdx = -1, diff, offset = { x: 0, y: 0 }, slidePos;
                    needNewRow = false;
                    col = row = 0;
                    for (var i = 0; i < data.qtSlides; ++i) {
                        $slide = container.$slides.eq(i);
                        slideInSlide = load.$slidesInSlides.index($slide) > -1;
                        slideData = data.slideData[i];

                        // to prevent the default behaviour in IE when dragging an element
                        $slide[0].ondragstart = $slide[0].onselectstart = function () { return false; };

                        if (slideInSlide && parentSlideIdx != -1) {
                            $slide.css('position', 'absolute');
                            slideData.pos.x = data.slideData[parentSlideIdx].pos.x + $slide.position().left;
                            slideData.pos.y = data.slideData[parentSlideIdx].pos.y + $slide.position().top;
                            $slide.css({
                                'left': slideData.pos.x + 'px',
                                'top': slideData.pos.y + 'px'
                            });
                        } else {
                            var isBlocked = $slide.css('display') === 'block';
                            if (i > 0 && opts.layout.cols === null && 
                                    (isBlocked || // current element is blocked, so need new row
                                     previousWasBlocked)) { // previous element was blocked (occupies all row), so now need new row
                                needNewRow = true;
                            }
                            previousWasBlocked = isBlocked;
                            if (needNewRow) {
                                ++row;
                                offset.y = (opts.layout.cols === null ? 0 : offset.y) + maxHeight;
                                offset.x = maxHeight = col = 0;
                            }

                            slideData.pos.x = opts.layout.cols === null ? $slide.position().left : offset.x;
                            if (justifySlide.x) {
                                diff = maxWidthInCol[col] - slideData.sizeTransAll.x;
                                if (diff !== 0) {
                                    slideData.pos.x += opts.layout.horizAlign == 'center' ? diff / 2: (opts.layout.horizAlign == 'left' ? 0 : diff);
                                }
                                offset.x += maxWidthInCol[col];
                            } else {
                                offset.x = Math.max(offset.x, slideData.pos.x + slideData.sizeTransAll.x);
                            }
                            slideData.pos.x -= slideData.topLeftTrans.left;

                            slideData.pos.y = opts.layout.cols === null ? $slide.position().top : offset.y;
                            if (justifySlide.y) {
                                diff = maxHeightInRow[row] - slideData.sizeTransAll.y;
                                if (diff !== 0) {
                                    slideData.pos.y += opts.layout.vertAlign == 'center' ? diff / 2 : (opts.layout.vertAlign == 'top' ? 0 : diff);
                                }
                                maxHeight = Math.max(maxHeight, maxHeightInRow[row]);
                            } else {
                                maxHeight = Math.max(maxHeight, slideData.pos.y + slideData.sizeTransAll.y);
                            }
                            slideData.pos.y -= slideData.topLeftTrans.top;

                            // In non IE browsers, when you set the position of some element that has some transformations applied, you are really setting
                            // the position of the untransformed version of that element. However, the getter $elem.position() returns the top/left of the 
                            // transformed element, i.e., the getter returns the "real" transformed coordinates, the setter sets the position before the 
                            // element is transformed.

                            // In IE, when you set the position of some element that has some transformations applied, the getter returns the same position.
                            // Both getter and setter return the same position.

                            if (opts.layout.cols !== null) {
                                $slide.css({
                                    'position': 'absolute',
                                    'left': (slideData.pos.x + (data.isIE8orBelow ? slideData.topLeftTrans.left : 0)) + 'px',
                                    'top': (slideData.pos.y + (data.isIE8orBelow ? slideData.topLeftTrans.top : 0)) + 'px'
                                });
                            } else {
                                if (isBlocked) {
                                    $slide.css({
                                        'width': slideData.sizeTrans.x + 'px',
                                        'height': slideData.sizeTrans.y + 'px'
                                    });
                                }
                            }
                            needNewRow = changeRow(++col);
                            parentSlideIdx = i;
                        }

                        slidePos = $slide.position();
                        if (data.isMozilla11orBelow) {
                            // Mozilla (up to 11.0b8) returns incorrect position for transformed elements, so there is a need to make an adjustment
                            var correctedPos = transUtil.getTransformedRect(slideData.size, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin);
                            slidePos.left += correctedPos.topLeft.x;
                            slidePos.top += correctedPos.topLeft.y;
                        }
                        container.setMaxSize(slideData.pos.x + slideData.sizeTransAll.x + slideData.topLeftTrans.left, 
                                             slideData.pos.y + slideData.sizeTransAll.y + slideData.topLeftTrans.top);
                        slideData.centerTrans = transUtil.getTransformedPoint(slideData.center, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin);
                        var topLeftOuter = transUtil.getTransformedRect(slideData.outerSize, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin).topLeft;
                        slideData.centerTrans.x = Math.round(slideData.centerTrans.x + slidePos.left - topLeftOuter.x + util.toInt($slide.css('margin-left')));
                        slideData.centerTrans.y = Math.round(slideData.centerTrans.y + slidePos.top - topLeftOuter.y + util.toInt($slide.css('margin-top')));
                        slideData.center.x = Math.round(slideData.center.x + slideData.pos.x);
                        slideData.center.y = Math.round(slideData.center.y + slideData.pos.y);
                    }

                    container.$transDiv.css({
                        // 50 is a gap necessary - when cols is null - to avoid static slide reposition when zoom out is very large
                        'width': Math.floor(container.size.x + (opts.layout.cols === null ? 50 : 0)) + 'px',
                        'height': Math.floor(container.size.y + (opts.layout.cols === null ? 50 : 0)) + 'px'
                    });
                    container.setSizeForIE();

                    if (data.qtSlides > 0) {
                        zoomUtil.initZoom(opts.initialZoom, opts.zoomMin, opts.initialSlide);
                        data.gotoSlide(opts.initialSlide);
                        zoomUtil.calcLongestPath();
                        $elem.triggerHandler('create.rsSlideIt');
                        load.ajax.doLoad();
                    } else {
                        $elem.triggerHandler('create.rsSlideIt');
                    }
                },
                ajax: {
                    slidesArray: null,
                    toProcess: 0,
                    quant: 0,
                    init: function () {
                        this.slidesArray = $.makeArray(container.$slides.filter($('img[data-src]')));
                        this.toProcess = this.quant = this.slidesArray.length;
                    },
                    doLoad: function ($loadThisSlide, successEvent, failureEvent) {
                        var doAjax = function ($slide) {
                            $slide.load(function () {
                                var success = this.complete && typeof this.naturalWidth != "undefined" && this.naturalWidth > 0;
                                $elem.triggerHandler('ajaxLoadSlide.rsSlideIt', [$slide, load.ajax.quant - load.ajax.toProcess + 1, success]);
                                if (--load.ajax.toProcess == 0) {
                                    $elem.triggerHandler('ajaxLoadEnd.rsSlideIt');
                                }
                                if (successEvent) {
                                    successEvent(this.complete, this.naturalWidth, this.naturalHeight);
                                }
                            }).error(function () {
                                $elem.triggerHandler('ajaxLoadSlide.rsSlideIt', [$slide, load.ajax.quant - load.ajax.toProcess + 1, false]);
                                if (--load.ajax.toProcess == 0) {
                                    $elem.triggerHandler('ajaxLoadEnd.rsSlideIt');
                                }
                                if (failureEvent) {
                                    failureEvent();
                                }
                            }).attr('src', $slide.attr('data-src'));
                        };
                        
                        if (this.quant > 0) {
                            if (this.toProcess == this.quant) {
                                $elem.triggerHandler('ajaxLoadBegin.rsSlideIt', [this.quant]);
                            }
                            if (!!$loadThisSlide) {
                                var idx = this.slidesArray.indexOf($loadThisSlide[0]);
                                if (idx > -1) {
                                    this.slidesArray[idx] = null;
                                }
                                doAjax($loadThisSlide);
                                
                            } else {
                                for(var i = 0; i < this.quant; ++i) {
                                    var slide = this.slidesArray[i];
                                    if (slide) {
                                        doAjax($(slide));
                                    }
                                }
                            }
                        }
                    }
                }
            };

        load.init();
    };

    $.fn.rsSlideIt = function (options) {
        var transitionTo = function (optionsGoto) {
            var optsGoto = $.extend({}, $.fn.rsSlideIt.defaultsTransition, optionsGoto);

            return this.each(function () {
                $(this).trigger('singleTransition.rsSlideIt', [optsGoto]);
            });
        },
        playPause = function (optionsSequence) {
            var optsSequence = $.extend({}, $.fn.rsSlideIt.defaultsPlayPause, optionsSequence);

            return this.each(function () {
                $(this).trigger('playPause.rsSlideIt', [optsSequence]);
            });
        },
        stop = function () {
            return this.each(function () {
                $(this).trigger('stop.rsSlideIt');
            });
        },
        option = function (options) {
            if (typeof arguments[0] === 'string') {
                var op = arguments.length == 1 ? 'getter' : (arguments.length == 2 ? 'setter' : null);
                if (op) {
                    return this.eq(0).triggerHandler(op + '.rsSlideIt', arguments);
                }
            }
        };

        if (typeof options === 'string') {
            var otherArgs = Array.prototype.slice.call(arguments, 1);
            switch (options) {
                case 'transition': return transitionTo.apply(this, otherArgs);
                case 'playPause': return playPause.apply(this, otherArgs);
                case 'stop': return stop.call(this);
                case 'option': return option.apply(this, otherArgs);
                default: return this;
            }
        }
        var opts = $.extend({}, $.fn.rsSlideIt.defaults, options);
        opts.layout = $.extend({}, $.fn.rsSlideIt.defaults.layout, options ? options.layout : options);
        opts.selector = $.extend({}, $.fn.rsSlideIt.defaults.selector, options ? options.selector : options);
        opts.events = $.extend({}, $.fn.rsSlideIt.defaults.events, options ? options.events : options);

        return this.each(function () {
            new SlideItClass($(this), opts);
        });
    };
    $.fn.rsSlideIt.state = {
        STOP: 0, // no transitions are currently running and user is free to navigate around
        PLAY: 1, // slide show is running, which stops the user from navigating around
        PAUSE: 2 // slide show is paused and another click to Play/Pause button will resume the slide show from the current point. User can navigate around (if userInteract is true).
    };


    // public access to the default input parameters
    $.fn.rsSlideIt.defaults = {
        zoomMin: 0.4,           // Minimum zoom possible. Type: floating point number.
        zoomStep: 0.1,          // Value incremented to the current zoom, when mouse wheel moves up. When mouse wheel moves down, current zoom is decremented by this value.
                                // To reverse direction, use negative zoomStep. To disable zoom on mouse wheel, do not set zoomStep to zero, but set mouseZoom to false instead. Type: floating point number.
        zoomMax: 15,            // Maximun zoom possible. Type: floating point number.
        initialSlide: 0,        // Active slide when plugin is initialized. Type: zero-based integer.
        initialZoom: 1,         // Scale used when plugin is initialized.
                                // Positive real number or 'fitWidth' or 'fitHeight' or 'fit' or 'cover'. Type: positive floating point number or string.
                                
        mouseZoom: true,        // Determines whether mouse wheel is used to zoom in/out. Type: boolean.
        mousePan: true,         // Determines whether mouse panning is allowed. Type: boolean.
        layout: {
            width: null,            // Container width in pixels. If null then uses the width defined in CSS. Type: integer.
            height: null,           // Container height in pixels. If null then uses the height defined in CSS. Type: integer.
            cols: 0,                // Layouts all slides in this number of columns, in a rightwards and downwards direction.
                                    // Use zero to layout all slides in one row; Use null to ignore slide layout and use the positioning set by CSS. Type: positive integer.
            horizAlign: null,       // Slide horizontal justification 'left', 'center' or 'right'. Ignored if cols is null. Type: string.
            vertAlign: null         // Slide vertical justification 'top', 'center' or 'bottom'. Ignored if cols is null. Type: string.
        },
        selector: {
            slide: 'img',           // jQuery selector string for all slide elements. Type: string.
            caption: '.caption',    // jQuery selector string for all text elements for each slide. Type: string.
            slideInSlide: null,     // jQuery selector string for all child slides inside a parent slide. Type: string.
            elementsOnTop: null     // jQuery selector string for the elements on top of the container element (if any). Type: string.
        },
        events: {
            onCreate: null,                 // Fired when plug-in has been initialized. Type: function (event).
            onAjaxLoadBegin: null,          // Fired before starting to make ajax requests. Type: function (event, qtTotal).
            onAjaxLoadSlide: null,          // Fired after an ajax response has been received successfully or unsuccessfully. Type: function (event, $ajaxSlide, index, success).
            onAjaxLoadEnd: null,            // Fired after all ajax responses have been received (immediately after the last onAjaxLoadSlide). Type: function (event).
            onChangeZoom: null,             // Fired when zoom changes, due to mouse wheel actions or by transitions. Type: function (event, zoom).
            onBeginPan: null,               // Fired when the user starts to pan around. Type: function (event).
            onEndPan: null,                 // Fired when the user finishes to pan around. Type: function (event).
            onSelectSlide: null,            // Fired when a slide that was unselected becomes selected. Type: function (event, $slide, index, caption).
            onUnselectSlide: null,          // Fired when a slide that was selected becomes unselected. Type: function (event, $slide, index).
            onClickSlide: null,             // Fired when a slide receives a single mouse click. Type: function (event, $slide, index).
            onDblClickSlide: function (event, $slide, index) { // Fired when a slide receives a double mouse click. Type: function (event, $slide, index).
                $(event.target).rsSlideIt('transition', {   // Custom onDblClickSlide defined by default.
                    slide: index,
                    zoomDest: 'fit'
                });
            }
        }
    };

    
    // Default options for the 'transition' method.
    $.fn.rsSlideIt.defaultsTransition = {
        slide: 'next',          // zero-based positive integer or 'prev' or 'next' or 'first' or 'last'. Type: positive integer or string.
        duration: 'normal',     // duration in milliseconds or a jQuery string alias. Type: positive integer or string.
        zoomDest: 1,            // positive real number or 'current' or 'fitWidth' or 'fitHeight' or 'fit' or 'cover'. Type: positive floating point number or string.
        zoomVertex: 'linear',   // positive real number or 'out' or 'in' or 'linear'. Type: positive floating point number or string.
        easing: 'swing',        // Easing function (@see http://api.jquery.com/animate/#easing). Type: string.
        onBegin: null,          // event handler called when this transition starts to run. Type: function(event, fromSlide, toSlide)
        onEnd: null             // event handler called when this transition is completed. Type: function(event, fromSlide, toSlide)
    };

    // Default options for the 'playPause' method.
    $.fn.rsSlideIt.defaultsPlayPause = {
        sequence: 'next',       // Type: array of positive integers or a string 'prev' or a string 'next'
        delayOnSlide: 2000,     // positive integer or string or array of positive integers/strings.
        zoomDest: 1,            // positive real number or 'current' or 'fitWidth' or 'fitHeight' or 'fit' or 'cover' or an array of positive real numbers and strings
        zoomVertex: 'linear',   // positive real number or 'out' or 'in' or 'linear' or an arrays of positive real numbers and strings
        easing: 'swing',        // Easing function used in transitions (@see http://api.jquery.com/animate/#easing). Type: string or array of strings.
        duration: 600,          // positive integer or string or array of positive integers/strings.
        repeat: 'forever',      // positive integer or 'forever'
        userInteract: true,     // true: user can zoom and pan when slide is standing still; false: otherwise 
        onPlay: null,           // Fired when the sequence starts to run
        onStop: null,           // Fired when the whole sequence is completed (only if repeat is not 'forever')
        onPause: null,          // Fired when the sequence pauses in a specific slide
        onBeginTrans: null,     // Fired when the transition within the sequence starts to run
        onEndTrans: null,       // Fired when the transition within the sequence is completed
        onBeginDelay: null,     // Fired when slideshow pauses for some time on a specific slide. Type: function(event, slide, delay)
        onEndDelay: null        // Fired when the delay performed on a specific slide has finished. Type: function(event, slide)
   };

})(jQuery);