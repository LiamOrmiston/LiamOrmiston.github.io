$('.nav-link').on('click', function(){
    $('.nav-link.active').removeClass('active');
    $(this).addClass('active');
});

// Adapted from: http://codetheory.in/change-active-state-links-sticky-navigation-scroll/
var sections = $('.container'), nav = $('nav'), nav_height = nav.outerHeight();

$(window).on('scroll', function () {
  var cur_pos = $(this).scrollTop();

  sections.each(function() {
    var top = $(this).offset().top - nav_height,
        bottom = top + $(this).outerHeight();

    if (cur_pos >= top && cur_pos <= bottom) {
      nav.find('.nav-link.active').removeClass('active');
      sections.find('.container.py-5.active').removeClass('active');

      $(this).addClass('active');
      nav.find('a[href="#'+$(this).attr('id')+'"]').addClass('active');
    }
  });
});
