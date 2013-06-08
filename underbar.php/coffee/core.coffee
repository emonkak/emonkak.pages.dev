class ScrollSpy
  constructor: (container) ->
    @container = container
    @handler = _.throttle _.bind(@onScroll, this), 100
    @watches = []
    @insides = {}

  start: ->
    $(@container).on 'scroll', @handler
    @onScroll()

  stop: ->
    $(@container).off 'scroll', @handler

  observe: (el) ->
    @watches.push el

  contains: ($el, scrollTop, scrollBottom) ->
    offsetTop = $el.offset().top
    offsetBottom = offsetTop + $el.height()

    if offsetTop >= scrollTop && offsetBottom <= scrollBottom
      # Visible all region.
      true
    else if offsetTop <= scrollBottom
      visibleHeight = Math.min(offsetBottom, scrollBottom) - Math.max(offsetTop, scrollTop)
      halfContainerHeight = (scrollBottom - scrollTop) / 2
      visibleHeight >= halfContainerHeight
    else
      false

  onScroll: ->
    $container = $(@container)
    scrollTop = $container.scrollTop()
    scrollBottom = scrollTop + $container.height()

    for el in @watches
      hash = el.hash
      $target = $(if hash.length > 1 then hash else 'body')
      continue if $target.length is 0

      if @contains($target, scrollTop, scrollBottom)
        unless hash of @insides
          @onEnter.call this, el, $target[0] if @onEnter
          @insides[hash] = el
      else if hash of @insides
        @onLeave.call this, el, $target[0] if @onLeave
        delete @insides[hash]

    return


# Scroll Spy
scrollSpy = new ScrollSpy(window)
scrollSpy.onEnter = (el) ->
  $el = $(el).parent().addClass('active').end()

  $header = $('#header')
  scrollTop = $header.scrollTop()
  scrollBottom = scrollTop + $header.height()
  offsetTop = scrollTop + $el.position().top

  unless scrollTop <= offsetTop <= scrollBottom
    $header.stop().animate scrollTop: offsetTop

scrollSpy.onLeave = (el) ->
  $(el).parent().removeClass('active')

$('#header a[href^="#"]').each -> scrollSpy.observe this

scrollSpy.start()

# Smooth scroll
$('a[href^="#"]').on 'click', (e) ->
  e.preventDefault()
  $target = $(if @hash.length > 1 then @hash else 'body')

  if $target.length
    offsetTop = $target.offset().top
    difference = Math.abs(offsetTop - $(window).scrollTop())

    $('html, body').stop().animate
      scrollTop: offsetTop
    , Math.min(difference, 500), 'swing', =>
      window.location.hash = @hash
      scrollSpy.onScroll()

    false
