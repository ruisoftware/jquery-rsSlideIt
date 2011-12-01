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
                size: {
                    x: 0,
                    y: 0
                },
                IEorigSize: {
                    paddingDiv: [0, 0],
                    zoomDiv: [0, 0]
                },
                IEpad: {
                    x: 0,
                    y: 0
                },
                pad: {
                    x: 0,
                    y: 0
                },
                setPad: function (usesRotation) {
                    this.IEpad.x = this.pad.x = elementCenter.x;
                    this.IEpad.y = this.pad.y = elementCenter.y;
                    if (usesRotation) {
                        this.IEpad.x = this.IEpad.y = this.pad.x = this.pad.y = Math.max(this.IEpad.x, this.IEpad.y);
                    }
                    this.$paddingDiv.css({
                        'padding-top': this.pad.y + 'px',
                        'padding-right': this.pad.x + 'px',
                        'padding-bottom': this.pad.y + 'px',
                        'padding-left': this.pad.x + 'px'
                    });
                },
                setSizeForIE: function() {
                    this.IEorigSize.paddingDiv[0] = this.$paddingDiv.outerWidth();
                    this.IEorigSize.paddingDiv[1] = this.$paddingDiv.outerHeight();
                    this.IEorigSize.zoomDiv[0] = this.$zoomDiv.width();
                    this.IEorigSize.zoomDiv[1] = this.$zoomDiv.height();
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

            seqData = { // data for the whole sequence (of transitions) currently running
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
                        sequences: (typeof optsSequence.sequence == 'object') ? optsSequence.sequence.length : (isPrevOrNext ? slideData.length : 0),
                        delays: (typeof optsSequence.delayOnSlide == 'object') ? optsSequence.delayOnSlide.length : 0,
                        zoomDests: (typeof optsSequence.zoomDest == 'object') ? optsSequence.zoomDest.length : 0,
                        zoomVertexes: (typeof optsSequence.zoomVertex == 'object') ? optsSequence.zoomVertex.length : 0,
                        durations: (typeof optsSequence.duration == 'object') ? optsSequence.duration.length : 0
                    };
                }
            },
            transData = {     // data for the current transition that is running
                goto: null,
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
                    this.goto = this.duration = this.zoomDest = this.zoomVertex = this.onComplete = this.onEndTransition = null;
                },
                setupNextTrans: function () {
                    this.goto = this.isPrevOrNext ? this.inputOpts.sequence : this.inputOpts.sequence[seqData.idx % seqData.qt.sequences];
                    if (!this.isPrevOrNext && this.goto == activeSlide.index) {
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
                        window.setTimeout(done, seqData.qt.delays == 0 ? transData.inputOpts.delayOnSlide : transData.inputOpts.delayOnSlide[seqData.idx % seqData.qt.delays]);
                    }
                }
            },

            core = {
                gotoSlideIdx: 0,
                isIE8orBelow: $.browser.msie && parseFloat($.browser.version) < 9,
                rotation: {
                    needed: false,
                    currAngle: 0,
                    currOrigin: null,
                    IE: { // in IE8 or below, rotation works differently from other browsers. 
                        // Thus we need to set an adjustment margin to the element to make it look identical to what other browsers do
                        adjustmentMargin: [0, 0],
                        getMatrix: function (rot) {
                            var cosine = Math.cos(rot),
                                sine = Math.sin(rot);
                            return "progid:DXImageTransform.Microsoft.Matrix(" +
                                "M11=" + cosine + ", M12=" + (-sine) +
                                ", M21=" + sine + ", M22=" + cosine + ", SizingMethod='auto expand')";
                        },
                        doRotate: function (rot, center) {
                            container.$paddingDiv.add(container.$zoomDiv).css({
                                'filter': core.rotation.IE.getMatrix(rot)
                            });
                            var corner = core.rotation.getContainerCorners(container.$paddingDiv, rot,
                                [zoomUtil.scale(center[0]), zoomUtil.scale(center[1])], 
                                [zoomUtil.scale(container.IEorigSize.paddingDiv[0]), zoomUtil.scale(container.IEorigSize.paddingDiv[0])]),
                                
                                cornerZoom = core.rotation.getContainerCorners(container.$zoomDiv, rot,
                                    [zoomUtil.scale(center[0] - container.pad.x), zoomUtil.scale(center[1] - container.pad.y)], 
                                    [zoomUtil.scale(container.IEorigSize.zoomDiv[0]), zoomUtil.scale(container.IEorigSize.zoomDiv[1])]),

                                scrPos = [$elem.scrollLeft(), $elem.scrollTop()];

                            this.adjustmentMargin[0] = corner.topLeft.x;
                            this.adjustmentMargin[1] = corner.topLeft.y;
                            core.rotation.cssMargin([0, 0]);
                            var zPos = container.$zoomDiv.position();
                            
                            container.IEpad.x = util.toInt(container.$paddingDiv.css('padding-left')) + (container.pad.x + cornerZoom.topLeft.x) - zPos.left - scrPos[0],
                            container.IEpad.y = util.toInt(container.$paddingDiv.css('padding-top')) + (container.pad.y + cornerZoom.topLeft.y) - zPos.top - scrPos[1];
                            container.$paddingDiv.css({
                                'padding-top': container.IEpad.y + 'px',
                                'padding-right': container.IEpad.x + 'px',
                                'padding-bottom': container.IEpad.y + 'px',
                                'padding-left': container.IEpad.x + 'px'
                            });
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
                        }
                    },
                    // given an $elem and their rotation angle (with rotation center on element's center point),
                    // it returns the [left, top, right, bottom] of the rectangle that outlines the rotated $elem 
                    getContainerRect: function ($elem, elemAngle, size) {
                        var center = [size[0] / 2, size[1] / 2];

                        // optimization
                        if (Math.abs(Math.sin(elemAngle)) < 0.000005) {
                            return [0, 0, size[0], size[1]];
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
                        return [
                        // top left corner
                            Math.min(xLT, Math.min(xRT, Math.min(xLB, Math.min(0, xRB)))),
                            Math.min(yLT, Math.min(yRT, Math.min(yLB, Math.min(0, yRB)))),
                        // bottom right corner
                            Math.max(xLT, Math.max(xRT, Math.max(xLB, Math.max(size[0], xRB)))),
                            Math.max(yLT, Math.max(yRT, Math.max(yLB, Math.max(size[1], yRB))))
                        ];
                    },
                    // given an $elem and their rotation angle (with an arbitrary rotation center), 
                    // it returns the top left and the bottom right points of the rotated rectangle 
                    getContainerCorners: function ($elem, elemAngle, center, size) {
                        // size cannot be #elem.width(), $elem.height() because IE returns current outline size, need to use unrotated and unscalled size

                        // optimization
                        if (Math.cos(elemAngle) > 0.999995) {
                            return {
                                topLeft: { x: 0, y: 0 },
                                bottomRight: { x: size[0], y: size[1] }
                            };
                        }

                        // LT: Left Top, RT: Right Top, RB: Right Bottom, LB: Left Bottom
                        // +: center point located at (a, b)
                        // c: (rectangle width - a)
                        // d: (rectangle height - b)
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
                        var segments = {
                            a: center[0],
                            b: center[1],
                            c: size[0] - center[0],
                            d: size[1] - center[1]
                        },
                        // compute all four hypotenuses from the center point to the four corners
                            hLT = Math.sqrt(segments.a * segments.a + segments.b * segments.b),
                            hRT = Math.sqrt(segments.c * segments.c + segments.b * segments.b),
                            hRB = Math.sqrt(segments.c * segments.c + segments.d * segments.d),
                            hLB = Math.sqrt(segments.a * segments.a + segments.d * segments.d),
                            angleLT = (hLT.toFixed(0) == 0 ? 0 : Math.acos(segments.a / hLT)),
                            angleRT = (hRT.toFixed(0) == 0 ? 0 : Math.acos(segments.c / hRT)),
                            angleRB = (hRB.toFixed(0) == 0 ? 0 : Math.acos(segments.c / hRB)),
                            angleLB = (hLB.toFixed(0) == 0 ? 0 : Math.acos(segments.a / hLB));

                        // special case when center point is outside the rectangle   
                        if (center[1] < 0) {
                            angleLT += Math.PI;
                            angleRT = -angleRT;
                        } else {
                            angleLT = Math.PI - angleLT;
                        }
                        if (center[1] > size[1]) {
                            angleLB = Math.PI - angleLB;
                        } else {
                            angleLB += Math.PI;
                            angleRB = -angleRB;
                        }
                        angleLT -= elemAngle;
                        angleRT -= elemAngle;
                        angleRB -= elemAngle;
                        angleLB -= elemAngle;
                        var xLT = Math.round(center[0] + hLT * Math.cos(angleLT)),
                            xRT = Math.round(center[0] + hRT * Math.cos(angleRT)),
                            xRB = Math.round(center[0] + hRB * Math.cos(angleRB)),
                            xLB = Math.round(center[0] + hLB * Math.cos(angleLB)),

                            yLT = Math.round(center[1] - hLT * Math.sin(angleLT)),
                            yRT = Math.round(center[1] - hRT * Math.sin(angleRT)),
                            yRB = Math.round(center[1] - hRB * Math.sin(angleRB)),
                            yLB = Math.round(center[1] - hLB * Math.sin(angleLB));
                        return {
                            topLeft: {
                                x: Math.min(xLT, Math.min(xRT, Math.min(xLB, xRB))),
                                y: Math.min(yLT, Math.min(yRT, Math.min(yLB, yRB)))
                            },
                            bottomRight: {
                                x: Math.max(xLT, Math.max(xRT, Math.max(xLB, xRB))),
                                y: Math.max(yLT, Math.max(yRT, Math.max(yLB, yRB)))
                            }
                        };
                    },
                    getCenter: function () {
                        if (this.currOrigin == null) {
                            var orig = container.$paddingDiv.css('-webkit-transform-origin');
                            if (orig != null) {
                                var origV = orig.split(" ");
                                this.currOrigin = [util.toInt(origV[0]), util.toInt(origV[1])];
                            } else {
                                this.currOrigin = [container.$paddingDiv.width() / 2, container.$paddingDiv.height() / 2];
                            }
                        }
                        return [this.currOrigin[0], this.currOrigin[1]];
                    },
                    // when transform-origin is changed to an element that is rotated, that element shifts to another position.
                    // To make the element appear in the same position, need to apply a top left margin to compensate the element shifting.
                    adjustRotOrigin: function (slideIdx, newCenter) {
                        if (Math.abs(this.currAngle) > 0.005) {
                            var orig = this.getCenter();
                            if (orig != null) {
                                if (newCenter.x != Math.floor(orig[0]) || newCenter.y != Math.floor(orig[1])) {
                                    var pntTopRight1 = this.getTopRight(orig, [zoomUtil.scale(slideData[slideIdx].center.x), -zoomUtil.scale(slideData[slideIdx].center.y)]),
                                        pntTopRight2 = this.getTopRight([newCenter.x, newCenter.y],
                                            [container.pad.x + zoomUtil.scale(slideData[slideIdx].pos.x + slideData[slideIdx].slideOuterSizeNoRotation.x) - newCenter.x,
                                             container.pad.y + zoomUtil.scale(slideData[slideIdx].pos.y) - newCenter.y]),
                                        margin = [pntTopRight1[0] - pntTopRight2[0], pntTopRight1[1] - pntTopRight2[1]];

                                    core.rotation.cssMargin(margin);
                                    return margin;
                                }
                            }
                        }
                        return [0, 0];
                    },
                    getTopRight: function (center, size) {
                        var h = Math.sqrt(size[0] * size[0] + size[1] * size[1]),
                            angleBox = Math.acos(size[0] / h),
                            totalAngle = (size[1] > 0 ? -angleBox : angleBox) - this.currAngle;
                        return [h * Math.cos(totalAngle) + center[0], -h * Math.sin(totalAngle) + center[1]];
                    },
                    cssRotate: function (rot, centerRot) {
                        if (core.isIE8orBelow) {
                            core.rotation.IE.doRotate(rot, centerRot);
                        } else {
                            var rotation = 'rotate(' + rot + 'rad)';
                            container.$paddingDiv.css({
                                '-webkit-transform': rotation,
                                '-moz-transform': rotation,
                                '-o-transform': rotation,
                                '-ms-transform': rotation,
                                'transform': rotation
                            });
                        }
                    },
                    cssOrigin: function (origin) {
                        if (this.currOrigin == null) {
                            this.currOrigin = [origin[0], origin[1]];
                        } else {
                            this.currOrigin[0] = origin[0];
                            this.currOrigin[1] = origin[1];
                        }
                        var orig = origin[0] + 'px ' + origin[1] + 'px';
                        container.$paddingDiv.css({
                            '-webkit-transform-origin': orig,
                            '-moz-transform-origin': orig,
                            '-o-transform-origin': orig,
                            'transform-origin': orig
                        });
                    },
                    cssMargin: function (m) {
                        container.$paddingDiv.css({
                            'margin-left': (m[0] + core.rotation.IE.adjustmentMargin[0]) + 'px',
                            'margin-top': (m[1] + core.rotation.IE.adjustmentMargin[1]) + 'px'
                        });
                    }
                },

                cssZoom: function () {
                    /*
                    var scale = 'scale(' + zoomUtil.zoom + ')';
                    if (this.currOrigin != null) {
                    scale += ' translate(' + this.currOrigin[0] + ',' + this.currOrigin[1] + ')';
                    }
                    container.$zoomDiv.css({
                    '-moz-transform': scale,
                    '-webkit-transform': scale,
                    '-o-transform': scale,
                    'transform': scale,
                    'zoom': zoomUtil.zoom
                    });
                    */
                    container.$zoomDiv.css({
                        '-moz-transform-origin': '0px 0px',
                        '-moz-transform': 'scale(' + zoomUtil.zoom + ')',
                        '-o-transform-origin': '0px 0px',
                        '-o-transform': 'scale(' + zoomUtil.zoom + ')',
                        'zoom': zoomUtil.zoom
                    });
                    var newSize = [zoomUtil.scale(container.size.x), zoomUtil.scale(container.size.y)];
                    container.$paddingDiv.css({
                        'width': newSize[0] + 'px',
                        'height': newSize[1] + 'px'
                    });
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
                            }, {
                                x: centerRot[0],
                                y: centerRot[1]
                            });

                        if (slideData[i].radius > 0.005) {
                            slideData[i].angleToCenter = Math.acos((slideData[i].pos.x + slideData[i].center.x - centerRot[0]) / slideData[i].radius);
                            if (slideData[i].pos.y + slideData[i].center.y > centerRot[1]) {
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
                        $minSlide = null,
                        minDist = minIdx = -1,
                        offset = this.rotation.getCenter();
                    offset[0] -= $elem.scrollLeft();
                    offset[1] -= $elem.scrollTop();
                    // could be done with each(), but the core for(;;) is faster
                    for (var i = len - 1; i > -1; i--) {
                        var $slide = container.$slides.eq(i),
                            dist = util.getDistanceTwoPnts({
                                x: zoomUtil.scale(slideData[i].radius) * Math.cos(this.rotation.currAngle - slideData[i].angleToCenter) + offset[0],
                                y: zoomUtil.scale(slideData[i].radius) * Math.sin(this.rotation.currAngle - slideData[i].angleToCenter) + offset[1]
                            }, {
                                x: elementCenter.x,
                                y: elementCenter.y
                            });

                        if (dist < minDist || i === len - 1) {
                            $minSlide = $slide;
                            minDist = dist;
                            minIdx = i;
                        }
                    }
                    return { $slide: $minSlide, index: minIdx };
                },

                selectSlide: function (forceSel) {
                    var newActiveSlide = core.getNearestSlide();
                    if (forceSel || activeSlide.index != newActiveSlide.index) {
                        if (opts.events.onUnselectSlide && activeSlide.$slide && activeSlide.index != newActiveSlide.index) {
                            opts.events.onUnselectSlide($elem, activeSlide.$slide, activeSlide.index);
                        }
                        activeSlide = newActiveSlide;
                        if (opts.events.onSelectSlide) {
                            opts.events.onSelectSlide($elem, activeSlide.$slide, activeSlide.index, slideData[newActiveSlide.index].caption);
                        }
                    }
                },

                doTransition: function (event, optsTrans) {
                    if (transData.animating) {
                        // ignore this event if user called this event while a previous one is still running
                        return;
                    }
                    transData.animating = true;
                    var prevGotoSlideIdx = this.gotoSlideIdx;
                    this.gotoSlideIdx = util.getSlideIdx(optsTrans.goto);
                    var zoomDest = zoomUtil.checkZoomBounds(zoomUtil.getZoomDest(optsTrans.zoomDest, this.gotoSlideIdx)),
                    fromPos = {
                        x: zoomUtil.unscale(elementCenter.x - container.pad.x + $elem.scrollLeft()),
                        y: zoomUtil.unscale(elementCenter.y - container.pad.y + $elem.scrollTop())
                    },

                    toPos = {
                        x: slideData[this.gotoSlideIdx].pos.x + slideData[this.gotoSlideIdx].center.x,
                        y: slideData[this.gotoSlideIdx].pos.y + slideData[this.gotoSlideIdx].center.y
                    },

                    delta = {
                        x: Math.abs(fromPos.x - toPos.x),
                        y: Math.abs(fromPos.y - toPos.y)
                    };
                    /*
                    alert(slideData[this.gotoSlideIdx].pos.x + ' + ' + slideData[this.gotoSlideIdx].center.x + '\\n' +
                    slideData[this.gotoSlideIdx].pos.y + ' + ' + slideData[this.gotoSlideIdx].center.y);
                    */
                    // only animate if something will move and if jQuery is running animations
                    if ((Math.max(delta.x, delta.y) > 1 || zoomDest != zoomUtil.zoom) && !$.fx.off) {
                        var rotMargin = this.rotation.needed ? this.rotation.adjustRotOrigin(prevGotoSlideIdx, {
                            x: zoomUtil.scale(fromPos.x) + container.pad.x,
                            y: zoomUtil.scale(fromPos.y) + container.pad.y
                        }) : [0, 0],
                        maxDeltaIsX = delta.x > delta.y,
                        startAnim = maxDeltaIsX ? fromPos.x : fromPos.y,
                        endAnim = maxDeltaIsX ? toPos.x : toPos.y;

                        // medium (x, y) = (x=unknown for now, y=optsTrans.zoomVertex= min or max zoom represented by y-coordinate 
                        // that corresponds to minimum or maximun the function takes)
                        zoomUtil.setZoomVertex(optsTrans, activeSlide.index, this.gotoSlideIdx, zoomDest);

                        var coefs = {
                            pan: util.getLinear({ x: startAnim, y: maxDeltaIsX ? fromPos.y : fromPos.x }, { x: endAnim, y: maxDeltaIsX ? toPos.y : toPos.x }),

                            // get the coefficients [a, b, c] of a quadratic function that interpolates the following 3 points: 
                            zoom: util.getQuadratic2PntsVertex(
                                        { x: startAnim, y: zoomUtil.zoom }, { x: endAnim, y: zoomDest },
                                        typeof optsTrans.zoomVertex == 'string' && optsTrans.zoomVertex == 'linear' ? 'linear' : zoomUtil.zoomVertex
                                    ),

                            // coefficients [a, b, c] used during rotation to smooth transitions from slide A to B
                            rotation: {
                                // transition between A's angle and B's angle
                                angle: util.getLinear({ x: startAnim, y: this.rotation.currAngle }, { x: endAnim, y: -slideData[this.gotoSlideIdx].rotation }),
                                margin: [
                                    util.getLinear({ x: startAnim, y: rotMargin[0] }, { x: endAnim, y: 0 }),
                                    util.getLinear({ x: startAnim, y: rotMargin[1] }, { x: endAnim, y: 0 })
                                ]
                            }
                        },

                        scrAnim,
                        // zoom only happens if coefficient a (coefs.zoom[0]) is not zero (parabolic animation) or
                        // if a is 0 (linear animation) and current zoom and destination zoom are not the same
                        needToZoom = coefs.zoom[0] != 0 || Math.abs(zoomUtil.zoom - zoomDest) > 0.0005,
                        lastTriggeredRotation = this.rotation.currAngle,
                        triggerRotEveryRad = opts.events.triggerOnRotationEvery * Math.PI / 180;

                        this.calcRotInfo([toPos.x, toPos.y]);

                        if (this.rotation.needed) {
                            if (opts.events.onStartRotation) {
                                opts.events.onStartRotation($elem,
                                    this.rotation.currAngle * 180 / Math.PI,
                                    this.rotation.getCenter(), [
                                        zoomUtil.scale(container.size.x),
                                        zoomUtil.scale(container.size.y)
                                    ], {
                                        x: container.pad.x,
                                        y: container.pad.y
                                    }
                                );
                            }
                        }
                        events.unbindEvents();

                        // set the initial values for scrAnim
                        $elem.animate({
                            scrAnim: startAnim
                        }, {
                            duration: 0
                        });

                        if (optsTrans.onStart) {
                            optsTrans.onStart();
                        }
                        // now animate
                        $elem.animate({
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


                                var centerRot = [panPnt[0] * zoomFactor + container.pad.x, panPnt[1] * zoomFactor + container.pad.y];
                                core.rotation.cssOrigin(centerRot);
                                if (core.rotation.needed) {
                                    var rotValue = util.getQuadraticValue(coefs.rotation.angle, now);
                                    core.rotation.cssRotate(rotValue, centerRot);
                                    core.rotation.cssMargin([util.getQuadraticValue(coefs.rotation.margin[0], now), util.getQuadraticValue(coefs.rotation.margin[1], now)]);

                                    if (opts.events.onRotation) {
                                        if (Math.abs(rotValue - lastTriggeredRotation) >= triggerRotEveryRad) {
                                            lastTriggeredRotation = rotValue;
                                            opts.events.onRotation($elem, rotValue * 180 / Math.PI, centerRot, [
                                                container.size.x * zoomFactor,
                                                container.size.y * zoomFactor
                                            ], {
                                                x: container.pad.x,
                                                y: container.pad.y
                                            });
                                        }
                                    }
                                }
                                $elem.scrollLeft(centerRot[0] - elementCenter.x).scrollTop(centerRot[1] - elementCenter.y);
                            },

                            complete: function () {
                                core.rotation.currAngle = -slideData[core.gotoSlideIdx].rotation;
                                var centerRot = [toPos.x * zoomDest + container.pad.x, toPos.y * zoomDest + container.pad.y];
                                $elem.scrollLeft(centerRot[0] - elementCenter.x).scrollTop(centerRot[1] - elementCenter.y);

                                core.rotation.cssOrigin(centerRot);
                                if (core.rotation.needed) {
                                    core.rotation.cssRotate(core.rotation.currAngle, centerRot);
                                    core.rotation.cssMargin([0, 0]);
                                    if (opts.events.onEndRotation) {
                                        opts.events.onEndRotation($elem, core.rotation.currAngle * 180 / Math.PI, centerRot, [
                                            container.size.x * zoomDest,
                                            container.size.y * zoomDest
                                        ], {
                                            x: container.pad.x,
                                            y: container.pad.y
                                        });
                                    }
                                }
                                
                                
                                
                                events.bindEvents();
                                transData.finished(optsTrans.onComplete);
                            }
                        });
                    } else {
                        transData.finished(optsTrans.onComplete);
                    }
                },

                doSequence: function (event) {
                    var runTransition = function () {
                        transData.onComplete = function () {
                            if (transData.onEndTransition) {
                                transData.onEndTransition();
                            }
                            if (seqData.state == $.fn.rsSlideIt.states.PLAYING && (seqData.idx % seqData.qt.sequences > 0 || seqData.repeat == -1 || seqData.repeat-- > 0)) {
                                if (transData.setupNextTrans()) {
                                    $elem.trigger('transition.rsSlideIt', [transData]);
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
                                    value = core.rotation.IE.convertToMatrix(value);
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
                                    matrix12 = parseFloat(coefs[1]);
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
                            value = value.replace(/(matrix\(| )/gi, ''); // remove occurences of "matrix(" and " "
                            var coefs = value.split(','),
                                matrix11 = parseFloat(coefs[0]),
                                matrix12 = parseFloat(coefs[1]);
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
                            if (typeof opts.layout.cols == 'object') {
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
                                contRect = core.rotation.getContainerRect($slide, rotAngle, slideSizes.size),
                                contRectOuter = core.rotation.getContainerRect($slide, rotAngle, slideSizes.outerSizeAll);

                            // to prevent the default behaviour in IE when dragging an element
                            $slide[0].ondragstart = function () { return false; };

                            if (!slideInSlide && needNewRow) {
                                ++row;
                            }
                            if (contRectOuter[0] < 0) {
                                contRectOuter[0] = -contRectOuter[0];
                                contRectOuter[2] += 2 * contRectOuter[0];
                            }
                            if (contRectOuter[1] < 0) {
                                contRectOuter[1] = -contRectOuter[1];
                                contRectOuter[3] += 2 * contRectOuter[1];
                            }
                            slideData.push({
                                pos: { // to be computed later
                                    x: 0,
                                    y: 0
                                },
                                size: { // outer size includes margin + border + padding
                                    x: contRectOuter[2] - contRectOuter[0],
                                    y: contRectOuter[3] - contRectOuter[1]
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
                                    x: contRect[2] - contRect[0],
                                    y: contRect[3] - contRect[1]
                                },
                                rectOuter: {
                                    left: contRectOuter[0],
                                    top: contRectOuter[1],
                                    right: contRectOuter[2],
                                    bottom: contRectOuter[3]
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
                            core.rotation.needed = core.rotation.needed || rotAngle != 0;

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
                        container.$zoomDiv.css('position', 'relative');
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
                                    var ieOffset = [0, 0, 0, 0];
                                    if (core.isIE8orBelow) {
                                        ieOffset = core.rotation.getContainerRect($slide, slideData[i].rotation, [slideData[i].slideSizeNoRotation.x, slideData[i].slideSizeNoRotation.y]);
                                    }
                                    $slide.css({
                                        'position': 'absolute',
                                        'left': (slideData[i].pos.x + ieOffset[0]) + 'px',
                                        'top': (slideData[i].pos.y + ieOffset[1]) + 'px'
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
                        bind('transition.rsSlideIt', events.onTransition).
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
                    this.calcRotInfo([
                        slideData[slide].pos.x + slideData[slide].center.x,
                        slideData[slide].pos.y + slideData[slide].center.y
                    ]);
                },
                gotoSlide: function (slide, zoomValue) {
                    core.doTransition(null, {
                        goto: slide,
                        duration: 0,
                        zoomDest: zoomUtil.checkZoomBounds(zoomUtil.getZoomDest(zoomValue, slide))
                    });
                    core.selectSlide(true);
                }
            },

            util = {
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
                        return [
                            (p3.x * (p2.y - p1.y) + p2.x * (p1.y - p3.y) + p1.x * (p3.y - p2.y)) / deno, // a
                            (p3.x * p3.x * (p1.y - p2.y) + p1.x * p1.x * (p2.y - p3.y) + p2.x * p2.x * (p3.y - p1.y)) / deno, // b
                            (p3.x * (p2.x * p1.y * (p2.x - p3.x) + p1.x * p2.y * (p3.x - p1.x)) + p1.x * p2.x * p3.y * (p1.x - p2.x)) / deno // c
                        ];
                    } else {
                        // return a linear function that interpolates the first and third point
                        return this.getLinear(p1, p3);
                    }
                },

                getLinear: function (p1, p3) {
                    var m = (p1.y - p3.y) / (p1.x - p3.x);
                    return [
                        0, // a
                        m, // b
                        p1.y - m * p1.x // c
                    ];
                },

                getQuadraticValue: function (coefs, x) { // coefs vector with [a, b, c] coefficients
                    return coefs[0] * x * x + coefs[1] * x + coefs[2];
                },

                // returns the x-coordinate of the point that corresponds to the min/max value of a quadradic f(x) function (when f'(x) = 0) 
                getVertexPointX: function (coefs) { // coefs vector with [a, b, c] coefficients
                    return -coefs[1] / (2 * coefs[0]);
                },

                // given 2 points and the y-coordinate of the vertex point (point where function has its min or max value),
                // this function interpolates a quadratic function.
                // It might need to make further approximations for the resulting f(x) reach the targeted yVertex
                getQuadratic2PntsVertex: function (p1, p3, yVertex) {
                    if (typeof yVertex == 'string' && yVertex == 'linear') {
                        return this.getLinear(p1, p3);
                    } else {
                        return this.getQuadraticAprox(p1, { x: (p1.x + p3.x) / 2, y: yVertex }, p3);
                    }
                },

                getQuadraticAprox: function (p1, p2, p3) {
                    var coefs = this.getQuadratic(p1, p2, p3);
                    if (coefs[0] != 0) { // only continue if a is non zero (if it is a parabola)

                        var vertexPnt = {
                            x: this.getVertexPointX(coefs),
                            y: 0 // is computed below
                        };
                        vertexPnt.y = this.getQuadraticValue(coefs, vertexPnt.x);

                        // compare the y-coordinate of the vertex point against the desired vertex (p2.y)
                        if (Math.abs(vertexPnt.y - p2.y) > 0.001) {
                            // fine tuning to aproximate the desired vertex (p2.y)
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
                longestPath: 0, // used when zoomVertex is 'autoIn' or 'autoOut'
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
                    var posData;
                    if (!animating) {
                        var $elemPos = $elem.position(),
                            scr = [$elem.scrollLeft(), $elem.scrollTop()],
                            coords = [X - $elemPos.left, Y - $elemPos.top], // offset relative to the top left border
                            unscaledPos = [
                                coords[0] + scr[0] - container.pad.x,
                                coords[1] + scr[1] - container.pad.y
                            ],
                            size = [zoomUtil.scale(container.size.x), zoomUtil.scale(container.size.y)];

                        if (unscaledPos[0] > 0) {
                            if (unscaledPos[0] > size[0]) {
                                unscaledPos[0] += container.size.x - size[0];
                            } else {
                                unscaledPos[0] = this.unscale(unscaledPos[0]);
                            }
                        }

                        if (unscaledPos[1] > 0) {
                            if (unscaledPos[1] > size[1]) {
                                unscaledPos[1] += container.size.y - size[1];
                            } else {
                                unscaledPos[1] = this.unscale(unscaledPos[1]);
                            }
                        }
                    }

                    var prevZoom = this.zoom;
                    this.zoom = this.checkZoomBounds(newZoom);

                    if (!animating) {
                        // adjust the origin to the current zoom level
                        var orig = core.rotation.getCenter();
                        orig[0] = this.unscale(orig[0] - container.pad.x, prevZoom);
                        orig[1] = this.unscale(orig[1] - container.pad.y, prevZoom);
                        
                        core.rotation.cssOrigin([
                            this.scale(orig[0]) + container.pad.x,
                            this.scale(orig[1]) + container.pad.y
                        ]);
                        
                        if (unscaledPos[0] > 0) {
                            $elem.scrollLeft(this.scale(unscaledPos[0]) + container.pad.x - coords[0]);
                        }
                        if (unscaledPos[1] > 0) {
                            $elem.scrollTop(this.scale(unscaledPos[1]) + container.pad.y - coords[1]);
                        }
                        core.cssZoom();
                    }

                    if (prevZoom != this.zoom && opts.events.onChangeZoom) {
                        opts.events.onChangeZoom($elem, this.zoom);
                    }
                },
                setZoomVertex: function (optsTrans, idx1, idx2, zoomDest) {
                    if (typeof optsTrans.zoomVertex == 'string') {
                        switch (optsTrans.zoomVertex) {
                            case 'autoOut':
                                var delta = Math.min(this.zoom, zoomDest) - opts.zoomMin;
                                this.zoomVertex = Math.min(this.zoom, zoomDest) - delta * util.getDistanceTwoSlides(idx1, idx2) / this.longestPath;
                                break;
                            case 'autoIn':
                                var delta = opts.zoomMax - Math.max(this.zoom, zoomDest);
                                this.zoomVertex = Math.max(this.zoom, zoomDest) + delta * util.getDistanceTwoSlides(idx1, idx2) / this.longestPath;
                        }
                    } else {
                        this.zoomVertex = this.checkZoomBounds(optsTrans.zoomVertex);
                    }
                },
                getZoomDest: function (zDest, gotoSlideIdx) {
                    if (typeof zDest == 'string') {
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

                // speed records the mouse speed while user is dragging the images
                speed: {
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
                            panUtil.speed.getCoords();
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
                        var scrPos = [$elem.scrollLeft(), $elem.scrollTop()];
                        this.value.x = scrPos[0] - (this.lastPt.x == -1 ? scrPos[0] : this.lastPt.x);
                        this.value.y = scrPos[1] - (this.lastPt.y == -1 ? scrPos[1] : this.lastPt.y);
                        this.lastPt.x = scrPos[0];
                        this.lastPt.y = scrPos[1];
                    }
                },

                // timer that starts on mouseup and stops some moments later (until scrolls stops)
                // its is used to make a smooth scroll animation after panning with the mouse.
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
                            scrollLeft($elem.scrollLeft() + (panUtil.speed.value.x > 0 ? --panUtil.speed.value.x : (panUtil.speed.value.x < 0 ? ++panUtil.speed.value.x : 0))).
                            scrollTop($elem.scrollTop() + (panUtil.speed.value.y > 0 ? --panUtil.speed.value.y : (panUtil.speed.value.y < 0 ? ++panUtil.speed.value.y : 0)));
                        if (panUtil.speed.value.x > 1) panUtil.speed.value.x--;
                        if (panUtil.speed.value.x < -1) panUtil.speed.value.x++;
                        if (panUtil.speed.value.y > 1) panUtil.speed.value.y--;
                        if (panUtil.speed.value.y < -1) panUtil.speed.value.y++;
                        if (panUtil.speed.value.x == 0 && panUtil.speed.value.y == 0) this.stopTimer();
                    }
                },

                isPanning: false,

                mousedown: function () {
                    this.isPanning = true;
                    if (opts.behaviour.panOnMouseDrag.useAcceleration) {
                        this.timerSmoothStop.stopTimer();

                        if (!this.speed.isRunning) {
                            this.speed.lastPt.x = this.speed.lastPt.y = -1;
                            this.speed.lastPt.x = this.speed.lastPt.y = -1;
                            this.speed.value.x = this.speed.value.y = 0;
                            this.speed.isRunning = true;
                            this.speed.startTimer();
                        }
                    }
                },

                mouseup: function (useSmoothStop) {
                    this.isPanning = false;
                    if (opts.behaviour.panOnMouseDrag.useAcceleration) {
                        this.speed.stopTimer();
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
                onStartPanning: function (event) {
                    event.preventDefault();
                    panUtil.startPos.x = event.clientX + $elem.scrollLeft();
                    panUtil.startPos.y = event.clientY + $elem.scrollTop();
                    panUtil.mousedown();
                },
                onPanning: function (event) {
                    if (panUtil.isPanning) {
                        $elem.
                            scrollLeft(panUtil.startPos.x - event.clientX).
                            scrollTop(panUtil.startPos.y - event.clientY);
                    }
                },
                onEndPanning: function (event) {
                    panUtil.mouseup(true);
                },
                onEndPanningFromBody: function (event) {
                    panUtil.mouseup(false);
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
                            seqData.init(optsSequence, (typeof optsSequence.sequence == 'string') && (optsSequence.sequence == 'prev' || optsSequence.sequence == 'next'));
                        }
                        if (seqData.state == $.fn.rsSlideIt.states.PAUSED) {
                            seqData.state = $.fn.rsSlideIt.states.PLAYING;
                        }
                        if (seqData.state == $.fn.rsSlideIt.states.PLAYING) {
                            core.doSequence(event);
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
                        $elemAndTops.
                            bind('mousedown.rsSlideIt', this.onStartPanning).
                            bind('mousemove.rsSlideIt', this.onPanning).
                            bind('mouseup.rsSlideIt', this.onEndPanning);
                        // the mouseup event might happen outside the plugin, so to make sure the unbind always runs, it must be done on body level
                        $("body, html").bind('mouseup.rsSlideIt', this.onEndPanningFromBody);
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
                        case 'rotation': return core.rotation.currAngle * 180 / Math.PI;
                        case 'center': return core.rotation.getCenter();
                        case 'padding': return [container.pad.x, container.pad.y];
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
        events.bindEvents();
    }

    $.fn.rsSlideIt = function (options) {
        var transitionTo = function (optionsTrans) {
            var optsTrans = $.extend({}, $.fn.rsSlideIt.defaultsTransitions, optionsTrans);

            return this.each(function () {
                $(this).trigger('transition.rsSlideIt', [optsTrans]);
            });
        },
        playPause = function (optionsSequence) {
            var optsSequence = $.extend({}, $.fn.rsSlideIt.defaultsSequence, optionsSequence);

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
            if (typeof arguments[0] == 'string') {
                var op = arguments.length == 1 ? 'getter' : (arguments.length == 2 ? 'setter' : null);
                if (op != null) {
                    return this.eq(0).triggerHandler(op + '.rsSlideIt', arguments);
                }
            }
        };

        if (typeof options == 'string') {
            var otherArgs = Array.prototype.slice.call(arguments, 1);
            switch (options) {
                case 'transitionTo': return transitionTo.apply(this, otherArgs);
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
        layout: {
            cols: null,             // null for images in a single row, integer or array of integers
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
            onChangeSize: null,     // function ($elem, size)
            onChangeZoom: null,     // function ($elem, zoom)
            onStartRotation: null,  // function ($elem, degrees, centerRot, size, padding)
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
                $elem.rsSlideIt('transitionTo', {
                    goto: slideIndex,
                    zoomDest: 'cover',
                    zoomVertex: 'linear',
                    duration: 'normal'
                });
            }
        },
        zoomMin: 0.4,
        zoomStep: 0.1,
        zoomMax: 15,
        initialSlide: 0,
        initialZoom: 1
    };

    $.fn.rsSlideIt.defaultsTransitions = {
        goto: 'next',       // positive integer or 'prev' or 'first' or 'last'
        duration: 600,      // positive integer 
        zoomDest: 1,        // positive real number or 'current' or 'fitWidth' or 'fitHeight' or 'fit' or 'cover'
        zoomVertex: 1,      // positive number or 'autoOut' or 'autoIn' or 'linear'
        onStart: null,      // event handler called when this transition starts to run
        onComplete: null    // event handler called when this transition is completed
    };

    $.fn.rsSlideIt.defaultsSequence = {
        sequence: 'next',   // array of positive integers or 'prev' or 'next'
        delayOnSlide: 2000, // positive integer or an array of positive integers
        zoomDest: 1,        // positive real number or 'current' or 'fitWidth' or 'fitHeight' or 'fit' or 'cover' or an arrays of positive real numbers and strings
        zoomVertex: 1,      // positive real number or 'autoOut' or 'autoIn' or 'linear' or an arrays of positive real numbers and strings
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
    }

})(jQuery);