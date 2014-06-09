/**
* jQuery SliteIt - Displays a CSS3 slide show with a JS fallback.
* ===============================================================
*
* Licensed under The MIT License
* 
* @version   2 
* @author    Jose Rui Santos
*
* For info, please scroll to the bottom.
*/
(function ($, undefined) {
    var SlideItClass = function ($viewport, opts) {
        var data = {
                $elemsOnTop: $(opts.selector.elementsOnTop),
                $viewportAndTops: null,
                slideData: [],
                qtSlides: 0,
                supportsCSSAnimation: true, //(typeof Modernizr !== 'undefined') && !!Modernizr.cssanimations,
                supportsCSSTransforms3D: true, //(typeof Modernizr !== 'undefined') && !!Modernizr.csstransforms3d,
                isIE8orBelow: false,
                isIE9: false,
                isMozilla11orBelow: false,
                activeSlide: {
                    $slide: null,
                    index: -1
                },
                init: function () {
                    this.qtSlides = viewport.world.$slides.length;
                    this.$viewportAndTops = $viewport.add(this.$elemsOnTop);

                    // to prevent the default behaviour in IE when dragging an element
                    this.$viewportAndTops.add(viewport.world.$elem).add(viewport.world.$slides).each(function () {
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
                gotoSlide: function (slide) {
                    transUtil.setActiveSlide(slide);
                    viewport.world.$elem.css(transUtil.getTransformCSS());
                    if (seqData.userInteract) {
                        events.bindMouseEvents();
                    }
                }
            },
            
            viewport = {
                world: {
                    $elem: null,                // this element is create dynamically as the child element of $viewport. World.$elem is the parent of all $slides
                    IEorigSize: { x: 0, y: 0 }, // IE needs to compute based on untransformed (original) viewport size
                    $slides: null,              // set with all slide elements
                    setFinalSize: function () {
                        this.IEorigSize.x = this.$elem.width();
                        this.IEorigSize.y = this.$elem.height();
                    },
                    init: function () {
                        $viewport.wrapInner('<div/>');
                        this.$elem = $('div:eq(0)', $viewport);
                        this.$elem.css({
                            'position': 'absolute',
                            'z-index': 0 // fix for IE8 standards mode that, without this z-index, cannot transform child elements
                        })
                        this.$slides = $(opts.selector.slide, this.$elem);
                    }
                },
                center: { x: 0, y: 0 },
                setCenterPos: function () {
                    this.center.x = $viewport.width() / 2;
                    this.center.y = $viewport.height() / 2;
                },
                init: function () {
                    if (!!opts.width) { $viewport.css('width', opts.width); }
                    if (!!opts.height) { $viewport.css('height', opts.height); }
                    $viewport.css('overflow', 'hidden').scrollLeft(0).scrollTop(0);
                    this.setCenterPos();
                    this.world.init();
                }
            },

            // TODO check code
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
                                $viewport.trigger('transition.rsSlideIt', [transData]);
                                
                            } else {
                                switch (seqData.state) {
                                    case $.fn.rsSlideIt.state.PLAY:
                                        seqData.state = $.fn.rsSlideIt.state.STOP; // no break here
                                    case $.fn.rsSlideIt.state.STOP:
                                        if (transData.inputOpts.onStop) {
                                            transData.inputOpts.onStop();
                                        }
                                        if (!seqData.userInteract) {
                                            events.bindMouseEvents();
                                        }
                                        transData.reset();
                                }
                            }
                        };

                        if (seqData.state !== $.fn.rsSlideIt.state.PAUSE && !seqData.userInteract) {
                            events.unbindMouseEvents();
                        }
                        transData.onEndTransSlideShow();
                    };

                    if (transData.inputOpts.onPlay) {
                        transData.inputOpts.onPlay();
                    }
                    runTransition();
                }
            },
            
            // TODO check code
            transData = { // data for the current transition that is running
                // Moving from slide A to slide B
                // ==============================
                // data structure:
                //   transfA is the CTM matrix composed of all slide A matrix transformations
                //   transfB is the CTM matrix composed of all slide B matrix transformations
                //   invTransfA is the inversed transfA, i.e, invTransfA * transfA = identity matrix (I)
                //   invTransfB is the inversed transfB, i.e, invTransfB * transfB = identity matrix (I)
                // 
                // Hereafter "world" means the $viewport only child element, that contains all the slides. 
                // In the initial state, when slide A is shown, the world has the invTransfA applied.
                // For a smoother animation to be possible, while the animation moves from slide A to slide B,
                // the world matrix "morphs" progressively from invTransfA to invTransfB.
                // In other words, during the course of transition from A to B, the invTransfA moves towards an identity matrix,
                // and the invTransfB moves from an identity matrix towards an invTransfB. 
                anim: {
                    $obj: null,
                    requestIdAnimationFrame: null,
                    progress: 0, // 0 <= progress <= 1
                    centerPnt: { x: 0, y: 0, z: 0 }, // the world transform origin. This value changes during a transition from slide A to B
                    transfsFadeToIdentity: [],
                    gotoSlideIdx: 0,
                    progressPausedOn: null,
                    zoomCoefs: null,
                    start: function (center) {
                        this.progress = 0;
                        this.centerPnt.x = center.x;
                        this.centerPnt.y = center.y;
                        this.centerPnt.z = center.z;
                    },
                    setLastStep: function () {
                        for (var i = this.transfsFadeToIdentity.length - 1; i > -1; --i) {
                            var transformation = this.transfsFadeToIdentity[i];
                            transformation.lastStep = util.interpolate(transformation.lastStep, 0, this.progress);
                        }
                        transData.animating = true;
                    },
                    pushTransformations: function (transformationsArray, interruptedDuringTransition) {
                        var easingFunc = !!transData.prevEasing ? $.easing[transData.prevEasing] : null,
                            value = interruptedDuringTransition ? this.progress : 1,
                            valueWithEasing = !!easingFunc ? easingFunc(value, transData.prevDuration * value, 0, 1, transData.prevDuration) : value,
                            funcCoefs = util.getLinear({ x: value, y: valueWithEasing }, { x: 0, y: 0 });
                            
                        for (var i = transformationsArray.length - 1; i > -1; --i) {
                            var transformation = transformationsArray[i];
                            this.transfsFadeToIdentity.unshift({ 
                                id:          transformation.id,
                                valueIdent:  transformation.valueIdent,
                                valueInv:    transformation.valueInv, 
                                lastStep:    value,
                                linearCoefs: funcCoefs
                            });
                        }
                    },
                    clearTransformations: function () {
                        this.transfsFadeToIdentity = [];
                    },
                    interrupt: function () {
                        // stops js request frame animation
                        if (this.requestIdAnimationFrame !== null) {
                            var cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame
                            if (cancelAnimationFrame) {
                                cancelAnimationFrame(this.requestIdAnimationFrame);
                            }
                            this.requestIdAnimationFrame = null;
                        }

                        // stops js animate() animation
                        if (this.$obj !== null) {
                            this.$obj.stop(); 
                        }
                        transUtil.activeSlideCTMmatrix = util.getInvertedMatrix(transUtil.cache.matrixCTM);
                        util.multiplyMatrices(zoomUtil.getMatrixUserZoom(zoomUtil.zoom), transUtil.activeSlideCTMmatrix); // remove the user zoom
                        if (data.isIE8orBelow) {
                            transUtil.trans.x = viewport.center.x - transUtil.orig.x;
                            transUtil.trans.y = viewport.center.y - transUtil.orig.y;
                            transUtil.activeSlideCenterTrans.x = transUtil.orig.x;
                            transUtil.activeSlideCenterTrans.y = transUtil.orig.y;
                            transUtil.cache.refresh();
                            transUtil.adjustTransIE(transUtil.orig);
                        }
                        if (seqData.state == $.fn.rsSlideIt.state.STOP) {
                            transUtil.activeSlideIndex = this.gotoSlideIdx;
                        }
                        transData.finished(true, true);
                    },
                    computeIntermediateMatrix: function (now, doEasing, toTransformations, noCalcInvMatrix, calcZoomValue) {
                        // doEasing is false for JS animations, because the $.animate() already takes care of easing.
                        // doEasing is true for CSS3 animations, since the easing needs to be handled manually
                        var i, transformation, interpolateFactor, value, userZoom;
                        // from slide matrix to identity
                        transUtil.cache.matrixCTM = transUtil.getMatrixIdentity();
                        for (i = this.transfsFadeToIdentity.length - 1; i > -1; --i) {
                            transformation = this.transfsFadeToIdentity[i];
                            
                            interpolateFactor = util.interpolate(transformation.lastStep, 0, now);
                            if (doEasing) {
                                interpolateFactor = util.getQuadraticValue(transformation.linearCoefs, interpolateFactor);
                            }
                            value = transformation.id == transUtil.transID.SCALEXY ? 
                                util.interpolatePoint({ x: transformation.valueIdent, y: transformation.valueIdent }, transformation.valueInv, interpolateFactor) :
                                util.interpolate(transformation.valueIdent, transformation.valueInv, interpolateFactor);
                            util.multiplyMatrices(transUtil.getMatrix(transformation.id, value), transUtil.cache.matrixCTM);
                        }

                        var nowWithEasing = doEasing ? $.easing[transData.easing](now, transData.duration * now, 0, 1, transData.duration) : now;
                        // from identity to slide matrix
                        for (i = toTransformations.length - 1; i > -1; --i) {
                            transformation = toTransformations[i];

                            value = transformation.id == transUtil.transID.SCALEXY ? 
                                util.interpolatePoint({ x: transformation.valueIdent, y: transformation.valueIdent }, transformation.valueInv, nowWithEasing) :
                                util.interpolate(transformation.valueIdent, transformation.valueInv, nowWithEasing);
                            util.multiplyMatrices(transUtil.getMatrix(transformation.id, value), transUtil.cache.matrixCTM);
                        }

                        userZoom = !!calcZoomValue ? util.getQuadraticValue(transData.anim.zoomCoefs, nowWithEasing) : zoomUtil.zoom;
                        util.multiplyMatrices(zoomUtil.getMatrixUserZoom(userZoom), transUtil.cache.matrixCTM);
                        util.roundMatrixToTrigonometricBounds(transUtil.cache.matrixCTM);

                        if (!noCalcInvMatrix) {
                            transUtil.cache.matrixCTM_inv = util.getInvertedMatrix(transUtil.cache.matrixCTM);
                        }
                        return userZoom;
                    }
                },

                cssAnim: {
                    $styleObj: null,
                    startTime: 0,
                    totalTime: 0,
                    intervalId: null,
                    getFrames: function (fromCenterTrans, toCenterTrans, toTransformations, easing, durationMs) {
                        var css = '', animEasingFunc, animValue,
                            addMatrix = function (orig) {
                                return 'XXtransform:matrix('
                                    + transUtil.cache.matrixCTM.slice(0, 2) + ','
                                    + transUtil.cache.matrixCTM.slice(3, 5) + ','
                                    + (viewport.center.x - orig.x).toFixed(2) + ','
                                    + (viewport.center.y - orig.y).toFixed(2) + ') translate3d(0,0,0);}\n';
                            },
                            addMatrix3D = function (orig) {
                                return 'XXtransform:matrix3d('
                                    + transUtil.cache.matrixCTM.slice(0, 3) + ',0,'
                                    + transUtil.cache.matrixCTM.slice(3, 6) + ',0,'
                                    + transUtil.cache.matrixCTM.slice(6, 9) + ',0,'
                                    + (viewport.center.x - orig.x).toFixed(2) + ','
                                    + (viewport.center.y - orig.y).toFixed(2) + ','
                                    + (- orig.z).toFixed(2) + ',1);}\n';
                            },
                            doAddMatrix = data.supportsCSSTransforms3D ? addMatrix3D : addMatrix;

                        for (var anim = 0; anim < 1.005; anim += 0.01) {
                            animValue = transData.anim.progressPausedOn !== null ? util.interpolate(transData.anim.progressPausedOn, 1, anim) : anim;
                            transData.anim.computeIntermediateMatrix(animValue, true, toTransformations, true, true);

                            animEasingFunc = $.easing[easing];
                            var orig = util.interpolatePoint(fromCenterTrans, toCenterTrans, animEasingFunc ? animEasingFunc(anim, durationMs*anim, 0, 1, durationMs) : anim);
                            // XX is a mask that will be replaced by a css prefix
                            css += Math.round(anim*100) + '% {XXtransform-origin: ' + orig.x.toFixed(0) + 'px ' + orig.y.toFixed(0) + 'px ' + orig.z.toFixed(0) + 'px; ' +
                                doAddMatrix(orig);
                        }
                        transUtil.cache.matrixCTM_inv = util.getInvertedMatrix(transUtil.cache.matrixCTM);
                        return css;
                    },
                    interrupt: function () {
                        this.totalTime += +new Date() - this.startTime;
                        transData.anim.progress = this.totalTime / transData.prevDuration;
                        transData.anim.progress = transData.anim.progress > 1 ? 1 : transData.anim.progress;
                        var animEasingFunc = $.easing[transData.easing],
                            animEasing = !!animEasingFunc ? animEasingFunc(transData.anim.progress, transData.prevDuration * transData.anim.progress, 0, 1, transData.prevDuration) : transData.anim.progress;
                        zoomUtil.zoom = util.getQuadraticValue(transData.anim.zoomCoefs, animEasing);
                        events.cssEndZoomEvents();
                        transData.anim.computeIntermediateMatrix(transData.anim.progress, true, data.slideData[transData.anim.gotoSlideIdx].cssTransforms.transformations);

                        transData.anim.centerPnt = transUtil.getTransformOriginCss(viewport.world.$elem);
                        transUtil.trans.x = viewport.center.x - transData.anim.centerPnt.x;
                        transUtil.trans.y = viewport.center.y - transData.anim.centerPnt.y;
                        transUtil.setTransformOrigin(transData.anim.centerPnt.x, transData.anim.centerPnt.y);

                        transUtil.activeSlideCTMmatrix = util.getInvertedMatrix(transUtil.cache.matrixCTM);
                        util.multiplyMatrices(zoomUtil.getMatrixUserZoom(zoomUtil.zoom), transUtil.activeSlideCTMmatrix); // remove the user zoom
                        
                        if (transData.isThisPartOfSlideShow()) {
                            this.resetCSSanimation();
                        }
                        if (seqData.state == $.fn.rsSlideIt.state.STOP) {
                            transUtil.activeSlideIndex = transData.anim.gotoSlideIdx;
                        }
                        transData.finished(true, true);
                    },
                    resetCSSanimation: function () {
                        viewport.world.$elem.css(transUtil.getTransformCSSstyle()).css({
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
                prevEasing: null,
                easing: null,
                onBegin: null,                  // user event for begin standalone transition
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
                    this.prevEasing = this.easing = seqData.qt.easings == 0 ? this.inputOpts.easing : this.inputOpts.easing[seqData.idx % seqData.qt.easings];
                },
                
                interrupt: function () {
                    data.supportsCSSAnimation ? this.cssAnim.interrupt() : this.anim.interrupt();
                },
                
                finished: function (finishedWithAnimation, interrupted) {
                    var done = function () {
                        if (seqData.timeoutId) {
                            $viewport.triggerHandler('endDelay.rsSlideIt', [transData.anim.gotoSlideIdx]);
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
                                $viewport.triggerHandler('beginDelay.rsSlideIt', [this.anim.gotoSlideIdx, delay]);
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
                                events.unbindMouseEvents();
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
                            events.unbindMouseEvents();
                        }
                        this.anim.gotoSlideIdx = util.getSlideIdx(optsTrans.slide);
                    }

                    // if user is currently panning around when transition kicks in, then stop panning
                    panUtil.stopImmediately();
                    viewport.setCenterPos();
                    return sameDestSlideIdx;
                },

                animationWillRun: function (fromCenterTrans, toCenterTrans, zoomDest) {
                    var sameMatrices = function (matrix1, matrix2) {
                        var m2 = matrix2.slice();
                        util.multiplyMatrices(zoomUtil.getMatrixUserZoom(zoomUtil.zoom), m2);
                        return util.areMatricesEqual(matrix1, m2);
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
                            $viewport.triggerHandler('beginTrans.rsSlideIt', [data.activeSlide.index, this.anim.gotoSlideIdx]);
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

                        // for some complex css3 animations, Chrome does not flush the whole animation data, hence the need for a timeout to fix this issue 
                        setTimeout(function () {
                            var animTrigger = animationName + ' ' + durationMs + 'ms linear forwards';
                            viewport.world.$elem.css({
                                '-webkit-animation': animTrigger,
                                '-moz-animation': animTrigger,
                                '-o-animation': animTrigger,
                                'animation': animTrigger
                            });
                            $('head').append(transData.cssAnim.$styleObj);
                        }, 1);

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
                        isLinearZoom = typeof optsTrans.zoomVertex === 'string' && optsTrans.zoomVertex == 'linear',
                        durationMs = optsTrans.duration * (sameDestSlideIdx ? 1 - this.anim.progress : 1),
                        requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame,
                        startTimeStamp = null,
                        animEasingFunc = $.easing[optsTrans.easing],
                        doRequestFirstFrame = function (timeStamp) {
                            startTimeStamp = timeStamp;
                            doStep(0);
                            transData.anim.requestIdAnimationFrame = requestAnimationFrame(doRequestFrame);
                        },
                        doRequestFrame = function (timeStamp) {
                            var now = (timeStamp - startTimeStamp)/durationMs;
                            if (now < 1) {
                                doStep(animEasingFunc ? animEasingFunc(now, durationMs*now, 0, 1, durationMs) : now);
                                transData.anim.requestIdAnimationFrame = requestAnimationFrame(doRequestFrame);
                            } else {
                                transData.anim.requestIdAnimationFrame = null;
                                doStep(1);
                                doComplete();
                            }
                        },
                        doStep = function (now) {
                            var prevZoom = zoomUtil.zoom;
                            transData.anim.progress = now;
                            transData.anim.centerPnt = util.interpolatePoint(fromCenterTrans, toCenterTrans, now);
                            zoomUtil.zoom = util.getQuadraticValue(transData.anim.zoomCoefs, now);

                            if (transData.anim.progressPausedOn !== null) {
                                now = util.interpolate(transData.anim.progressPausedOn, 1, now);
                            }
                            transData.anim.computeIntermediateMatrix(now, false, toTransformations);

                            transUtil.trans.x = viewport.center.x - transData.anim.centerPnt.x;
                            transUtil.trans.y = viewport.center.y - transData.anim.centerPnt.y;
                            if (data.isIE8orBelow) {
                                transUtil.adjustTransIE(transData.anim.centerPnt);
                            }
                            transUtil.setTransformOrigin(transData.anim.centerPnt.x, transData.anim.centerPnt.y);
                            viewport.world.$elem.css(transUtil.getTransformCSSstyle());
                            zoomUtil.invokeChangeZoom(prevZoom);
                        },
                        doComplete = function () {
                            transData.transitionDone(true);
                        };

                    if (this.animationWillRun(fromCenterTrans, toCenterTrans, zoomDest)) {
                        // medium (x, y) = (x=unknown for now, y=optsTrans.zoomVertex= min or max zoom represented by y-coordinate 
                        // that corresponds to minimum or maximun the function takes)
                        zoomUtil.setZoomVertex(optsTrans.zoomVertex, this.anim.gotoSlideIdx, zoomDest);
                        // get the coefficients [a, b, c] of a quadratic function that interpolates the following 3 points: 
                        this.anim.zoomCoefs = util.getQuadratic2PntsVertex({ x: 0, y: zoomUtil.zoom }, { x: 1, y: zoomDest }, isLinearZoom ? 'linear' : zoomUtil.zoomVertex);

                        if ((seqData.state === $.fn.rsSlideIt.state.PLAY || !this.isThisPartOfSlideShow()) && optsTrans.onBegin) {
                            $viewport.triggerHandler('beginTrans.rsSlideIt', [data.activeSlide.index, this.anim.gotoSlideIdx]);
                        }
                        if (this.isThisPartOfSlideShow()) {
                            seqData.state = $.fn.rsSlideIt.state.PLAY;
                        }

                        // this.anim.progress holds the position the last animation had before being interrupted.
                        // If previous animation did finished (not interrupted), then this.anim.progress is zero.
                        if (requestAnimationFrame) {
                            if (util.isAlmostZero(durationMs)) {
                                doStep(1);
                                transData.transitionDone(true);
                            } else {
                                transData.anim.requestIdAnimationFrame = requestAnimationFrame(doRequestFirstFrame);
                            }
                        } else {
                            this.anim.$obj = $({ percent: 0 });
                            this.anim.$obj.animate({
                                percent: 1
                            }, {
                                duration: durationMs,
                                easing: optsTrans.easing,
                                step: doStep,
                                complete: doComplete
                            });
                        }
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
                        $viewport.triggerHandler('endTrans.rsSlideIt', [data.activeSlide.index, this.anim.gotoSlideIdx]);
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
                    return util.isAlmostZero(value) ? 0 : (util.isAlmostOne(value) ? 1 : (util.isAlmostZero(value + 1) /* testing for -1 */ ? -1 : value));
                },

                roundMatrixToTrigonometricBounds: function (matrix) {
                    for (var i = 0, len = matrix.length; i < len; ++i) {
                        matrix[i] = this.roundToTrigonometricBounds(matrix[i]);
                    }
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
                        y: (to.y - from.y) * percent + from.y,
                        z: (to.z - from.z) * percent + from.z
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
                    if (!this.isAlmostZero(coefs.a)) { // only continue if a is non zero (if it is a parabola)

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
                multiplyMatrices: function (matrix1, matrix2) {
                    // matrix1 and matrix2 are 3x3 matrices, with indexes as | 0 1 2 |
                    //                                                       | 3 4 5 |
                    //                                                       | 6 7 8 |
                    var m2 = matrix2.slice(); // clone array
                    matrix2[0] = matrix1[0] * m2[0] + matrix1[1] * m2[3] + matrix1[2] * m2[6];
                    matrix2[1] = matrix1[0] * m2[1] + matrix1[1] * m2[4] + matrix1[2] * m2[7];
                    matrix2[2] = matrix1[0] * m2[2] + matrix1[1] * m2[5] + matrix1[2] * m2[8];

                    matrix2[3] = matrix1[3] * m2[0] + matrix1[4] * m2[3] + matrix1[5] * m2[6];
                    matrix2[4] = matrix1[3] * m2[1] + matrix1[4] * m2[4] + matrix1[5] * m2[7];
                    matrix2[5] = matrix1[3] * m2[2] + matrix1[4] * m2[5] + matrix1[5] * m2[8];

                    matrix2[6] = matrix1[6] * m2[0] + matrix1[7] * m2[3] + matrix1[8] * m2[6];
                    matrix2[7] = matrix1[6] * m2[1] + matrix1[7] * m2[4] + matrix1[8] * m2[7];
                    matrix2[8] = matrix1[6] * m2[2] + matrix1[7] * m2[5] + matrix1[8] * m2[8];
                    return matrix2;
                },

                areMatricesEqual: function (matrix1, matrix2) {
                    for (var i = 0; i < 9; ++i) {
                        if (!this.areTheSame(matrix1[i], matrix2[i])) {
                            return false;
                        }
                    }
                    return true;
                },

                // returns the inverse matrix of the given matrix, in such a way that matrix * matrixInv = matrixIdentity
                getInvertedMatrix: function (m) {
                    var det = m[0]*(m[4]*m[8] - m[5]*m[7]) +
                              m[1]*(m[5]*m[6] - m[3]*m[8]) +
                              m[2]*(m[3]*m[7] - m[4]*m[6]);
                    if (this.isAlmostZero(det)) {
                        return m.splice();
                    }
                    return [
                        (m[4]*m[8] - m[5]*m[7])/det, (m[2]*m[7] - m[1]*m[8])/det, (m[1]*m[5] - m[2]*m[4])/det,
                        (m[5]*m[6] - m[3]*m[8])/det, (m[0]*m[8] - m[2]*m[6])/det, (m[2]*m[3] - m[0]*m[5])/det,
                        (m[3]*m[7] - m[4]*m[6])/det, (m[1]*m[6] - m[0]*m[7])/det, (m[0]*m[4] - m[1]*m[3])/det
                    ];
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
                        viewport.world.$elem.css(transUtil.doMouseZoom(prevZoom, this.zoom));
                        this.invokeChangeZoom(prevZoom);
                    }
                },
                invokeChangeZoom: function (prevZoom) {
                    if (prevZoom != this.zoom && opts.events.onChangeZoom) {
                        $viewport.triggerHandler('changeZoom.rsSlideIt', [this.zoom]);
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
                        viewport.setCenterPos();
                        var slideData = data.slideData[gotoSlideIdx],
                            fit = {
                                x: viewport.center.x * 2 / (slideData.padding[3] + slideData.size.x + slideData.padding[1]),
                                y: viewport.center.y * 2 / (slideData.padding[0] + slideData.size.y + slideData.padding[2])
                            };
                        switch (zDest) {
                            case 'current': return this.zoom;
                            case 'fitWidth': return fit.x;
                            case 'fitHeight': return fit.y;
                            case 'fit': return Math.min(fit.x, fit.y);
                            case 'cover': return Math.max(viewport.center.x * 2 / slideData.size.x, viewport.center.y * 2 / slideData.size.y);
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
                    viewport.setCenterPos();
                    this.doZoom(this.checkZoomBounds(newZoom));
                },
                getMatrixUserZoom: function (zoom) {
                    return transUtil.getMatrixScale3D(zoom, zoom, zoom);
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
                    var worldRect = transUtil.getTransformedRect(viewport.world.IEorigSize),
                        viewportPos = $viewport.position();
                    panUtil.width = worldRect.bottomRight.x - worldRect.topLeft.x;
                    panUtil.height = worldRect.bottomRight.y - worldRect.topLeft.y;
                    panUtil.elemPos.x = viewportPos.left;
                    panUtil.elemPos.y = viewportPos.top;
                    $viewport.triggerHandler('beginPan.rsSlideIt');
                },
                endPan: function () {
                    panUtil.isPanning = false;
                    $viewport.triggerHandler('endPan.rsSlideIt');
                },
                mousemove: function (event) {
                    if (!panUtil.isPanning) {
                        panUtil.beginPan(event);
                    }
                    
                    var position = viewport.world.$elem.offset(),
                        limits = {
                            top: position.top - panUtil.elemPos.y + panUtil.height,
                            right: position.left - panUtil.elemPos.x - viewport.center.x * 2,
                            bottom: position.top - panUtil.elemPos.y - viewport.center.y * 2,  
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
                    viewport.world.$elem.css(transUtil.doMousePan(offset));
                },
                mousedown: function (event) {
                    if (event.which == 1) {
                        data.$viewportAndTops.bind('mousemove.rsSlideIt', panUtil.mousemove);
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
                    data.$viewportAndTops.unbind('mousemove.rsSlideIt', panUtil.mousemove);
                    if (panUtil.isPanning) {
                        panUtil.endPan();
                    }
                }
            },

            transUtil = {
                transID: {
                    ROTATE:      0,
                    ROTATE3D:    1,
                    ROTATEX:     2,
                    ROTATEY:     3,
                    ROTATEZ:     4,

                    SCALE3D:     5,
                    SCALE:       6,
                    SCALEXY:     7,
                    SCALEX:      8,
                    SCALEY:      9,
                    SCALEZ:     10,

                    SKEWX:      11,
                    SKEWY:      12
                },
                orig: { x: viewport.center.x, y: viewport.center.y, z: 0 }, // transformation origin point
                trans: { x: 0, y: 0, z: 0 },
                activeSlideIndex: -1, // the slide to which we want to move after a transition is done. data.activeSlide.index is the current active slide
                activeSlideCTMmatrix: null,
                activeSlideCenterTrans: { x: 0, y: 0, z: 0 },
                cache: { // caches some expensive function results
                    matrixCTM:     [1, 0, 0, 0, 1, 0, 0, 0, 1], // Current Transformation Matrix containing all the precalculated transformations, plus current zoom applied
                    matrixCTM_inv: [1, 0, 0, 0, 1, 0, 0, 0, 1], // Inversed matrixCTM, which means matrixCTM * matrixCTM_inv = Identity matrix. This matrixCTM_inv matches the current slide ctmMatrix, with user zoom applied.
                    refresh: function () {
                        this.matrixCTM = util.getInvertedMatrix(transUtil.activeSlideCTMmatrix);
                        util.multiplyMatrices(zoomUtil.getMatrixUserZoom(zoomUtil.zoom), this.matrixCTM); // final scale transformation related with the mouse zoom
                        this.matrixCTM_inv = util.getInvertedMatrix(this.matrixCTM);
                    }
                },

                getMatrixIdentity: function () {
                    return [
                        1, 0, 0,
                        0, 1, 0,
                        0, 0, 1
                    ];
                },
                getMatrixRotate: function (sine, cosine) {
                    sine = util.roundToTrigonometricBounds(sine);
                    cosine = util.roundToTrigonometricBounds(cosine);
                    return [
                        cosine, sine, 0,
                        -sine, cosine, 0,
                        0, 0, 1
                    ];
                },
                getMatrixRotate3D: function(x, y, z, rad) {
                    var sq = Math.sin(rad/2),
                        sc = sq*Math.cos(rad/2),
                        len = Math.sqrt(x*x + y*y + z*z),
                        trigRound = util.roundToTrigonometricBounds;
                    if (util.isAlmostZero(len)) {
                        return this.getMatrixIdentity();
                    }
                    sq *= sq;
                    // normalize [x,y,z] vector
                    x /= len;
                    y /= len;
                    z /= len;
                    return [
                        trigRound(1 - 2*(y*y + z*z)*sq),   trigRound(2*(x*y*sq + z*sc)),      trigRound(2*(x*z*sq - y*sc)),
                        trigRound(2*(x*y*sq - z*sc)),      trigRound(1 - 2*(x*x + z*z)*sq),   trigRound(2*(y*z*sq + x*sc)),
                        trigRound(2*(x*z*sq + y*sc)),      trigRound(2*(y*z*sq - x*sc)),      trigRound(1 - 2*(x*x + y*y)*sq)
                    ];
                },
                getMatrixRotateX: function(rad) {
                    return this.getMatrixRotate3D(1, 0, 0, rad);
                },
                getMatrixRotateY: function(rad) {
                    return this.getMatrixRotate3D(0, 1, 0, rad);
                },
                getMatrixRotateZ: function(rad) {
                    return this.getMatrixRotate3D(0, 0, 1, rad);
                },

                getMatrixScale3D: function (scaleX, scaleY, scaleZ) {
                    return [
                        scaleX, 0, 0,
                        0, scaleY, 0,
                        0, 0, scaleZ
                    ];
                },
                getMatrixScale: function (scale) {
                    return this.getMatrixScale3D(scale, scale, 1);
                },
                getMatrixScaleXY: function (scaleX, scaleY) {
                    return this.getMatrixScale3D(scaleX, scaleY, 1);
                },
                getMatrixScaleX: function (scale) {
                    return this.getMatrixScale3D(scale, 1, 1);
                },
                getMatrixScaleY: function (scale) {
                    return this.getMatrixScale3D(1, scale, 1);
                },
                getMatrixScaleZ: function (scale) {
                    return this.getMatrixScale3D(1, 1, scale);
                },

                getMatrixSkewX: function (tangent) {
                    return [
                        1, 0, 0, 
                        util.roundToTrigonometricBounds(tangent), 1, 0,
                        0, 0, 1
                    ];
                },
                getMatrixSkewY: function (tangent) {
                    return [
                        1, util.roundToTrigonometricBounds(tangent), 0,
                        0, 1, 0,
                        0, 0, 1
                    ];
                },

                getMatrix: function (id, value) {
                    switch (id) {
                        case this.transID.ROTATE:   return this.getMatrixRotate(Math.sin(value), Math.cos(value));
                        case this.transID.ROTATE3D: return this.getMatrixRotate3D(value.x, value.y, value.z, value.rad);
                        case this.transID.ROTATEX:  return this.getMatrixRotateX(value);
                        case this.transID.ROTATEY:  return this.getMatrixRotateY(value);
                        case this.transID.ROTATEZ:  return this.getMatrixRotateZ(value);

                        case this.transID.SCALE3D:  return this.getMatrixScale3D(value.x, value.y, value.z);
                        case this.transID.SCALE:    return this.getMatrixScale(value);
                        case this.transID.SCALEXY:  return this.getMatrixScaleXY(value.x, value.y);
                        case this.transID.SCALEX:   return this.getMatrixScaleX(value);
                        case this.transID.SCALEY:   return this.getMatrixScaleY(value);
                        case this.transID.SCALEZ:   return this.getMatrixScaleZ(value);

                        case this.transID.SKEWX:    return this.getMatrixSkewX(Math.tan(value));
                        case this.transID.SKEWY:    return this.getMatrixSkewY(Math.tan(value));
                    }
                    return this.getMatrixIdentity();
                },

                getTransformedPoint: function(pnt, ctmMatrix, centerPnt) {
                    var ctm = ctmMatrix === undefined ? this.cache.matrixCTM : ctmMatrix;
                    if (centerPnt === undefined) {
                        return { 
                            x: ctm[0]*pnt.x + ctm[3]*pnt.y + ctm[6]*pnt.z,
                            y: ctm[1]*pnt.x + ctm[4]*pnt.y + ctm[7]*pnt.z,
                            z: ctm[2]*pnt.x + ctm[5]*pnt.y + ctm[8]*pnt.z
                        };
                    }
                    var centerPntZ = centerPnt.z ? centerPnt.z : 0;
                    return { 
                        x: centerPnt.x + ctm[0]*(pnt.x - centerPnt.x) + ctm[3]*(pnt.y - centerPnt.y) + ctm[6]*(pnt.z - centerPntZ),
                        y: centerPnt.y + ctm[1]*(pnt.x - centerPnt.x) + ctm[4]*(pnt.y - centerPnt.y) + ctm[7]*(pnt.z - centerPntZ),
                        z: centerPntZ + ctm[2]*(pnt.x - centerPnt.x) + ctm[5]*(pnt.y - centerPnt.y) + ctm[8]*(pnt.z - centerPntZ)
                    };
                },
                getTransformedRect: function(rectSize, ctmMatrix, centerPnt) {
                    var lt = this.getTransformedPoint({ x: 0, y: 0, z: 0 }, ctmMatrix, centerPnt),
                        rt = this.getTransformedPoint({ x: rectSize.x, y: 0, z: 0 }, ctmMatrix, centerPnt),
                        rb = this.getTransformedPoint({ x: rectSize.x, y: rectSize.y, z: 0 }, ctmMatrix, centerPnt),
                        lb = this.getTransformedPoint({ x: 0, y: rectSize.y, z: 0 }, ctmMatrix, centerPnt);
                    return {
                        topLeft: {
                            x: Math.min(lt.x, Math.min(rt.x, Math.min(lb.x, rb.x))),
                            y: Math.min(lt.y, Math.min(rt.y, Math.min(lb.y, rb.y))),
                            z: Math.min(lt.z, Math.min(rt.z, Math.min(lb.z, rb.z)))
                        },
                        bottomRight: {
                            x: Math.max(lt.x, Math.max(rt.x, Math.max(lb.x, rb.x))),
                            y: Math.max(lt.y, Math.max(rt.y, Math.max(lb.y, rb.y))),
                            z: Math.max(lt.z, Math.max(rt.z, Math.max(lb.z, rb.z)))
                        }
                    };
                },
                getTransformOrigin: function () {
                    return { x: this.orig.x, y: this.orig.y, z: this.orig.z };
                },
                setTransformOrigin: function (origX, origY, origZ) {
                    this.orig.x = origX;
                    this.orig.y = origY;
                    this.orig.z = origZ;
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
                        // translate3d is used to enable hardware optimization on css animations
                        var matrixCss, origCss = this.orig.x.toFixed(0) + 'px ' + this.orig.y.toFixed(0) + 'px ' + this.orig.z.toFixed(0) + 'px';
                        if (data.supportsCSSTransforms3D) {
                            matrixCss = 'matrix3d(' + this.cache.matrixCTM.slice(0, 3) + ',0, '
                                                    + this.cache.matrixCTM.slice(3, 6) + ',0, '
                                                    + this.cache.matrixCTM.slice(6, 9) + ',0, '
                                                    + this.trans.x + ',' + this.trans.y + ',' + this.trans.z +',1)';
                        } else {
                            matrixCss = 'matrix(' + this.cache.matrixCTM.slice(0, 2) + ','
                                                  + this.cache.matrixCTM.slice(3, 5) + ','
                                                  + this.trans.x + ',' + this.trans.y + ') translate3d(0,0,0)';
                        }
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
                            'transform': matrixCss,

                            // prevents some flickering effect even in 2D css animations
                            '-webkit-backface-visibility': 'hidden',
                            '-moz-backface-visibility': 'hidden',
                            '-ms-backface-visibility': 'hidden',
                            'backface-visibility': 'hidden',
                            '-webkit-transform-style': 'preserve-3d',
                            '-moz-transform-style': 'preserve-3d',
                            'transform-style': 'preserve-3d'
                        };
                    }
                },

                adjustTransIE: function (centerPnt) {
                    var rect = this.getTransformedRect(viewport.world.IEorigSize, this.cache.matrixCTM, centerPnt);
                    this.trans.x += rect.topLeft.x;
                    this.trans.y += rect.topLeft.y;
                },

                setActiveSlide: function (slideIdx) {
                    data.activeSlide.index = this.activeSlideIndex = slideIdx;
                    data.activeSlide.$slide = viewport.world.$slides.eq(slideIdx);
                    var slideData = data.slideData[slideIdx];
                    this.activeSlideCTMmatrix = slideData.cssTransforms.ctmMatrix;
                    this.trans.x = viewport.center.x - slideData.centerTrans.x;
                    this.trans.y = viewport.center.y - slideData.centerTrans.y;
                    this.trans.z = - slideData.centerTrans.z;

                    this.cache.refresh();
                    if (data.isIE8orBelow) {
                        this.activeSlideCenterTrans.x = slideData.centerTrans.x;
                        this.activeSlideCenterTrans.y = slideData.centerTrans.y;
                        this.adjustTransIE(slideData.centerTrans);
                    }
                },

                getTransformCSS: function (offset) {
                    this.setTransformOrigin(
                        viewport.center.x - this.trans.x,
                        viewport.center.y - this.trans.y,
                        - this.trans.z
                    );
                    if (data.isIE8orBelow) {
                        var rect = this.getTransformedRect(viewport.world.IEorigSize, this.cache.matrixCTM, 
                            offset === undefined ? this.activeSlideCenterTrans : {
                                x: this.activeSlideCenterTrans.x - offset.x,
                                y: this.activeSlideCenterTrans.y - offset.y
                            });
                        this.orig.x += rect.topLeft.x;
                        this.orig.y += rect.topLeft.y;
                    }
                    return this.getTransformCSSstyle();
                },

                getTransformOriginCss: function ($elem, outerSize) {
                    if (data.isIE8orBelow) {
                        // TODO check if in IE8 and below, the transform origin correctly maps to the margins
                        return { x: util.toFloat($elem.css('margin-left')), y: util.toFloat($elem.css('margin-top')), z: 0 };
                    } else {
                        var value = $elem.css('-webkit-transform-origin');
                        if (!util.isDefined(value)) {
                            value = $elem.css('-moz-transform-origin');
                            if (!util.isDefined(value)) {
                                value = $elem.css('-o-transform-origin');
                                if (!util.isDefined(value)) {
                                    value = $elem.css('msTransformOrigin');
                                    if (!util.isDefined(value)) {
                                        value = $elem.css('transform-origin');
                                        if (!util.isDefined(value)) {
                                            return !!outerSize ? 
                                                { x: outerSize.x / 2, y: outerSize.y / 2, z: 0 } : { x: viewport.world.IEorigSize.x / 2, y: viewport.world.IEorigSize.y / 2, z: 0 };
                                        }
                                    }
                                }
                            }
                        }
                    }
                    var values = value.split(" "),
                        origin = { x: 0, y: 0, z: 0 };
                    switch (values.length) {
                        case 3: origin.z = util.toFloat(values[2]);
                        case 2: origin.y = util.toFloat(values[1]);
                        case 1: origin.x = util.toFloat(values[0]);
                    }
                    return origin;
                },

                doMousePan: function (offset) {
                    var css = this.getTransformCSS(offset);
                    return css;
                },

                doMouseZoom: function (oldMouseZoom, newMouseZoom) {
                    if (data.isIE8orBelow) {
                        // IE8 and below do not have transform-origin, so the workaround to properly center scale transformations is to apply a translation
                        if (!util.isAlmostZero(oldMouseZoom)) {
                            var deltaScale, deltaTrans;
                            deltaScale = newMouseZoom - oldMouseZoom;
                            deltaTrans = (viewport.center.x - this.trans.x) / oldMouseZoom;
                            this.trans.x -= deltaTrans * deltaScale;
                            
                            deltaTrans = (viewport.center.y - this.trans.y) / oldMouseZoom;
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
                    if (opts.mouseZoom && seqData.userInteract || opts.events.onMouseWheel) {
                        evt.preventDefault ? evt.preventDefault() : evt.returnValue = false;
                    }
                    if (opts.mouseZoom && seqData.userInteract) {
                        zoomUtil.doZoom(zoomUtil.zoom + delta.y * opts.zoomStep);    
                    }
                    if (opts.events.onMouseWheel) {
                        $viewport.triggerHandler('userMousewheel.rsSlideIt', [delta.y > 0]);
                    }
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
                        if (!!$mouseOn && $mouseOn.closest(data.$viewportAndTops).length !== 1) {
                            event.which = 1;
                            panUtil.mouseup(event);
                        }
                    }
                },
                onSingleTransition: function (event, optsTrans) {
                    if (!transData.isThisPartOfSlideShow()) {
                        transData.prevDuration = transData.duration;
                        transData.prevEasing = transData.easing;
                        transData.reset();
                        
                        transData.duration = util.getSpeedMs(optsTrans.duration);
                        if (transData.prevDuration === null) {
                            transData.prevDuration = transData.duration;
                        }
                        optsTrans.duration = transData.duration;

                        transData.easing = optsTrans.easing;
                        if (transData.prevEasing === null) {
                            transData.prevEasing = transData.easing;
                        }
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
                                events.bindMouseEvents();
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
                                events.bindMouseEvents();
                            }
                        }
                        if (!seqData.userInteract) {
                            events.bindMouseEvents();
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
                unbindMouseEvents: function () {
                    if (opts.mousePan) {
                        data.$viewportAndTops.
                            unbind('mousedown.rsSlideIt', this.onMousedown).
                            unbind('mouseup.rsSlideIt', this.onMouseup).
                            unbind('mouseleave.rsSlideIt', this.onMouseleave);
                    }
                    data.$viewportAndTops.unbind('DOMMouseScroll.rsSlideIt mousewheel.rsSlideIt', events.onMouseWheel);
                },
                bindMouseEvents: function () {
                    if (opts.mousePan) {
                        data.$viewportAndTops.
                            bind('mousedown.rsSlideIt', this.onMousedown).
                            bind('mouseup.rsSlideIt', this.onMouseup).
                            bind('mouseleave.rsSlideIt', this.onMouseleave);
                    }
                    data.$viewportAndTops.bind('DOMMouseScroll.rsSlideIt mousewheel.rsSlideIt', events.onMouseWheel);
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
                                opts.zoomMax = value;
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
                                opts.zoomMin = value;
                                zoomUtil.setterZoom(value);
                            }
                            break;
                        case 'zoomStep':
                            opts.zoomStep = value;
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
                    if (!panUtil.isPanning && opts.events.onClickSlide) {
                        var $slide = events.readUnderneath(event);
                        if ($slide) {
                            $viewport.triggerHandler('clickSlide.rsSlideIt', [$slide, viewport.world.$slides.index($slide.closest(opts.selector.slide))]);
                        }
                    }
                },
                onDblClick: function (event) {
                    if (opts.events.onDblClickSlide) {
                        var $slide = events.readUnderneath(event);
                        if ($slide) {
                            $viewport.triggerHandler('dblClickSlide.rsSlideIt', [$slide, viewport.world.$slides.index($slide.closest(opts.selector.slide))]);
                            event.stopPropagation();
                        }
                    }
                },
                onCreate: function (event) {
                    if (opts.events.onCreate) {
                        opts.events.onCreate(event);
                    }
                },
                onDestroy: function (event) {
                    if (transData.inputOpts) {
                        $viewport.trigger('stop.rsSlideIt'); // stop slideshow
                    } else {
                        if (transData.animating) {
                            transData.interrupt();
                        }
                    }

                    $viewport.
                        unbind('singleTransition.rsSlideIt', events.onSingleTransition).
                        unbind('transition.rsSlideIt', events.onTransition).
                        unbind('playPause.rsSlideIt', events.onPlayPause).
                        unbind('stop.rsSlideIt', events.onStop).
                        unbind('destroy.rsSlideIt', events.onDestroy).
                        unbind('getter.rsSlideIt', events.onGetter).
                        unbind('setter.rsSlideIt', events.onSetter).
                        unbind('create.rsSlideIt', events.onCreate).
                        unbind('ajaxLoadBegin.rsSlideIt', events.onAjaxLoadBegin).
                        unbind('ajaxLoadSlide.rsSlideIt', events.onAjaxLoadSlide).
                        unbind('ajaxLoadEnd.rsSlideIt', events.onAjaxLoadEnd).
                        unbind('changeZoom.rsSlideIt', events.onChangeZoom).
                        unbind('selectSlide.rsSlideIt', events.onSelectSlide).
                        unbind('unselectSlide.rsSlideIt', events.onUnselectSlide).
                        unbind('clickSlide.rsSlideIt', events.onClickSlide).
                        unbind('dblClickSlide.rsSlideIt', events.onDblClickSlide).
                        unbind('beginPan.rsSlideIt', events.onBeginPan).
                        unbind('endPan.rsSlideIt', events.onEndPan).
                        unbind('beginTrans.rsSlideIt', events.onBeginTrans).
                        unbind('endTrans.rsSlideIt', events.onEndTrans).
                        unbind('beginDelay.rsSlideIt', events.onBeginDelay).
                        unbind('endDelay.rsSlideIt', events.onEndDelay).
                        unbind('userMousewheel.rsSlideIt', events.onUserMouseWheel);

                    viewport.world.$slides.add(data.$elemsOnTop).
                        unbind('dblclick.rsSlideIt', events.onDblClick).
                        unbind('mouseup.rsSlideIt', events.onMouseupClick);

                    if (data.supportsCSSAnimation) {
                        if (transData.cssAnim.$styleObj) {
                            transData.cssAnim.$styleObj.remove();
                        }
                        viewport.world.$elem.css({
                            '-webkit-animation': '',
                            '-moz-animation': '',
                            '-o-animation': '',
                            'animation': ''
                        }).
                        unbind('animationstart.rsSlideIt', events.onCssAnimationStart).
                        unbind('webkitAnimationStart.rsSlideIt', events.onCssAnimationStart).
                        unbind('oanimationstart.rsSlideIt', events.onCssAnimationStart).
                        unbind('MSAnimationStart.rsSlideIt', events.onCssAnimationStart).
                        unbind('animationend.rsSlideIt', events.onCssAnimationEnd).
                        unbind('webkitAnimationEnd.rsSlideIt', events.onCssAnimationEnd).
                        unbind('oanimationend.rsSlideIt', events.onCssAnimationEnd).
                        unbind('MSAnimationEnd.rsSlideIt', events.onCssAnimationEnd);
                    }
                    data.$viewportAndTops.
                        unbind('mousemove.rsSlideIt', panUtil.mousemove).
                        unbind('mousedown.rsSlideIt', this.onMousedown).
                        unbind('mouseup.rsSlideIt', this.onMouseup).
                        unbind('mouseleave.rsSlideIt', this.onMouseleave).
                        unbind('DOMMouseScroll.rsSlideIt mousewheel.rsSlideIt', events.onMouseWheel);

                    if (data.isIE8orBelow) {
                        viewport.world.$elem.css({
                            'margin-left': '',
                            'margin-top': '',
                            'filter': ''
                        });
                    } else {
                        viewport.world.$elem.css({
                            '-webkit-transform-origin': '',
                            '-moz-transform-origin': '',
                            '-o-transform-origin': '',
                            'msTransformOrigin': '',
                            'transform-origin': '',
                            '-webkit-transform': '',
                            '-moz-transform': '',
                            '-o-transform': '',
                            'msTransform': '',
                            'transform': '',
                            '-webkit-backface-visibility': '',
                            '-moz-backface-visibility': '',
                            '-ms-backface-visibility': '',
                            'backface-visibility': '',
                            '-webkit-transform-style': '',
                            '-moz-transform-style': '',
                            'transform-style': ''
                        });
                    }
                    if (data.supportsCSSTransforms3D) {
                        if (opts.data3D.viewportClass) {
                            $viewport.removeClass(opts.data3D.viewportClass);
                        }
                        $viewport.css({
                            '-webkit-perspective': '',
                            '-moz-perspective': '',
                            'perspective': ''
                        });
                    }
                    if (!!opts.width) { $viewport.css('width', ''); }
                    if (!!opts.height) { $viewport.css('height', ''); }
                    $viewport.css('overflow', '');
                    viewport.world.$slides.css({
                        'display': '',
                        'width': '',
                        'height': ''
                    });
                    $viewport.add(viewport.world.$slides).filter(function () {
                        return $(this).attr('style') === '';
                    }).removeAttr('style');
                    viewport.world.$slides.eq(0).unwrap();
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
                onUserMouseWheel: function (event, up) {
                    if (opts.events.onMouseWheel) {
                        opts.events.onMouseWheel(event, up);
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
                    events.cssStartZoomEvents();
                },
                onCssAnimationEnd: function () {
                    transData.cssAnim.resetCSSanimation();
                    transData.transitionDone(true);
                    events.cssEndZoomEvents();
                },
                cssStartZoomEvents: function () {
                    if (opts.events.onChangeZoom) {
                        transData.cssAnim.intervalId = setInterval(events.fireCssZoomEvent, 70);
                    }
                },
                fireCssZoomEvent: function (noCalc) {
                    var prevZoom = zoomUtil.zoom,
                        ellapsedTime, progress;
                    
                    if (!noCalc) {
                        ellapsedTime = transData.cssAnim.totalTime + (+new Date() - transData.cssAnim.startTime);
                        progress = ellapsedTime / transData.prevDuration;
                        progress = progress > 1 ? 1 : progress;
                        zoomUtil.zoom = util.getQuadraticValue(transData.anim.zoomCoefs, progress);
                    }
                    if (!!noCalc || prevZoom != zoomUtil.zoom) {
                        $viewport.triggerHandler('changeZoom.rsSlideIt', [zoomUtil.zoom]);
                    }
                },
                cssEndZoomEvents: function () {
                    if (transData.cssAnim.intervalId !== null) {
                        clearInterval(transData.cssAnim.intervalId);
                        transData.cssAnim.intervalId = null;
                        events.fireCssZoomEvent(true);
                    }
                }
            },

            load = {
                processedSlides: 0,
                init: function () {
                    viewport.init();
                    data.init();
                    this.ajax.init();
                    if (data.qtSlides > 0) {
                        $viewport.
                            bind('singleTransition.rsSlideIt', events.onSingleTransition).
                            bind('transition.rsSlideIt', events.onTransition).
                            bind('playPause.rsSlideIt', events.onPlayPause).
                            bind('stop.rsSlideIt', events.onStop).
                            bind('destroy.rsSlideIt', events.onDestroy).
                            bind('getter.rsSlideIt', events.onGetter).
                            bind('setter.rsSlideIt', events.onSetter).
                            bind('create.rsSlideIt', events.onCreate).
                            bind('ajaxLoadBegin.rsSlideIt', events.onAjaxLoadBegin).
                            bind('ajaxLoadSlide.rsSlideIt', events.onAjaxLoadSlide).
                            bind('ajaxLoadEnd.rsSlideIt', events.onAjaxLoadEnd).
                            bind('changeZoom.rsSlideIt', events.onChangeZoom).
                            bind('clickSlide.rsSlideIt', events.onClickSlide).
                            bind('dblClickSlide.rsSlideIt', events.onDblClickSlide).
                            bind('beginPan.rsSlideIt', events.onBeginPan).
                            bind('endPan.rsSlideIt', events.onEndPan).
                            bind('beginTrans.rsSlideIt', events.onBeginTrans).
                            bind('endTrans.rsSlideIt', events.onEndTrans).
                            bind('beginDelay.rsSlideIt', events.onBeginDelay).
                            bind('endDelay.rsSlideIt', events.onEndDelay).
                            bind('userMousewheel.rsSlideIt', events.onUserMouseWheel);

                        viewport.world.$slides.add(data.$elemsOnTop).bind('dblclick.rsSlideIt', events.onDblClick).bind('mouseup.rsSlideIt', events.onMouseupClick);

                        if (data.supportsCSSAnimation) { 
                            viewport.world.$elem.
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
                        util.warn('Moderniz lib not loaded! Unable to determine if browser supports CSS3 animations natively. Falling back to javascript animation!', false);
                    } else {
                        if (typeof Modernizr.cssanimations === 'undefined') {
                            util.warn('Moderniz lib loaded, but missing the "CSS Animations" detection feature! Make sure Moderniz includes such feature, otherwise pure javascript animation is used.', false);
                        }
                        if (typeof Modernizr.csstransforms3d === 'undefined') {
                            util.warn('Moderniz lib loaded, but missing the "CSS 3D Transforms" detection feature! Make sure Moderniz includes such feature.', false);
                        }
                    }

                    opts.initialSlide = data.checkSlideBounds(opts.initialSlide);
                    if (opts.zoomMax < opts.zoomMin) { var sw = opts.zoomMax; opts.zoomMax = opts.zoomMin; opts.zoomMin = sw; }
                    
                    opts.initialZoom = opts.initialZoom < opts.Min ? opts.Min : (opts.initialZoom > opts.Max ? opts.Max : opts.initialZoom);
                    if (data.supportsCSSTransforms3D) {
                        if (opts.data3D.viewportClass) {
                            $viewport.addClass(opts.data3D.viewportClass);
                        }
                        $viewport.css({
                            '-webkit-perspective': opts.data3D.perspective + 'px',
                            '-moz-perspective': opts.data3D.perspective + 'px',
                            'perspective': opts.data3D.perspective + 'px'
                        });
                    }
                    if (data.qtSlides > 0) {
                        $viewport.
                            bind('loadSlide.rsSlideIt', this.onLoadSlide).
                            triggerHandler('loadSlide.rsSlideIt');
                    }
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
                getTransformFromCss: function ($slide) {
                    var value,
                        getTransformFromCSSie = function (msFilter) {
                            var lookup = "progid:dximagetransform.microsoft.matrix(",
                                pos = msFilter.toLowerCase().indexOf(lookup);
                            if (pos > -1) {
                                msFilter = msFilter.substring(pos + lookup.length).toLowerCase().replace(/(m11=|m12=|m21=|m22=| )/g, '');
                                var coefs = msFilter.split(',');
                                // M12 and M21 are swapped in IE
                                return 'matrix(' + coefs[0] + ', ' + coefs[2] + ', ' + coefs[1] + ', ' + coefs[3] + ')';
                            }
                            return null;
                        };
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
                getMatrixCoefs: function (value) {
                    value = value.replace(/matrix(3d)?\(/gi, ''); // remove occurences of "matrix(" and "matrix3d("
                    var coefs = value.split(',');
                    if (coefs.length == 16) {
                        return {
                            // matrix3d(m11, m12, m13, 0, m21, m22, m23, 0, m31, m32, m33, 0, tx, ty, tz, 1)
                            // | m11 m12 m13 0 |
                            // | m21 m22 m23 0 |
                            // | m31 m32 m33 0 |
                            // |  tx  ty  tz 1 |
                            is3D: true,
                            m11: util.roundToTrigonometricBounds(util.toFloat(coefs[0])),
                            m12: util.roundToTrigonometricBounds(util.toFloat(coefs[1])),
                            m13: util.roundToTrigonometricBounds(util.toFloat(coefs[2])),

                            m21: util.roundToTrigonometricBounds(util.toFloat(coefs[4])),
                            m22: util.roundToTrigonometricBounds(util.toFloat(coefs[5])),
                            m23: util.roundToTrigonometricBounds(util.toFloat(coefs[6])),

                            m31: util.roundToTrigonometricBounds(util.toFloat(coefs[8])),
                            m32: util.roundToTrigonometricBounds(util.toFloat(coefs[9])),
                            m33: util.roundToTrigonometricBounds(util.toFloat(coefs[10])),

                            tx: util.toInt(coefs[12]),
                            ty: util.toInt(coefs[13]),
                            tz: util.toInt(coefs[14])
                        };
                    }
                    // matrix(m11, m12, m21, m22, tx, ty)
                    // | m11 m12 0 |
                    // | m21 m22 0 |
                    // |  tx  ty 1 |
                    return {
                        is3D: false,
                        m11: util.roundToTrigonometricBounds(util.toFloat(coefs[0])),
                        m12: util.roundToTrigonometricBounds(util.toFloat(coefs[1])),
                        m21: util.roundToTrigonometricBounds(util.toFloat(coefs[2])),
                        m22: util.roundToTrigonometricBounds(util.toFloat(coefs[3])),
                        tx: util.toInt(coefs[4]),
                        ty: util.toInt(coefs[5])
                    };
                },
                getTransformInfo: function ($slide, outerSize) {
                    var getTransformFromDataAttr = function () {
                            var value = $slide.attr('data-transform');
                            if (!util.isDefined(value)) {
                                value = $slide.attr('data-transform2D');
                                if (!util.isDefined(value)) {
                                    value = $slide.attr('data-transform3D');
                                    return !util.isDefined(value) ? null : value;
                                }
                            }
                            return value;
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
                            found = value.match(/rotateX\([-|+]?[\d.]+(deg|rad|grad|turn)\)/i);
                            // try rotateX(a) (3D)
                            if (found && util.isDefined(found[0])) {
                                var angle = util.getAngleRadians(value.replace(/rotateX\(|\)/gi, ''));
                                return { 
                                    id:         transUtil.transID.ROTATEX,
                                    valueIdent: 0,
                                    valueInv:   - angle,
                                    matrix:     transUtil.getMatrixRotateX(angle),
                                    matrixInv:  transUtil.getMatrixRotateX(- angle)
                                };
                            }
                            found = value.match(/rotateY\([-|+]?[\d.]+(deg|rad|grad|turn)\)/i);
                            // try rotateY(a) (3D)
                            if (found && util.isDefined(found[0])) {
                                var angle = util.getAngleRadians(value.replace(/rotateY\(|\)/gi, ''));
                                return { 
                                    id:         transUtil.transID.ROTATEY,
                                    valueIdent: 0,
                                    valueInv:   - angle,
                                    matrix:     transUtil.getMatrixRotateY(angle),
                                    matrixInv:  transUtil.getMatrixRotateY(- angle)
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
                                util.warn('Slide' + slideToString($slide) + ' contains a non-standard transformation: skew(x,y). Use skewX(x) skewY(y) instead.', true);
                            } else {
                                // try skew(x) -- non standard
                                found = value.match(/skew\([-|+]?[\d.]+(deg|rad|grad|turn)\)/i);
                                if (found && util.isDefined(found[0])) {
                                    util.warn('Slide' + slideToString($slide) + ' contains a non-standard transformation: skew(x). Use skewX(x) instead.', true);
                                }
                            }
                            return null;
                        },
                        getInvertedScale = function (scale) {
                            return util.isAlmostZero(scale) ? 20000 : (1.0 / scale);
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
                                ctmMatrix: transUtil.getMatrixIdentity(),
                                transformations: []
                            };
                        },
                        getTransformFromData = function (value, origin) {
                            // remove all spaces and then add a space before each scale, rotate, skew and translate
                            var transfs = value.replace(/ /g, '').
                                            // 2d
                                            replace(/\)scale/gi, ') scale').replace(/\)rotate/gi, ') rotate').replace(/\)skew/gi, ') skew').replace(/\)translate/gi, ') translate').
                                            // 3d
                                            replace(/\)rotateX/gi, ') rotateX').replace(/\)rotateY/gi, ') rotateY').
                                            split(' '),
                                allTrans = getTransformDefault(origin),
                                cssData;

                            // translate transformations are ignored
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
                                    util.multiplyMatrices(cssData.matrix, allTrans.ctmMatrix);
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
                        slideToString = function ($s) {
                            var id = $s.attr('id');
                            return !!id ? ' #' + id : ' at index ' + viewport.world.$slides.index($s);
                        },
                        decompose2dMatrix = function (coefs) {
                            // can the matrix be decomposed into rotation and scale matrices?
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
                                allTrans.ctmMatrix[0] = coefs.m11; // | a b |   | a b  . |
                                allTrans.ctmMatrix[1] = coefs.m12; // | c d | = | c d  . |
                                allTrans.ctmMatrix[3] = coefs.m21; //           | .  . . |
                                allTrans.ctmMatrix[4] = coefs.m22;

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
                            return null;
                        },
                        decompose3dMatrix = function (coefs) {
                            return null;
                        },
                        value = getTransformFromDataAttr(),
                        origin = transUtil.getTransformOriginCss($slide, outerSize);

                    if (value == null) {
                        value = load.getTransformFromCss($slide);
                        if (value == null) {
                            return getTransformDefault(origin);
                        }
                    }
                    if (value.indexOf('matrix(') == 0 || value.indexOf('matrix3d(') == 0) {
                        // slideIt assumes that all slides have origin in (0,0) but with translations (x,y) applied
                        
                        var coefs = load.getMatrixCoefs(value),
                            allTrans = coefs.is3D? decompose3dMatrix(coefs) : decompose2dMatrix(coefs);

                        if (allTrans == null) {
                            // CSS matrix is too complex. Need more info from data-transform
                            if (coefs.is3D) {
                                util.warn('Unable to read transformation matrix for slide' + slideToString($slide) + ', due to an uneven scale or to the use of skew.\nDefine your transform style in a data-transform3D attribute instead.', true);
                            } else {
                                util.warn('Unable to read transformation matrix for slide' + slideToString($slide) + ', due to an uneven scaleX and scaleY or to the use of skew.\nDefine your transform style in a data-transform2D attribute instead.', true);
                            }
                            return getTransformDefault(origin);
                        }
                        return allTrans;
                    }
                    return getTransformFromData(value, origin);
                },
                onLoadSlide: function (event) {
                    var $slide = viewport.world.$slides.eq(load.processedSlides),
                        loadSuccess = function () {
                            loadSuccessExternal(this.complete, this.naturalWidth, this.naturalHeight);
                        },
                        loadSuccessExternal = function (complete, naturalWidth, naturalHeight) {
                            if (complete && typeof naturalWidth != "undefined" && naturalWidth > 0) {
                                load.getOtherSizes(slideSizes, $slide, naturalWidth, naturalHeight);
                                load.processSlide($slide, slideSizes);
                            } else {
                                load.getOtherSizes(slideSizes, $slide, 1, 1);
                                load.processSlide($slide, slideSizes);
                            }
                        },
                        loadFailure = function () {
                            load.getOtherSizes(slideSizes, $slide, 1, 1);
                            load.processSlide($slide, slideSizes);
                        };
                    
                    // IE9 renders a black block, when both -ms-transform and filter are defined. To work around this, need to remove filter
                    if (data.isIE9 && $slide.css('msTransform') != '' && $slide.css('filter') != '') {
                        $slide.css('filter', '');
                    }
                    var isImg = $slide.is('img'),
                        isImgAjax = $slide.is('img[data-src]'),
                        slideSizes = load.getSlideSizes($slide);
                    if (slideSizes.size.x === 0 || slideSizes.size.y === 0 || isImgAjax && (util.toInt($slide.attr('width')) == 0 || util.toInt($slide.attr('height')) == 0)) { // size is unknown and slide does not contain any valid width/height attribute
                        if (isImg) {
                            if (isImgAjax) { // ajax img without width/height attribute defined
                                load.ajax.doLoad($slide, loadSuccessExternal, loadFailure);
                            } else { // non ajax img without width/height attribute defined
                                $slide.load(loadSuccess).error(loadFailure);
                            }
                        } else {
                            // slides should have a non-zero dimension. In the rare case of zero size element, assume 1x1 instead. This is reasonable workaround. 
                            load.getOtherSizes(slideSizes, $slide, 1, 1);
                            load.processSlide($slide, slideSizes);
                        }
                    } else {
                        load.processSlide($slide, slideSizes);
                    }
                },
                processSlide: function ($slide, slideSizes) {
                    load.pushSlideData($slide, slideSizes);
                    if (++load.processedSlides < data.qtSlides) {
                        $viewport.triggerHandler('loadSlide.rsSlideIt');
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
                getSlideSizes: function ($slide) {
                    var ieFilter, ieMsFilter;
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
                    return sizes;
                },
                pushSlideData: function ($slide, slideSizes) {
                    var cssTransforms = this.getTransformInfo($slide, slideSizes.outerSize),
                        slideChildren = this.getChildren($slide);

                    data.slideData.push({
                        center: { // center of element, with origin pointing to this element's topleft (0,0,0)
                            x: slideSizes.outerSize.x / 2,
                            y: slideSizes.outerSize.y / 2,
                            z: 0
                        },
                        // centerTrans is computed later
                        centerTrans: { x: 0, y: 0 }, // same as center but with transformations applied and origin set to (viewport.world.$elem) topleft
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
                        cssTransforms: cssTransforms,
                        nextSibling: viewport.world.$slides.index($slide.next(opts.selector.slide)),
                        firstChild: slideChildren.length === 0 ? -1: viewport.world.$slides.index(slideChildren.eq(0))
                    });
/*
                    if ($slide.css('display') == 'block') {
                        $slide.css('display', 'inline-block');
                    }
                    $slide.css({
                        'width': slideSizes.size.x + 'px',
                        'height': slideSizes.size.y + 'px'
                    });
*/
                },
                getChildren: function ($slide) {
                    // Find all direct children of $slide (children with the given opts.selector.slide selector), but
                    // those children might not necessarily be immediately below the parent, hierarchy speaking.
                    // e.g., given this tree, where span are slides and div are not slides
                    //                                  The function returns:
                    //  span1                                 getChildren(span1) = []
                    //  span2                                 getChildren(span2) = [span3]
                    //    span3                               getChildren(span3) = []
                    //  span4                                 getChildren(span4) = [span5, span6, span7]  (not span8, because only direct children)
                    //    div
                    //      span5                             getChildren(span5) = []
                    //      span6                             getChildren(span6) = []
                    //    span7                               getChildren(span7) = [span8]
                    //      span8                             getChildren(span8) = []
                    return $slide.
                            find(opts.selector.slide).
                            filter(function (i, e) {
                                return $(e).parent().closest(opts.selector.slide).is($slide);
                            });
                },

                setSlidePos: function () {
                    var $slide, slideData, slidePos, parents,
                        worldOffset = viewport.world.$elem.offset(),
                        getPosition = function ($slide) {
                            var offset = $slide.offset();
                            return {
                                left: offset.left - worldOffset.left,
                                top: offset.top - worldOffset.top
                            };
                        },
                        getOffset = function ($slide) {
                            var matrixCssStr = load.getTransformFromCss($slide);
                            if (matrixCssStr !== null && (matrixCssStr.indexOf('matrix(') == 0 || matrixCssStr.indexOf('matrix3d(') == 0)) {
                                var coefs = load.getMatrixCoefs(matrixCssStr);
                                if (coefs.is3D) {
                                    return { x: coefs.tx, y: coefs.ty, z: coefs.tz };
                                }
                                return { x: coefs.tx, y: coefs.ty, z: 0 };
                            }
                            return { x: 0, y: 0, z: 0 };
                        };
                    viewport.world.setFinalSize();
                    if (data.qtSlides > 0) {
                        this.doSetSlidePos(0, getPosition, getOffset, [], {x:0, y:0, z:0});
                        console.log(data.slideData);
                        zoomUtil.initZoom(opts.initialZoom, opts.zoomMin, opts.initialSlide);
                        data.gotoSlide(opts.initialSlide);
                        zoomUtil.calcLongestPath();
                        $viewport.triggerHandler('create.rsSlideIt');
                        load.ajax.doLoad();
                    } else {
                        $viewport.triggerHandler('create.rsSlideIt');
                    }
                },
                doSetSlidePos: function(index, getPositionFunc, getOffsetFunc, parents, totalOffset) {
                    var $slide, slideData, slidePos, topLeftOuter,
                        origin, matrixOffset, parentCtmMatrix;
                    do {
                        $slide = viewport.world.$slides.eq(index);
                        matrixOffset = getOffsetFunc($slide);
                        slideData = data.slideData[index];
                        
                        console.log('+', $slide.attr('id'));

                        if (slideData.firstChild > -1) {
                            $slide.css({
                                '-webkit-transform-style': 'flat'
                            });
                        }
                        if (parents.length > 0) {
                            $slide.css({
                                '-webkit-transform': 'none'
                            });
                        }
                        slidePos = getPositionFunc($slide);

                        if (slideData.firstChild > -1) {
                            $slide.css({
                                '-webkit-transform': 'none',
                                '-webkit-transform-style': ''
                            });
                        }

                        if (parents.length > 0) {
                            var centerTrans = {
                                x: slidePos.left + slideData.center.x,
                                y: slidePos.top + slideData.center.y,
                                z: 0
                            }, childOrigin = {
                                x: slidePos.left + slideData.cssTransforms.origin.x,
                                y: slidePos.top + slideData.cssTransforms.origin.y,
                                z: 0
                            }, parentSlideData = data.slideData[parents[0]];

                            if (!data.slideData[parents[0]].originRelativeToParent) {
                                var firstParentPos = getPositionFunc(viewport.world.$slides.eq(parents[0]))
                                parentSlideData.originRelativeToParent = {
                                    x: firstParentPos.left + parentSlideData.cssTransforms.origin.x,
                                    y: firstParentPos.top + parentSlideData.cssTransforms.origin.y,
                                    z: 0
                                };
                            }

                            // this loop runs at least one time
                            for (var parentIdx = 0; parentIdx < parents.length; ++parentIdx) {
                                parentSlideData = data.slideData[parents[parentIdx]];
                                if (parentIdx == 0) {
                                    parentCtmMatrix = parentSlideData.cssTransforms.ctmMatrix;
                                } else {
                                    parentCtmMatrix = util.getInvertedMatrix(util.multiplyMatrices(
                                        data.slideData[parents[parentIdx - 1]].cssTransforms.originalMatrix || data.slideData[parents[parentIdx - 1]].cssTransforms.ctmMatrix,
                                        (parentSlideData.cssTransforms.originalMatrix || parentSlideData.cssTransforms.ctmMatrix).slice()));
                                }
                                if (!slideData.originRelativeToParent) {
                                    centerTrans = transUtil.getTransformedPoint(centerTrans, parentCtmMatrix, parentSlideData.originRelativeToParent);
                                    childOrigin = transUtil.getTransformedPoint(childOrigin, parentCtmMatrix, parentSlideData.originRelativeToParent);
                                }
                            }

                            if (!slideData.originRelativeToParent) {
                                slideData.centerTrans = centerTrans;
                                slideData.originRelativeToParent = {
                                    x: childOrigin.x,
                                    y: childOrigin.y,
                                    z: childOrigin.z
                                };
                            }
                            
                            if (!slideData.cssTransforms.originalMatrix) {
                                slideData.cssTransforms.originalMatrix = slideData.cssTransforms.ctmMatrix.slice();
                            }
                            slideData.cssTransforms.ctmMatrix = util.multiplyMatrices(slideData.cssTransforms.ctmMatrix, parentSlideData.cssTransforms.ctmMatrix.slice());
                            util.roundMatrixToTrigonometricBounds(slideData.cssTransforms.ctmMatrix);

                            matrixOffset = transUtil.getTransformedPoint(matrixOffset, parentSlideData.cssTransforms.ctmMatrix);

                            slideData.centerTrans = transUtil.getTransformedPoint(slideData.centerTrans, util.getInvertedMatrix(util.multiplyMatrices(parentCtmMatrix, slideData.cssTransforms.originalMatrix.slice())), slideData.originRelativeToParent);
                            slideData.centerTrans.x += totalOffset.x + matrixOffset.x;
                            slideData.centerTrans.y += totalOffset.y + matrixOffset.y;
                            slideData.centerTrans.z += totalOffset.z + matrixOffset.z;
                            
                            // push the parent transformations into this slide
                            var parentTransfs = parentSlideData.cssTransforms.transformations;
                            for(var p = parentTransfs.length - 1; p > -1; --p) {
                                slideData.cssTransforms.transformations.unshift({
                                    id:         parentTransfs[p].id,
                                    valueIdent: parentTransfs[p].valueIdent,
                                    valueInv:   parentTransfs[p].valueInv, 
                                    matrixInv:  parentTransfs[p].matrixInv.slice()
                                });
                            }
                        } else {
                            topLeftOuter = transUtil.getTransformedRect(slideData.outerSize, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin).topLeft;
                            slideData.centerTrans = transUtil.getTransformedPoint(slideData.center, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin);
                            slideData.centerTrans.x += slidePos.left - topLeftOuter.x;
                            slideData.centerTrans.y += slidePos.top - topLeftOuter.y;
                            slideData.centerTrans.z += matrixOffset.z;
                        }

                        if (slideData.firstChild > -1) {
                            parents.push(index);
                            this.doSetSlidePos(slideData.firstChild, getPositionFunc, getOffsetFunc, parents, {
                                x: totalOffset.x + matrixOffset.x,
                                y: totalOffset.y + matrixOffset.y,
                                z: totalOffset.z + matrixOffset.z
                            });
                            parents.pop();
                        }
                        $slide.css({
                            '-webkit-transform': '',
                            '-webkit-transform-style': ''
                        });
                        console.log('-', $slide.attr('id'), ' slidePos=(',slidePos.left, ',', slidePos.top, ') $position=(', 
                            $slide.position().left, ',', $slide.position().top, ') offset=(', $slide.offset().left,',', $slide.offset().top, ') centerTrans=', slideData.centerTrans);
                        index = slideData.nextSibling;
                    } while (index > -1);
                },
/*

                setSlidePos: function () {
                    var $slide, slideData, slidePos, parents, clientOriginTransfParent,
                        worldOffset = viewport.world.$elem.offset(),
                        getPosition = function ($slide) {
                            var offset = $slide.offset();
                            return {
                                left: offset.left - worldOffset.left,
                                top: offset.top - worldOffset.top
                            };
                        },
                        transformDataStack = [],
                        pushTransformData = function () {
                            var childrenQt = load.getChildren($slide).length;
                            if (childrenQt > 0) {
                                transformDataStack.push({
                                    parent: $slide,
                                    childrenQt: childrenQt
                                });
                            }
                            $slide.css({
//                                '-webkit-transform': 'none',
                                '-webkit-transform-style': 'initial'
                            });
                            return childrenQt;
                        },
                        popTransformData = function () {
                            var stackSize = transformDataStack.length;
                            while (stackSize > 0 &&
                                   !transformDataStack[stackSize - 1].parent.is($slide) &&
                                   --transformDataStack[stackSize - 1].childrenQt === 0) {
                                transformDataStack.pop().parent.css({
//                                    '-webkit-transform': '',
                                    '-webkit-transform-style': ''
                                });
                                stackSize--;
                            }
                        };

                    for (var i = 0; i < data.qtSlides; ++i) {
                        $slide = viewport.world.$slides.eq(i);
                        slideData = data.slideData[i];

                        parents = $viewport.find($slide.parent().closest(opts.selector.slide)).map(function (i, e) {
                            var index = viewport.world.$slides.index(e);
                            return index === -1 ? null : index;
                        }).get();
                        var qtChildren = pushTransformData();
                        slidePos = getPosition($slide);
                        if (parents.length === 0) { // parents array has either zero or one elements
                            $slide.css({
//                                '-webkit-transform': ''
                            });
                        }
                        $slide.css({
                            '-webkit-transform-style': ''
                        });
                        if (data.isMozilla11orBelow) {
                            // Mozilla (up to 11.0b8) returns incorrect position for transformed elements, so there is a need to make an adjustment
                            var topLeft = transUtil.getTransformedRect(slideData.size, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin).topLeft;
                            slidePos.left += topLeft.x;
                            slidePos.top += topLeft.y;
                        }
                        

                        if (parents.length > 0) {
                            var composedMatrix = transUtil.getMatrixIdentity();
                            util.multiplyMatrices(data.slideData[parents[0]].cssTransforms.ctmMatrix, composedMatrix);
                            if (qtChildren === 0 && false) {
                                $slide.css({
                                    '-webkit-transform': 'none'
                                });
                            }
                            $slide.css({
                                '-webkit-transform-style': 'initial'
                            });
                            slidePos = getPosition($slide);
                            console.log('child pos = ', slidePos);
                            if (qtChildren === 0 && false) {
                                $slide.css({
                                    '-webkit-transform': ''
                                });
                            }
                            $slide.css({
                                '-webkit-transform-style': ''
                            });
                            popTransformData();

                            slideData.centerTrans = transUtil.getTransformedPoint({
                                x: slidePos.left + slideData.center.x,
                                y: slidePos.top + slideData.center.y,
                                z:0
                            }, composedMatrix, data.slideData[parents[0]].centerTrans);

                            clientOriginTransfParent = transUtil.getTransformedPoint({
                                x: slidePos.left + slideData.cssTransforms.origin.x,
                                y: slidePos.top + slideData.cssTransforms.origin.y,
                                z:0
                            }, composedMatrix, data.slideData[parents[0]].centerTrans);

                            slideData.centerTrans = transUtil.getTransformedPoint(slideData.centerTrans, slideData.cssTransforms.ctmMatrix, clientOriginTransfParent);
                            util.multiplyMatrices(slideData.cssTransforms.ctmMatrix, composedMatrix);
                            slideData.cssTransforms.ctmMatrix = composedMatrix.slice(); // copies composedMatrix array into another (by value)

                            // push the parent transformations into this slide
                            var parentTransfs = data.slideData[parents[0]].cssTransforms.transformations;
                            for(var p = parentTransfs.length - 1; p > -1; --p) {
                                slideData.cssTransforms.transformations.unshift({
                                    id:         parentTransfs[p].id,
                                    valueIdent: parentTransfs[p].valueIdent,
                                    valueInv:   parentTransfs[p].valueInv, 
                                    matrixInv:  parentTransfs[p].matrixInv.slice()
                                });
                            }
                            
                        } else {
                            //if (i==2) debugger;

                            if ($slide.hasClass("old")) {
                                var topLeftOuter = transUtil.getTransformedRect(slideData.outerSize, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin).topLeft;
                                slideData.centerTrans = transUtil.getTransformedPoint(slideData.center, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin);
                                slideData.centerTrans.x += slidePos.left - topLeftOuter.x;
                                slideData.centerTrans.y += slidePos.top - topLeftOuter.y;
                            } else {
                                clientOriginTransfParent = {
                                    x: slidePos.left + slideData.cssTransforms.origin.x,
                                    y: slidePos.top + slideData.cssTransforms.origin.y,
                                    z: 0
                                };
                                slideData.centerTrans = transUtil.getTransformedPoint({x: slidePos.left + slideData.center.x, y: slidePos.top + slideData.center.y, z:0}, slideData.cssTransforms.ctmMatrix, clientOriginTransfParent);
                            }
                            
                            console.log('(' + slidePos.left + ',' + slidePos.top + ') ['+i+']' + slideData.centerTrans.x + ',' + slideData.centerTrans.y + ',' + slideData.centerTrans.z);
                        }
                    }

                    viewport.world.setFinalSize();

                    if (data.qtSlides > 0) {
                        zoomUtil.initZoom(opts.initialZoom, opts.zoomMin, opts.initialSlide);
                        data.gotoSlide(opts.initialSlide);
                        zoomUtil.calcLongestPath();
                        $viewport.triggerHandler('create.rsSlideIt');
                        load.ajax.doLoad();
                    } else {
                        $viewport.triggerHandler('create.rsSlideIt');
                    }
                },
*/



                /*
                setSlidePos: function () {
                    var $slide, slideData, slidePos, parents,
                        worldOffset = viewport.world.$elem.offset(),
                        getPosition = function ($slide) {
                            var offset = $slide.offset();
                            return {
                                left: offset.left - worldOffset.left,
                                top: offset.top - worldOffset.top
                            };
                        };
                    for (var i = 0; i < data.qtSlides; ++i) {
                        $slide = viewport.world.$slides.eq(i);
                        slideData = data.slideData[i];
                        var $children = $slide.find(viewport.world.$slides),
                            transformData = $slide.css('-webkit-transform');

                        if ($children.length > 0) {
                            $slide.css('-webkit-transform', 'none');
                        }
                        slidePos = getPosition($slide);
                        if ($children.length > 0) {
                            $slide.css('-webkit-transform', transformData);
                        }
                        if (data.isMozilla11orBelow) {
                            // Mozilla (up to 11.0b8) returns incorrect position for transformed elements, so there is a need to make an adjustment
                            var topLeft = transUtil.getTransformedRect(slideData.size, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin).topLeft;
                            slidePos.left += topLeft.x;
                            slidePos.top += topLeft.y;
                        }
                        
                        parents = $viewport.find($slide.parent().closest(opts.selector.slide)).map(function (i, e) {
                            var index = viewport.world.$slides.index(e);
                            return index === -1 ? null : index;
                        }).get();

                        if (parents.length > 0) { // parents array has either zero or one elements
                            var composedMatrix = transUtil.getMatrixIdentity();
                            util.multiplyMatrices(data.slideData[parents[0]].cssTransforms.ctmMatrix, composedMatrix);
                        
                            viewport.world.$slides.eq(parents[0]).add($slide).css('-webkit-transform', 'rotateX(0deg)');
                            console.log('parent pos = ', getPosition(viewport.world.$slides.eq(parents[0])));
                            slidePos = getPosition($slide);
                            console.log('child pos = ', slidePos);
                            viewport.world.$slides.eq(parents[0]).css('-webkit-transform', 'rotateX(-60deg)');
                            $slide.css('-webkit-transform', 'rotateX(-40deg)');
                            
                            slideData.centerTrans = transUtil.getTransformedPoint({x: slidePos.left + slideData.center.x, y: slidePos.top + slideData.center.y, z:0}, composedMatrix, data.slideData[parents[0]].centerTrans);
                            var clientOriginTransfParent = transUtil.getTransformedPoint({x: slidePos.left + slideData.cssTransforms.origin.x, y: slidePos.top + slideData.cssTransforms.origin.y, z:0}, composedMatrix, data.slideData[parents[0]].centerTrans);
                            slideData.centerTrans = transUtil.getTransformedPoint(slideData.centerTrans, slideData.cssTransforms.ctmMatrix, clientOriginTransfParent);
                            util.multiplyMatrices(slideData.cssTransforms.ctmMatrix, composedMatrix);
                            slideData.cssTransforms.ctmMatrix = composedMatrix.slice(); // copies composedMatrix array into another (by value)
                         
                            console.log('CenterTrans: parent=', data.slideData[parents[0]].centerTrans, ' child=', slideData.centerTrans);
   
                        // push the parent transformations into this slide
                            var parentTransfs = data.slideData[parents[0]].cssTransforms.transformations;
                            for(var p = parentTransfs.length - 1; p > -1; --p) {
                                slideData.cssTransforms.transformations.unshift({
                                    id:         parentTransfs[p].id,
                                    valueIdent: parentTransfs[p].valueIdent,
                                    valueInv:   parentTransfs[p].valueInv, 
                                    matrixInv:  parentTransfs[p].matrixInv.slice()
                                });
                            }
                        } else {
                            var topLeftOuter = transUtil.getTransformedRect(slideData.outerSize, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin).topLeft;
                            slideData.centerTrans = transUtil.getTransformedPoint(slideData.center, slideData.cssTransforms.ctmMatrix, slideData.cssTransforms.origin);
                            slideData.centerTrans.x += slidePos.left - topLeftOuter.x;
                            slideData.centerTrans.y += slidePos.top - topLeftOuter.y;
                        }
                    }

                    viewport.world.setFinalSize();

                    if (data.qtSlides > 0) {
                        zoomUtil.initZoom(opts.initialZoom, opts.zoomMin, opts.initialSlide);
                        data.gotoSlide(opts.initialSlide);
                        zoomUtil.calcLongestPath();
                        $viewport.triggerHandler('create.rsSlideIt');
                        load.ajax.doLoad();
                    } else {
                        $viewport.triggerHandler('create.rsSlideIt');
                    }
                },
                */
                ajax: {
                    slidesArray: null,
                    toProcess: 0,
                    quant: 0,
                    init: function () {
                        this.slidesArray = $.makeArray(viewport.world.$slides.filter($('img[data-src]')));
                        this.toProcess = this.quant = this.slidesArray.length;
                    },
                    doLoad: function ($loadThisSlide, successEvent, failureEvent) {
                        var doAjax = function ($slide) {
                            $slide.load(function () {
                                var success = this.complete && typeof this.naturalWidth != "undefined" && this.naturalWidth > 0;
                                $viewport.triggerHandler('ajaxLoadSlide.rsSlideIt', [$slide, load.ajax.quant - load.ajax.toProcess + 1, success]);
                                if (--load.ajax.toProcess == 0) {
                                    $viewport.triggerHandler('ajaxLoadEnd.rsSlideIt');
                                }
                                if (successEvent) {
                                    successEvent(this.complete, this.naturalWidth, this.naturalHeight);
                                }
                            }).error(function () {
                                $viewport.triggerHandler('ajaxLoadSlide.rsSlideIt', [$slide, load.ajax.quant - load.ajax.toProcess + 1, false]);
                                if (--load.ajax.toProcess == 0) {
                                    $viewport.triggerHandler('ajaxLoadEnd.rsSlideIt');
                                }
                                if (failureEvent) {
                                    failureEvent();
                                }
                            }).attr('src', $slide.attr('data-src'));
                        };
                        
                        if (this.quant > 0) {
                            if (this.toProcess == this.quant) {
                                $viewport.triggerHandler('ajaxLoadBegin.rsSlideIt', [this.quant]);
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
            this.trigger('singleTransition.rsSlideIt', [optsGoto]);
        },
        playPause = function (optionsSequence) {
            var optsSequence = $.extend({}, $.fn.rsSlideIt.defaultsPlayPause, optionsSequence);
            this.trigger('playPause.rsSlideIt', [optsSequence]);
        },
        stop = function () {
            this.trigger('stop.rsSlideIt');
        },
        option = function (options) {
            if (typeof arguments[0] === 'string') {
                var op = arguments.length == 1 ? 'getter' : (arguments.length == 2 ? 'setter' : null);
                if (op) {
                    return this.eq(0).triggerHandler(op + '.rsSlideIt', arguments);
                }
            }
        },
        destroy = function () {
            this.trigger('destroy.rsSlideIt');
        };


        if (typeof options === 'string') {
            var otherArgs = Array.prototype.slice.call(arguments, 1);
            switch (options) {
                case 'transition': return transitionTo.apply(this, otherArgs);
                case 'playPause': return playPause.apply(this, otherArgs);
                case 'stop': return stop.call(this);
                case 'option': return option.apply(this, otherArgs);
                case 'destroy': return destroy.call(this);
                default: return this;
            }
        }
        var opts = $.extend({}, $.fn.rsSlideIt.defaults, options);
        opts.data3D = $.extend({}, $.fn.rsSlideIt.defaults.data3D, options ? options.data3D : options);
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
        zoomMin: 0.4,           // Minimum zoom possible. Type: floating point number greater than zero.
        zoomStep: 0.1,          // Value incremented to the current zoom, when mouse wheel moves up. When mouse wheel moves down, current zoom is decremented by this value.
                                // To reverse direction, use negative zoomStep. To disable zoom on mouse wheel, do not set zoomStep to zero, but set mouseZoom to false instead. Type: floating point number.
        zoomMax: 30,            // Maximun zoom possible. Type: floating point number.
        initialSlide: 0,        // Active slide when plugin is initialized. Type: zero-based integer.
        initialZoom: 1,         // Scale used when plugin is initialized. Type: positive floating point number or strings 'fitWidth' or 'fitHeight' or 'fit' or 'cover'.
        mouseZoom: true,        // Determines whether mouse wheel is used to zoom in/out. The onMouseWheel event (see below) is called, even if mouseZoom is false. Type: boolean.
        mousePan: true,         // Determines whether mouse panning is allowed. Type: boolean.
        width: null,            // Viewport width in pixels. If null then uses the width defined in CSS. Type: integer.
        height: null,           // Viewport height in pixels. If null then uses the width defined in CSS. Type: integer.
        data3D: {
            viewportClass: 'transf3D', // Class(es) added to the viewport element if browser does support 3D transformations (requires Modernizr lib with "CSS 3D Transforms" detection feature). Type: string.
            perspective: 500
        },
        selector: {
            slide: 'img',           // jQuery selector string for all slide elements. Type: string.
            caption: '.caption',    // jQuery selector string for all text elements for each slide. Type: string.
            elementsOnTop: null     // jQuery selector string for the elements on top of the viewport element (if any). Type: string.
        },
        events: {
            onCreate: null,                 // Fired when plug-in has been initialized. Type: function (event).
            onAjaxLoadBegin: null,          // Fired before starting to make ajax requests. Type: function (event, qtTotal).
            onAjaxLoadSlide: null,          // Fired after an ajax response has been received successfully or unsuccessfully. Type: function (event, $ajaxSlide, index, success).
            onAjaxLoadEnd: null,            // Fired after all ajax responses have been received (immediately after the last onAjaxLoadSlide). Type: function (event).
            onMouseWheel: null,             // Fired when mouse whell moves upwards or downwards. Type: function (event, up).
            onChangeZoom: null,             // Fired when zoom changes, due to mouse wheel actions or by transitions. Type: function (event, zoom).
            onBeginPan: null,               // Fired when the user starts to pan around. Type: function (event).
            onEndPan: null,                 // Fired when the user finishes to pan around. Type: function (event).
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
        userInteract: true,     // true: user can zoom and pan while slideshow is standing still; false: otherwise 
        onPlay: null,           // Fired when the sequence starts to run
        onStop: null,           // Fired when the whole sequence is completed (only if repeat is not 'forever')
        onPause: null,          // Fired when the sequence pauses in a specific slide
        onBeginTrans: null,     // Fired when the transition within the sequence starts to run
        onEndTrans: null,       // Fired when the transition within the sequence is completed
        onBeginDelay: null,     // Fired when slideshow pauses for some time on a specific slide. Type: function(event, slide, delay)
        onEndDelay: null        // Fired when the delay performed on a specific slide has finished. Type: function(event, slide)
   };
})(jQuery);