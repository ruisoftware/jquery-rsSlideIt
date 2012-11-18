/**
* jQuery SliteIt - Displays a slide show
* ====================================================
*
* Licensed under The MIT License
* 
* @version   1.5
* @since     01.11.2011
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
                elementCenter: { x: 0, y: 0 },
                slideData: [],
                qtSlides: 0,
                init: function () {
                    this.qtSlides = container.$slides.length;
                    this.$elemAndTops = $elem.add(this.$elemsOnTop);
                },
                setCenterPos: function () {
                    this.elementCenter.x = $elem.width() / 2;
                    this.elementCenter.y = $elem.height() / 2;
                },
                activeSlide: {
                    $slide: null,
                    index: -1
                },
                sortedX: [],
                sortedY: [],
                findPnt: function(findX, elem, sortedArray, callbackGetValue, callbackOffsetParam) {
                    var from = 0,
                        len = sortedArray.length,
                        to = len - 1,
                        middle = -2,
                        middleValue,
                        slideData;
                    while (from <= to) {
                        middle = Math.floor((from + to)/ 2);
                        slideData = this.slideData[sortedArray[middle]];
                        middleValue = callbackGetValue(findX, slideData, callbackOffsetParam);
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
                            middleValue = callbackGetValue(findX, slideData, callbackOffsetParam);
                            if (middleValue < elem) {
                                ++middle;
                            }
                        }
                    }
                    return { found: false, idx: (middle < 0 ? 0 : middle) };
                },
                insertSorted: function () {
                    var slideData,
                        getCoordsIns;
                    if (Math.cos(core.rotation.currAngle) > 0.9995) {
                        // no rotation (could use the same getCoordsIns() below, but since there is no rotation, ie, cos(a)=1, it is more optimized to simple use (pos + center)
                        getCoordsIns = function(isX, slideData) {
                            return isX ? slideData.pos.x + slideData.center.x : slideData.pos.y + slideData.center.y;
                        };
                    } else {
                        getCoordsIns = function(isX, slideData) {
                            return slideData.radius * (isX ? Math.cos(core.rotation.currAngle - slideData.angleToCenter) : Math.sin(core.rotation.currAngle - slideData.angleToCenter));
                        };
                    }
                    delete this.sortedX;
                    delete this.sortedY;
                    this.sortedX = [];
                    this.sortedY = [];
                    for (var i = 0; i < this.qtSlides; i++) {
                        slideData = this.slideData[i];
                        this.sortedX.splice(this.findPnt(true, getCoordsIns(true, slideData), this.sortedX, getCoordsIns).idx, 0, i);
                        this.sortedY.splice(this.findPnt(false, getCoordsIns(false, slideData), this.sortedY, getCoordsIns).idx, 0, i);
                    }
                },
                getCoords: function (isX, slideData, offset) {
                    return isX ?
                        zoomUtil.scale(slideData.radius) * Math.cos(core.rotation.currAngle - slideData.angleToCenter) + offset.x :
                        zoomUtil.scale(slideData.radius) * Math.sin(core.rotation.currAngle - slideData.angleToCenter) + offset.y;
                },
                getCoordsIE: function (isX, slideData, offset) {
                    return isX ? slideData.centerTrans.x + offset.x : slideData.centerTrans.y + offset.y;
                },
                findRange: function (isXrange, range, offset) {
                    var sortedArray = (isXrange ? this.sortedX : this.sortedY),
                        callback = core.isIE8orBelow ? data.getCoordsIE : data.getCoords,
                        findResultFrom = this.findPnt(isXrange, range[0], sortedArray, callback, offset),
                        findResultTo = this.findPnt(isXrange, range[1], sortedArray, callback, offset),
                        value,
                        slideData;
                    if (findResultFrom.found) { // get the first point with the same x or y value
                        value = range[0];
                        while (findResultFrom.idx > 0 && value === range[0]) {
                            --findResultFrom.idx;
                            slideData = this.slideData[sortedArray[findResultFrom.idx]];
                            value = callback(isXrange, slideData, offset);
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
                            value = callback(isXrange, slideData, offset);
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
                findRangeX: function(range, offset) {
                    return this.findRange(true, range, offset);
                },
                findRangeY: function(range, offset) {
                    return this.findRange(false, range, offset);
                }               
            },
            
            container = {    // container is the first DIV element inside the slideIt element
                $paddingDiv: null,
                $zoomDiv: null,
                $slides: null, // set with all slide elements
                size: { x: 0, y: 0 },
                IEorigSize: { x: 0, y: 0 }, // IE needs to compute based on unscaled (original) container size
                pad: { x: 0, y: 0 },
                setPad: function () {
                    this.pad.x = this.pad.y = Math.max(data.elementCenter.x, data.elementCenter.y);
                    this.$paddingDiv.css({
                        'padding-top': this.pad.y + 'px',
                        'padding-right': this.pad.x + 'px',
                        'padding-bottom': this.pad.y + 'px',
                        'padding-left': this.pad.x + 'px'
                    });
                },
                setSizeForIE: function () {
                    this.IEorigSize.x = this.$zoomDiv.width();
                    this.IEorigSize.y = this.$zoomDiv.height();
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
                    if (!!opts.layout.overflow) { $elem.css('overflow', opts.layout.overflow); }
                    data.setCenterPos();
                    $elem.wrapInner('<div />');
                    this.$paddingDiv = $('div:eq(0)', $elem);
                    this.$paddingDiv.wrapInner('<div />');
                    this.$zoomDiv = $('div:eq(0)', this.$paddingDiv);
                    this.$slides = $(opts.selector.slide, this.$zoomDiv);
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
                init: function (optsSequence) {
                    this.idx = 0;
                    this.state = $.fn.rsSlideIt.state.PLAY;
                    transData.reset();
                    transData.onBegin = optsSequence.onBeginTrans;
                    transData.onEnd = optsSequence.onEndTrans;
                    transData.inputOpts = optsSequence;
                    transData.isPrevOrNext = (typeof optsSequence.sequence === 'string') && (optsSequence.sequence == 'prev' || optsSequence.sequence == 'next');
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
                        degrees: (optsSequence.degrees !== null && typeof optsSequence.degrees === 'object') ? optsSequence.degrees.length : 0,
                        durations: (typeof optsSequence.duration === 'object') ? optsSequence.duration.length : 0
                    };
                },
                firePauseStopEvents: function () {
                    switch (this.state) {
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
                }
            },
            
            transData = {     // data for the current transition that is running
                $animObj: null,
                slide: null,
                duration: null,
                zoomDest: null,
                zoomVertex: null,
                degrees: null,
                onBegin: null,
                onEnd: null,                    // user event for complete standalone transition
                onEndTransSlideShow: null,      // internal event for complete transition within a set of transitions (slide show)
                inputOpts: null,
                isPrevOrNext: false,
                animating: false,
                stopAnimation: false,
                isThisPartOfSlideShow: function () { // slide show is running? (true) Or just a single transition is running? (false)
                    return !!this.onEndTransSlideShow;
                },
                reset: function () {
                    this.slide = this.duration = this.zoomDest = this.zoomVertex = this.degrees = this.onEndTransSlideShow = null;
                },
                setupNextTrans: function () {
                    this.slide = this.isPrevOrNext ? this.inputOpts.sequence : this.inputOpts.sequence[seqData.idx % seqData.qt.sequences];
                    this.duration = seqData.qt.durations == 0 ? this.inputOpts.duration : this.inputOpts.duration[seqData.idx % seqData.qt.durations];
                    this.zoomDest = seqData.qt.zoomDests == 0 ? this.inputOpts.zoomDest : this.inputOpts.zoomDest[seqData.idx % seqData.qt.zoomDests];
                    this.zoomVertex = seqData.qt.zoomVertexes == 0 ? this.inputOpts.zoomVertex : this.inputOpts.zoomVertex[seqData.idx % seqData.qt.zoomVertexes];
                    this.degrees = seqData.qt.degrees == 0 ? this.inputOpts.degrees : this.inputOpts.degrees[seqData.idx % seqData.qt.degrees];
                },
                finished: function (transOnComplete) {
                    var done = function () {
                        seqData.timeoutId = null;
                        transData.animating = false;
                        if (transOnComplete) {
                            ++seqData.idx;
                            transOnComplete();
                        }
                    };

                    if (this.isThisPartOfSlideShow()) {
                        // transition that ran integrated in a sequence
                        if (seqData.state === $.fn.rsSlideIt.state.PLAY) {
                            if (this.onEnd) { // transition
                                this.onEnd();
                            }
                            seqData.timeoutId = setTimeout(done, seqData.qt.delays == 0 ? transData.inputOpts.delayOnSlide : transData.inputOpts.delayOnSlide[seqData.idx % seqData.qt.delays]);
                        } else {
                            done();
                            if (seqData.state === $.fn.rsSlideIt.state.PLAY) {
                                seqData.state = $.fn.rsSlideIt.state.STOP;
                            }
                        }
                    } else {
                        // standalone transition
                        done();
                    }
                },
                onStopAnimation: function (center) {
                    core.calcRotInfo(center);
                    if (core.isIE8orBelow) {
                        core.IE.calcRotCenters(center, core.rotation.currAngle, zoomUtil.zoom);
                    }
                    this.animating = this.stopAnimation = false;
                    seqData.firePauseStopEvents();
                    events.bindEvents();
                    core.selectSlide(false);
                    this.finished(null);
                    if (seqData.state === $.fn.rsSlideIt.state.STOP) {
                        transData.reset();
                    }
                }
            },

            core = {
                gotoSlideIdx: 0,
                rotation: {
                    currAngle: 0,
                    currOrigin: null,
                    // given an $elem and their rotation angle (with rotation center on element's center point),
                    // it returns the [left, top, right, bottom] of the rectangle that outlines the rotated $elem 
                    getContainerRectCenter: function (elemAngle, size) {
                        var center = { x: size.x / 2, y: size.y / 2 };

                        // optimization
                        if (Math.abs(Math.sin(elemAngle)) < 0.000005) {
                            return {
                                topLeft: { x: 0, y: 0 },
                                bottomRight: { x: size.x, y: size.y }
                            };
                        }

                        // LT: Left Top, RT: Right Top, RB: Right Bottom, LB: Left Bottom
                        var h = Math.sqrt(center.x * center.x + center.y * center.y),
                            angle = Math.acos(center.x / h),
                            angleLT = Math.PI - angle,
                            angleRT = angle,
                            angleRB = -angleRT,
                            angleLB = -angleLT;
                        angleLT -= elemAngle;
                        angleRT -= elemAngle;
                        angleRB -= elemAngle;
                        angleLB -= elemAngle;
                        var xLT = center.x + h * Math.cos(angleLT),
                            xRT = center.x + h * Math.cos(angleRT),
                            xRB = center.x + h * Math.cos(angleRB),
                            xLB = center.x + h * Math.cos(angleLB),

                            yLT = center.y - h * Math.sin(angleLT),
                            yRT = center.y - h * Math.sin(angleRT),
                            yRB = center.y - h * Math.sin(angleRB),
                            yLB = center.y - h * Math.sin(angleLB);
                        return {
                            topLeft: {
                                x: Math.min(xLT, Math.min(xRT, Math.min(xLB, Math.min(0, xRB)))),
                                y: Math.min(yLT, Math.min(yRT, Math.min(yLB, Math.min(0, yRB))))
                            },
                            bottomRight: {
                                x: Math.max(xLT, Math.max(xRT, Math.max(xLB, Math.max(size.x, xRB)))),
                                y: Math.max(yLT, Math.max(yRT, Math.max(yLB, Math.max(size.y, yRB))))
                            }
                        };
                    },
                    getCenter: function () {
                        if (!this.currOrigin) {
                            var orig = container.$paddingDiv.css('-webkit-transform-origin');
                            if (orig) {
                                var origV = orig.split(' ');
                                this.currOrigin = { x: util.toInt(origV[0]), y: util.toInt(origV[1]) };
                            } else {
                                this.currOrigin = { x: container.$paddingDiv.width() / 2, y: container.$paddingDiv.height() / 2 };
                            }
                        }
                        return { x: this.currOrigin.x, y: this.currOrigin.y };
                    },
                    // when transform-origin is changed to an element that is rotated, that element shifts to another position.
                    // To make the element appear back to the same position, need to apply a top left margin to compensate the element shifting.
                    adjustRotOrigin: function (slideIdx, fromPos) {
                        var orig = this.getCenter();
                        if (core.isIE8orBelow) {
                            orig.x = zoomUtil.unscale(orig.x - container.pad.x);
                            orig.y = zoomUtil.unscale(orig.y - container.pad.y);

                            var newCenter = {
                                x: orig.x - zoomUtil.scale(orig.x - fromPos.x),
                                y: orig.y + zoomUtil.scale(fromPos.y - orig.y)
                            },
                                topLeftOld = core.IE.getContainerRect(orig, container.IEorigSize, core.rotation.currAngle, zoomUtil.zoom, false).topLeft,
                                topLeftNew = core.IE.getContainerRect(newCenter, container.IEorigSize, core.rotation.currAngle, zoomUtil.zoom, false).topLeft;
                            return {
                                x: zoomUtil.unscale(topLeftOld.x - topLeftNew.x),
                                y: zoomUtil.unscale(topLeftOld.y - topLeftNew.y)
                            };

                        } else {

                            var newCenter = {
                                x: zoomUtil.scale(fromPos.x) + container.pad.x,
                                y: zoomUtil.scale(fromPos.y) + container.pad.y
                            };
                            if (Math.abs(Math.round(newCenter.x) - Math.round(orig.x)) > 1 || Math.abs(Math.round(newCenter.y) - Math.round(orig.y)) > 1) {
                                var pntTopRight1 = this.getTopRight(orig, { x: zoomUtil.scale(data.slideData[slideIdx].center.x), y: -zoomUtil.scale(data.slideData[slideIdx].center.y) }),
                                    pntTopRight2 = this.getTopRight(newCenter, {
                                        x: container.pad.x + zoomUtil.scale(data.slideData[slideIdx].pos.x + data.slideData[slideIdx].slideOuterSizeNoRotation.x) - newCenter.x + 
                                            (orig.x - (container.pad.x + zoomUtil.scale(data.slideData[slideIdx].pos.x + data.slideData[slideIdx].center.x))),
                                        y: container.pad.y + zoomUtil.scale(data.slideData[slideIdx].pos.y) - newCenter.y - 
                                            (orig.y - (container.pad.y + zoomUtil.scale(data.slideData[slideIdx].pos.y + data.slideData[slideIdx].center.y)))
                                    });
                                return {
                                    x: pntTopRight1.x - pntTopRight2.x,
                                    y: pntTopRight1.y - pntTopRight2.y
                                };
                            } else {
                                return { x: 0, y: 0 };
                            }
                        }
                    },
                    getTopRight: function (center, size) {
                        var h = Math.sqrt(size.x * size.x + size.y * size.y),
                            angleBox = Math.acos(size.x / h),
                            totalAngle = (size.y > 0 ? -angleBox : angleBox) - this.currAngle;
                        return { x: h * Math.cos(totalAngle) + center.x, y: -h * Math.sin(totalAngle) + center.y };
                    },
                    getCssRotate: function (rot) {
                        var rotation = 'rotate(' + rot.toFixed(6) + 'rad)';
                        return {
                            '-webkit-transform': rotation,
                            '-moz-transform': rotation,
                            '-o-transform': rotation,
                            'msTransform': rotation,
                            'transform': rotation
                        };
                    },
                    cssRotate: function (rot, m) {
                        container.$paddingDiv.css(this.getCssRotate(rot)).css({
                            'margin-left': m.marginX + 'px',
                            'margin-top': m.marginY + 'px'
                        });
                    },
                    cssOrigin: function (origin) {
                        if (!this.currOrigin) {
                            this.currOrigin = { x: origin.x, y: origin.y };
                        } else {
                            this.currOrigin.x = origin.x;
                            this.currOrigin.y = origin.y;
                        }
                        var orig = origin.x.toFixed(6) + 'px ' + origin.y.toFixed(6) + 'px';
                        container.$paddingDiv.css({
                            '-webkit-transform-origin': orig,
                            '-moz-transform-origin': orig,
                            '-o-transform-origin': orig,
                            'msTransformOrigin': orig,
                            'transform-origin': orig
                        });
                    }
                },

                // in IE8 or below, rotation works differently from other browsers. 
                isIE8orBelow: $.browser.msie && parseInt($.browser.version) < 9,
                isIE9: $.browser.msie && parseInt($.browser.version) === 9,
                IE: {
                    // given two points, returns the angle between the center's X axis segment and the segment from center to vertex
                    // and also returns the distance between these two points
                    getHorizAngleTwoPntsAndDistance: function (center, vertex) {
                        var dist = util.getDistanceTwoPnts(center, vertex);
                        // center and vertex are the same point?
                        if (dist < 0.0001) {
                            return { angle: 0, h: 0 };
                        }
                        var alpha = Math.acos((vertex.x - center.x) / dist);
                        // center is above the vertex?
                        if (center.y < vertex.y) {
                            alpha = -alpha;
                        }
                        return { angle: alpha, h: dist };
                    },

                    // performs a rotation of angle radians, for a point distanciated from the center by h.
                    // retuns the new position of thisPnt after rotation
                    rotatePnt: function (center, angle, h) {
                        return {
                            x: center.x + h * Math.cos(angle),
                            y: center.y - h * Math.sin(angle)
                        };
                    },

                    getMatrix: function (rad, scale) {
                        var sine = Math.sin(rad) * scale,
                            cosine = Math.cos(rad) * scale;
                        return this.getMatrixStr([cosine, -sine, sine, cosine]);
                    },

                    getMatrixRotOnly: function (rad) {
                        var sine = Math.sin(rad),
                            cosine = Math.cos(rad);
                        return this.getMatrixStr([cosine, -sine, sine, cosine]);
                    },

                    getMatrixStr: function (coefs) {
                        return "progid:DXImageTransform.Microsoft.Matrix(M11=" + coefs[0].toFixed(6) + ", M12=" + coefs[1].toFixed(6) + ", M21=" + coefs[2].toFixed(6) + ", M22=" + coefs[3].toFixed(6) + ", DX=0, Dy=0, SizingMethod='auto expand');";
                    },

                    calcRotCenters: function (center, toAngle, toScale) {
                        for (var i = data.qtSlides - 1; i > -1; --i) {
                            var angleData = this.getHorizAngleTwoPntsAndDistance(center, {
                                x: data.slideData[i].pos.x + data.slideData[i].center.x,
                                y: data.slideData[i].pos.y + data.slideData[i].center.y
                            }), pointData = this.rotatePnt(center, angleData.angle - toAngle, angleData.h * toScale);
                            data.slideData[i].centerTrans.x = pointData.x + container.pad.x;
                            data.slideData[i].centerTrans.y = pointData.y + container.pad.y;
                        }
                    },

                    // given an $elem and their rotation angle (with an arbitrary rotation center), 
                    // returns the top left and the bottom right points of the rotated rectangle 
                    getContainerRect: function (center, size, toAngle, toScale, calcCenters) {
                        // size cannot be #elem.width(), $elem.height() because IE returns current outline size, need to use unrotated and unscalled size

                        // LT: Left Top, RT: Right Top, RB: Right Bottom, LB: Left Bottom
                        // +: center point located at (a, b)
                        // c: (rectangleWidth - a)
                        // d: (rectangleHeight - b)
                        // LT-------------------------------------------RT
                        // |             |                               |
                        // |             b                               |
                        // |             |                               |
                        // |-----a-------+---------------c---------------|
                        // |             |                               |
                        // |             |                               |
                        // |             d                               | 
                        // |             |                               |
                        // |             |                               |
                        // LB-------------------------------------------RB
                        // before rotating/scaling, get the angles for each of the four vertices relatively to the center point
                        var lt = $.extend({}, { x: 0, y: 0 }, this.getHorizAngleTwoPntsAndDistance(center, { x: 0, y: 0 })),
                            rt = $.extend({}, { x: size.x, y: 0 }, this.getHorizAngleTwoPntsAndDistance(center, { x: size.x, y: 0 })),
                            rb = $.extend({}, size, this.getHorizAngleTwoPntsAndDistance(center, size)),
                            lb = $.extend({}, { x: 0, y: size.y }, this.getHorizAngleTwoPntsAndDistance(center, { x: 0, y: size.y }));

                        // now scale and rotate
                        lt.h *= toScale;
                        rt.h *= toScale;
                        rb.h *= toScale;
                        lb.h *= toScale;
                        lt = $.extend({}, lt, this.rotatePnt(center, lt.angle - toAngle, lt.h));
                        rt = $.extend({}, rt, this.rotatePnt(center, rt.angle - toAngle, rt.h));
                        rb = $.extend({}, rb, this.rotatePnt(center, rb.angle - toAngle, rb.h));
                        lb = $.extend({}, lb, this.rotatePnt(center, lb.angle - toAngle, lb.h));

                        if (calcCenters) {
                            this.calcRotCenters(center, toAngle, toScale);
                        }

                        return {
                            topLeft: {
                                x: Math.min(lt.x, Math.min(rt.x, Math.min(rb.x, lb.x))),
                                y: Math.min(lt.y, Math.min(rt.y, Math.min(rb.y, lb.y)))
                            },
                            bottomRight: {
                                x: Math.max(lt.x, Math.max(rt.x, Math.max(rb.x, lb.x))),
                                y: Math.max(lt.y, Math.max(rt.y, Math.max(rb.y, lb.y)))
                            }
                        };
                    },

                    setPaddings: function (padding) {
                        container.$paddingDiv.css({
                            'padding-left': (padding.x > 0 ? padding.x : 0) + 'px',
                            'padding-top': (padding.y > 0 ? padding.y : 0) + 'px',

                            // negative paddings do not work in IE, so need to "move" these negative paddings
                            // to margins and if they are positive just ignore them (use zero)
                            'margin-left': (padding.x > 0 ? 0 : padding.x) + 'px',
                            'margin-top': (padding.y > 0 ? 0 : padding.y) + 'px'
                        });
                    },

                    doRotateScale: function (rad, center, calcCenters, adjustMargins) {
                        container.$paddingDiv.css({
                            'filter': core.IE.getMatrixRotOnly(rad),
                            'width': zoomUtil.scale(container.IEorigSize.x).toFixed(0) + 'px',
                            'height': zoomUtil.scale(container.IEorigSize.y).toFixed(0) + 'px'
                        });

                        container.$zoomDiv.css('filter', core.IE.getMatrix(rad, zoomUtil.zoom));
                        var topLeft = this.getContainerRect(center, container.IEorigSize, rad, zoomUtil.zoom, calcCenters).topLeft,
                            padding = {
                                x: topLeft.x + container.pad.x + adjustMargins.marginX,
                                y: topLeft.y + container.pad.y + adjustMargins.marginY
                            };
                        this.setPaddings(padding);
                    },

                    convertToMatrix: function (msFilter) {
                        var lookup = "progid:dximagetransform.microsoft.matrix(",
                            pos = msFilter.toLowerCase().indexOf(lookup);
                        if (pos > -1) {
                            msFilter = msFilter.substring(pos + lookup.length).toLowerCase().replace(/(m11=|m12=|m21=|m22=| )/g, '');
                            var coefs = msFilter.split(',');
                            // M12 and M22 have symetrical (sine) values when compared with the same values from webkit matrix()
                            msFilter = 'matrix(' + coefs[0] + ', ' + (-parseFloat(coefs[1])) + ', ' + (-parseFloat(coefs[2])) + ', ' + coefs[3] + ')';
                        }
                        return msFilter;
                    }
                },

                cssZoom: function () {
                    var newSize = { x: Math.round(zoomUtil.scale(container.size.x)), y: Math.round(zoomUtil.scale(container.size.y)) };
                    if (!core.isIE8orBelow) {
                        container.$zoomDiv.css({
                            '-moz-transform-origin': '0px 0px',
                            '-moz-transform': 'scale(' + zoomUtil.zoom + ')',
                            '-o-transform-origin': '0px 0px',
                            '-o-transform': 'scale(' + zoomUtil.zoom + ')',
                            'zoom': zoomUtil.zoom
                        });
                        
                        container.$paddingDiv.css({
                            'width': newSize.x + 'px',
                            'height': newSize.y + 'px'
                        });
                    }
                },

                calcRotInfo: function (centerRot) {
                    for (var i = data.qtSlides - 1; i > -1; --i) {
                        data.slideData[i].radius =
                            util.getDistanceTwoPnts({
                                x: data.slideData[i].pos.x + data.slideData[i].center.x,
                                y: data.slideData[i].pos.y + data.slideData[i].center.y
                            }, centerRot
                        );

                        if (data.slideData[i].radius > 0.005) {
                            data.slideData[i].angleToCenter = Math.acos((data.slideData[i].pos.x + data.slideData[i].center.x - centerRot.x) / data.slideData[i].radius);
                            if (data.slideData[i].pos.y + data.slideData[i].center.y > centerRot.y) {
                                data.slideData[i].angleToCenter = -data.slideData[i].angleToCenter;
                            }
                        } else {
                            data.slideData[i].angleToCenter = 0;
                        }
                    }
                },

                // returns the slide that whose center is closest to the viewport center
                getActiveSlide: function () {
                    data.setCenterPos();
                    var offset = core.isIE8orBelow ? {x : 0, y: 0} : core.rotation.getCenter(),
                        minDist = minIdx = -1,
                        distance = (data.elementCenter.x + data.elementCenter.y) / 10,
                        zoomDistance = zoomUtil.scale(distance),
                        pntsX = [],
                        pntsY = [],
                        merged = [],
                        maxIterations = 10;
                        
                    offset.x -= $elem.scrollLeft();
                    offset.y -= $elem.scrollTop();
                    while (merged.length === 0 && maxIterations-- > 0) { // maxIterations is just an optimization, since 4 iterations should be enough to find the nearest point
                        pntsX = data.findRangeX([data.elementCenter.x - zoomDistance, data.elementCenter.x + zoomDistance], offset);
                        pntsY = data.findRangeY([data.elementCenter.y - zoomDistance, data.elementCenter.y + zoomDistance], offset);
                        merged = $.map(pntsX, function (px) {
                            return $.inArray(px, pntsY) < 0 ? null : px;
                        });
                        distance *=2;
                        zoomDistance = zoomUtil.scale(distance);
                    }
                        
                    var dist, slideData;
                    for (var i = merged.length - 1; i > -1; i--) {
                        slideData = data.slideData[merged[i]];
                        dist = util.getDistanceTwoPnts({
                            x: (core.isIE8orBelow ? data.getCoordsIE : data.getCoords)(true, slideData, offset),
                            y: (core.isIE8orBelow ? data.getCoordsIE : data.getCoords)(false, slideData, offset)
                        }, {
                            x: data.elementCenter.x,
                            y: data.elementCenter.y
                        });
                        if (dist < minDist || i === merged.length - 1) {
                            minDist = dist;
                            minIdx = merged[i];
                        }
                    }
                    return { $slide: minIdx === -1 ? null : container.$slides.eq(minIdx), index: minIdx };
                },
                
                selectSlide: function (forceSel) {
                    var newActiveSlide = this.getActiveSlide();
                    if (forceSel || data.activeSlide.index != newActiveSlide.index) {
                        if (opts.events.onUnselectSlide && data.activeSlide.$slide && data.activeSlide.index != newActiveSlide.index) {
                            $elem.triggerHandler('unselectSlide.rsSlideIt', [data.activeSlide.$slide, data.activeSlide.index]);
                        }
                        data.activeSlide = newActiveSlide;
                        if (opts.events.onSelectSlide) {
                            $elem.triggerHandler('selectSlide.rsSlideIt', [data.activeSlide.$slide, data.activeSlide.index, data.slideData[newActiveSlide.index].caption]);
                        }
                    }
                },
                
                getRotationSlide: function (opsDegrees) {
                    return opsDegrees === null ? data.slideData[this.gotoSlideIdx].rotation : util.degToRad(opsDegrees);
                },

                doTransition: function (event, optsTrans) {
                    if (transData.animating) {
                        if (transData.isThisPartOfSlideShow()) {
                            // ignore if user called this event while a previous one is still running
                            return;
                        }
                        if (transData.$animObj !== null) {
                            transData.$animObj.stop();
                        }
                        data.insertSorted();
                        data.activeSlide = core.getActiveSlide();
                        transData.finished(null);
                    }
                    transData.animating = true;
                    // if user is currently panning around when transition kicks in, then stop pan
                    panUtil.stopImmediately();
                    var prevGotoSlideIdx = this.gotoSlideIdx;
                    this.gotoSlideIdx = util.getSlideIdx(optsTrans.slide);
                    data.setCenterPos();
                    var zoomDest = zoomUtil.checkZoomBounds(zoomUtil.getZoomDest(optsTrans.zoomDest, this.gotoSlideIdx)),
                        destSlideData = data.slideData[this.gotoSlideIdx],
                        // animation will run from the current viewport's center point...
                        fromPos = {
                            x: data.elementCenter.x - container.pad.x + $elem.scrollLeft(),
                            y: data.elementCenter.y - container.pad.y + $elem.scrollTop()
                        },
                        // ... to the target slide's center point
                        toPos = {
                            x: destSlideData.center.x,
                            y: destSlideData.center.y
                        };

                    // webkit browsers lose some position precision for very large left/top coordinates applied to static elements, when css zoom is not 1. This is a workaround.
                    if ($.browser.webkit) {
                        var nowZoom = zoomUtil.zoom;
                        // temporarily go to destination zoom with no rotation
                        zoomUtil.zoom = zoomUtil.checkZoomBounds(zoomDest);
                        core.cssZoom();
                        container.$paddingDiv.css(core.rotation.getCssRotate(0));

                        // get the slide position on this destination zoom
                        var toPosition = container.$slides.eq(this.gotoSlideIdx).position();
                        toPos.x += toPosition.left + (destSlideData.size.x - destSlideData.slideSizeNoRotation.x) / 2;
                        toPos.y += toPosition.top + (destSlideData.size.y - destSlideData.slideSizeNoRotation.y) / 2;
                        // roolback the zoom and rotation
                        zoomUtil.zoom = zoomUtil.checkZoomBounds(nowZoom);;
                        core.cssZoom();
                        container.$paddingDiv.css(core.rotation.getCssRotate(core.rotation.currAngle));
                    } else {
                        toPos.x += destSlideData.pos.x;
                        toPos.y += destSlideData.pos.y;
                    }

                    if (!core.isIE8orBelow) {
                        fromPos.x = zoomUtil.unscale(fromPos.x);
                        fromPos.y = zoomUtil.unscale(fromPos.y);
                    }

                    var delta = {
                        x: Math.abs(fromPos.x - toPos.x),
                        y: Math.abs(fromPos.y - toPos.y)
                    }, runAnimation = !$.fx.off,
                        isLinearZoom = typeof optsTrans.zoomVertex === 'string' && optsTrans.zoomVertex == 'linear',
                        needToZoom = Math.abs(zoomUtil.zoom - zoomDest) > 0.0005,
                        destAngle = core.getRotationSlide(optsTrans.degrees),
                        needToRotate = Math.abs(this.rotation.currAngle + destAngle) > 0.0005;

                    if (runAnimation && delta.x < 1 && delta.y < 1) { // fromPos and toPos are the same (no translation will be done)
                        // but if zoom or rotation will change, then
                        if (needToZoom || needToRotate) {
                            // need to add an artificial offset, that will not make a translation movement (not even for one pixel)
                            // this is required, because animation is based on translation, so start and end point need to be different
                            delta.x = delta.y = 0.9;
                            toPos.x = fromPos.x + delta.x;
                            toPos.y = fromPos.y + delta.y;
                        } else {
                            runAnimation = false; // no translation, no zoom and no rotation will happen, so nothing needs to animate
                        }
                    }

                    if (runAnimation) {
                        // medium (x, y) = (x=unknown for now, y=optsTrans.zoomVertex= min or max zoom represented by y-coordinate 
                        // that corresponds to minimum or maximun the function takes)
                        zoomUtil.setZoomVertex(optsTrans, data.activeSlide.index, this.gotoSlideIdx, zoomDest);
                        var rotMargin = this.rotation.adjustRotOrigin(prevGotoSlideIdx, fromPos),
                            maxDeltaIsX = delta.x > delta.y,
                            startAnim = maxDeltaIsX ? fromPos.x : fromPos.y,
                            endAnim = maxDeltaIsX ? toPos.x : toPos.y,
                            coefs = {
                                pan: util.getLinear({ x: startAnim, y: maxDeltaIsX ? fromPos.y : fromPos.x }, { x: endAnim, y: maxDeltaIsX ? toPos.y : toPos.x }),

                                // get the coefficients [a, b, c] of a quadratic function that interpolates the following 3 points: 
                                zoom: util.getQuadratic2PntsVertex(
                                        { x: startAnim, y: zoomUtil.zoom }, { x: endAnim, y: zoomDest },
                                        isLinearZoom ? 'linear' : zoomUtil.zoomVertex
                                      ),

                                // coefficients [a, b, c] used during rotation to smooth transitions from slide A to B
                                rotation: {
                                    // transition between A's angle and B's angle
                                    angle: util.getLinear({ x: startAnim, y: this.rotation.currAngle }, { x: endAnim, y: -destAngle }),
                                    margin: {
                                        x: util.getLinear({ x: startAnim, y: rotMargin.x }, { x: endAnim, y: 0 }),
                                        y: util.getLinear({ x: startAnim, y: rotMargin.y }, { x: endAnim, y: 0 })
                                    }
                                }
                            },
                            scrAnim,
                            lastTriggeredRotation = this.rotation.currAngle,
                            fireRotEveryRad = util.degToRad(opts.events.onRotationFiresEvery),
                            zoomFactor = zoomUtil.zoom;

                        this.calcRotInfo(toPos);

                        if (seqData.userInteract) {
                            events.unbindEvents();
                        }

                        if ((seqData.state == $.fn.rsSlideIt.state.PLAY || !transData.isThisPartOfSlideShow()) && optsTrans.onBegin) {
                            optsTrans.onBegin();
                        }
                        if (transData.isThisPartOfSlideShow()) {
                            seqData.state = $.fn.rsSlideIt.state.PLAY;
                        }
                        transData.stopAnimation = false;

                        if (needToRotate) {
                            if (opts.events.onBeginRotation) {
                                $elem.triggerHandler('beginRotation.rsSlideIt', [
                                    util.radToDeg(-this.rotation.currAngle),
                                    util.radToDeg(destAngle),
                                    this.rotation.getCenter(), {
                                        width: zoomUtil.scale(container.size.x),
                                        height: zoomUtil.scale(container.size.y)
                                    }
                                ]);
                            }
                        }

                        // animate
                        transData.$animObj = $({ scrAnim: startAnim });
                        transData.$animObj.animate({
                            scrAnim: endAnim
                        }, {
                            duration: optsTrans.duration,
                            easing: opts.behaviour.easing,
                            step: function (now) {
                                var panPnt = { x: 0, y: 0 };
                                if (maxDeltaIsX) {
                                    panPnt.x = now;
                                    panPnt.y = util.getQuadraticValue(coefs.pan, now);
                                } else {
                                    panPnt.x = util.getQuadraticValue(coefs.pan, now);
                                    panPnt.y = now;
                                }

                                if (needToZoom) {
                                    zoomFactor = util.getQuadraticValue(coefs.zoom, now);
                                    zoomUtil.doZoom(0, 0, zoomFactor, true);
                                    core.cssZoom();
                                }

                                var centerRot = { x: panPnt.x * zoomFactor + container.pad.x, y: panPnt.y * zoomFactor + container.pad.y };
                                if (needToRotate) {
                                    core.rotation.currAngle = util.getQuadraticValue(coefs.rotation.angle, now);
                                }
                                core.rotation.cssOrigin(centerRot);

                                if (core.isIE8orBelow) {
                                    core.IE.doRotateScale(core.rotation.currAngle, panPnt, false, {
                                        marginX: util.getQuadraticValue(coefs.rotation.margin.x, now),
                                        marginY: util.getQuadraticValue(coefs.rotation.margin.y, now)
                                    });
                                    $elem.scrollLeft(panPnt.x + container.pad.x - data.elementCenter.x).scrollTop(panPnt.y + container.pad.y - data.elementCenter.y);
                                } else {
                                    core.rotation.cssRotate(core.rotation.currAngle, {
                                        marginX: util.getQuadraticValue(coefs.rotation.margin.x, now),
                                        marginY: util.getQuadraticValue(coefs.rotation.margin.y, now)
                                    });
                                    $elem.scrollLeft(centerRot.x - data.elementCenter.x).scrollTop(centerRot.y - data.elementCenter.y);
                                }

                                if (needToRotate && opts.events.onRotation && Math.abs(core.rotation.currAngle - lastTriggeredRotation) >= fireRotEveryRad) {
                                    lastTriggeredRotation = core.rotation.currAngle;
                                    $elem.triggerHandler('rotation.rsSlideIt', [
                                        util.radToDeg(-core.rotation.currAngle), 
                                        centerRot, {
                                            width: container.size.x * zoomFactor,
                                            height: container.size.y * zoomFactor
                                        }
                                    ]);
                                }
                                if (transData.stopAnimation) {
                                    if (transData.$animObj !== null) {
                                        transData.$animObj.stop();
                                    }
                                    if (needToRotate) {
                                        data.insertSorted();
                                    }
                                    transData.onStopAnimation(panPnt);
                                }
                            },
                            complete: function () {
                                core.rotation.currAngle = - core.getRotationSlide(optsTrans.degrees);
                                var centerRot = { x: toPos.x * zoomDest + container.pad.x, y: toPos.y * zoomDest + container.pad.y };
                                core.rotation.cssOrigin(centerRot);

                                if (core.isIE8orBelow) {
                                    core.IE.doRotateScale(core.rotation.currAngle, toPos, true, { marginX: 0, marginY: 0 });
                                    $elem.scrollLeft(toPos.x + container.pad.x - data.elementCenter.x).scrollTop(toPos.y + container.pad.y - data.elementCenter.y);
                                } else {
                                    core.rotation.cssRotate(core.rotation.currAngle, { marginX: 0, marginY: 0 });
                                    $elem.scrollLeft(centerRot.x - data.elementCenter.x).scrollTop(centerRot.y - data.elementCenter.y);
                                }

                                if (needToRotate) {
                                    if (opts.events.onEndRotation) {
                                        $elem.triggerHandler('endRotation.rsSlideIt', [
                                            util.radToDeg(-core.rotation.currAngle), 
                                            centerRot, {
                                            width: container.size.x * zoomDest,
                                            height: container.size.y * zoomDest
                                        }]);
                                    }
                                    data.insertSorted();
                                }
                                if (seqData.userInteract) {
                                    events.bindEvents();
                                }
                                core.selectSlide(false);
                                transData.finished(transData.isThisPartOfSlideShow() ? optsTrans.onEndTransSlideShow : optsTrans.onEnd);
                            }
                        });
                    } else {
                        var eventOnEnd,
                            isThisPartOfSlideShow = transData.isThisPartOfSlideShow();
                        if (isThisPartOfSlideShow) {
                            seqData.state = $.fn.rsSlideIt.state.PLAY;
                            eventOnEnd = transData.onEnd;
                            transData.onEnd = null;
                        }
                        transData.finished(isThisPartOfSlideShow ? optsTrans.onEndTransSlideShow : optsTrans.onEnd);
                        if (isThisPartOfSlideShow) {
                            transData.onEnd = eventOnEnd;
                        }
                    }
                },

                doSlideshow: function (event) {
                    var runTransition = function () {
                        transData.onEndTransSlideShow = function () {
                            if (seqData.state == $.fn.rsSlideIt.state.PAUSE ||
                                seqData.state == $.fn.rsSlideIt.state.PLAY && (seqData.idx % seqData.qt.sequences > 0 || seqData.repeat == -1 || seqData.repeat-- > 0)) {

                                if (seqData.state != $.fn.rsSlideIt.state.PAUSE || seqData.pauseOnSlide) {
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
                                        core.selectSlide(false);
                                }
                            }
                        };

                        if (!seqData.userInteract) {
                            events.unbindEvents();
                        }
                        transData.onEndTransSlideShow();
                    };

                    if (transData.inputOpts.onPlay) {
                        transData.inputOpts.onPlay();
                    }
                    runTransition();
                },

                initSlideForRotation: function (slide) {
                    data.activeSlide.index = slide;
                    data.activeSlide.$slide = container.$slides.eq(slide);
                    this.calcRotInfo({
                        x: data.slideData[slide].pos.x + data.slideData[slide].center.x,
                        y: data.slideData[slide].pos.y + data.slideData[slide].center.y
                    });
                },
                gotoSlide: function (slide, zoomValue, rotDegrees) {
                    var zoomDest = zoomUtil.checkZoomBounds(zoomUtil.getZoomDest(zoomValue, slide));
                    core.rotation.cssOrigin({
                        x: (data.slideData[slide].pos.x + data.slideData[slide].center.x) * zoomDest + container.pad.x,
                        y: (data.slideData[slide].pos.y + data.slideData[slide].center.y) * zoomDest + container.pad.y
                    });
                    core.doTransition(null, {
                        slide: slide,
                        duration: 0,
                        zoomDest: zoomDest,
                        degrees: rotDegrees
                    });
                    core.selectSlide(true);
                }
            },

            util = {
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

                getDistanceTwoPnts: function (pnt1, pnt2) {
                    var pt = [pnt1.x - pnt2.x, pnt1.y - pnt2.y];
                    return Math.sqrt(pt[0] * pt[0] + pt[1] * pt[1]);
                },

                getDistanceTwoSlides: function (i1, i2) {
                    return this.getDistanceTwoPnts({
                        x: data.slideData[i1].pos.x + data.slideData[i1].center.x,
                        y: data.slideData[i1].pos.y + data.slideData[i1].center.y
                    }, {
                        x: data.slideData[i2].pos.x + data.slideData[i2].center.x,
                        y: data.slideData[i2].pos.y + data.slideData[i2].center.y
                    });
                },

                // given 3 points, it uses interpolation to find out the coefficients [a, b, c] of the 
                // quadratic function that intersects those 3 points.
                // These 3 points should be distinct and cannot share the same X
                // f(x) = y = a(x^2) + bx + c
                getQuadratic: function (p1, p2, p3) {
                    // p2.y is the minimum/maximum y-coordinate among the 3 points?
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
                // It might need to make further approximations for the resulting f(x) reach the targeted yVertex
                getQuadratic2PntsVertex: function (p1, p3, yVertex) {
                    if (typeof yVertex === 'string' && yVertex == 'linear') {
                        return this.getLinear(p1, p3);
                    } else {
                        return this.getQuadraticAprox(p1, { x: (p1.x + p3.x) / 2, y: yVertex }, p3);
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
                getSlideIdx: function (dest) {
                    switch (dest) {
                        case 'prev': return data.activeSlide.index == 0 ? data.qtSlides - 1 : data.activeSlide.index - 1;
                        case 'next': return data.activeSlide.index == data.qtSlides - 1 ? 0 : data.activeSlide.index + 1;
                        case 'first': return 0;
                        case 'last': return data.qtSlides - 1;
                        default: return dest;
                    }
                }
            },

            zoomUtil = {
                zoom: 1.0,
                zoomVertex: 0,
                longestPath: 0, // used when zoomVertex is 'in' or 'out'
                scale: function (value, factor) {
                    return value * (!factor ? this.zoom : factor);
                },
                unscale: function (value, factor) {
                    return value / (!factor ? this.zoom : factor);
                },
                checkZoomBounds: function (zoomValue) {
                    return (zoomValue > opts.zoomMax ? opts.zoomMax : (zoomValue < opts.zoomMin ? opts.zoomMin : zoomValue));
                },
                calcLongestPath: function () {
                    this.longestPath = 0;
                    for (var i = 0; i < data.qtSlides; ++i) {
                        for (var j = i + 1; j < data.qtSlides; ++j) {
                            this.longestPath = Math.max(this.longestPath, util.getDistanceTwoSlides(i, j));
                        }
                    }
                },
                doZoom: function (X, Y, newZoom, animating) {
                    if (!animating) {
                        var $elemPos = $elem.position(),
                            scr = { x: $elem.scrollLeft(), y: $elem.scrollTop() },
                            offset = { x: X - $elemPos.left, y: Y - $elemPos.top }, // offset relative to the top left corner
                            unscaledPos = { x: 0, y: 0 };

                        if (!core.isIE8orBelow) {
                            unscaledPos.x = offset.x + scr.x - container.pad.x;
                            unscaledPos.y = offset.y + scr.y - container.pad.y;
                            if (unscaledPos.x > 0) {
                                var containerSize = zoomUtil.scale(container.size.x);
                                if (unscaledPos.x > containerSize) {
                                    unscaledPos.x += container.size.x - containerSize;
                                } else {
                                    unscaledPos.x = this.unscale(unscaledPos.x);
                                }
                            }

                            if (unscaledPos.y > 0) {
                                var containerSize = zoomUtil.scale(container.size.y);
                                if (unscaledPos.y > containerSize) {
                                    unscaledPos.y += container.size.y - containerSize;
                                } else {
                                    unscaledPos.y = this.unscale(unscaledPos.y);
                                }
                            }
                        }
                    }

                    var prevZoom = this.zoom;
                    this.zoom = this.checkZoomBounds(newZoom);
                    if (!animating) {
                        // adjust the origin to the current zoom level
                        var orig = core.rotation.getCenter();
                        orig.x = this.unscale(orig.x - container.pad.x, prevZoom);
                        orig.y = this.unscale(orig.y - container.pad.y, prevZoom);
                        container.$zoomDiv.css('visibility', 'hidden'); // reduces flickering in IE
                        core.rotation.cssOrigin({
                            x: this.scale(orig.x) + container.pad.x,
                            y: this.scale(orig.y) + container.pad.y
                        });
                        
                        if (core.isIE8orBelow) {
                            core.IE.doRotateScale(core.rotation.currAngle, orig, true, { marginX: 0, marginY: 0 });
                            var scrollOffset = {
                                x: this.scale(this.unscale((offset.x + scr.x - container.pad.x) - orig.x, prevZoom)),
                                y: this.scale(this.unscale((offset.y + scr.y - container.pad.y) - orig.y, prevZoom))
                            };
                            $elem.
                                scrollLeft(orig.x + container.pad.x - offset.x + scrollOffset.x).
                                scrollTop(orig.y + container.pad.y - offset.y + scrollOffset.y);
                        } else {
                            if (unscaledPos.x > 0) {
                                $elem.scrollLeft(this.scale(unscaledPos.x) + container.pad.x - offset.x);
                            }
                            if (unscaledPos.y > 0) {
                                $elem.scrollTop(this.scale(unscaledPos.y) + container.pad.y - offset.y);
                            }
                        }
                        core.cssZoom();
                        container.$zoomDiv.css('visibility', 'visible');
                    }

                    if (prevZoom != this.zoom && opts.events.onChangeZoom) {
                        $elem.triggerHandler('changeZoom.rsSlideIt', [
                            this.zoom, 
                            { x: container.$paddingDiv.width(), y: container.$paddingDiv.height() },
                            { x: container.pad.x, y: container.pad.y }
                        ]);
                    }
                },
                setZoomVertex: function (optsTrans, idx1, idx2, zoomDest) {
                    if (typeof optsTrans.zoomVertex === 'string') {
                        switch (optsTrans.zoomVertex) {
                            case 'out':
                                var delta = Math.min(this.zoom, zoomDest) - opts.zoomMin;
                                this.zoomVertex = Math.min(this.zoom, zoomDest) - delta * util.getDistanceTwoSlides(idx1, idx2) / this.longestPath;
                                break;
                            case 'in':
                                var delta = opts.zoomMax - Math.max(this.zoom, zoomDest);
                                this.zoomVertex = Math.max(this.zoom, zoomDest) + delta * util.getDistanceTwoSlides(idx1, idx2) / this.longestPath;
                        }
                    } else {
                        this.zoomVertex = this.checkZoomBounds(optsTrans.zoomVertex);
                    }
                },
                getZoomDest: function (zDest, gotoSlideIdx) {
                    if (typeof zDest === 'string') {
                        data.setCenterPos();
                        var fit = [
                            data.elementCenter.x * 2 / (data.slideData[gotoSlideIdx].padding[3] + data.slideData[gotoSlideIdx].slideSizeNoRotation.x + data.slideData[gotoSlideIdx].padding[1]),
                            data.elementCenter.y * 2 / (data.slideData[gotoSlideIdx].padding[0] + data.slideData[gotoSlideIdx].slideSizeNoRotation.y + data.slideData[gotoSlideIdx].padding[2])
                        ];
                        switch (zDest) {
                            case 'current': return this.zoom;
                            case 'fitWidth': return fit[0];
                            case 'fitHeight': return fit[1];
                            case 'fit': return Math.min(fit[0], fit[1]);
                            case 'cover': return Math.max(data.elementCenter.x * 2 / data.slideData[gotoSlideIdx].slideSizeNoRotation.x, data.elementCenter.y * 2 / data.slideData[gotoSlideIdx].slideSizeNoRotation.y);
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
                    var $pos = $elem.position(),
                        prev = [$elem.scrollLeft() / this.zoom, $elem.scrollTop() / this.zoom];
                    data.setCenterPos();
                    this.doZoom(
                        $pos.left + data.elementCenter.x,
                        $pos.top + data.elementCenter.y,
                        this.checkZoomBounds(newZoom), false);
                    $elem.scrollLeft(prev[0] * this.zoom).scrollTop(prev[1] * this.zoom);
                }
            },

            panUtil = {
                startPos: { x: 0, y: 0 },
                isPanning: false,
                beginPan: function (event) {
                    this.startPos.x = event.pageX + $elem.scrollLeft();
                    this.startPos.y = event.pageY + $elem.scrollTop();
                    this.isPanning = true;
                    $elem.triggerHandler('beginPan.rsSlideIt');
                },
                endPan: function () {
                    this.isPanning = false;
                    $elem.triggerHandler('endPan.rsSlideIt');
                },
                mousemove: function (event) {
                    if (!panUtil.isPanning) {
                        panUtil.beginPan(event);
                    }
                    $elem.
                        scrollLeft(panUtil.startPos.x - event.pageX).
                        scrollTop(panUtil.startPos.y - event.pageY);
                },
                mousedown: function (event) {
                    if (event.which == 1) {
                        data.$elemAndTops.bind('mousemove.rsSlideIt', panUtil.mousemove);
                        panUtil.isPanning = false;
                    }
                    event.preventDefault();
                },
                mouseup: function (event) {
                    if (event.which == 1) {
                        data.$elemAndTops.unbind('mousemove.rsSlideIt');
                        if (panUtil.isPanning) {
                            panUtil.endPan();
                        }
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

            events = {
                onScroll: function (event) {
                    core.selectSlide(false);
                },
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
                        delta.y = evt.wheelDeltaY/120;
                    }
                    if (evt.wheelDeltaX !== undefined) { 
                        delta.x = - evt.wheelDeltaX/120;
                    }
                    event.preventDefault ? event.preventDefault() : event.returnValue = false; // prevents scrolling
                    if (core.isIE8orBelow) {
                        var $elemPos = $elem.position();
                        data.setCenterPos();
                        zoomUtil.doZoom($elemPos.left + data.elementCenter.x, $elemPos.top + data.elementCenter.y, zoomUtil.zoom + delta.y * opts.zoomStep, false);
                    } else {
                        zoomUtil.doZoom(event.pageX, event.pageY, zoomUtil.zoom + delta.y * opts.zoomStep, false);
                    }
                },
                onMousedown: function (event) {
                    panUtil.mousedown(event);
                },
                onMouseup: function (event) {
                    panUtil.mouseup(event);
                },
                onMouseenter: function (event) {
                    if (panUtil.isPanning) {
                        event.which = 1;
                        panUtil.mouseup(event);
                    }
                },
                onSingleTransition: function (event, optsTrans) {
                    if (!transData.isThisPartOfSlideShow()) {
                        transData.reset();
                        core.doTransition(event, optsTrans);
                    }
                },
                onTransition: function (event, optsTrans) {
                    core.doTransition(event, optsTrans);
                },
                onPlayPause: function (event, optsSequence) {
                    if (seqData.state == $.fn.rsSlideIt.state.PLAY) {
                        seqData.state = $.fn.rsSlideIt.state.PAUSE;
                        transData.stopAnimation = true;
                        if (seqData.timeoutId) {
                            // pause was called when transition animation was not running, in other words, 
                            // user clicked "pause" when the slide show was standing still waiting for the next transition to start
                            seqData.pauseOnSlide = true;
                            clearTimeout(seqData.timeoutId);
                            seqData.firePauseStopEvents();
                            transData.finished(null);
                        }
                    } else {
                        if (seqData.state == $.fn.rsSlideIt.state.STOP && !transData.animating) {
                            seqData.init(optsSequence);
                        }
                        if (seqData.state == $.fn.rsSlideIt.state.PLAY || seqData.state == $.fn.rsSlideIt.state.PAUSE) {
                            core.doSlideshow(event);
                        }
                    }
                },
                onStop: function (event) {
                    seqData.state = $.fn.rsSlideIt.state.STOP;
                    transData.stopAnimation = true;
                    if (seqData.timeoutId) {
                        // stop was called when transition animation was not running, in other words, 
                        // user clicked "stop" when the slide show was standing still waiting for the next transition to start
                        clearTimeout(seqData.timeoutId);
                        seqData.firePauseStopEvents();
                        transData.finished(null);
                    }
                },
                unbindEvents: function () {
                    data.$elemAndTops.unbind('scroll.rsSlideIt');
                    if (opts.behaviour.mouseZoom) {
                        data.$elemAndTops.unbind('DOMMouseScroll.rsSlideIt mousewheel.rsSlideIt');
                    }
                    if (opts.behaviour.mousePan) {
                        data.$elemAndTops.
                            unbind('mousedown.rsSlideIt mouseenter.rsSlideIt').
                            unbind('mouseup.rsSlideIt', this.onMouseup);
                    }
                },
                bindEvents: function () {
                    data.$elemAndTops.bind('scroll.rsSlideIt', this.onScroll);
                    if (opts.behaviour.mouseZoom) {
                        data.$elemAndTops.bind('DOMMouseScroll.rsSlideIt mousewheel.rsSlideIt', this.onMouseWheel);
                    }
                    if (opts.behaviour.mousePan) {
                        data.$elemAndTops.
                            bind('mousedown.rsSlideIt', this.onMousedown).
                            bind('mouseup.rsSlideIt', this.onMouseup).
                            bind('mouseenter.rsSlideIt', this.onMouseenter);
                    }
                },
                onGetter: function (event, field) {
                    switch (field) {
                        case 'zoom': return zoomUtil.zoom;
                        case 'zoomMin': return opts.zoomMin;
                        case 'zoomStep': return opts.zoomStep;
                        case 'zoomMax': return opts.zoomMax;
                        case 'activeSlide': return data.activeSlide.index;
                        case 'rotation': return util.radToDeg(core.rotation.currAngle);
                        case 'center': return core.rotation.getCenter();
                        case 'padding': return { x: container.pad.x, y: container.pad.y };
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
                            core.gotoSlide(value, zoomUtil.zoom, null);
                            break;
                        case 'center':
                            core.rotation.cssOrigin(value);
                            break;
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
                            if ($under.closest(opts.selector.slide).length == 1) {
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
                onChangeZoom: function (event, zoom, size, pad) {
                    if (opts.events.onChangeZoom) {
                        opts.events.onChangeZoom(event, zoom, size, pad);
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
                onBeginRotation: function (event, fromDegrees, toDegrees, center, size) {
                    if (opts.events.onBeginRotation) {
                        opts.events.onBeginRotation(event, fromDegrees, toDegrees, center, size);
                    }
                }, 
                onRotation: function (event, degrees, center, size) {
                    if (opts.events.onRotation) {
                        opts.events.onRotation(event, degrees, center, size);
                    }
                }, 
                onEndRotation: function (event, degrees, center, size) {
                    if (opts.events.onEndRotation) {
                        opts.events.onEndRotation(event, degrees, center, size);
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
                }
            },
            load = {
                processedSlides: 0,
                $slidesInSlides: null,
                init: function () {
                    container.init();
                    data.init();
                    this.ajax.init();
                    this.$slidesInSlides = !opts.selector.slideInSlide ? $([]) : $(opts.selector.slideInSlide, container.$zoomDiv);
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
                            bind('beginRotation.rsSlideIt', events.onBeginRotation).
                            bind('rotation.rsSlideIt', events.onRotation).
                            bind('endRotation.rsSlideIt', events.onEndRotation).
                            bind('beginPan.rsSlideIt', events.onBeginPan).
                            bind('endPan.rsSlideIt', events.onEndPan);
                            
                        container.$slides.add(data.$elemsOnTop).bind('dblclick.rsSlideIt', events.onDblClick).bind('mouseup.rsSlideIt', events.onMouseupClick);
                    }
                    
                    opts.initialSlide = opts.initialSlide < 0 ? 0 : (opts.initialSlide >= data.qtSlides ? data.qtSlides - 1 : opts.initialSlide);
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
                getRotation: function ($slide) {
                    var notDefined = function (value) {
                        return !value || value == "" || value == "none";
                    },
                    getTransform = function () {
                        var value;
                        if (core.isIE8orBelow) {
                            value = $slide.css('filter');
                            if (notDefined(value)) {
                                value = $slide.css('-ms-filter');
                                if (notDefined(value)) {
                                    return "";
                                }
                            }
                            value = core.IE.convertToMatrix(value);
                        } else {
                            value = $slide.css('-webkit-transform');
                            if (notDefined(value)) {
                                value = $slide.css('-moz-transform');
                                if (notDefined(value)) {
                                    value = $slide.css('-o-transform');
                                    if (notDefined(value)) {
                                        value = $slide.css('msTransform');
                                        if (notDefined(value)) {
                                            value = $slide.css('transform');
                                            if (notDefined(value)) {
                                                return "";
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        return value;
                    },
                    parseAsMatrix = function (value) {
                        value = value.replace(/(matrix\(| )/gi, ''); // remove occurences of "matrix(" and " "
                        var coefs = value.split(','),
                            matrix11 = parseFloat(coefs[0]),
                            matrix12 = parseFloat(coefs[1]),
                        // unfortunately, some browsers return coefficients greater
                        // than 1 (ie, 1.0000001) or lesser than -1 (ie, -1.0000001)
                            fixCoef = function (coef) {
                                return coef > 1.0 ? 1.0 : (coef < -1.0 ? -1.0 : coef);
                            };

                        matrix11 = fixCoef(matrix11);
                        matrix12 = fixCoef(matrix12);
                        if (Math.abs(matrix11 - Math.round(matrix11)) < 0.00005) {
                            // some browsers like Opera, return an integer when in reality should be other value near to integer.
                            // in this case, calculate angle by using the second matrix12
                            angle = Math.asin(matrix12);
                            if (matrix11 < 0.0) {
                                angle = Math.PI - angle;
                            }
                        } else {
                            angle = Math.acos(matrix11);
                            if (matrix12 < 0.0) {
                                angle = -angle;
                            }
                        }
                        return angle;
                    },
                    value = getTransform();

                    if (value.indexOf('matrix(') == 0) {
                        return parseAsMatrix(value);
                    }

                    var toRad = 0; // conversion rate to radians
                    // try radians
                    var found = value.match(/rotate\([-|+]?[\d.]+rad\)/i);
                    if (!found || notDefined(found[0])) {
                        // try degrees
                        found = value.match(/rotate\([-|+]?[\d.]+deg\)/i);
                        if (!found || notDefined(found[0])) {
                            // try grads
                            found = value.match(/rotate\([-|+]?[\d.]+grad\)/i);
                            if (!found || notDefined(found[0])) {
                                // try turns
                                found = value.match(/rotate\([-|+]?[\d.]+turn\)/i);
                                if (!found || notDefined(found[0])) {
                                    return 0;
                                } else toRad = Math.PI / 0.5; // turn to rad
                            } else toRad = Math.PI / 200; // grad to rad
                        } else toRad = Math.PI / 180; // deg to rad
                    } else toRad = 1; // rad to rad
                    // remove ocurrences of: "rotate", "(", "deg", "rad", "grad", "turn", ")", "none"
                    value = value.replace(/(rotate|\(|deg|rad|grad|turn|\)|none)/gi, '');
                    return util.toFloat(value) * toRad;
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
                    if (core.isIE9 && $slide.css('msTransform') != '' && $slide.css('filter') != '') {
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
                    load.loadSlideOtherData($slide, slideInSlide, slideSizes);
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
                    var cssDisplay, ieFilter;
                    if (!slideInSlide && opts.layout.cols !== null) {
                        // to get the correct size of blocked elements, need to read it as an inline-block
                        cssDisplay = $slide.css('display');
                        $slide.css('display', 'inline-block');
                    }
                    if (core.isIE8orBelow) {
                        ieFilter = $slide.css('filter');
                        $slide.css('filter', '');
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
                    if (core.isIE8orBelow) {
                        $slide.css('filter', ieFilter);
                    }
                    if (!slideInSlide && opts.layout.cols !== null) {
                        // restore the original display
                        $slide.css('display', cssDisplay);
                    }
                    return sizes;
                },
                changeRow: function (col) {
                    return !!opts.layout.cols && (col % opts.layout.cols === 0);
                },
                loadSlideOtherData: function ($slide, slideInSlide, slideSizes) {
                    var rotAngle = load.getRotation($slide),
                        contRectOuter = core.rotation.getContainerRectCenter(rotAngle, slideSizes.outerSizeAll);

                    if (contRectOuter.topLeft.x < 0) {
                        contRectOuter.topLeft.x = -contRectOuter.topLeft.x;
                        contRectOuter.bottomRight.x += 2 * contRectOuter.topLeft.x;
                    }
                    if (contRectOuter.topLeft.y < 0) {
                        contRectOuter.topLeft.y = -contRectOuter.topLeft.y;
                        contRectOuter.bottomRight.y += 2 * contRectOuter.topLeft.y;
                    }
                    data.slideData.push({
                        // pos and centerTrans are computed later
                        pos: { x: 0, y: 0 },
                        centerTrans: { x: 0, y: 0 }, // same as center (see below) but with transformations applied
                        size: { // outer size includes margin + border + padding
                            x: contRectOuter.bottomRight.x - contRectOuter.topLeft.x,
                            y: contRectOuter.bottomRight.y - contRectOuter.topLeft.y
                        },
                        slideSizeNoRotation: {
                            x: slideSizes.size.x,
                            y: slideSizes.size.y
                        },
                        slideOuterSizeNoRotation: {
                            x: slideSizes.outerSizeAll.x,
                            y: slideSizes.outerSizeAll.y
                        },
                        rectOuter: {
                            left: contRectOuter.topLeft.x,
                            top: contRectOuter.topLeft.y,
                            right: contRectOuter.bottomRight.x,
                            bottom: contRectOuter.bottomRight.y
                        },
                        center: {
                            x: util.toInt($slide.css('margin-left')) + slideSizes.size.x / 2,
                            y: util.toInt($slide.css('margin-top')) + slideSizes.size.y / 2
                        },
                        padding: [util.toInt($slide.css('padding-top')), util.toInt($slide.css('padding-right')), util.toInt($slide.css('padding-bottom')), util.toInt($slide.css('padding-left'))],
                        border: [util.toInt($slide.css('border-top-width')), util.toInt($slide.css('border-right-width')), util.toInt($slide.css('border-bottom-width')), util.toInt($slide.css('border-left-width'))],
                        margin: [util.toInt($slide.css('margin-top')), util.toInt($slide.css('margin-right')), util.toInt($slide.css('margin-bottom')), util.toInt($slide.css('margin-left'))],
                        caption: load.getCaption($slide),
                        rotation: rotAngle,
                        radius: 0, // radius between center of rotation and slide center point (to be computed later)
                        angleToCenter: 0 // angle between X axis and segment that connects this slide center with the center of rotation (to be computed later)
                    });
                },
                setSlidePos: function () {
                    if (data.qtSlides > 0) {
                        container.setPad();
                    }

                    var col = row = 0,
                        needNewRow = false,
                        justifySlide = {
                            x: !!opts.layout.cols && opts.layout.horizAlign && (opts.layout.horizAlign == 'left' || opts.layout.horizAlign == 'center' || opts.layout.horizAlign == 'right'),
                            y: !!opts.layout.cols && opts.layout.vertAlign && (opts.layout.vertAlign == 'top' || opts.layout.vertAlign == 'center' || opts.layout.vertAlign == 'bottom')
                        },
                        maxWidthInCol = [],
                        maxHeightInRow = [],
                        $slide, slideInSlide;
                        
                    container.$zoomDiv.css({
                        'position': 'relative',
                        'z-index': 0 // fix for IE8 standards mode that, without this z-index, cannot rotate child elements
                    });
                    
                    for (var i = 0; i < data.qtSlides; ++i) {
                        $slide = container.$slides.eq(i);
                        slideInSlide = load.$slidesInSlides.index($slide) > -1;

                        // to prevent the default behaviour in IE when dragging an element
                        $slide[0].ondragstart = function () { return false; };

                        if (!slideInSlide && needNewRow) {
                            ++row;
                        }

                        if (!slideInSlide) {
                            if (justifySlide.x) {
                                if (col === maxWidthInCol.length) {
                                    maxWidthInCol.push(data.slideData[i].size.x / 2);
                                } else {
                                    maxWidthInCol[col] = Math.max(maxWidthInCol[col], data.slideData[i].size.x / 2);
                                }
                            }

                            if (justifySlide.y) {
                                if (row === maxHeightInRow.length) {
                                    maxHeightInRow.push(data.slideData[i].size.y / 2);
                                } else {
                                    maxHeightInRow[row] = Math.max(maxHeightInRow[row], data.slideData[i].size.y / 2);
                                }
                            }

                            needNewRow = load.changeRow(++col);
                            if (needNewRow) {
                                col = 0;
                            }
                        }
                    }

                    var maxHeight = 0, previousWasBlocked = false, parentSlideIdx = -1, diff, offset = { x: 0, y: 0 };
                    needNewRow = false;
                    col = row = 0;
                    for (var i = 0; i < data.qtSlides; ++i) {
                        $slide = container.$slides.eq(i);
                        slideInSlide = load.$slidesInSlides.index($slide) > -1;

                        if (slideInSlide && parentSlideIdx != -1) {
                            $slide.css('position', 'absolute');
                            data.slideData[i].pos.x = data.slideData[parentSlideIdx].pos.x + $slide.position().left;
                            data.slideData[i].pos.y = data.slideData[parentSlideIdx].pos.y + $slide.position().top;
                            $slide.css({
                                'left': data.slideData[i].pos.x + 'px',
                                'top': data.slideData[i].pos.y + 'px'
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
                                offset.x = 0;
                                maxHeight = col = 0;
                            }

                            data.slideData[i].pos.x = opts.layout.cols === null ? $slide.position().left : offset.x;
                            data.slideData[i].pos.x += data.slideData[i].rectOuter.left;
                            if (justifySlide.x) {
                                diff = maxWidthInCol[col] - data.slideData[i].size.x / 2;
                                if (diff !== 0) {
                                    data.slideData[i].pos.x += opts.layout.horizAlign == 'center' ? diff : (opts.layout.horizAlign == 'left' ? 0 : diff * 2);
                                }
                                offset.x += maxWidthInCol[col] * 2;
                            } else {
                                offset.x = Math.max(offset.x, data.slideData[i].pos.x + data.slideData[i].size.x);
                            }

                            data.slideData[i].pos.y = opts.layout.cols === null ? $slide.position().top : offset.y;
                            data.slideData[i].pos.y += data.slideData[i].rectOuter.top;
                            if (justifySlide.y) {
                                diff = maxHeightInRow[row] - data.slideData[i].size.y / 2;
                                if (diff !== 0) {
                                    data.slideData[i].pos.y += opts.layout.vertAlign == 'center' ? diff : (opts.layout.vertAlign == 'top' ? 0 : diff * 2);
                                }
                                maxHeight = Math.max(maxHeight, maxHeightInRow[row] * 2);
                            } else {
                                maxHeight = Math.max(maxHeight, (opts.layout.cols === null ? data.slideData[i].pos.y : 0) + data.slideData[i].size.y);
                            }

                            if (opts.layout.cols !== null) {
                                var ieOffset = { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0} };
                                if (core.isIE8orBelow) {
                                    ieOffset = core.rotation.getContainerRectCenter(data.slideData[i].rotation, data.slideData[i].slideSizeNoRotation);
                                }
                                $slide.css({
                                    'position': 'absolute',
                                    'left': (data.slideData[i].pos.x + ieOffset.topLeft.x) + 'px',
                                    'top': (data.slideData[i].pos.y + ieOffset.topLeft.y) + 'px'
                                });
                            } else {
                                if (isBlocked) {
                                    $slide.css({
                                        'width': data.slideData[i].size.x + 'px',
                                        'height': data.slideData[i].size.y + 'px'
                                    });
                                }
                            }

                            needNewRow = load.changeRow(++col);
                            parentSlideIdx = i;
                        }
                    }
                    offset.y = (opts.layout.cols === null ? 0 : offset.y) + maxHeight;
                    if (opts.layout.cols !== null) {
                        // non slides that are blocked, should float in order to not interfere with space available
                        container.$zoomDiv.children().not(container.$slides).filter(function(index) {
                            return $(this).css('display') === 'block';
                        }).css('float', 'left');
                    }
                    
                    container.resetMaxSize();
                    container.$zoomDiv.css({ 'width': '500000px', 'height': '500000px' }); // workaround that allows $.position() return correct values. This dimension is correctly set after the following for loop.
                    var isMozilla11OrLower = !!$.browser.mozilla && parseInt($.browser.version) < 12;
                    for (var i = 0; i < data.qtSlides; ++i) {
                        var slidePos = container.$slides.eq(i).position(),
                            slideData = data.slideData[i];
                        // Mozilla (up to 11.0b8) returns the correct position for rotated elements, so there is no need to adjust for Mozilla
                        slideData.pos.x = slidePos.left + (isMozilla11OrLower ? 0 : (slideData.size.x - slideData.slideSizeNoRotation.x) / 2);
                        slideData.pos.y = slidePos.top + (isMozilla11OrLower ? 0 : (slideData.size.y - slideData.slideSizeNoRotation.y) / 2);
                        container.setMaxSize(slideData.pos.x + slideData.size.x, slideData.pos.y + slideData.size.y); 
                    }
                    container.$paddingDiv.add(container.$zoomDiv).css({
                        // 50 is a gap necessary - when cols is null - to avoid static slide reposition when zoom out is very large
                        'width': Math.floor(container.size.x + (opts.layout.cols === null ? 50 : 0)) + 'px',
                        'height': Math.floor(container.size.y + (opts.layout.cols === null ? 50 : 0)) + 'px'
                    });
                    container.setSizeForIE();
                    data.insertSorted();

                    if (data.qtSlides > 0) {
                        zoomUtil.initZoom(opts.initialZoom, opts.zoomMin, opts.initialSlide);
                        core.initSlideForRotation(opts.initialSlide);
                        core.cssZoom();
                        core.gotoSlide(opts.initialSlide, opts.initialZoom, opts.initialDegrees);
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
        opts.behaviour = $.extend({}, $.fn.rsSlideIt.defaults.behaviour, options ? options.behaviour : options);
        opts.selector = $.extend({}, $.fn.rsSlideIt.defaults.selector, options ? options.selector : options);
        opts.events = $.extend({}, $.fn.rsSlideIt.defaults.events, options ? options.events : options);

        return this.each(function () {
            new SlideItClass($(this), opts);
        });
    };

    // public access to the default input parameters
    $.fn.rsSlideIt.defaults = {
        zoomMin: 0.4,           // Minimum zoom possible. Type: positive floating point number.
        zoomStep: 0.1,          // Value incremented to the current zoom, when mouse wheel moves up. When mouse wheel moves down, current zoom is decremented by this value.
                                // To reverse direction, use negative step. To disable zoom on mouse wheel, do not use zero, but set behaviour.mouseZoom to false instead. Type: floating point number.
        zoomMax: 15,            // Maximun zoom possible. Type: positive floating point number.
        initialSlide: 0,        // Active slide when plugin is initialized. Type: 0-based integer .
        initialZoom: 1,         // Zoom used when plugin is initialized. Type: positive floating point number.
        initialDegrees: null,   // Rotation degrees used when plugin is initialized. If null, then uses the rotation from the Slide initialSlide. Type: floating point number.
        layout: {
            width: null,            // Container width in pixels. If null then uses the width defined in CSS. Type: integer.
            height: null,           // Container height in pixels. If null then uses the height defined in CSS. Type: integer.
            overflow: 'hidden',     // Container overflow property. Type: string 'visible', 'hidden', 'scroll', 'auto', 'inherit'. If null, then uses overflow from CSS.
            cols: 0,                // Layouts all slides in this number of columns, in a left to right and top to bottom direction.
                                    // Use zero to layout all slides in one row; Use null to ignore slide layout and use the positioning set by CSS. Type: positive integer.
            horizAlign: null,       // Slide horizontal justification 'left', 'center' or 'right'. Ignored if cols is null. Type: string.
            vertAlign: null         // Slide vertical justification 'top', 'center' or 'bottom'. Ignored if cols is null. Type: string.
        },
        behaviour: {
            mouseZoom: true,        // Determines whether mouse wheel is used to zoom in/out. Type: boolean.
            mousePan: true,         // Determines whether mouse drag events is used to pan around. Type: boolean.
            easing: 'swing'         // Easing function used in transitions (@see http://api.jquery.com/animate/#easing). Type: string.
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
            onAjaxLoadEnd: null,            // Fired after all ajax requests (immediately after the last onAjaxLoadSlideAfter). Type: function (event).
            onChangeZoom: null,             // Fired when zoom changes, due to mouse wheel actions or by transitions. Type: function (event, zoom, size, pad).
            onBeginRotation: null,          // Fired when a rotation transformation is about to be performed. Type: function (event, fromDegrees, toDegrees, centerRot, size).
            onRotation: null,               // During rotation, fired every 'onRotationFiresEvery' degrees. Type: function (event, degrees, centerRot, size).
            onEndRotation: null,            // Fired when a rotation transformation has finished. Type: function (event, degrees, centerRot, size).
            onRotationFiresEvery: 2,        // Angle offset in degrees that triggers the onRotation event. Type: positive floating point number.
                                            // For example, if rotation runs from 0 to 22 degrees and onRotationFiresEvery is 5, then
                                            // onRotation is called 6 times during rotation (when angle is 0, 5, 10, 15, 20, 22).
                                            // The event onRotation is always called on the first and last rotation angle.
            onBeginPan: null,               // Fired when the user starts to pan around. Type: function (event).
            onEndPan: null,                 // Fired when the user finishes to pan around. Type: function (event).
            onUnselectSlide: null,          // Fired when a slide that was selected becomes unselected. Type: function (event, $slide, index).
            onSelectSlide: null,            // Fired when a slide that was unselected becomes selected. Type: function (event, $slide, index, caption).
            onClickSlide: null,             // Fired when a slide receives a single mouse click. Type: function (event, $slide, index).
            onDblClickSlide: function (event, $slide, index) { // Fired when a slide receives a double mouse click. Type: function (event, $slide, index).
                $(event.target).rsSlideIt('transition', {   // Custom onDblClickSlide defined by default.
                    slide: index,
                    zoomDest: 'current',
                    zoomVertex: 'linear',
                    duration: 'normal'
                });
            }
        }
    };

    // Default options for the 'transition' method.
    $.fn.rsSlideIt.defaultsTransition = {
        slide: 'next',          // zero-based positive integer or 'prev' or 'next' or 'first' or 'last'
        duration: 'normal',     // positive integer
        zoomDest: 1,            // positive real number or 'current' or 'fitWidth' or 'fitHeight' or 'fit' or 'cover'
        zoomVertex: 'linear',   // positive real number or 'out' or 'in' or 'linear'
        degrees: null,          // real number. If null then uses rotation angle from CSS
        onBegin: null,          // event handler called when this transition starts to run
        onEnd: null             // event handler called when this transition is completed
    };

    // Default options for the 'playPause' method.
    $.fn.rsSlideIt.defaultsPlayPause = {
        sequence: 'next',       // Type: array of positive integers or a string 'prev' or a string 'next'
        delayOnSlide: 2000,     // positive integer or an array of positive integers
        zoomDest: 1,            // positive real number or 'current' or 'fitWidth' or 'fitHeight' or 'fit' or 'cover' or an array of positive real numbers and strings
        zoomVertex: 'linear',   // positive real number or 'out' or 'in' or 'linear' or an arrays of positive real numbers and strings
        duration: 600,          // positive integer or array of positive integers
        repeat: 'forever',      // positive integer or 'forever',
        degrees: null,          // real number or an array of real numbers and nulls
        userInteract: true,     // true: user can zoom and pan when slide is standing still; false: otherwise 
        onPlay: null,           // event handler called when the sequence starts to run
        onPause: null,          // event handler called when the sequence pauses in a specific slide
        onStop: null,           // event handler called when the whole sequence is completed (only if repeat is not 'forever')
        onBeginTrans: null,     // event handler called when the transition within the sequence starts to run
        onEndTrans: null        // event handler called when the transition within the sequence is completed
    };

    $.fn.rsSlideIt.state = {
        STOP: 0, // no transitions are currently running and user is free to navigate around
        PLAY: 1, // slide show is running, which stops the user from navigating around
        PAUSE: 2 // slide show is paused and another click to Play/Pause button will resume the slide show from the current point. User can navigate around (if userInteract is true).
    };

})(jQuery);