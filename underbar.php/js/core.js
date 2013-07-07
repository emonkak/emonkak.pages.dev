// Generated by CoffeeScript 1.6.3
(function() {
  var $header, ScrollSpy, isFocusToHeader, isSmoothScrolling, scrollSpy;

  ScrollSpy = (function() {
    function ScrollSpy(container) {
      this.$container = $(container);
      this.onScroll = _.throttle(_.bind(this.onScroll, this), 100);
      this.watches = [];
      this.insides = {};
    }

    ScrollSpy.prototype.start = function() {
      this.$container.on('scroll', this.onScroll);
      return this.onScroll();
    };

    ScrollSpy.prototype.stop = function() {
      return this.$container.off('scroll', this.onScroll);
    };

    ScrollSpy.prototype.observe = function(el) {
      return this.watches.push(el);
    };

    ScrollSpy.prototype.contains = function($el, scrollTop, scrollBottom) {
      var halfContainerHeight, offsetBottom, offsetTop, visibleHeight;
      offsetTop = $el.offset().top;
      offsetBottom = offsetTop + $el.height();
      if (offsetTop >= scrollTop && offsetBottom <= scrollBottom) {
        return true;
      } else if (offsetTop <= scrollBottom) {
        visibleHeight = Math.min(offsetBottom, scrollBottom) - Math.max(offsetTop, scrollTop);
        halfContainerHeight = (scrollBottom - scrollTop) / 2;
        return visibleHeight >= halfContainerHeight;
      } else {
        return false;
      }
    };

    ScrollSpy.prototype.onScroll = function() {
      var $target, el, hash, scrollBottom, scrollTop, _i, _len, _ref;
      scrollTop = this.$container.scrollTop();
      scrollBottom = scrollTop + this.$container.height();
      _ref = this.watches;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        el = _ref[_i];
        hash = el.hash;
        $target = $(hash.length > 1 ? hash : 'body');
        if ($target.length === 0) {
          continue;
        }
        if (this.contains($target, scrollTop, scrollBottom)) {
          if (!(hash in this.insides)) {
            if (this.onEnter) {
              this.onEnter.call(this, el, $target[0]);
            }
            this.insides[hash] = el;
          }
        } else if (hash in this.insides) {
          if (this.onLeave) {
            this.onLeave.call(this, el, $target[0]);
          }
          delete this.insides[hash];
        }
      }
    };

    return ScrollSpy;

  })();

  isFocusToHeader = false;

  isSmoothScrolling = false;

  $header = $('#header').on({
    mouseenter: function() {
      return isFocusToHeader = true;
    },
    mouseleave: function() {
      return isFocusToHeader = false;
    }
  });

  scrollSpy = new ScrollSpy(window);

  scrollSpy.onEnter = function(el) {
    var $active, height, offsetTop, scrollTop;
    $active = $(el).parent().addClass('active');
    if (!isFocusToHeader || isSmoothScrolling) {
      scrollTop = $header.scrollTop();
      offsetTop = $active.position().top;
      height = $header.height();
      return $header.stop().animate({
        scrollTop: scrollTop + offsetTop - (height / 2)
      });
    }
  };

  scrollSpy.onLeave = function(el) {
    return $(el).parent().removeClass('active');
  };

  $('#header dd a[href^="#"]').each(function() {
    return scrollSpy.observe(this);
  });

  scrollSpy.start();

  $(document).on('click', 'a[href^="#"]', function(e) {
    var $target, difference, offsetTop,
      _this = this;
    e.preventDefault();
    $target = $(this.hash.length > 1 ? this.hash : 'body');
    if ($target.length) {
      offsetTop = $target.offset().top;
      difference = Math.abs(offsetTop - $(window).scrollTop());
      isSmoothScrolling = true;
      $('html, body').stop().animate({
        scrollTop: offsetTop
      }, Math.min(difference, 500), 'swing', function() {
        window.location.hash = _this.hash;
        scrollSpy.onScroll();
        return isSmoothScrolling = false;
      });
      return false;
    }
  });

}).call(this);
