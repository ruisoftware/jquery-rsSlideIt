/**
* jQuery SliteIt - Displays a slide show
* ====================================================
*
* Licensed under The MIT License
* 
* @version   0.1
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
        var $elemAndTops = $elem.add($(opts.selector.elementsOnTop)),
            elementCenter = {
                x: $elem.width() / 2,
                y: $elem.height() / 2
            },
            container = {    // container is the first DIV element inside the slideIt element
                $paddingDiv: null,
                $zoomDiv: null,
                $slides: null, // set with all slide elements
                size: { x: 0, y: 0 },
                IEorigSize: { x: 0, y: 0 }, // IE needs to compute based on unscaled (original) container size
                pad: { x: 0, y: 0 },
                setPad: function (usesRotation) {
                    this.pad.x = elementCenter.x;
                    this.pad.y = elementCenter.y;
                    if (usesRotation) {
                        this.pad.x = this.pad.y = Math.max(this.pad.x, this.pad.y);
                    }
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
                    $elem.wrapInner('<div />');
                    this.$paddingDiv = $("div:eq(0)", $elem);
                    this.$paddingDiv.wrapInner('<div />');
                    this.$zoomDiv = $("div:eq(0)", this.$paddingDiv);
                    this.$slides = $(opts.selector.slide, this.$zoomDiv);
                }
            },

            slideData = [],
            activeSlide = {
                $slide: null,
                index: -1
            },

            seqData = { // data for the whole slide show currently running
                idx: 0,      // current active slide while sequence runs
                repeat: 0,   // how many cycles a sequence runs
                qt: null,    // quantities of all sequence input parameters
                state: $.fn.rsSlideIt.states.STOPPED,
                setCompleteState: function () {
                    switch (this.state) {
                        case $.fn.rsSlideIt.states.PLAYING:
                        case $.fn.rsSlideIt.states.STOPPING:
                            this.state = $.fn.rsSlideIt.states.STOPPED;
                            break;
                        case $.fn.rsSlideIt.states.PAUSING:
                            this.state = $.fn.rsSlideIt.states.PAUSED;
                    }
                },
                init: function (optsSequence, isPrevOrNext) {
                    this.idx = 0;
                    this.state = $.fn.rsSlideIt.states.PLAYING;
                    transData.reset();
                    transData.onStart = optsSequence.onStartTransition;
                    transData.inputOpts = optsSequence;
                    transData.isPrevOrNext = isPrevOrNext;

                    this.repeat = optsSequence.repeat == 'forever' ? -1 : optsSequence.repeat;
                    if (this.repeat != -1) {
                        if (isPrevOrNext || optsSequence.sequence[0] != activeSlide.index) {
                            this.repeat++; // when user clicks the play button, first need to go to first slide to start the sequence from there
                            // this first step of moving to first slide consumes one repetition, therefore the need to increment it by one
                        }
                    }
                    this.qt = {
                        sequences: (typeof optsSequence.sequence === 'object') ? optsSequence.sequence.length : (isPrevOrNext ? slideData.length : 0),
                        delays: (typeof optsSequence.delayOnSlide === 'object') ? optsSequence.delayOnSlide.length : 0,
                        zoomDests: (typeof optsSequence.zoomDest === 'object') ? optsSequence.zoomDest.length : 0,
                        zoomVertexes: (typeof optsSequence.zoomVertex === 'object') ? optsSequence.zoomVertex.length : 0,
                        durations: (typeof optsSequence.duration === 'object') ? optsSequence.duration.length : 0
                    };
                }
            },
            transData = {     // data for the current transition that is running
                slide: null,
                duration: null,
                zoomDest: null,
                zoomVertex: null,
                onStart: null,
                onComplete: null,               // internal event for complete transition
                onEndTransition: null,          // user event for complete transition
                inputOpts: null,
                isPrevOrNext: false,
                animating: false,
                reset: function () {
                    this.slide = this.duration = this.zoomDest = this.zoomVertex = this.onComplete = this.onEndTransition = null;
                },
                setupNextTrans: function () {
                    this.slide = this.isPrevOrNext ? this.inputOpts.sequence : this.inputOpts.sequence[seqData.idx % seqData.qt.sequences];
                    if (!this.isPrevOrNext && this.slide == activeSlide.index) {
                        ++seqData.idx;
                        this.onComplete();
                        return false;
                    }
                    this.duration = seqData.qt.durations == 0 ? this.inputOpts.duration : this.inputOpts.duration[seqData.idx % seqData.qt.durations];
                    this.zoomDest = seqData.qt.zoomDests == 0 ? this.inputOpts.zoomDest : this.inputOpts.zoomDest[seqData.idx % seqData.qt.zoomDests];
                    this.zoomVertex = seqData.qt.zoomVertexes == 0 ? this.inputOpts.zoomVertex : this.inputOpts.zoomVertex[seqData.idx % seqData.qt.zoomVertexes];
                    return true;
                },
                finished: function (transOnComplete) {
                    var done = function () {
                        transData.animating = false;
                        if (transOnComplete) {
                            transOnComplete();
                        }
                        ++seqData.idx;
                    };

                    if (seqData.qt === null) {
                        // standalone transition
                        done();
                    } else {
                        // transition that ran integrated in a sequence
                        setTimeout(done, seqData.qt.delays == 0 ? transData.inputOpts.delayOnSlide : transData.inputOpts.delayOnSlide[seqData.idx % seqData.qt.delays]);
                    }
                }
            },

            core = {
                gotoSlideIdx: 0,
                rotation: {
                    needed: false,
                    currAngle: 0,
                    currOrigin: null,
                    // given an $elem and their rotation angle (with rotation center on element's center point),
                    // it returns the [left, top, right, bottom] of the rectangle that outlines the rotated $elem 
                    getContainerRectCenter: function (elemAngle, size) {
                        var center = [size[0] / 2, size[1] / 2];

                        // optimization
                        if (Math.abs(Math.sin(elemAngle)) < 0.000005) {
                            return {
                                topLeft: { x: 0, y: 0 },
                                bottomRight: { x: size[0], y: size[1] }
                            };
                        }

                        // LT: Left Top, RT: Right Top, RB: Right Bottom, LB: Left Bottom
                        var h = Math.sqrt(center[0] * center[0] + center[1] * center[1]),
                            angle = Math.acos(center[0] / h),
                            angleLT = Math.PI - angle,
                            angleRT = angle,
                            angleRB = -angleRT,
                            angleLB = -angleLT;
                        angleLT -= elemAngle;
                        angleRT -= elemAngle;
                        angleRB -= elemAngle;
                        angleLB -= elemAngle;
                        var xLT = center[0] + h * Math.cos(angleLT),
                            xRT = center[0] + h * Math.cos(angleRT),
                            xRB = center[0] + h * Math.cos(angleRB),
                            xLB = center[0] + h * Math.cos(angleLB),

                            yLT = center[1] - h * Math.sin(angleLT),
                            yRT = center[1] - h * Math.sin(angleRT),
                            yRB = center[1] - h * Math.sin(angleRB),
                            yLB = center[1] - h * Math.sin(angleLB);
                        return {
                            topLeft: {
                                x: Math.min(xLT, Math.min(xRT, Math.min(xLB, Math.min(0, xRB)))),
                                y: Math.min(yLT, Math.min(yRT, Math.min(yLB, Math.min(0, yRB))))
                            },
                            bottomRight: {
                                x: Math.max(xLT, Math.max(xRT, Math.max(xLB, Math.max(size[0], xRB)))),
                                y: Math.max(yLT, Math.max(yRT, Math.max(yLB, Math.max(size[1], yRB))))
                            }
                        };
                    },
                    getCenter: function () {
                        if (this.currOrigin == null) {
                            var orig = container.$paddingDiv.css('-webkit-transform-origin');
                            if (orig != null) {
                                var origV = orig.split(" ");
                                this.currOrigin = { x: util.toInt(origV[0]), y: util.toInt(origV[1]) };
                            } else {
                                this.currOrigin = { x: container.$paddingDiv.width() / 2, y: container.$paddingDiv.height() / 2 };
                            }
                        }
                        return { x: this.currOrigin.x, y: this.currOrigin.y };
                    },
                    // when transform-origin is changed to an element that is rotated, that element shifts to another position.
                    // To make the element appear in the same position, need to apply a top left margin to compensate the element shifting.
                    adjustRotOrigin: function (slideIdx, fromPos) {
                        if (this.needed && Math.abs(this.currAngle) > 0.005) {
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

                                if (newCenter.x != Math.floor(orig.x) || newCenter.y != Math.floor(orig.y)) {
                                    var pntTopRight1 = this.getTopRight(orig, { x: zoomUtil.scale(slideData[slideIdx].center.x), y: -zoomUtil.scale(slideData[slideIdx].center.y) }),
                                        pntTopRight2 = this.getTopRight(newCenter, {
                                            x: container.pad.x + zoomUtil.scale(slideData[slideIdx].pos.x + slideData[slideIdx].slideOuterSizeNoRotation.x) - newCenter.x,
                                            y: container.pad.y + zoomUtil.scale(slideData[slideIdx].pos.y) - newCenter.y
                                        });
                                    return {
                                        x: pntTopRight1.x - pntTopRight2.x,
                                        y: pntTopRight1.y - pntTopRight2.y
                                    };
                                }
                            }
                        }
                        return { x: 0, y: 0 };
                    },
                    getTopRight: function (center, size) {
                        var h = Math.sqrt(size.x * size.x + size.y * size.y),
                            angleBox = Math.acos(size.x / h),
                            totalAngle = (size.y > 0 ? -angleBox : angleBox) - this.currAngle;
                        return { x: h * Math.cos(totalAngle) + center.x, y: -h * Math.sin(totalAngle) + center.y };
                    },
                    cssRotate: function (rot, m) {
                        var rotation = 'rotate(' + rot + 'rad)';
                        container.$paddingDiv.css({
                            '-webkit-transform': rotation,
                            '-moz-transform': rotation,
                            '-o-transform': rotation,
                            '-ms-transform': rotation,
                            'transform': rotation,
                            'margin-left': m.marginX + 'px',
                            'margin-top': m.marginY + 'px'
                        });
                    },
                    cssOrigin: function (origin) {
                        if (this.currOrigin == null) {
                            this.currOrigin = { x: origin.x, y: origin.y };
                        } else {
                            this.currOrigin.x = origin.x;
                            this.currOrigin.y = origin.y;
                        }
                        var orig = origin.x + 'px ' + origin.y + 'px';
                        container.$paddingDiv.css({
                            '-webkit-transform-origin': orig,
                            '-moz-transform-origin': orig,
                            '-o-transform-origin': orig,
                            'transform-origin': orig
                        });
                    }
                },

                // in IE8 or below, rotation works differently from other browsers. 
                isIE8orBelow: $.browser.msie && parseFloat($.browser.version) < 9,
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
                        return this.getMatrixStr([cosine, -sine, sine, cosine, 0, 0]);
                    },

                    getMatrixRotOnly: function (rad) {
                        var sine = Math.sin(rad),
                            cosine = Math.cos(rad);
                        return this.getMatrixStr([cosine, -sine, sine, cosine, 0, 0]);
                    },

                    getMatrixStr: function (coefs) {
                        return "progid:DXImageTransform.Microsoft.Matrix(M11=" + coefs[0] + ", M12=" + coefs[1] + ", M21=" + coefs[2] + ", M22=" + coefs[3] + ", DX=" + coefs[4] + ", Dy=" + coefs[5] + ", SizingMethod='auto expand');";
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
                            // also apply transformations to all slide's center point
                            for (var i = slideData.length - 1; i > -1; --i) {
                                var angleData = this.getHorizAngleTwoPntsAndDistance(center, {
                                    x: slideData[i].pos.x + slideData[i].center.x,
                                    y: slideData[i].pos.y + slideData[i].center.y
                                }),
                                    pointData = this.rotatePnt(center, angleData.angle - toAngle, angleData.h * toScale);
                                slideData[i].centerTrans.x = pointData.x + container.pad.x;
                                slideData[i].centerTrans.y = pointData.y + container.pad.y;
                            }
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
                            'width': zoomUtil.scale(container.IEorigSize.x) + 'px',
                            'height': zoomUtil.scale(container.IEorigSize.y) + 'px'
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
                            var coefs = msFilter.split(",");
                            // M12 and M22 have symetrical (sine) values when compared with the same values from webkit matrix()
                            msFilter = 'matrix(' + coefs[0] + ', ' + (-parseFloat(coefs[1])) + ', ' + (-parseFloat(coefs[2])) + ', ' + coefs[3] + ')';
                        }
                        return msFilter;
                    },

                    // returns the active slide, i.e., the slide that has its center closest to the viewport center
                    getNearestSlide: function () {
                        var len = slideData.length,
                            minDist = minIdx = -1;

                        // could be done with each(), but the core for(;;) is faster
                        for (var i = len - 1; i > -1; i--) {
                            var dist = util.getDistanceTwoPnts({
                                x: slideData[i].centerTrans.x - $elem.scrollLeft(),
                                y: slideData[i].centerTrans.y - $elem.scrollTop()
                            }, elementCenter);

                            if (dist < minDist || i === len - 1) {
                                minDist = dist;
                                minIdx = i;
                            }
                        }
                        return { $slide: minIdx === -1 ? null : container.$slides.eq(minIdx), index: minIdx };
                    }
                },

                cssZoom: function () {
                    var newSize = { x: zoomUtil.scale(container.size.x), y: zoomUtil.scale(container.size.y) };
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
                    if (opts.events.onChangeSize) {
                        opts.events.onChangeSize($elem, newSize, {
                            x: container.pad.x,
                            y: container.pad.y
                        });
                    }
                },

                calcRotInfo: function (centerRot) {
                    for (var i = slideData.length - 1; i > -1; --i) {
                        slideData[i].radius =
                            util.getDistanceTwoPnts({
                                x: slideData[i].pos.x + slideData[i].center.x,
                                y: slideData[i].pos.y + slideData[i].center.y
                            }, centerRot
                        );

                        if (slideData[i].radius > 0.005) {
                            slideData[i].angleToCenter = Math.acos((slideData[i].pos.x + slideData[i].center.x - centerRot.x) / slideData[i].radius);
                            if (slideData[i].pos.y + slideData[i].center.y > centerRot.y) {
                                slideData[i].angleToCenter = -slideData[i].angleToCenter;
                            }
                        } else {
                            slideData[i].angleToCenter = 0;
                        }
                    }
                },

                // returns the active slide, i.e., the slide that has its center closest to the viewport center
                getNearestSlide: function () {
                    var len = slideData.length,
                        minDist = minIdx = -1,
                        offset = this.rotation.getCenter();
                    offset.x -= $elem.scrollLeft();
                    offset.y -= $elem.scrollTop();

                    // could be done with each(), but the core for(;;) is faster
                    for (var i = len - 1; i > -1; i--) {
                        var dist = util.getDistanceTwoPnts({
                            x: zoomUtil.scale(slideData[i].radius) * Math.cos(this.rotation.currAngle - slideData[i].angleToCenter) + offset.x,
                            y: zoomUtil.scale(slideData[i].radius) * Math.sin(this.rotation.currAngle - slideData[i].angleToCenter) + offset.y
                        }, {
                            x: elementCenter.x,
                            y: elementCenter.y
                        });

                        if (dist < minDist || i === len - 1) {
                            minDist = dist;
                            minIdx = i;
                        }
                    }
                    return { $slide: minIdx === -1 ? null : container.$slides.eq(minIdx), index: minIdx };
                },

                selectSlide: function (forceSel) {
                    var newActiveSlide = core.isIE8orBelow ? core.IE.getNearestSlide() : core.getNearestSlide();
                    if (forceSel || activeSlide.index != newActiveSlide.index) {
                        if (opts.events.onUnselectSlide && activeSlide.$slide && activeSlide.index != newActiveSlide.index) {
                            opts.events.onUnselectSlide($elem, activeSlide.$slide, activeSlide.index);
                        }
                        activeSlide = newActiveSlide;
                        if (opts.events.onSelectSlide) {
                            return opts.events.onSelectSlide($elem, activeSlide.$slide, activeSlide.index, slideData[newActiveSlide.index].caption);
                        }
                    }
                    return true;
                },

                doTransition: function (event, optsTrans) {
                    if (transData.animating) {
                        // ignore this event if user called this event while a previous one is still running
                        return;
                    }
                    transData.animating = true;

                    var prevGotoSlideIdx = this.gotoSlideIdx;
                    this.gotoSlideIdx = util.getSlideIdx(optsTrans.slide);
                    var zoomDest = zoomUtil.checkZoomBounds(zoomUtil.getZoomDest(optsTrans.zoomDest, this.gotoSlideIdx)),
                    // animation will run from the current viewport's center point...
                        fromPos = {
                            x: elementCenter.x - container.pad.x + $elem.scrollLeft(),
                            y: elementCenter.y - container.pad.y + $elem.scrollTop()
                        },
                    // ... to the target slide's center point
                        toPos = {
                            x: slideData[this.gotoSlideIdx].pos.x + slideData[this.gotoSlideIdx].center.x,
                            y: slideData[this.gotoSlideIdx].pos.y + slideData[this.gotoSlideIdx].center.y
                        };

                    if (!core.isIE8orBelow) {
                        fromPos.x = zoomUtil.unscale(fromPos.x);
                        fromPos.y = zoomUtil.unscale(fromPos.y);
                    }

                    var delta = {
                        x: Math.abs(fromPos.x - toPos.x),
                        y: Math.abs(fromPos.y - toPos.y)
                    }, runAnimation = !$.fx.off,
                        isLinearZoom = typeof optsTrans.zoomVertex === 'string' && optsTrans.zoomVertex == 'linear',
                        needToZoom = !isLinearZoom || Math.abs(zoomUtil.zoom - zoomDest) > 0.0005,
                        needToRotate = this.rotation.needed && Math.abs(this.rotation.currAngle + slideData[this.gotoSlideIdx].rotation) > 0.0005;


                    if (runAnimation && delta.x < 1 && delta.y < 1) { // fromPos and toPos are the same (no translation will be done)
                        // but if zoom or rotation will change, then
                        if (zoomDest != zoomUtil.zoom || needToRotate) {
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
                        zoomUtil.setZoomVertex(optsTrans, activeSlide.index, this.gotoSlideIdx, zoomDest);

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
                                    angle: util.getLinear({ x: startAnim, y: this.rotation.currAngle }, { x: endAnim, y: -slideData[this.gotoSlideIdx].rotation }),
                                    margin: {
                                        x: util.getLinear({ x: startAnim, y: rotMargin.x }, { x: endAnim, y: 0 }),
                                        y: util.getLinear({ x: startAnim, y: rotMargin.y }, { x: endAnim, y: 0 })
                                    }
                                }
                            },
                            scrAnim,
                            lastTriggeredRotation = this.rotation.currAngle,
                            triggerRotEveryRad = util.degToRad(opts.events.triggerOnRotationEvery);

                        this.calcRotInfo(toPos);

                        events.unbindEvents();

                        if (optsTrans.onStart) {
                            optsTrans.onStart();
                        }

                        if (needToRotate) {
                            if (opts.events.onStartRotation) {
                                opts.events.onStartRotation($elem,
                                    util.radToDeg(-this.rotation.currAngle),
                                    this.rotation.getCenter(), {
                                        width: zoomUtil.scale(container.size.x),
                                        height: zoomUtil.scale(container.size.y)
                                    }, {
                                        x: container.pad.x,
                                        y: container.pad.y
                                    },
                                    util.radToDeg(slideData[this.gotoSlideIdx].rotation)
                                );
                            }
                        }

                        //////////////////////////////////////////////
                        // now animate
                        $({
                            scrAnim: startAnim
                        }).animate({
                            scrAnim: endAnim
                        }, {
                            duration: optsTrans.duration,
                            easing: opts.behaviour.easing,
                            step: function (now, fx) {
                                var panPnt = [now, now],
                                    zoomFactor = util.getQuadraticValue(coefs.zoom, now);

                                panPnt[maxDeltaIsX ? 1 : 0] = util.getQuadraticValue(coefs.pan, now);

                                if (needToZoom) {
                                    zoomUtil.doZoom(0, 0, zoomFactor, true);
                                    core.cssZoom();
                                }

                                var centerRot = { x: panPnt[0] * zoomFactor + container.pad.x, y: panPnt[1] * zoomFactor + container.pad.y },
                                    rotValue = 0;
                                if (core.rotation.needed) {
                                    rotValue = util.getQuadraticValue(coefs.rotation.angle, now);
                                }
                                core.rotation.cssOrigin(centerRot);

                                if (core.isIE8orBelow) {
                                    core.IE.doRotateScale(rotValue, { x: panPnt[0], y: panPnt[1] }, false, {
                                        marginX: util.getQuadraticValue(coefs.rotation.margin.x, now),
                                        marginY: util.getQuadraticValue(coefs.rotation.margin.y, now)
                                    });
                                    $elem.scrollLeft(panPnt[0] + container.pad.x - elementCenter.x).scrollTop(panPnt[1] + container.pad.y - elementCenter.y);
                                } else {
                                    if (core.rotation.needed) {
                                        core.rotation.cssRotate(rotValue, {
                                            marginX: util.getQuadraticValue(coefs.rotation.margin.x, now),
                                            marginY: util.getQuadraticValue(coefs.rotation.margin.y, now)
                                        });
                                    }
                                    $elem.scrollLeft(centerRot.x - elementCenter.x).scrollTop(centerRot.y - elementCenter.y);
                                }

                                if (needToRotate && opts.events.onRotation && Math.abs(rotValue - lastTriggeredRotation) >= triggerRotEveryRad) {
                                    lastTriggeredRotation = rotValue;
                                    opts.events.onRotation($elem, util.radToDeg(-rotValue), centerRot, {
                                        width: container.size.x * zoomFactor,
                                        height: container.size.y * zoomFactor
                                    }, {
                                        x: container.pad.x,
                                        y: container.pad.y
                                    });
                                }
                            },
                            complete: function () {
                                core.rotation.currAngle = -slideData[core.gotoSlideIdx].rotation;
                                var centerRot = { x: toPos.x * zoomDest + container.pad.x, y: toPos.y * zoomDest + container.pad.y };
                                core.rotation.cssOrigin(centerRot);

                                if (core.isIE8orBelow) {
                                    core.IE.doRotateScale(core.rotation.currAngle, toPos, true, { marginX: 0, marginY: 0 });
                                    $elem.scrollLeft(toPos.x + container.pad.x - elementCenter.x).scrollTop(toPos.y + container.pad.y - elementCenter.y);
                                } else {
                                    if (core.rotation.needed) {
                                        core.rotation.cssRotate(core.rotation.currAngle, { marginX: 0, marginY: 0 });
                                    }
                                    $elem.scrollLeft(centerRot.x - elementCenter.x).scrollTop(centerRot.y - elementCenter.y);
                                }

                                if (needToRotate && opts.events.onEndRotation) {
                                    opts.events.onEndRotation($elem, util.radToDeg(-core.rotation.currAngle), centerRot, {
                                        width: container.size.x * zoomDest,
                                        height: container.size.y * zoomDest
                                    }, {
                                        x: container.pad.x,
                                        y: container.pad.y
                                    });
                                }
                                events.bindEvents();
                                transData.finished(optsTrans.onComplete);
                            }
                        });
                        //////////////////////////////////////////////
                    } else {
                        transData.finished(optsTrans.onComplete);
                    }
                },

                doSlideshow: function (event) {
                    var runTransition = function () {
                        transData.onComplete = function () {
                            if (transData.onEndTransition) {
                                transData.onEndTransition();
                            }
                            if (seqData.state == $.fn.rsSlideIt.states.PLAYING && (seqData.idx % seqData.qt.sequences > 0 || seqData.repeat == -1 || seqData.repeat-- > 0)) {
                                if (transData.setupNextTrans()) {
                                    $elem.trigger('goto.rsSlideIt', [transData]);
                                }
                            } else {
                                seqData.setCompleteState();
                                switch (seqData.state) {
                                    case $.fn.rsSlideIt.states.STOPPED:
                                        if (transData.inputOpts.onStoppedSequence) {
                                            transData.inputOpts.onStoppedSequence();
                                        }
                                        break;
                                    case $.fn.rsSlideIt.states.PAUSED:
                                        if (transData.inputOpts.onPausedSequence) {
                                            transData.inputOpts.onPausedSequence();
                                        }
                                }
                            }
                        };
                        transData.onEndTransition = null;
                        transData.onComplete();
                        transData.onEndTransition = transData.inputOpts.onEndTransition;
                    };

                    if (transData.inputOpts.onPlaySequence) {
                        transData.inputOpts.onPlaySequence();
                    }
                    seqData.state = $.fn.rsSlideIt.states.PLAYING;
                    runTransition();
                },

                init: function () {
                    container.init();
                    var col = 0,
                    row = 0,
                    needNewRow = false,
                    justifySlide = {
                        x: opts.layout.cols != null && opts.layout.slideAlignX != null && (opts.layout.slideAlignX == 'left' || opts.layout.slideAlignX == 'center' || opts.layout.slideAlignX == 'right'),
                        y: opts.layout.cols != null && opts.layout.slideAlignY != null && (opts.layout.slideAlignY == 'top' || opts.layout.slideAlignY == 'center' || opts.layout.slideAlignY == 'bottom')
                    },
                    maxWidthInCol = [],
                    maxHeightInRow = [],
                    getCaption = function ($slide) {
                        var caption = [];
                        if (opts.selector.caption != null) {
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
                    getRotation = function ($slide) {
                        var notDefined = function (value) {
                            return value == null || value == undefined || value == "" || value == "none";
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
                                                value = $slide.css('-ms-transform');
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
                        if (found == null || notDefined(found[0])) {
                            // try degrees
                            found = value.match(/rotate\([-|+]?[\d.]+deg\)/i);
                            if (found == null || notDefined(found[0])) {
                                // try grads
                                found = value.match(/rotate\([-|+]?[\d.]+grad\)/i);
                                if (found == null || notDefined(found[0])) {
                                    // try turns
                                    found = value.match(/rotate\([-|+]?[\d.]+turn\)/i);
                                    if (found == null || notDefined(found[0])) {
                                        return 0;
                                    } else toRad = Math.PI / 0.5; // turn to rad
                                } else toRad = Math.PI / 200; // grad to rad
                            } else toRad = Math.PI / 180; // deg to rad
                        } else toRad = 1; // rad to rad
                        // remove ocurrences of: "rotate", "(", "deg", "rad", "grad", "turn", ")", "none"
                        value = value.replace(/(rotate|\(|deg|rad|grad|turn|\)|none)/gi, '');
                        return util.toFloat(value) * toRad;
                    },
                    changeRow = function (col) {
                        if (opts.layout.cols != null) {
                            if (typeof opts.layout.cols === 'object') {
                                return col % opts.layout.cols[row % opts.layout.cols.length] == 0;
                            }
                            return col % opts.layout.cols == 0;
                        }
                        return false;
                    },
                    getSlideSizes = function ($slide) {
                        if (core.isIE8orBelow) {
                            var filter = $slide.css('filter');
                            try {
                                $slide.css('filter', '');
                                return {
                                    outerSize: [$slide.outerWidth(), $slide.outerHeight()],
                                    outerSizeAll: [$slide.outerWidth(true), $slide.outerHeight(true)],
                                    size: [$slide.width(), $slide.height()]
                                };
                            } finally {
                                $slide.css('filter', filter);
                            }
                        }
                        return {
                            outerSize: [$slide.outerWidth(), $slide.outerHeight()],
                            outerSizeAll: [$slide.outerWidth(true), $slide.outerHeight(true)],
                            size: [$slide.width(), $slide.height()]
                        };
                    },
                    loadSlideData = function () {
                        // could be done with each(), but the core for(;;) is faster
                        for (var i = 0; i < container.$slides.length; ++i) {
                            // save data needed to render the zoom and rotation
                            var $slide = container.$slides.eq(i),
                                slideSizes = getSlideSizes($slide),
                                rotAngle = getRotation($slide),
                                slideInSlide = $slidesInSlides.index($slide) > -1,
                                contRect = core.rotation.getContainerRectCenter(rotAngle, slideSizes.size),
                                contRectOuter = core.rotation.getContainerRectCenter(rotAngle, slideSizes.outerSizeAll);

                            // to prevent the default behaviour in IE when dragging an element
                            $slide[0].ondragstart = function () { return false; };

                            if (!slideInSlide && needNewRow) {
                                ++row;
                            }
                            if (contRectOuter.topLeft.x < 0) {
                                contRectOuter.topLeft.x = -contRectOuter.topLeft.x;
                                contRectOuter.bottomRight.x += 2 * contRectOuter.topLeft.x;
                            }
                            if (contRectOuter.topLeft.y < 0) {
                                contRectOuter.topLeft.y = -contRectOuter.topLeft.y;
                                contRectOuter.bottomRight.y += 2 * contRectOuter.topLeft.y;
                            }
                            slideData.push({
                                // pos and centerTrans are computed later
                                pos: { x: 0, y: 0 },
                                centerTrans: { x: 0, y: 0 }, // same as center (see below) but with transformations applied
                                size: { // outer size includes margin + border + padding
                                    x: contRectOuter.bottomRight.x - contRectOuter.topLeft.x,
                                    y: contRectOuter.bottomRight.y - contRectOuter.topLeft.y
                                },
                                slideSizeNoRotation: {
                                    x: slideSizes.size[0],
                                    y: slideSizes.size[1]
                                },
                                slideOuterSizeNoRotation: {
                                    x: slideSizes.outerSizeAll[0],
                                    y: slideSizes.outerSizeAll[1]
                                },
                                slideSize: {
                                    x: contRect.bottomRight.x - contRect.topLeft.x,
                                    y: contRect.bottomRight.y - contRect.topLeft.y
                                },
                                rectOuter: {
                                    left: contRectOuter.topLeft.x,
                                    top: contRectOuter.topLeft.y,
                                    right: contRectOuter.bottomRight.x,
                                    bottom: contRectOuter.bottomRight.y
                                },
                                center: {
                                    x: util.toInt($slide.css('margin-left')) + slideSizes.outerSize[0] / 2,
                                    y: util.toInt($slide.css('margin-top')) + slideSizes.outerSize[1] / 2
                                },
                                padding: [util.toInt($slide.css('padding-top')), util.toInt($slide.css('padding-right')), util.toInt($slide.css('padding-bottom')), util.toInt($slide.css('padding-left'))],
                                border: [util.toInt($slide.css('border-top-width')), util.toInt($slide.css('border-right-width')), util.toInt($slide.css('border-bottom-width')), util.toInt($slide.css('border-left-width'))],
                                margin: [util.toInt($slide.css('margin-top')), util.toInt($slide.css('margin-right')), util.toInt($slide.css('margin-bottom')), util.toInt($slide.css('margin-left'))],
                                caption: getCaption($slide),
                                rotation: rotAngle,
                                radius: 0, // radius between center of rotation and slide center point (to be computed later)
                                angleToCenter: 0 // angle between X axis and segment that connects this slide center with the center of rotation (to be computed later)
                            });
                            core.rotation.needed = core.rotation.needed || Math.abs(rotAngle) > 0.00001;

                            if (slideData[i].slideSizeNoRotation.x == 0 || slideData[i].slideSizeNoRotation.y == 0) {
                                throw {
                                    id: 'no data',
                                    msg: 'Width or height are missing for slide #' + i + ': ' + $("<div />").append($slide).html()
                                }
                            }
                            if (!slideInSlide) {
                                if (justifySlide.x) {
                                    if (col === maxWidthInCol.length) {
                                        maxWidthInCol.push(slideData[i].size.x / 2);
                                    } else {
                                        maxWidthInCol[col] = Math.max(maxWidthInCol[col], slideData[i].size.x / 2);
                                    }
                                }

                                if (justifySlide.y) {
                                    if (row === maxHeightInRow.length) {
                                        maxHeightInRow.push(slideData[i].size.y / 2);
                                    } else {
                                        maxHeightInRow[row] = Math.max(maxHeightInRow[row], slideData[i].size.y / 2);
                                    }
                                }

                                needNewRow = changeRow(++col);
                                if (needNewRow) {
                                    col = 0;
                                }
                            }
                        }
                        container.setPad(core.rotation.needed);
                    },

                    setSlidePos = function () {
                        var diff,
                            maxHeight = 0,
                            offset = {
                                x: 0,
                                y: 0
                            },
                            parentSlideIdx = -1;
                        col = row = 0;
                        needNewRow = false;
                        container.resetMaxSize();
                        container.$zoomDiv.css({
                            'position': 'relative',
                            'z-index': 0 // fix for IE8 standards mode that, without this z-index, cannot rotate child elements
                        });
                        for (var i = 0; i < container.$slides.length; ++i) {
                            var $slide = container.$slides.eq(i),
                                slideInSlide = $slidesInSlides.index($slide) > -1;

                            if (slideInSlide && parentSlideIdx != -1) {
                                slideData[i].pos.x = slideData[parentSlideIdx].pos.x + $slide.position().left;
                                slideData[i].pos.y = slideData[parentSlideIdx].pos.y + $slide.position().top;
                            } else {
                                if (needNewRow) {
                                    ++row;
                                    offset.y += maxHeight;
                                    container.setMaxSize(offset.x, offset.y);
                                    offset.x = 0;
                                    maxHeight = col = 0;
                                }

                                slideData[i].pos.x = opts.layout.cols == null ? $slide.position().left : offset.x;
                                slideData[i].pos.x += slideData[i].rectOuter.left;
                                if (justifySlide.x) {
                                    diff = maxWidthInCol[col] - slideData[i].size.x / 2;
                                    if (diff !== 0) {
                                        slideData[i].pos.x += opts.layout.slideAlignX == 'center' ? diff : (opts.layout.slideAlignX == 'left' ? 0 : diff * 2);
                                    }
                                    offset.x += maxWidthInCol[col] * 2;
                                } else {
                                    offset.x += slideData[i].size.x;
                                }

                                slideData[i].pos.y = opts.layout.cols == null ? $slide.position().top : offset.y;
                                slideData[i].pos.y += slideData[i].rectOuter.top;
                                if (justifySlide.y) {
                                    diff = maxHeightInRow[row] - slideData[i].size.y / 2;
                                    if (diff !== 0) {
                                        slideData[i].pos.y += opts.layout.slideAlignY == 'center' ? diff : (opts.layout.slideAlignY == 'top' ? 0 : diff * 2);
                                    }
                                    maxHeight = Math.max(maxHeight, maxHeightInRow[row] * 2);
                                } else {
                                    maxHeight = Math.max(maxHeight, slideData[i].size.y);
                                }

                                if (opts.layout.cols != null) {
                                    var ieOffset = { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0} };
                                    if (core.isIE8orBelow) {
                                        ieOffset = core.rotation.getContainerRectCenter(slideData[i].rotation, [slideData[i].slideSizeNoRotation.x, slideData[i].slideSizeNoRotation.y]);
                                    }
                                    $slide.css({
                                        'position': 'absolute',
                                        'left': (slideData[i].pos.x + ieOffset.topLeft.x) + 'px',
                                        'top': (slideData[i].pos.y + ieOffset.topLeft.y) + 'px'
                                    });
                                } else {
                                    $slide.css('position', 'absolute');
                                }

                                needNewRow = changeRow(++col);
                                parentSlideIdx = i;
                            }
                        }
                        offset.y += maxHeight;
                        container.setMaxSize(offset.x, offset.y);
                        container.$paddingDiv.add(container.$zoomDiv).css({
                            'width': container.size.x + 'px',
                            'height': container.size.y + 'px'
                        });
                        container.setSizeForIE();
                    },
                    $slidesInSlides = opts.selector.slideInSlide === null ? $([]) : $(opts.selector.slideInSlide);

                    loadSlideData();
                    setSlidePos();
                    $elem.
                        bind('goto.rsSlideIt', events.onTransition).
                        bind('playPause.rsSlideIt', events.onPlayPause).
                        bind('stop.rsSlideIt', events.onStop).
                        bind('getter.rsSlideIt', events.onGetter).
                        bind('setter.rsSlideIt', events.onSetter);
                    container.$slides.bind('click.rsSlideIt', events.onClick);
                },
                initSlideForRotation: function (slide) {
                    slide = slide < 0 ? 0 : (slide >= container.$slides.length ? container.$slides.length - 1 : slide);
                    activeSlide.index = slide;
                    activeSlide.$slide = container.$slides.eq(slide);
                    this.calcRotInfo({
                        x: slideData[slide].pos.x + slideData[slide].center.x,
                        y: slideData[slide].pos.y + slideData[slide].center.y
                    });
                },
                gotoSlide: function (slide, zoomValue) {
                    var zoomDest = zoomUtil.checkZoomBounds(zoomUtil.getZoomDest(zoomValue, slide));
                    core.rotation.cssOrigin({
                        x: (slideData[slide].pos.x + slideData[slide].center.x) * zoomDest + container.pad.x,
                        y: (slideData[slide].pos.y + slideData[slide].center.y) * zoomDest + container.pad.y
                    });

                    core.doTransition(null, {
                        slide: slide,
                        duration: 0,
                        zoomDest: zoomDest
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
                    return str == null || str == undefined || str == 'auto' || str == '' ? 0 : parseInt(str, 10);
                },

                toFloat: function (str) {
                    return str == null || str == undefined || str == 'auto' || str == '' ? 0.0 : parseFloat(str);
                },

                getDistanceTwoPnts: function (pnt1, pnt2) {
                    var pt = [pnt1.x - pnt2.x, pnt1.y - pnt2.y];
                    return Math.sqrt(pt[0] * pt[0] + pt[1] * pt[1]);
                },

                getDistanceTwoSlides: function (i1, i2) {
                    return this.getDistanceTwoPnts({
                        x: slideData[i1].pos.x + slideData[i1].center.x,
                        y: slideData[i1].pos.y + slideData[i1].center.y
                    }, {
                        x: slideData[i2].pos.x + slideData[i2].center.x,
                        y: slideData[i2].pos.y + slideData[i2].center.y
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
                        case 'prev': return activeSlide.index == 0 ? slideData.length - 1 : activeSlide.index - 1;
                        case 'next': return activeSlide.index == slideData.length - 1 ? 0 : activeSlide.index + 1;
                        case 'first': return 0;
                        case 'last': return slideData.length - 1;
                        default: return dest;
                    }
                }
            },

            zoomUtil = {
                zoom: 1.0,
                zoomVertex: 0,
                longestPath: 0, // used when zoomVertex is 'in' or 'out'
                scale: function (value, factor) {
                    return value * (factor == null || factor == undefined ? this.zoom : factor);
                },
                unscale: function (value, factor) {
                    return value / (factor == null || factor == undefined ? this.zoom : factor);
                },
                checkZoomBounds: function (zoomValue) {
                    return (zoomValue > opts.zoomMax ? opts.zoomMax : (zoomValue < opts.zoomMin ? opts.zoomMin : zoomValue));
                },
                calcLongestPath: function () {
                    this.longestPath = 0;
                    for (var i = 0; i < container.$slides.length; ++i) {
                        for (var j = i + 1; j < container.$slides.length; ++j) {
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
                    }

                    if (prevZoom != this.zoom && opts.events.onChangeZoom) {
                        opts.events.onChangeZoom($elem, this.zoom);
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
                        var fit = [
                            elementCenter.x * 2 / (slideData[gotoSlideIdx].padding[3] + slideData[gotoSlideIdx].slideSizeNoRotation.x + slideData[gotoSlideIdx].padding[1]),
                            elementCenter.y * 2 / (slideData[gotoSlideIdx].padding[0] + slideData[gotoSlideIdx].slideSizeNoRotation.y + slideData[gotoSlideIdx].padding[2])
                        ];
                        switch (zDest) {
                            case 'current': return this.zoom;
                            case 'fitWidth': return fit[0];
                            case 'fitHeight': return fit[1];
                            case 'fit': return Math.min(fit[0], fit[1]);
                            case 'cover': return Math.max(elementCenter.x * 2 / slideData[gotoSlideIdx].slideSizeNoRotation.x, elementCenter.y * 2 / slideData[gotoSlideIdx].slideSizeNoRotation.y);
                            default: return this.zoom;
                        }
                    }
                    return zDest;
                },
                initZoom: function (z, zMin, slideIdx) {
                    this.zoom = zMin;
                    this.zoom = this.checkZoomBounds(this.getZoomDest(z, slideIdx));
                    if (opts.events.onChangeZoom) {
                        opts.events.onChangeZoom($elem, this.zoom);
                    }
                },
                setterZoom: function (newZoom) {
                    var $pos = $elem.position(),
                        prev = [$elem.scrollLeft() / this.zoom, $elem.scrollTop() / this.zoom];
                    this.doZoom(
                        $pos.left + elementCenter.x,
                        $pos.top + elementCenter.y,
                        this.checkZoomBounds(newZoom), false);
                    $elem.scrollLeft(prev[0] * this.zoom).scrollTop(prev[1] * this.zoom);
                }
            },

            panUtil = {
                startPos: {
                    x: 0,
                    y: 0
                },

                // speed records the mouse speed while user is dragging the slides
                mouseSpeed: {
                    value: {
                        x: 0,
                        y: 0
                    },
                    lastPt: {
                        x: -1,
                        y: -1
                    },
                    isRunning: false,
                    id: 0,
                    startTimer: function () {
                        this.id = window.setInterval(function () {
                            panUtil.mouseSpeed.getCoords();
                        }, 20);
                        this.isRunning = true;
                    },
                    stopTimer: function () {
                        if (this.isRunning) {
                            window.clearInterval(this.id);
                            this.lastPt.x = -1;
                            this.lastPt.y = -1;
                            this.isRunning = false;
                        }
                    },
                    getCoords: function () {
                        var scrPos = { x: $elem.scrollLeft(), y: $elem.scrollTop() };
                        this.value.x = scrPos.x - (this.lastPt.x == -1 ? scrPos.x : this.lastPt.x);
                        this.value.y = scrPos.y - (this.lastPt.y == -1 ? scrPos.y : this.lastPt.y);
                        this.lastPt.x = scrPos.x;
                        this.lastPt.y = scrPos.y;
                    }
                },

                // timer that starts on mouseup and stops some moments later (until scrolls stops)
                // its is used to make a smooth scroll deceleration after panning with the mouse.
                // this feature is available when useAcceleration is true
                timerSmoothStop: {
                    isRunning: false,
                    id: 0,
                    startTimer: function () {
                        this.id = window.setInterval(function () {
                            panUtil.timerSmoothStop.smoothStop();
                        }, 30);
                        this.isRunning = true;
                    },
                    stopTimer: function () {
                        if (this.isRunning) {
                            window.clearInterval(this.id);
                            this.isRunning = false;
                        }
                    },
                    smoothStop: function () {
                        $elem.
                            scrollLeft($elem.scrollLeft() + (panUtil.mouseSpeed.value.x > 0 ? --panUtil.mouseSpeed.value.x : (panUtil.mouseSpeed.value.x < 0 ? ++panUtil.mouseSpeed.value.x : 0))).
                            scrollTop($elem.scrollTop() + (panUtil.mouseSpeed.value.y > 0 ? --panUtil.mouseSpeed.value.y : (panUtil.mouseSpeed.value.y < 0 ? ++panUtil.mouseSpeed.value.y : 0)));
                        if (panUtil.mouseSpeed.value.x > 1) panUtil.mouseSpeed.value.x--;
                        if (panUtil.mouseSpeed.value.x < -1) panUtil.mouseSpeed.value.x++;
                        if (panUtil.mouseSpeed.value.y > 1) panUtil.mouseSpeed.value.y--;
                        if (panUtil.mouseSpeed.value.y < -1) panUtil.mouseSpeed.value.y++;
                        if (panUtil.mouseSpeed.value.x == 0 && panUtil.mouseSpeed.value.y == 0) this.stopTimer();
                    }
                },

                isPanning: false,

                startPan: function (event) {
                    this.startPos.x = event.clientX + $elem.scrollLeft();
                    this.startPos.y = event.clientY + $elem.scrollTop();
                    this.isPanning = true;
                    if (opts.behaviour.panOnMouseDrag.useAcceleration) {
                        // if still decelerating from last pan operation, then stop immediatelly
                        this.timerSmoothStop.stopTimer();

                        if (!this.mouseSpeed.isRunning) {
                            this.mouseSpeed.lastPt.x = this.mouseSpeed.lastPt.y = -1;
                            this.mouseSpeed.value.x = this.mouseSpeed.value.y = 0;
                            this.mouseSpeed.isRunning = true;
                            this.mouseSpeed.startTimer();
                        }
                    }
                },
                mousemove: function (event) {
                    if (event.which == 1) { // mouse is moving while button is being pressed down?
                        if (!this.isPanning) {
                            this.startPan(event);
                        }
                        $elem.
                            scrollLeft(panUtil.startPos.x - event.clientX).
                            scrollTop(panUtil.startPos.y - event.clientY);
                    } else {
                        if (this.isPanning) {
                            this.stopPan(event);
                        }
                    }
                },
                stopPan: function (useSmoothStop) {
                    this.isPanning = false;
                    if (opts.behaviour.panOnMouseDrag.useAcceleration) {
                        this.mouseSpeed.stopTimer();
                        if (useSmoothStop && !this.timerSmoothStop.isRunning) {
                            this.timerSmoothStop.startTimer();
                        }
                    }
                }
            },

            events = {
                onScroll: function (event) {
                    core.selectSlide(false);
                },
                onMouseWheel: function (event, delta, deltaX, deltaY) {
                    event.preventDefault(); // prevents scrolling
                    zoomUtil.doZoom(event.clientX, event.clientY, zoomUtil.zoom + deltaY * opts.zoomStep, false);
                },
                onPanning: function (event) {
                    panUtil.mousemove(event);
                },
                onTransition: function (event, optsTrans) {
                    core.doTransition(event, optsTrans);
                },
                onPlayPause: function (event, optsSequence) {
                    if (seqData.state == $.fn.rsSlideIt.states.PLAYING) {
                        seqData.state = $.fn.rsSlideIt.states.PAUSING;
                    } else {
                        if (seqData.state == $.fn.rsSlideIt.states.STOPPING) {
                            seqData.state = $.fn.rsSlideIt.states.STOPPED;
                        }
                        if (seqData.state == $.fn.rsSlideIt.states.STOPPED && !transData.animating) {
                            seqData.init(optsSequence, (typeof optsSequence.sequence === 'string') && (optsSequence.sequence == 'prev' || optsSequence.sequence == 'next'));
                        }
                        if (seqData.state == $.fn.rsSlideIt.states.PAUSED) {
                            seqData.state = $.fn.rsSlideIt.states.PLAYING;
                        }
                        if (seqData.state == $.fn.rsSlideIt.states.PLAYING) {
                            core.doSlideshow(event);
                        }
                    }
                },
                onStop: function (event) {
                    seqData.state = $.fn.rsSlideIt.states.STOPPING;
                },
                unbindEvents: function () {
                    $elemAndTops.unbind('scroll.rsSlideIt');
                    if (opts.behaviour.zoomOnMouseWheel) {
                        $elemAndTops.unbind('mousewheel.rsSlideIt');
                    }
                    if (opts.behaviour.panOnMouseDrag.enabled) {
                        $elemAndTops.unbind('mousedown.rsSlideIt mousemove.rsSlideIt mouseup.rsSlideIt');
                        $("body, html").unbind('mouseup.rsSlideIt');
                    }
                },
                bindEvents: function () {
                    $elemAndTops.bind('scroll.rsSlideIt', this.onScroll);
                    if (opts.behaviour.zoomOnMouseWheel) {
                        $elemAndTops.bind('mousewheel.rsSlideIt', this.onMouseWheel);
                    }
                    if (opts.behaviour.panOnMouseDrag.enabled) {
                        $elemAndTops.bind('mousemove.rsSlideIt', this.onPanning);
                    }
                    core.selectSlide(false);
                },
                onGetter: function (event, field) {
                    switch (field) {
                        case 'zoom': return zoomUtil.zoom;
                        case 'zoomMin': return opts.zoomMin;
                        case 'zoomStep': return opts.zoomStep;
                        case 'zoomMax': return opts.zoomMax;
                        case 'activeSlide': return activeSlide.index;
                        case 'rotation': return util.radToDeg(core.rotation.currAngle);
                        case 'center': return core.rotation.getCenter();
                        case 'padding': return { x: container.pad.x, y: container.pad.y };
                        case 'state': return seqData.state;
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
                            core.gotoSlide(value, zoomUtil.zoom);
                            break;
                        case 'center':
                            core.rotation.cssOrigin(value);
                            break;
                    }
                    return events.onGetter(event, field);
                },
                click_dblClickUtil: {
                    qtClicks: 0,
                    $slide: null
                },
                onClick: function (event) {
                    if (opts.events.onClickSlide || opts.events.onDblClickSlide) {
                        events.click_dblClickUtil.qtClicks++;
                        events.click_dblClickUtil.$slide = $(this);
                        if (events.click_dblClickUtil.qtClicks === 1) {
                            setTimeout(function () {
                                if (events.click_dblClickUtil.qtClicks === 1) {
                                    if (opts.events.onClickSlide) {
                                        opts.events.onClickSlide(event, $elem, events.click_dblClickUtil.$slide, container.$slides.index(events.click_dblClickUtil.$slide[0]));
                                    }
                                } else {
                                    if (opts.events.onDblClickSlide) {
                                        opts.events.onDblClickSlide(event, $elem, events.click_dblClickUtil.$slide, container.$slides.index(events.click_dblClickUtil.$slide[0]));
                                    }
                                }
                                events.click_dblClickUtil.qtClicks = 0;
                            }, 200);
                        }
                    }
                }
            };

        try {
            core.init();
        } catch (er) {
            if (er.id == 'no data') {
                var msg = 'rsSlideIt.init(): ' + er;
                if (window.console) {
                    console.error(msg);
                } else {
                    alert(msg);
                }
            } else {
                throw e; // other unhandled exception
            }
        }
        zoomUtil.initZoom(opts.initialZoom, opts.zoomMin, opts.initialSlide);
        core.initSlideForRotation(opts.initialSlide);
        core.cssZoom();
        core.gotoSlide(opts.initialSlide, opts.initialZoom);
        zoomUtil.calcLongestPath();
    }

    $.fn.rsSlideIt = function (options) {
        var transitionTo = function (optionsGoto) {
            var optsGoto = $.extend({}, $.fn.rsSlideIt.defaultsGoto, optionsGoto);

            return this.each(function () {
                $(this).trigger('goto.rsSlideIt', [optsGoto]);
            });
        },
        playPause = function (optionsSequence) {
            var optsSequence = $.extend({}, $.fn.rsSlideIt.defaultsSlideshow, optionsSequence);

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
                if (op != null) {
                    return this.eq(0).triggerHandler(op + '.rsSlideIt', arguments);
                }
            }
        };

        if (typeof options === 'string') {
            var otherArgs = Array.prototype.slice.call(arguments, 1);
            switch (options) {
                case 'goto': return transitionTo.apply(this, otherArgs);
                case 'playPause': return playPause.apply(this, otherArgs);
                case 'stop': return stop.call(this);
                case 'option': return option.apply(this, otherArgs);
                default: return this;
            }
        }
        var opts = $.extend({}, $.fn.rsSlideIt.defaults, options);
        opts.layout = $.extend({}, $.fn.rsSlideIt.defaults.layout, options ? options.layout : options);
        opts.behaviour = $.extend({}, $.fn.rsSlideIt.defaults.behaviour, options ? options.behaviour : options);
        opts.behaviour.panOnMouseDrag = $.extend({}, $.fn.rsSlideIt.defaults.behaviour.panOnMouseDrag, options ? (options.behaviour ? options.behaviour.panOnMouseDrag : options.behaviour) : options);
        opts.selector = $.extend({}, $.fn.rsSlideIt.defaults.selector, options ? options.selector : options);
        opts.events = $.extend({}, $.fn.rsSlideIt.defaults.events, options ? options.events : options);

        return this.each(function () {
            new SlideItClass($(this), opts);
        });
    };

    // public access to the default input parameters
    $.fn.rsSlideIt.defaults = {
        zoomMin: 0.4,
        zoomStep: 0.1,
        zoomMax: 15,
        initialSlide: 0,
        initialZoom: 1,
        layout: {
            cols: null,             // null for slides in a single row, integer or array of integers
            slideAlignX: 'default', // or 'left', 'center', 'right' 
            slideAlignY: 'default'  // or 'top', 'center', 'bottom'
        },
        behaviour: {
            zoomOnMouseWheel: true,
            panOnMouseDrag: {
                enabled: true,
                useAcceleration: true
            },
            easing: 'swing'
        },
        selector: {
            slide: 'img',
            caption: '.caption',
            slideInSlide: null,
            elementsOnTop: null
        },
        events: {
            onChangeSize: null,     // function ($elem, size, containerSize)
            onChangeZoom: null,     // function ($elem, zoom)
            onStartRotation: null,  // function ($elem, startDegrees, centerRot, size, padding, endDegrees)
            onRotation: null,       // function ($elem, degrees, centerRot, size, padding)
            onEndRotation: null,    // function ($elem, degrees, centerRot, size, padding)
            triggerOnRotationEvery: 2, // minimum angle offset in degrees that triggers the onRotation event.
            // For example, if element rotates from 0 to 22 degrees and triggerRotationEventEvery is 5, then
            // onRotation is called 6 times during rotation (when angle is 0, 5, 10, 15, 20, 22).
            // The event is always called on the first and last rotation angle.
            onUnselectSlide: null,    // function ($elem, $slide, slideIndex)
            onSelectSlide: null,      // function ($elem, $slide, slideIndex, caption)
            onClickSlide: null,       // function ($elem, $slide, slideIndex)
            onDblClickSlide: function (event, $elem, $slide, slideIndex) {
                $elem.rsSlideIt('goto', {
                    slide: slideIndex,
                    zoomDest: 'cover',
                    zoomVertex: 'linear',
                    duration: 'normal'
                });
            }
        }
    };

    $.fn.rsSlideIt.defaultsGoto = {
        slide: 'next',      // positive integer or 'prev' or 'first' or 'last'
        duration: 600,      // positive integer 
        zoomDest: 1,        // positive real number or 'current' or 'fitWidth' or 'fitHeight' or 'fit' or 'cover'
        zoomVertex: 1,      // positive number or 'out' or 'in' or 'linear'
        onStart: null,      // event handler called when this transition starts to run
        onComplete: null    // event handler called when this transition is completed
    };

    $.fn.rsSlideIt.defaultsSlideshow = {
        sequence: 'next',   // array of positive integers or 'prev' or 'next'
        delayOnSlide: 2000, // positive integer or an array of positive integers
        zoomDest: 1,        // positive real number or 'current' or 'fitWidth' or 'fitHeight' or 'fit' or 'cover' or an arrays of positive real numbers and strings
        zoomVertex: 1,      // positive real number or 'out' or 'in' or 'linear' or an arrays of positive real numbers and strings
        duration: 600,      // positive integer or array of positive integers
        repeat: 'forever',  // positive integer or 'forever',
        onPlaySequence: null,       // event handler called when the sequence starts to run
        onPausedSequence: null,      // event handler called when the sequence pauses in a specific slide
        onStartTransition: null,    // event handler called when the transition within the sequence starts to run
        onEndTransition: null, // event handler called when the transition within the sequence is completed
        onStoppedSequence: null        // event handler called when the whole sequence is completed (only if repeat is not 'forever')
    };

    $.fn.rsSlideIt.states = {
        STOPPING: 0, // button Stop was pressed and slider will stop as soon current transition finishes
        STOPPED: 1, // no transitions are currently running and user is free to navigate around
        PLAYING: 2, // sequence of transitions are running and user is locked from navigating around
        PAUSING: 3, // button Play/Pause was pressed and slider will pause as soon current transition finishes
        PAUSED: 4  // sequence is paused and another click to Play/Pause button will resume the sequence from the current point. User can navigate around
    };

})(jQuery);